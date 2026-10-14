import type { ThreadResponse } from './types';

// Keep only a contiguous history. If many messages arrived while offline,
// restart at the newest page so "older" can fill the gap without skipping it.
export function mergeLatest(previous: ThreadResponse | null, latest: ThreadResponse): ThreadResponse {
  if (!previous || previous.thread.key !== latest.thread.key) return latest;
  if (previous.thread.revision > latest.thread.revision) return previous;
  const overlaps = latest.thread.entries.some(entry => previous.thread.entries.some(old => old.clientId === entry.clientId));
  if (!overlaps) return latest;
  return { ...latest, hasMore: previous.hasMore, thread: { ...latest.thread, entries: [...new Map([...previous.thread.entries, ...latest.thread.entries].map(e => [e.clientId, e])).values()] } };
}
