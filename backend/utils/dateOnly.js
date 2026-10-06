export function previousCalendarDate(dateOnly) {
  const normalized = String(dateOnly || '').slice(0, 10);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new RangeError('A valid YYYY-MM-DD date is required.');

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.toISOString().slice(0, 10) !== normalized) {
    throw new RangeError('A valid YYYY-MM-DD date is required.');
  }

  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
