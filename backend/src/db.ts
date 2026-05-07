import { Db, MongoClient } from "mongodb";

let client: MongoClient | undefined;
let db: Db | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function getDb(): Promise<Db> {
  if (db) {
    return db;
  }

  const dbUrl = requireEnv("instance")
    .replace("<password>", requireEnv("key"))
    .replace("<user>", requireEnv("user"));

  client = new MongoClient(dbUrl);
  await client.connect();
  db = client.db(requireEnv("DB_NAME"));

  return db;
}
