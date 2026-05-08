import type { Db } from "mongodb";
import { formatDateTime, parseDateTime, todayString } from "../../common/date";
import { getNextId } from "../../common/mongo";
import type { ApiResult, RequestBody } from "../../common/types";

export async function addToQueue(db: Db, body: RequestBody): Promise<ApiResult> {
  console.log("In add_to_queue", body);

  body.visitId = await getNextId(db, body.type);
  body.visitDate = todayString();

  const wip = await db.collection("wip").findOne({
    "patient.patientId": body.patient.patientId,
    type: body.type
  });

  if (wip) {
    return { success: false, message: "Patient Already on the queue" };
  }

  if (body.type === "visit") {
    const history = await db.collection("history").findOne({ patientId: body.patient.patientId });

    if (history) {
      const lastVisit = history.visits[0];
      body.profile = lastVisit.profile;
      body.aasans = lastVisit.aasans;
      body.karms = lastVisit.karms;
      body.medicines = lastVisit.medicines;
      body.pathya = lastVisit.pathya;
      body.apathya = lastVisit.apathya;
      body.lastVisitDate = formatDateTime(lastVisit.visitDate);
    }

    await db.collection("wip").insertOne(body);
  } else {
    await getNextId(db, body.type);
    await db.collection("wip").insertOne(body);
  }

  return { success: true, message: "Patient added to OPD Queue" };
}

export async function getQueue(db: Db): Promise<ApiResult> {
  const returnData = await db.collection("wip").find({}).toArray();

  for (const item of returnData) {
    delete (item as Record<string, unknown>)._id;
  }

  return { success: true, payload: returnData };
}

export async function updateVisit(db: Db, body: RequestBody): Promise<ApiResult> {
  try {
    await db.collection("wip").findOneAndReplace({ visitId: body.visitId }, body);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error Updating Visit" };
  }
}

export async function processVisit(db: Db, body: RequestBody): Promise<ApiResult> {
  try {
    body.visitDate = parseDateTime(body.visitDate);

    if (body.type === "kvisit") {
      const patientId = body.patient.patientId;
      const history = await db.collection("history").findOne({ patientId });
      delete body.state;
      delete body.patient;

      if (history) {
        history.kvisits.unshift(body);
        await db.collection("history").findOneAndReplace({ patientId }, history);
      } else {
        await db.collection("history").insertOne({
          patientId,
          visits: [],
          kvisits: [body]
        });
      }

      await db.collection("wip").deleteOne({ visitId: body.visitId });
    } else {
      const patientId = body.patient.patientId;
      delete body.lastVisitDate;
      delete body.patient;

      const history = await db.collection("history").findOne({ patientId });
      if (history) {
        history.visits.unshift(body);
        await db.collection("history").findOneAndReplace({ patientId }, history);
      } else {
        await db.collection("history").insertOne({
          patientId,
          visits: [body],
          kvisits: []
        });
      }

      await db.collection("wip").deleteOne({ visitId: body.visitId });
    }

    return { success: true };
  } catch (error) {
    console.error("Exception", error);
    return { success: false, message: "Error Updating Visit" };
  }
}
