export function formatDateKey(value: string, locale: string, format: string): string {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return value;
  if (format === "mdy") return `${monthText}/${dayText}/${yearText}`;
  if (format === "dmy") return `${dayText}/${monthText}/${yearText}`;
  if (format === "ymd") return `${yearText}-${monthText}-${dayText}`;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

export function formatTime(value: string, locale: string, format: "12h" | "24h"): string {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: format === "12h",
  }).format(new Date(2020, 0, 1, hour, minute));
}
