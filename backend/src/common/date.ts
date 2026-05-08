const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatDateTime(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = parseDateTime(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  return "";
}

export function parseDateTime(value: string): Date {
  if (DATE_ONLY_PATTERN.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return new Date(value);
}

export function todayString(): string {
  return formatDateTime(new Date());
}

export function calculateAge(value: unknown): number {
  const born = value instanceof Date ? value : parseDateTime(String(value));
  const today = new Date();
  let age = today.getUTCFullYear() - born.getUTCFullYear();

  const hasBirthdayPassed =
    today.getUTCMonth() > born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() >= born.getUTCDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age;
}

export function isSingleDayRange(startDate: Date, endDate: Date): boolean {
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  return endDate.getTime() >= startDate.getTime() && endDate.getTime() - startDate.getTime() <= millisecondsInDay;
}
