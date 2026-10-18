# Resource optimization audit

## Boundaries

Preserve schedules, immediate user actions, authorization, accounting accuracy,
and business history. No production sends, generation or database restarts in tests.

## Implemented

- Extension heartbeat is recorded once per claim, with a one-minute write gate.
- Healthy incident resolution is batched rather than sent per fingerprint.
- Identical concurrent plain Supabase GET requests share in-flight work only.
  Credentials and query isolate requests, callers receive separate objects,
  and writes invalidate pending read sharing before and after completion.
- Explicit permanent HTTP errors cannot trigger retry through misleading text.
- Vercel ignores local outputs, isolated video tooling and local outreach files.
  Runtime public assets remain included.

## Existing protections retained

- Push removes subscriptions when providers return 404/410.
- History and activity readers already apply bounded limits.
- Drive uses parent-folder filters, narrow fields and saved folder identifiers.
- Client Ads monitor requests campaign-level data, not all ad/adset detail.
- Cron handlers call server helpers rather than their own HTTP endpoints.
- Hook images have immutable storage cache metadata and upload size limits.

## Not changed automatically

- Database index audit: live Supabase query denied by current connector access.
  Verify actual query plans and existing indexes before additive migrations.
- Retention: no business or technical records deleted. Agree retention and audit
  requirements before automatic cleanup; retries and delivery evidence may matter.
- PDF reuse: requires a complete content/version fingerprint, not just filename.
  Do not reuse a previous report if metrics, notes or business settings changed.
- Image recompression: requires visual checks and format/metadata handling; do
  not silently reduce original creative or alter uploaded client material.
- Pagination: apply per screen with complete navigation, not global truncation
  of client/account lists or planner history.
- Browser asset caching: version asset URLs before extending cache lifetimes
  so deployed JavaScript cannot remain stale.
- Realtime: extension has one socket owner; reconnects preserve recovery.
  No refresh cadence or reconnect behavior changed in this batch.
- Car Loan MY cron log tuning needs separate project review and may require
  a database restart; no jobs disabled or rescheduled.

## Verification

Run Node 24 `npm ci`, `npm run check`, `npm test` in a clean checkout.
Fixture tests cover concurrency, credential isolation, failure cleanup,
mutation invalidation and independent caller results. They do not send pushes,
publish posts or generate production documents.

Savings are workload-dependent. Compare request counts and byte usage over
matching multi-day windows after release; no percentage saving is assumed.
