import "./environment";
import type { DataSourceOptions } from "typeorm";
import { databaseEntities } from "./entities";
import { CanonicalTwins1791324000000 } from "../migrations/1791324000000-CanonicalTwins";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL must be configured");
const schema = process.env.DB_SCHEMA || "public";
if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) throw new Error("Invalid DB_SCHEMA");
export const databaseOptions: DataSourceOptions = {
  type: "postgres",
  url,
  schema,
  entities: databaseEntities,
  migrations: [CanonicalTwins1791324000000],
  synchronize: false,
  logging: false,
  connectTimeoutMS: 10000,
  extra: {
    max: 10,
    connectionTimeoutMillis: 10000,
    options: `-c search_path=${schema},public`,
  },
};
