import type { Db } from "mongodb";
import type { ApiResult } from "./types";

export async function getMedList(db: Db): Promise<ApiResult> {
  const list = await db.collection("history").distinct("visits.medicines.name");
  return { success: true, payload: list };
}

export async function getTagList(db: Db): Promise<ApiResult> {
  const readings = [
    "मधुमेह",
    "रक्तचाप",
    "लक्षण/चिन्ह",
    "प्रयोगशाला संबंधी",
    "पूर्व निदान",
    "उपद्रव",
    "Weight"
  ];
  const returnData: Record<string, unknown> = {};
  returnData.tags = await db.collection("history").distinct("visits.profile.tags");

  for (const reading of readings) {
    returnData[reading] = await db.collection("history").distinct(`visits.profile.readings.${reading}`);
  }

  return { success: true, payload: returnData };
}
