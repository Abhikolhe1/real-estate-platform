import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { createHash, randomUUID } from "crypto";
import {
  assertCanonicalTwin,
  canonicalJson,
  CanonicalTwinV1,
  Correction,
} from "@aether/twin-schema";
import { FloorPlan } from "../entities/floorplan.entity";
import { Project } from "../entities/project.entity";
import {
  TwinSourceAsset,
  TwinRevision,
  TwinReconstructionJob,
} from "../entities/canonical-twin.entity";

const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type TwinScope = {
  tenantId: string;
  projectId: string;
  floorplanId: string;
};

@Injectable()
export class CanonicalTwinService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  constructor(private readonly db: DataSource) {}
  onModuleInit() {
    if (
      process.env.CAD_SERVICE_TOKEN &&
      process.env.CAD_WORKER_ENABLED !== "false"
    ) {
      this.timer = setInterval(() => {
        void this.runNext().catch(() => {
          /* Persisted job failures are read through status API. */
        });
      }, 2000);
      this.timer.unref();
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async floorplan(scope: TwinScope, manager = this.db.manager, lock = false) {
    if (!Object.values(scope).every((v) => uuid.test(v)))
      throw new NotFoundException("Resource not found");
    if (
      !(await manager.findOneBy(Project, {
        id: scope.projectId,
        tenantId: scope.tenantId,
      }))
    )
      throw new NotFoundException("Project not found");
    const fp = await manager.findOne(FloorPlan, {
      where: {
        id: scope.floorplanId,
        tenantId: scope.tenantId,
        projectId: scope.projectId,
      },
      ...(lock ? { lock: { mode: "pessimistic_write" as const } } : {}),
    });
    if (!fp) throw new NotFoundException("Floorplan not found");
    return fp;
  }
  async status(scope: TwinScope) {
    const fp = await this.floorplan(scope);
    const [jobs, revisions] = await Promise.all([
      this.db
        .getRepository(TwinReconstructionJob)
        .find({ where: scope, order: { createdAt: "DESC" }, take: 50 }),
      this.db
        .getRepository(TwinRevision)
        .find({
          where: scope,
          order: { createdAt: "DESC" },
          take: 100,
          select: [
            "id",
            "sourceAssetId",
            "state",
            "createdBy",
            "createdAt",
            "baseRevisionId",
            "issueSummary",
            "canonicalSha256",
            "reviewedBy",
            "reviewedAt",
          ],
        }),
    ]);
    return {
      floorplanId: fp.id,
      sourceAssetId: fp.canonicalSourceAssetId,
      draftRevisionId: fp.canonicalDraftRevisionId,
      approvedRevisionId: fp.approvedCanonicalRevisionId,
      jobs,
      revisions,
    };
  }
  async revision(scope: TwinScope, id: string, manager = this.db.manager) {
    await this.floorplan(scope, manager);
    if (!uuid.test(id)) throw new NotFoundException("Revision not found");
    const revision = await manager.findOneBy(TwinRevision, { ...scope, id });
    if (!revision) throw new NotFoundException("Revision not found");
    if (hash(canonicalJson(revision.canonical)) !== revision.canonicalSha256)
      throw new ConflictException("Immutable canonical checksum mismatch");
    return revision;
  }
  async approved(scope: TwinScope) {
    const fp = await this.floorplan(scope);
    if (!fp.approvedCanonicalRevisionId)
      throw new NotFoundException("No approved canonical revision");
    const r = await this.revision(scope, fp.approvedCanonicalRevisionId);
    assertCanonicalTwin(r.canonical, true);
    return r;
  }
  private requireWorker() {
    if (!process.env.CAD_SERVICE_TOKEN)
      throw new ServiceUnavailableException(
        "CAD_SERVICE_TOKEN must be configured",
      );
  }
  async source(scope: TwinScope, id: string) {
    await this.floorplan(scope);
    if (!uuid.test(id)) throw new NotFoundException("Source not found");
    const asset = await this.db
      .getRepository(TwinSourceAsset)
      .createQueryBuilder("asset")
      .addSelect("asset.bytes")
      .where(
        "asset.id = :id AND asset.tenantId = :tenantId AND asset.projectId = :projectId AND asset.floorplanId = :floorplanId",
        { ...scope, id },
      )
      .getOne();
    if (!asset) throw new NotFoundException("Source not found");
    if (hash(asset.bytes) !== asset.sha256)
      throw new ConflictException("Immutable source checksum mismatch");
    return asset;
  }
  async upload(scope: TwinScope, actor: string, file: Express.Multer.File) {
    this.requireWorker();
    await this.floorplan(scope);
    if (
      !file ||
      !/\.dxf$/i.test(file.originalname) ||
      file.size > 10 * 1024 * 1024 ||
      !file.size ||
      !file.buffer.subarray(0, 4096).includes(Buffer.from("SECTION")) ||
      !file.buffer.subarray(-4096).includes(Buffer.from("EOF"))
    ) {
      throw new BadRequestException(
        "A valid ASCII DXF of at most 10 MiB is required",
      );
    }
    return this.db.transaction(async (m) => {
      const fp = await this.floorplan(scope, m, true);
      await this.capacity(scope, m);
      const asset = await m.save(
        TwinSourceAsset,
        m.create(TwinSourceAsset, {
          ...scope,
          createdBy: actor,
          bytes: file.buffer,
          byteLength: file.size,
          sha256: hash(file.buffer),
          filename: file.originalname
            .replace(/[\\/\x00-\x1f]/g, "_")
            .slice(0, 255),
        }),
      );
      const job = await m.save(
        TwinReconstructionJob,
        m.create(TwinReconstructionJob, {
          ...scope,
          createdBy: actor,
          sourceAssetId: asset.id,
          baseRevisionId:
            fp.canonicalDraftRevisionId ||
            fp.approvedCanonicalRevisionId ||
            null,
          stage: "queued",
          config: {},
        }),
      );
      fp.canonicalSourceAssetId = asset.id;
      await m.save(fp);
      return {
        assetId: asset.id,
        sha256: asset.sha256,
        jobId: job.id,
        stage: job.stage,
      };
    });
  }
  private async capacity(scope: TwinScope, m: EntityManager) {
    await m.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      scope.tenantId,
    ]);
    const active = await m.countBy(TwinReconstructionJob, {
      tenantId: scope.tenantId,
      stage: In(["queued", "reconstructing"]),
    });
    if (active >= 8)
      throw new ConflictException("Tenant processing queue is full");
    if (
      await m.countBy(TwinReconstructionJob, {
        ...scope,
        stage: In(["queued", "reconstructing"]),
      })
    )
      throw new ConflictException("This floorplan already has an active job");
  }
  async reprocess(
    scope: TwinScope,
    actor: string,
    baseId: string,
    config: Record<string, unknown>,
  ) {
    this.requireWorker();
    const base = await this.revision(scope, baseId);
    const allowed = [
      "endpointSnapToleranceM",
      "intersectionToleranceM",
      "openingHostToleranceM",
      "curveSagittaM",
      "bodyClearanceM",
      "wallThicknessM",
      "floorHeightM",
      "scaleToMeters",
      "sourceUnits",
      "sourceOrigin",
      "layerMapping",
      "ignoredSourceIds",
    ];
    if (!config || Object.keys(config).some((k) => !allowed.includes(k)))
      throw new BadRequestException("Unknown reconstruction configuration");
    return this.db.transaction(async (m) => {
      const fp = await this.floorplan(scope, m, true);
      if (fp.canonicalDraftRevisionId !== baseId)
        throw new ConflictException(
          "Draft changed; reload before reprocessing",
        );
      await this.capacity(scope, m);
      return m.save(
        TwinReconstructionJob,
        m.create(TwinReconstructionJob, {
          ...scope,
          createdBy: actor,
          sourceAssetId: base.sourceAssetId,
          baseRevisionId: baseId,
          stage: "queued",
          config: { ...base.canonical.config, ...config },
        }),
      );
    });
  }
  async cancel(scope: TwinScope, id: string) {
    await this.floorplan(scope);
    if (!uuid.test(id)) throw new NotFoundException("Job not found");
    const result = await this.db
      .getRepository(TwinReconstructionJob)
      .update(
        { ...scope, id, stage: In(["queued", "reconstructing"]) },
        {
          stage: "cancelled",
          finishedAt: new Date(),
          failure: { code: "USER_CANCELLED", message: "Cancelled by reviewer" },
        },
      );
    if (!result.affected)
      throw new ConflictException("Job is already finished or unavailable");
    return { stage: "cancelled" };
  }
  async worker(action: string, data: unknown): Promise<any> {
    this.requireWorker();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch(
        `${process.env.AI_SERVICE_URL || "http://127.0.0.1:8000"}/canonical/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CAD_SERVICE_TOKEN}`,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        },
      );
      if (!response.ok)
        throw new BadRequestException({
          code: "CAD_WORKER_REJECTED",
          details: await response
            .json()
            .catch(() => ({ status: response.status })),
        });
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }
  private makeRevision(
    scope: TwinScope,
    actor: string,
    canonical: CanonicalTwinV1,
    base: TwinRevision | null,
    changes: any[],
    approved = false,
  ) {
    const id = randomUUID();
    canonical = structuredClone(canonical);
    canonical.revision = {
      id,
      baseId: base?.id || null,
      state: approved
        ? "approved"
        : canonical.issues.some((i) => i.severity === "blocking" && !i.resolved)
          ? "review_required"
          : "draft",
    };
    assertCanonicalTwin(canonical, approved);
    const now = new Date();
    return this.db
      .getRepository(TwinRevision)
      .create({
        id,
        ...scope,
        createdBy: actor,
        sourceAssetId: canonical.source.assetId,
        sourceSha256: canonical.source.sha256,
        algorithmVersion: canonical.source.algorithmVersion,
        baseRevisionId: base?.id || null,
        state: canonical.revision.state,
        canonical,
        canonicalSha256: hash(canonicalJson(canonical)),
        corrections: [
          ...(base?.corrections || []),
          ...changes.map((c) => ({
            ...c,
            actor,
            at: now.toISOString(),
            baseRevisionId: base?.id || "",
          })),
        ],
        reviewedBy: approved ? actor : null,
        reviewedAt: approved ? now : null,
        issueSummary: Object.fromEntries(
          ["blocking", "warning", "info"].map((s) => [
            s,
            canonical.issues.filter((i) => i.severity === s && !i.resolved)
              .length,
          ]),
        ),
      });
  }
  async corrections(
    scope: TwinScope,
    actor: string,
    baseId: string,
    commands: Correction[],
  ) {
    const base = await this.revision(scope, baseId);
    const result = await this.worker("correct", {
      canonical: base.canonical,
      commands,
    });
    const next = this.makeRevision(
      scope,
      actor,
      assertCanonicalTwin(result.canonical),
      base,
      result.changes,
    );
    return this.db.transaction(async (m) => {
      const fp = await this.floorplan(scope, m, true);
      if (fp.canonicalDraftRevisionId !== baseId)
        throw new ConflictException("Draft changed; reload before saving");
      await m.insert(TwinRevision, next);
      fp.canonicalDraftRevisionId = next.id;
      await m.save(fp);
      return next;
    });
  }
  async validate(scope: TwinScope, id: string) {
    const r = await this.revision(scope, id);
    const result = await this.worker("validate", { canonical: r.canonical });
    const issues = [
      ...r.canonical.issues.filter((i) => !i.resolved),
      ...result.issues,
    ];
    return {
      revisionId: id,
      issues,
      canApprove: !issues.some((i) => i.severity === "blocking"),
    };
  }
  async approve(scope: TwinScope, actor: string, baseId: string) {
    const base = await this.revision(scope, baseId);
    const validation = await this.validate(scope, baseId);
    if (!validation.canApprove)
      throw new BadRequestException({
        message: "Blocking validation issues remain",
        issues: validation.issues,
      });
    const approved = this.makeRevision(
      scope,
      actor,
      base.canonical,
      base,
      [],
      true,
    );
    return this.db.transaction(async (m) => {
      const fp = await this.floorplan(scope, m, true);
      if (fp.canonicalDraftRevisionId !== baseId)
        throw new ConflictException("Draft changed; reload before approving");
      await m.insert(TwinRevision, approved);
      fp.approvedCanonicalRevisionId = approved.id;
      fp.canonicalDraftRevisionId = approved.id;
      await m.save(fp);
      return approved;
    });
  }
  async runNext() {
    if (this.busy) return;
    this.busy = true;
    let job: TwinReconstructionJob | null = null;
    try {
      // Leases exceeding the worker hard limit cannot legitimately still be processing.
      await this.db
        .query(`UPDATE twin_reconstruction_jobs SET stage='failed',"finishedAt"=now(),failure='{"code":"WORKER_INTERRUPTED","message":"Worker lease expired; reprocess source"}'::jsonb
        WHERE stage='reconstructing' AND "startedAt" < now()-interval '2 minutes'`);
      job = await this.db.transaction(async (m) => {
        const next = await m
          .getRepository(TwinReconstructionJob)
          .createQueryBuilder("j")
          .where("j.stage = :stage", { stage: "queued" })
          .orderBy("j.createdAt", "ASC")
          .setLock("pessimistic_write")
          .setOnLocked("skip_locked")
          .getOne();
        if (!next) return null;
        next.stage = "reconstructing";
        next.startedAt = new Date();
        next.version++;
        return m.save(next);
      });
      if (!job) return;
      const scope = {
        tenantId: job.tenantId,
        projectId: job.projectId,
        floorplanId: job.floorplanId,
      };
      const asset = await this.source(scope, job.sourceAssetId);
      const base = job.baseRevisionId
        ? await this.revision(scope, job.baseRevisionId)
        : null;
      const output = await this.worker("reconstruct", {
        data: asset.bytes.toString("base64"),
        assetId: asset.id,
        config: job.config,
        previous: base?.canonical,
        history: base?.corrections || [],
      });
      const canonical = assertCanonicalTwin(output.canonical);
      if (
        canonical.source.sha256 !== asset.sha256 ||
        canonical.source.assetId !== asset.id
      )
        throw new Error("Worker source mismatch");
      const revision = this.makeRevision(
        scope,
        job.createdBy,
        canonical,
        base,
        output.changes || [],
      );
      // Reprocess records only successfully transferred corrections. Conflicts remain in the new draft.
      revision.corrections = (output.changes || []).map((c) => ({
        ...c,
        actor: job!.createdBy,
        at: new Date().toISOString(),
        baseRevisionId: base?.id || "",
      }));
      await this.db.transaction(async (m) => {
        const current = await m.findOne(TwinReconstructionJob, {
          where: { id: job!.id },
          lock: { mode: "pessimistic_write" },
        });
        if (current?.stage !== "reconstructing") return;
        const fp = await this.floorplan(scope, m, true);
        if (
          (fp.canonicalDraftRevisionId || null) !==
          (job!.baseRevisionId || null)
        ) {
          current.stage = "failed";
          current.failure = {
            code: "REPROCESS_CONFLICT",
            message:
              "Draft changed while processing; retry from current revision",
          };
        } else {
          await m.insert(TwinRevision, revision);
          fp.canonicalDraftRevisionId = revision.id;
          await m.save(fp);
          current.stage = "review_required";
          current.resultRevisionId = revision.id;
          current.issueCounts = revision.issueSummary;
          current.timings = output.timings;
        }
        current.finishedAt = new Date();
        await m.save(current);
      });
    } catch (error) {
      if (job)
        await this.db
          .getRepository(TwinReconstructionJob)
          .update(
            { id: job.id, stage: "reconstructing" },
            {
              stage: "failed",
              finishedAt: new Date(),
              failure: {
                code: "RECONSTRUCTION_FAILED",
                message: String(
                  error instanceof Error ? error.message : error,
                ).slice(0, 1000),
              },
            },
          );
    } finally {
      this.busy = false;
    }
  }
}
