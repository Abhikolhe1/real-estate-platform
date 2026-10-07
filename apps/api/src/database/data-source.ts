import "dotenv/config";
import { DataSource } from "typeorm";
import { databaseOptions } from "./options";
export default new DataSource(databaseOptions);
