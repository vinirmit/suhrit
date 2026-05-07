import type { Db } from "mongodb";
import { parseDate } from "./date";
import type { ApiResult, RequestBody } from "./types";

export async function getReport(db: Db, body: RequestBody): Promise<ApiResult> {
  const startDate = parseDate(body.start_date);
  const endDate = parseDate(body.end_date);

  const pipeline = [
    {
      $project: {
        _id: 0,
        patientId: 1,
        matchedVisits: {
          $filter: {
            input: "$visits",
            as: "item",
            cond: {
              $and: [
                { $gte: ["$$item.visitDate", startDate] },
                { $lte: ["$$item.visitDate", endDate] }
              ]
            }
          }
        },
        matchedKVisits: {
          $filter: {
            input: "$kvisits",
            as: "item",
            cond: {
              $and: [
                { $gte: ["$$item.visitDate", startDate] },
                { $lte: ["$$item.visitDate", endDate] }
              ]
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalOpdPayments: { $sum: "$matchedVisits.opdPayment" },
        totalKarmaPayments: { $sum: "$matchedKVisits.payment" },
        totalVisits: { $size: "$matchedVisits" },
        totalKVisits: { $size: "$matchedKVisits" },
        visitsList: {
          $map: {
            input: "$matchedVisits",
            as: "visit",
            in: {
              patientId: "$patientId",
              opdPayment: "$$visit.opdPayment"
            }
          }
        },
        kvisitsList: {
          $map: {
            input: "$matchedKVisits",
            as: "kvisit",
            in: {
              patientId: "$patientId",
              payment: "$$kvisit.payment",
              karms: "$$kvisit.karms"
            }
          }
        }
      }
    }
  ];

  const totalSums = {
    totalOpdPayments: 0,
    totalKarmaPayments: 0,
    totalVisits: 0,
    totalKVisits: 0,
    visitsList: [] as Record<string, unknown>[],
    kvisitsList: [] as Record<string, unknown>[]
  };

  const entries = await db.collection("history").aggregate(pipeline).toArray();

  for (const entry of entries) {
    totalSums.totalOpdPayments += entry.totalOpdPayments;
    totalSums.totalKarmaPayments += entry.totalKarmaPayments;
    totalSums.totalVisits += entry.totalVisits;
    totalSums.totalKVisits += entry.totalKVisits;

    if (body.start_date === body.end_date) {
      totalSums.visitsList.push(...entry.visitsList);
      totalSums.kvisitsList.push(...entry.kvisitsList);
    }
  }

  if (body.start_date === body.end_date) {
    for (const item of totalSums.visitsList) {
      const patientDetails = await db.collection("patients").findOne(
        { patientId: item.patientId },
        { projection: { _id: 0, firstName: 1, lastName: 1 } }
      );
      item.firstName = patientDetails?.firstName;
      item.lastName = patientDetails?.lastName;
    }

    for (const item of totalSums.kvisitsList) {
      const patientDetails = await db.collection("patients").findOne(
        { patientId: item.patientId },
        { projection: { _id: 0, firstName: 1, lastName: 1 } }
      );
      item.firstName = patientDetails?.firstName;
      item.lastName = patientDetails?.lastName;
    }
  }

  console.log(totalSums);
  return { success: true, payload: totalSums };
}
