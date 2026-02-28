export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function lastNDates(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    result.push(date.toISOString().slice(0, 10));
  }
  return result;
}
