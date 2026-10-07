import { MigrationInterface, QueryRunner } from "typeorm";

export class CanonicalTwins1791324000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    const scope = `"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" uuid NOT NULL,
      "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
      "floorplanId" uuid NOT NULL REFERENCES floorplans(id) ON DELETE RESTRICT,
      "createdBy" uuid NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now()`;
    await q.query(`CREATE TABLE twin_source_assets (${scope}, "sha256" varchar(64) NOT NULL,
      "filename" varchar(255) NOT NULL, "byteLength" integer NOT NULL CHECK ("byteLength" BETWEEN 1 AND 10485760), "bytes" bytea NOT NULL)`);
    await q.query(`CREATE TABLE twin_revisions (${scope}, "sourceAssetId" uuid NOT NULL REFERENCES twin_source_assets(id),
      "sourceSha256" varchar(64) NOT NULL, "algorithmVersion" varchar NOT NULL,
      "baseRevisionId" uuid REFERENCES twin_revisions(id), "state" varchar NOT NULL CHECK (state IN ('draft','review_required','approved')),
      "canonical" jsonb NOT NULL, "canonicalSha256" varchar(64) NOT NULL, "corrections" jsonb NOT NULL DEFAULT '[]',
      "reviewedBy" uuid, "reviewedAt" timestamptz, "issueSummary" jsonb NOT NULL)`);
    await q.query(`CREATE TABLE twin_reconstruction_jobs (${scope}, "sourceAssetId" uuid NOT NULL REFERENCES twin_source_assets(id),
      "baseRevisionId" uuid REFERENCES twin_revisions(id), "resultRevisionId" uuid REFERENCES twin_revisions(id),
      stage varchar NOT NULL DEFAULT 'queued', version integer NOT NULL DEFAULT 1, config jsonb NOT NULL DEFAULT '{}',
      failure jsonb, timings jsonb, "issueCounts" jsonb NOT NULL DEFAULT '{}', "startedAt" timestamptz, "finishedAt" timestamptz)`);
    await q.query(`ALTER TABLE floorplans ADD COLUMN "canonicalSourceAssetId" uuid REFERENCES twin_source_assets(id),
      ADD COLUMN "canonicalDraftRevisionId" uuid REFERENCES twin_revisions(id),
      ADD COLUMN "approvedCanonicalRevisionId" uuid REFERENCES twin_revisions(id)`);
    for (const table of [
      "twin_source_assets",
      "twin_revisions",
      "twin_reconstruction_jobs",
    ]) {
      await q.query(
        `CREATE INDEX ${table}_scope ON ${table} ("tenantId", "projectId", "floorplanId")`,
      );
    }
    await q.query(
      `CREATE INDEX twin_jobs_queue ON twin_reconstruction_jobs(stage, "createdAt")`,
    );
    await q.query(
      `CREATE UNIQUE INDEX projects_twin_scope ON projects ("tenantId",id)`,
    );
    await q.query(
      `CREATE UNIQUE INDEX floorplans_twin_scope ON floorplans ("tenantId","projectId",id)`,
    );
    for (const table of ["twin_source_assets", "twin_revisions"]) {
      await q.query(
        `CREATE UNIQUE INDEX ${table}_scoped_id ON ${table} ("tenantId","projectId","floorplanId",id)`,
      );
    }
    for (const table of [
      "twin_source_assets",
      "twin_revisions",
      "twin_reconstruction_jobs",
    ]) {
      await q.query(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_project_scope FOREIGN KEY ("tenantId","projectId") REFERENCES projects("tenantId",id),
        ADD CONSTRAINT ${table}_floorplan_scope FOREIGN KEY ("tenantId","projectId","floorplanId") REFERENCES floorplans("tenantId","projectId",id)`);
    }
    for (const table of ["twin_revisions", "twin_reconstruction_jobs"]) {
      await q.query(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_asset_scope FOREIGN KEY ("tenantId","projectId","floorplanId","sourceAssetId") REFERENCES twin_source_assets("tenantId","projectId","floorplanId",id),
        ADD CONSTRAINT ${table}_base_scope FOREIGN KEY ("tenantId","projectId","floorplanId","baseRevisionId") REFERENCES twin_revisions("tenantId","projectId","floorplanId",id)`);
    }
    for (const column of [
      "canonicalDraftRevisionId",
      "approvedCanonicalRevisionId",
    ]) {
      await q.query(
        `ALTER TABLE floorplans ADD CONSTRAINT floorplans_${column}_scope FOREIGN KEY ("tenantId","projectId",id,"${column}") REFERENCES twin_revisions("tenantId","projectId","floorplanId",id)`,
      );
    }
    await q.query(
      `ALTER TABLE floorplans ADD CONSTRAINT floorplans_source_scope FOREIGN KEY ("tenantId","projectId",id,"canonicalSourceAssetId") REFERENCES twin_source_assets("tenantId","projectId","floorplanId",id)`,
    );
    await q.query(`ALTER TABLE twin_revisions ADD CONSTRAINT twin_revision_identity CHECK (
      canonical->>'schemaVersion'='aether-twin/1' AND canonical->'revision'->>'id'=id::text AND canonical->'revision'->>'state'=state
      AND canonical->'source'->>'assetId'="sourceAssetId"::text AND canonical->'source'->>'sha256'="sourceSha256")`);
    await q.query(`CREATE FUNCTION twin_approved_pointer() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW."approvedCanonicalRevisionId" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM twin_revisions WHERE id=NEW."approvedCanonicalRevisionId" AND state='approved'
        AND "tenantId"=NEW."tenantId" AND "projectId"=NEW."projectId" AND "floorplanId"=NEW.id)
        THEN RAISE EXCEPTION 'Approved pointer requires an approved revision in the same scope'; END IF; RETURN NEW; END $$`);
    await q.query(
      `CREATE TRIGGER canonical_approved_pointer BEFORE INSERT OR UPDATE ON floorplans FOR EACH ROW EXECUTE FUNCTION twin_approved_pointer()`,
    );
    await q.query(`CREATE FUNCTION twin_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Canonical source assets and revisions are immutable'; END $$`);
    for (const table of ["twin_source_assets", "twin_revisions"]) {
      await q.query(
        `CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION twin_immutable()`,
      );
    }
  }
  async down(q: QueryRunner) {
    await q.query("DROP TRIGGER canonical_approved_pointer ON floorplans");
    await q.query("DROP FUNCTION twin_approved_pointer()");
    await q.query(
      `ALTER TABLE floorplans DROP COLUMN "approvedCanonicalRevisionId", DROP COLUMN "canonicalDraftRevisionId", DROP COLUMN "canonicalSourceAssetId"`,
    );
    await q.query(
      "DROP TABLE twin_reconstruction_jobs, twin_revisions, twin_source_assets",
    );
    await q.query("DROP FUNCTION twin_immutable()");
    await q.query("DROP INDEX floorplans_twin_scope, projects_twin_scope");
  }
}
