import type { Db } from "mongodb";
import { calculateAge, formatDateTime, parseDateTime, todayString } from "../../common/date";
import { getNextId } from "../../common/mongo";
import type { ApiResult, MongoDoc, RequestBody } from "../../common/types";

export async function searchPatient(db: Db, body: RequestBody): Promise<ApiResult> {
  const criteria: MongoDoc = {};

  if ("patientId" in body) {
    criteria.patientId = body.patientId;
  }
  if ("mobile" in body) {
    criteria.mobile = body.mobile;
  }
  if ("name" in body) {
    criteria.$or = [
      { firstName: { $regex: body.name, $options: "i" } },
      { lastName: { $regex: body.name, $options: "i" } }
    ];
  }

  const items = await db.collection("patients").find(criteria, { projection: { _id: 0 } }).toArray();

  for (const item of items) {
    item.age = calculateAge(item.dateofbirth);
    item.dateofbirth = formatDateTime(item.dateofbirth);
  }

  if (items.length > 0) {
    return { success: true, payload: items };
  }

  return { success: false, message: "Patient Not Found" };
}

export async function registerPatient(db: Db, body: RequestBody): Promise<ApiResult> {
  const patient = { ...body.patient };
  const payment = body.payment;

  if (!patient.dateofbirth) {
    return { success: false, message: "Date of Birth is required" };
  }

  patient.dateofbirth = parseDateTime(patient.dateofbirth);

  try {
    patient.patientId = await getNextId(db, "patient");
    const insertResult = await db.collection("patients").insertOne(patient);

    if (payment === 0) {
      return { success: true, message: "Patient Registered" };
    }

    const queuePatient = { ...patient };
    delete queuePatient._id;
    delete queuePatient.dateofbirth;
    queuePatient.age = calculateAge(patient.dateofbirth);

    const queueData = {
      visitId: await getNextId(db, "visit"),
      visitDate: todayString(),
      type: "visit",
      opdPayment: 150,
      patient: queuePatient
    };

    await db.collection("wip").insertOne(queueData);
    void insertResult;
    return { success: true, message: "Patient Registered" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Patient Not Registered" };
  }
}

export async function editPatient(db: Db, body: RequestBody): Promise<ApiResult> {
  if (!body.patient?.dateofbirth) {
    return { success: false, message: "Date of Birth is required" };
  }

  const patient = { ...body.patient, dateofbirth: parseDateTime(body.patient.dateofbirth) };

  try {
    await db.collection("patients").findOneAndReplace({ patientId: patient.patientId }, patient);
    return { success: true, message: "Patient Saved" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Patient Not Saved" };
  }
}

export async function patientLastVisit(db: Db, body: RequestBody): Promise<ApiResult> {
  try {
    const item = await db.collection("history").findOne({ patientId: body.patientId });

    if (!item) {
      return { success: false, message: "No Previous Visits found" };
    }

    if (item.visits.length === 0) {
      return { success: false, message: "No Previous OPD Visits found" };
    }

    const payload = { ...item.visits[0] };
    const patient = await db
      .collection("patients")
      .findOne({ patientId: body.patientId }, { projection: { _id: 0, dateofbirth: 0 } });

    payload.patient = patient;
    payload.visitDate = formatDateTime(payload.visitDate);
    return { success: true, payload };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function patientHistory(db: Db, body: RequestBody): Promise<ApiResult> {
  try {
    const item = await db.collection("history").findOne({ patientId: body.patientId });

    if (item) {
      delete (item as Record<string, unknown>)._id;

      for (const visit of item.visits) {
        visit.visitDate = formatDateTime(visit.visitDate);
      }
      for (const visit of item.kvisits) {
        visit.visitDate = formatDateTime(visit.visitDate);
      }

      return { success: true, payload: item };
    }

    return { success: true, payload: { visits: [], kvisits: [] } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
}
