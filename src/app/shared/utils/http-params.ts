import { HttpParams } from '@angular/common/http';

/**
 * Optional per-key serializer. Returns `undefined` to skip the parameter
 * entirely (useful when the same input could mean "do not send" vs "send
 * an empty value").
 */
export type ParamSerializer = (value: unknown) => string | undefined;

const identitySerializer: ParamSerializer = (value) =>
  value === null || value === undefined ? undefined : String(value);

/**
 * Build an `HttpParams` instance from a raw object, with optional per-key
 * serialization.
 *
 * The reading-routes service repeats the same six-line `if (params?.x)
 * httpParams = httpParams.set('x', String(params.x))` block four times
 * (~20 occurrences in total). This helper makes a service method a
 * one-liner:
 *
 * ```ts
 * return this.http.get(url, { params: buildHttpParams(filters) });
 * ```
 *
 * Rules:
 *   - `null` and `undefined` values are skipped (matches the original
 *     explicit `if (params?.x)` guards).
 *   - Default serialization is `String(value)`. Override per key via
 *     `serializers` when the value needs a custom transformation
 *     (dates, enums, comma-joined lists, etc.).
 *   - The returned `HttpParams` is a fresh instance — call sites can
 *     `.set()` on it without affecting other calls.
 */
export function buildHttpParams(
  raw: object | null | undefined,
  serializers?: Record<string, ParamSerializer>,
): HttpParams {
  let params = new HttpParams();
  if (!raw) return params;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const serializer = serializers?.[key] ?? identitySerializer;
    const wire = serializer(value);
    if (wire === undefined) continue;
    params = params.set(key, wire);
  }
  return params;
}
