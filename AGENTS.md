# BuddyPilot development

Read CLOUD_SETUP.md before cloud changes or releases.
Use Node from .nvmrc and install from package-lock.json with npm ci.
Run npm run check and npm test before committing.
Preserve current UI and business behavior unless explicitly requested.
Never print, commit, or expose credentials.
Do not migrate business data into Git. Supabase and Drive are the shared sources.
Deploy preview first; production requires explicit user authorization and
verified checks. Never trigger real sends or billing/report generation in tests.
Keep migration history and ensure additive changes support rollback.
