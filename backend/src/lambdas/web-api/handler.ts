import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { getDb } from "../../common/db";
import {
  editPatient,
  patientHistory,
  patientLastVisit,
  registerPatient,
  searchPatient
} from "./patient";
import { getReport } from "./report";
import type { ApiResult, RequestBody, RouteWithBody, RouteWithoutBody } from "../../common/types";
import { getMedList, getTagList } from "./util";
import { getDetails } from "./user";
import { addToQueue, getQueue, processVisit, updateVisit } from "./visit";

const cachedUsers = new Map<string, unknown>();

const routesWithBody: Record<string, RouteWithBody> = {
  "/patient/search": searchPatient,
  "/patient/edit": editPatient,
  "/patient/history": patientHistory,
  "/patient/lastvisit": patientLastVisit,
  "/patient/register": registerPatient,
  "/visit/add": addToQueue,
  "/visit/update": updateVisit,
  "/visit/process": processVisit,
  "/report/range": getReport
};

const routesWithoutBody: Record<string, RouteWithoutBody> = {
  "/visit/queue": getQueue,
  "/util/medlist": getMedList,
  "/util/taglist": getTagList
};

export async function lambdaHandler(
  event: APIGatewayProxyEventV2 & Record<string, any>
): Promise<APIGatewayProxyResult> {
  const db = await getDb();
  let requestBody: RequestBody = {};
  let statusCode = 200;

  const token = decodeJwt(getAuthorizationToken(event));
  const username = token.username;

  if (!cachedUsers.has(username)) {
    const userDetails = await getDetails(db, username);
    if (userDetails.success) {
      cachedUsers.set(username, userDetails.user);
    } else {
      return jsonResponse(200, { success: false, message: "User not found" });
    }
  }

  const user = cachedUsers.get(username);
  console.log("user: ", user);

  const path = getPath(event).replace("/default", "");

  if (path === "/user/details") {
    return jsonResponse(200, { success: true, user });
  }

  if (event.body) {
    let rawBody = event.body;

    if (event.isBase64Encoded) {
      rawBody = Buffer.from(rawBody, "base64").toString("utf8");
    }

    try {
      requestBody = JSON.parse(rawBody);
      console.log(requestBody);
    } catch {
      statusCode = 400;
      requestBody = {};
    }
  }

  if (statusCode === 400) {
    return jsonResponse(statusCode, { error: "Invalid JSON format in request body" });
  }

  console.log("Received body:", JSON.stringify(requestBody, null, 2));

  const routeWithBody = routesWithBody[path];
  if (routeWithBody) {
    const result = await routeWithBody(db, requestBody);
    console.log(result);
    return jsonResponse(200, result);
  }

  const routeWithoutBody = routesWithoutBody[path];
  if (routeWithoutBody) {
    const result = await routeWithoutBody(db);
    return jsonResponse(200, result);
  }

  return jsonResponse(200, { success: false, message: "Function not found" });
}

function getAuthorizationToken(event: APIGatewayProxyEventV2 & Record<string, any>): string {
  const headers = event.headers ?? {};
  const authorization = headers.authorization ?? headers.Authorization;
  if (!authorization) {
    throw new Error("Missing Authorization header");
  }

  return authorization.split(" ")[1];
}

function getPath(event: APIGatewayProxyEventV2 & Record<string, any>): string {
  return event.path ?? event.rawPath ?? event.requestContext?.http?.path ?? "";
}

function decodeJwt(token: string): Record<string, any> {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }

  const payloadEncoded = parts[1];
  const padding = "=".repeat((4 - (payloadEncoded.length % 4)) % 4);
  return JSON.parse(Buffer.from(payloadEncoded + padding, "base64url").toString("utf8"));
}

function jsonResponse(statusCode: number, result: ApiResult | Record<string, unknown>): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(result)
  };
}
