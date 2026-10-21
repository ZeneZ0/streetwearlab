import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";
import { CREATE_TABLES_SQL } from "./init";

const here = path.dirname(fileURLToPath(import.meta.url));
// Файл базы данных хранится в корне репозитория: streetwearlab.db
const dbFile = process.env.DB_FILE ?? path.resolve(here, "../../../streetwearlab.db");

export const client = createClient({ url: `file:${dbFile}` });
export const db = drizzle(client, { schema });

export async function initDb(): Promise<void> {
  await client.executeMultiple(CREATE_TABLES_SQL);
}

export * from "./schema";
