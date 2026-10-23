/**
 * Gộp ba bên (base = bản mình đã tải/lưu gần nhất, mine = bản mình đang sửa, theirs = bản mới nhất trên máy chủ).
 * - Phần chỉ một bên sửa: lấy bản đã sửa (kể cả xóa).
 * - Danh sách mà mọi phần tử đều có `id`: gộp theo từng phần tử, nên hai người sửa hai thẻ khác nhau không xung đột.
 * - Hai bên cùng sửa một giá trị khác nhau: giữ bản trên máy chủ và ghi nhận xung đột.
 */

const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((o, k) => {
          o[k] = (val as Record<string, unknown>)[k];
          return o;
        }, {});
    }
    return val;
  });

const same = (a: unknown, b: unknown) => (a === undefined || b === undefined ? a === b : stable(a) === stable(b));
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const idList = (v: unknown): v is Array<Record<string, unknown>> => Array.isArray(v) && v.every(x => isObj(x) && typeof x.id === 'string' && x.id !== '');

export interface MergeResult<T> {
  value: T;
  conflicts: string[];
}

export function threeWayMerge<T>(base: T | undefined, mine: T, theirs: T): MergeResult<T> {
  const conflicts: string[] = [];
  const walk = (b: unknown, m: unknown, t: unknown, path: string): unknown => {
    if (same(m, b)) return t;
    if (same(t, b)) return m;
    if (same(m, t)) return m;
    if (isObj(m) && isObj(t)) {
      const bo = isObj(b) ? b : {};
      const out: Record<string, unknown> = {};
      const keys = Array.from(new Set([...Object.keys(t), ...Object.keys(m)]));
      for (const k of keys) {
        const v = walk(bo[k], m[k], t[k], path ? `${path}.${k}` : k);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    if (idList(m) && idList(t) && (b === undefined || idList(b))) {
      const bList = (b as Array<Record<string, unknown>> | undefined) || [];
      const byId = (list: Array<Record<string, unknown>>) => new Map(list.map(x => [x.id as string, x]));
      const bm = byId(bList);
      const mm = byId(m);
      const tm = byId(t);
      const order = [...t.map(x => x.id as string), ...m.map(x => x.id as string).filter(id => !tm.has(id))];
      const out: Array<Record<string, unknown>> = [];
      for (const id of order) {
        const v = walk(bm.get(id), mm.get(id), tm.get(id), `${path}[${id}]`);
        if (v !== undefined) out.push(v as Record<string, unknown>);
      }
      return out;
    }
    conflicts.push(path || '(gốc)');
    return t;
  };
  return { value: walk(base, mine, theirs, '') as T, conflicts };
}
