const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateLike(value: string): Date {
  if (DATE_ONLY_PATTERN.test(value)) {
    return new Date(`${value}T00:00:00`);
  }

  return new Date(value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateTimeInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = parseDateLike(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toApiDateTime(value: string): string {
  const date = parseDateLike(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}

export function nowDateTimeInput(): string {
  return formatDateTimeInput(new Date().toISOString());
}

export function startOfTodayDateTimeInput(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return formatDateTimeInput(date.toISOString());
}

export function endOfTodayDateTimeInput(): string {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return formatDateTimeInput(date.toISOString());
}

export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = parseDateLike(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDisplayDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = parseDateLike(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
