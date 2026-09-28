import { NextResponse } from 'next/server'

/**
 * POST /api/check-email
 *
 * Formerly an enumeration oracle (audit finding C2): it answered
 * `{ exists, emailConfirmed }` for any address and, to do so, pulled up to a
 * thousand auth users per request via `auth.admin.listUsers({ perPage: 1000 })`.
 * That let anyone confirm which addresses in a list held a Bleje Pronën account
 * — and whether each was verified — one request at a time.
 *
 * The endpoint is kept as a constant-shape no-op so existing callers do not 404,
 * but it now:
 *   - performs no auth lookup at all (no service-role key, no directory scan);
 *   - returns the identical body and status for every input, valid or not;
 *   - runs the same code path for every address, so there is no timing signal.
 *
 * Registration no longer pre-checks existence: clients submit straight to
 * `/api/signup`, and the server decides the flow. Login failures are reported
 * with a single generic message. Nothing in the auth surface may reveal whether
 * an address is registered.
 */
export async function POST() {
  return NextResponse.json({ ok: true })
}
