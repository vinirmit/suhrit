export function removeEmptyObjectValues<T extends Record<string, unknown>>(
  value: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== '' && entry !== null && entry !== undefined,
    ),
  ) as Partial<T>;
}

