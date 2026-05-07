import type { Db, Document } from "mongodb";

export type ApiResult = {
  success?: boolean;
  false?: boolean;
  message?: unknown;
  payload?: unknown;
  user?: unknown;
};

export type RequestBody = Record<string, any>;

export type RouteWithBody = (db: Db, body: RequestBody) => Promise<ApiResult>;
export type RouteWithoutBody = (db: Db) => Promise<ApiResult>;

export type MongoDoc = Document & Record<string, any>;
