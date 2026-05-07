import { z } from 'zod';

import { http } from './http';
import { readLocalJson, writeLocalJson } from './storage';

const stringListResponseSchema = z.object({
  payload: z.array(z.string().nullable()),
});

const tagOptionsSchema = z.record(z.array(z.string()));

const tagListResponseSchema = z.union([
  tagOptionsSchema,
  z.object({
    payload: tagOptionsSchema,
  }),
  z.object({
    success: z.boolean().optional(),
    payload: tagOptionsSchema,
  }),
]);

const helperCacheSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    updatedAt: z.number(),
    data: dataSchema,
  });

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MEDICINE_CACHE_KEY = 'helper-cache:medicines';
const TAG_CACHE_KEY = 'helper-cache:tags';

type TagOptions = Record<string, string[]>;

function hasUsableTagOptions(options: TagOptions): boolean {
  const keys = Object.keys(options);

  if (keys.length === 0) {
    return false;
  }

  if (keys.length === 1 && keys[0] === 'tags') {
    return false;
  }

  return keys.some((key) => (options[key] ?? []).length > 0);
}

function extractTagOptions(response: unknown): TagOptions {
  const wrapped = z
    .object({
      payload: tagOptionsSchema,
    })
    .safeParse(response);

  if (wrapped.success) {
    return wrapped.data.payload;
  }

  const successWrapped = z
    .object({
      success: z.boolean().optional(),
      payload: tagOptionsSchema,
    })
    .safeParse(response);

  if (successWrapped.success) {
    return successWrapped.data.payload;
  }

  return tagOptionsSchema.parse(response);
}

function readFreshCache<T>(
  key: string,
  schema: z.ZodType<T>,
): T | null {
  const cached = readLocalJson<unknown>(key);
  const parsed = helperCacheSchema(schema).safeParse(cached);

  if (!parsed.success) {
    return null;
  }

  if (Date.now() - parsed.data.updatedAt > DAY_IN_MS) {
    return null;
  }

  return parsed.data.data ?? null;
}

function writeCache<T>(key: string, data: T): void {
  writeLocalJson(key, {
    updatedAt: Date.now(),
    data,
  });
}

function normalizeStringList(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

export function mergeTagOptions(current: TagOptions, incoming: TagOptions): TagOptions {
  const keys = new Set([...Object.keys(current), ...Object.keys(incoming)]);
  const merged: TagOptions = {};

  keys.forEach((key) => {
    merged[key] = normalizeStringList([...(current[key] ?? []), ...(incoming[key] ?? [])]);
  });

  return merged;
}

export function updateCachedTags(newTags: string[]): TagOptions {
  const cached = readLocalJson<unknown>(TAG_CACHE_KEY);
  const parsed = helperCacheSchema(tagOptionsSchema).safeParse(cached);
  const base = parsed.success ? parsed.data.data : { tags: [] };
  const merged = mergeTagOptions(base, { tags: newTags });
  writeCache(TAG_CACHE_KEY, merged);
  return merged;
}

export async function fetchMedicineList(): Promise<string[]> {
  const cached = readFreshCache(MEDICINE_CACHE_KEY, z.array(z.string()));
  if (cached) {
    return cached;
  }

  const response = await http.get<z.infer<typeof stringListResponseSchema>>(
    '/util/medlist',
  );
  const medicines = stringListResponseSchema
    .parse(response)
    .payload.filter((item): item is string => typeof item === 'string');
  const normalized = normalizeStringList(medicines);
  writeCache(MEDICINE_CACHE_KEY, normalized);
  return normalized;
}

export async function fetchTagOptions(): Promise<TagOptions> {
  const cached = readFreshCache(TAG_CACHE_KEY, tagOptionsSchema);
  if (cached && hasUsableTagOptions(cached)) {
    return cached;
  }

  const response = await http.get<z.infer<typeof tagListResponseSchema>>('/util/taglist');
  const parsed = extractTagOptions(response);
  const normalized = Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, normalizeStringList(value)]),
  );
  writeCache(TAG_CACHE_KEY, normalized);
  return normalized;
}
