export function formatDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return "";
}

export function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function todayString(): string {
  return formatDate(new Date());
}

export function calculateAge(value: unknown): number {
  const born = value instanceof Date ? value : parseDate(String(value));
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
