/**
 * PostgREST filter sanitizer for user-supplied search input (audit finding C5).
 *
 * `/api/search` interpolates raw query strings into PostgREST filter syntax:
 *
 *   .or(`title.ilike.%${q}%,city.ilike.%${q}%`)
 *   .ilike('first_name', `%${q}%`)
 *
 * PostgREST treats `,` as a condition separator, `()` as grouping, `:` as a
 * foreign-key hint, `!`/`not.` as negation and `%`/`_`/`*` as LIKE wildcards.
 * Interpolating unfiltered input therefore lets a caller rewrite the WHERE
 * clause (e.g. `q=prishtine,price.gt.0` or `q=%` to force a full-table scan).
 *
 * Every value that reaches a filter string MUST pass through
 * `sanitizeSearchTerm()` first. The sanitizer is deliberately destructive:
 * search terms are words, not syntax, so dropping structural characters costs
 * nothing in relevance and removes the injection surface entirely.
 */

/** Longest accepted search term. Bounds query cost and cache-key growth. */
export const MAX_SEARCH_TERM_LENGTH = 80

/** C0/C1 control characters (incl. NUL, newline, ESC) — never valid in a query. */
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g

/**
 * PostgREST structural characters + SQL LIKE wildcards.
 * Kept: letters, digits, spaces, `-`, `.`, `/`, `@`, `#`, `+`, `~`, `ë`, `ç`…
 * (dots are safe: PostgREST splits `column.operator.value` on the first two
 * dots only, so a dot inside the value cannot start a new condition — and
 * commas, which could, are stripped.)
 */
const STRUCTURAL_CHARS_RE = /[,()[\]{}<>=!&|;:*?%_"'`\\]/g

/** Any run of whitespace collapsed to a single space. */
const WHITESPACE_RE = /\s+/g

/**
 * Strips PostgREST/SQL control characters from a search term.
 *
 * Returns a trimmed, whitespace-collapsed, length-capped string that is safe
 * to interpolate into a `.or(...)` / `.ilike(...)` filter, or `''` when nothing
 * usable remains (callers must treat `''` as "no filter" and skip the query).
 */
export function sanitizeSearchTerm(input: unknown, maxLength = MAX_SEARCH_TERM_LENGTH): string {
  if (typeof input !== 'string' || input.length === 0) return ''

  const cleaned = input
    .replace(CONTROL_CHARS_RE, ' ')
    .replace(STRUCTURAL_CHARS_RE, ' ')
    .replace(WHITESPACE_RE, ' ')
    .trim()

  if (!cleaned) return ''
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength).trim() : cleaned
}

/**
 * Digits-only projection of a term, for numeric filters (price, area, phone
 * fragments). Digits cannot carry PostgREST syntax, but the value is still run
 * through the sanitizer so the guarantee does not depend on the regex above.
 */
export function sanitizeDigits(input: unknown, maxLength = 16): string {
  if (typeof input !== 'string') return ''
  return sanitizeSearchTerm(input.replace(/[^0-9]/g, ''), maxLength)
}

/**
 * Builds a PostgREST `.or()` body from column/operator pairs.
 *
 * `conditions` are produced by the caller from *already sanitized* terms; this
 * helper is the single place that emits the `,` separators, so the shape of the
 * filter string stays under our control.
 */
export function buildOrFilter(conditions: readonly string[]): string {
  return conditions.filter((c) => typeof c === 'string' && c.length > 0).join(',')
}

/**
 * Convenience builder for the common "match this term across these columns"
 * case. Sanitizes the term itself, so callers cannot forget.
 *
 * Returns `null` when the term sanitizes to empty — the caller must then skip
 * the query rather than issue an unfiltered (full-table) one.
 */
export function buildIlikeOr(term: unknown, columns: readonly string[]): string | null {
  const safe = sanitizeSearchTerm(term)
  if (!safe || columns.length === 0) return null
  return buildOrFilter(columns.map((column) => `${column}.ilike.%${safe}%`))
}
