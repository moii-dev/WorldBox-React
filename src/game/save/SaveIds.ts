/** Advance a generator past IDs restored from a previous browser session. */
export function nextIdAfter(ids: Iterable<string>, prefix: string, next = 1): number {
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const suffix = id.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) continue;
    const value = Number(suffix);
    if (Number.isSafeInteger(value)) next = Math.max(next, value + 1);
  }
  return next;
}
