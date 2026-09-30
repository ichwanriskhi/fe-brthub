/**
 * Safe-cast value to a plain record, or `{}` for null/primitives/arrays.
 * Used when reading loosely-typed API payloads field-by-field.
 */
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
