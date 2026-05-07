import type { Db } from "mongodb";

export async function getNextId(db: Db, idType: string): Promise<number> {
  const item = await db.collection("counts").findOne({ type: idType });
  if (!item) {
    throw new Error(`Counter not found for type: ${idType}`);
  }

  const lastNumber = Number(item.lastNumber) + 1;
  await db.collection("counts").findOneAndReplace({ _id: item._id }, { ...item, lastNumber });
  return lastNumber;
}
