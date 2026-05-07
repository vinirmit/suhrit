import type { Db } from "mongodb";
import type { ApiResult } from "./types";

export async function getDetails(db: Db, username: string): Promise<ApiResult> {
  const item = await db
    .collection("users")
    .findOne({ username }, { projection: { username: 0, tenantId: 0 } });

  if (item) {
    const { _id, ...user } = item;
    void _id;
    return { success: true, user };
  }

  return { success: false };
}
