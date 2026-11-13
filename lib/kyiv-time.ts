const KYIV_TIME_ZONE = "Europe/Kyiv";
const DAY_MS = 24 * 60 * 60 * 1000;
const SEND_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KYIV_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

type KyivParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function kyivParts(instant: Date): KyivParts {
  const values: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

/** Kyiv UTC offset in milliseconds at the given instant. */
function kyivOffsetMs(instantMs: number): number {
  const p = kyivParts(new Date(instantMs));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/** Converts a Kyiv wall-clock time to a UTC instant. Times inside the DST gap shift forward. */
function kyivLocalToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = localAsUtc - kyivOffsetMs(localAsUtc);
  guess = localAsUtc - kyivOffsetMs(guess);
  return new Date(guess);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function isValidSendTime(value: unknown): value is string {
  return typeof value === "string" && SEND_TIME_PATTERN.test(value);
}

export function kyivDateKey(instant: Date): string {
  const p = kyivParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function formatKyivTime(instant: Date): string {
  const p = kyivParts(instant);
  return `${pad(p.day)}.${pad(p.month)} ${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Earliest Kyiv occurrence of `sendTime` that is strictly after `now`
 * and falls on a Kyiv date later than the date of `lastRunFor` (if given).
 */
export function computeNextRunAt(sendTime: string, now: Date, lastRunFor?: Date | null): Date {
  if (!isValidSendTime(sendTime)) {
    throw new Error(`Invalid send time: ${sendTime}`);
  }
  const [hour, minute] = sendTime.split(":").map(Number);
  const excludedDate = lastRunFor ? kyivDateKey(lastRunFor) : null;
  const today = kyivParts(now);
  const todayUtcMidnight = Date.UTC(today.year, today.month - 1, today.day);

  for (let offsetDays = 0; offsetDays <= 3; offsetDays += 1) {
    const day = new Date(todayUtcMidnight + offsetDays * DAY_MS);
    const candidate = kyivLocalToUtc(
      day.getUTCFullYear(),
      day.getUTCMonth() + 1,
      day.getUTCDate(),
      hour,
      minute,
    );
    if (candidate.getTime() <= now.getTime()) continue;
    if (excludedDate && kyivDateKey(candidate) <= excludedDate) continue;
    return candidate;
  }

  throw new Error("Unable to compute next run time");
}
