# BuddyPilot Cloud

## Stable baseline

Use `main` as the canonical branch for local and Codex Cloud work.
Before starting a cloud task, fetch and sync with the latest `origin/main`.
Older cloud tasks must sync first rather than redeploy their previous snapshot.

The repository source was aligned with production deployment
`dpl_J3pFXugp6Vp3nmwo9epr9MTzQuJd` (6 October 2026), including
separate Post Pilot channels, extension v0.4.0, product audience fields,
report phase settings and immediate action feedback. Local source changes
only become available to Cloud after they are committed and pushed to `main`.

## Setup

Use Node 24 (`nvm use`) and run `npm ci`, `npm run check`, and `npm test`.
Run `sh scripts/cloud-check.sh` after Vercel preview configuration is linked.
GitHub Actions is not configured: the existing Git authorization lacks
the workflow permission. Checks must be run in the cloud task before release.
There is no TypeScript or separate lint command in this CommonJS project.
Use the same Supabase project: `mpbcamohrfbfjtkuemjs`.
Database records and Google Drive documents are shared remotely; do not
copy them into Git or migrate to a new database.

Configure VERCEL_TOKEN and SUPABASE_ACCESS_TOKEN as cloud secrets.
Configure VERCEL_PROJECT=invoice-pilot and
SUPABASE_PROJECT_REF=mpbcamohrfbfjtkuemjs as ordinary variables.
Never print credentials, commit .env files, or put secrets in prompts.

Link Vercel to team `abdussomadruddin-projects`, project `invoice-pilot`.
Use `npx vercel pull --yes --environment=preview` to obtain preview
configuration when authorized. Use production configuration only for
an explicitly approved production release. Preserve all existing remote
environment variables; tokens alone are not the application's runtime config.

## Release gate

1. Start from the latest remote branch and inspect git status.
2. Implement narrowly; never apply an older patch over newer code blindly.
3. Run npm ci, npm run check, npm test, and npx vercel build.
4. Deploy a preview and verify login/logout, Client Pilot, Ads CMO,
   report preview and invoice preview on desktop and iPhone 15.
5. Do not send WhatsApp, publish posts, or create production invoices/reports
   as a smoke test without explicit authorization.
6. Promote production only after tests pass and the user approves release.
7. Verify buddypilot.vercel.app, the exact deployment ID, and all six cron jobs.

Do not run destructive migrations. Additive migrations must preserve old
runtime compatibility and be tested before production. Migration files
already applied remain part of historical audit even after application rollback.

## Scheduling

Vercel owns all schedules; do not create duplicate Codex schedules.
Weekly reports: Monday 06:00 Malaysia; admin reminder: Monday 10:00.
Monthly invoices: first day 06:00; admin reminder: first day 10:00.
WhatsApp stays manual. Hobby cron may execute within its hourly window.

## Rollback

Known stable deployment: dpl_9f1NkDqjU9EXeHwFHsDJsgWvXL5Z.
Promote that deployment and verify production alias and cron deployment ID.
Revert the offending Git commit separately so cloud does not redeploy it.
Do not reset Git history, delete business data, or drop database tables.
