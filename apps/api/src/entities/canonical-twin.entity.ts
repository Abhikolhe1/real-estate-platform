import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
} from "typeorm";
import type { CanonicalTwinV1 } from "@aether/twin-schema";

abstract class ScopedRecord {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") tenantId!: string;
  @Column("uuid") projectId!: string;
  @Column("uuid") floorplanId!: string;
  @Column("uuid") createdBy!: string;
  @CreateDateColumn({ type: "timestamptz" }) createdAt!: Date;
}

@Entity("twin_source_assets")
@Index(["tenantId", "projectId", "floorplanId"])
export class TwinSourceAsset extends ScopedRecord {
  @Column("varchar", { length: 64 }) sha256!: string;
  @Column("varchar", { length: 255 }) filename!: string;
  @Column("integer") byteLength!: number;
  @Column("bytea", { select: false }) bytes!: Buffer;
}

@Entity("twin_revisions")
@Index(["tenantId", "projectId", "floorplanId"])
export class TwinRevision extends ScopedRecord {
  @Column("uuid") sourceAssetId!: string;
  @Column("varchar", { length: 64 }) sourceSha256!: string;
  @Column("varchar") algorithmVersion!: string;
  @Column("uuid", { nullable: true }) baseRevisionId!: string | null;
  @Column("varchar") state!: "draft" | "review_required" | "approved";
  @Column("jsonb") canonical!: CanonicalTwinV1;
  @Column("varchar", { length: 64 }) canonicalSha256!: string;
  @Column("jsonb", { default: [] }) corrections!: {
    actor: string;
    at: string;
    baseRevisionId: string;
    command: any;
    before: any;
    after: any;
  }[];
  @Column("uuid", { nullable: true }) reviewedBy!: string | null;
  @Column("timestamptz", { nullable: true }) reviewedAt!: Date | null;
  @Column("jsonb") issueSummary!: Record<string, number>;
}

@Entity("twin_reconstruction_jobs")
@Index(["stage", "createdAt"])
export class TwinReconstructionJob extends ScopedRecord {
  @Column("uuid") sourceAssetId!: string;
  @Column("uuid", { nullable: true }) baseRevisionId!: string | null;
  @Column("uuid", { nullable: true }) resultRevisionId!: string | null;
  @Column("varchar", { default: "queued" }) stage!: string;
  @Column("integer", { default: 1 }) version!: number;
  @Column("jsonb", { default: {} }) config!: Record<string, unknown>;
  @Column("jsonb", { nullable: true }) failure!: {
    code: string;
    message: string;
  } | null;
  @Column("jsonb", { nullable: true }) timings!: Record<string, number> | null;
  @Column("jsonb", { default: {} }) issueCounts!: Record<string, number>;
  @Column("timestamptz", { nullable: true }) startedAt!: Date | null;
  @Column("timestamptz", { nullable: true }) finishedAt!: Date | null;
}
