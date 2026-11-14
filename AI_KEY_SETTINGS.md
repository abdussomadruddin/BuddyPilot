# AI API Key Settings

Admin menu: Settings > AI API Key. The existing shared admin authentication
protects `/api/settings/ai-keys`; this application does not have separate admin
and staff roles. Any signed-in holder of the app password is an administrator.

## Release

1. Apply `supabase/migrations/20261114000200_ai_provider_credentials.sql`.
   The existing Facebook Storytelling migration must also be applied.
   Then apply `20261114000300_openrouter_free_models.sql`.
2. Ensure the server has a stable secret of at least 32 characters. The order
   is `AI_SETTINGS_ENCRYPTION_KEY`, `META_TOKEN_ENCRYPTION_KEY`, then
   `TIKTOK_TOKEN_ENCRYPTION_KEY`. Prefer the dedicated variable for new installs.
   Never change this secret without re-encrypting or re-entering stored keys.
3. Deploy the application through the normal preview and production gates.

Keys are AES-256-GCM encrypted with provider-bound authenticated data. Only the
service role can read/write the new table. The browser receives configuration
status, source, and update time, never plaintext or ciphertext credentials.
No key is stored in browser storage. Blank Save retains an existing key and
allows changing the model/provider; it is rejected when no key exists. Empty Test
uses the saved server key, falling back to its environment key only when no
database key exists. Storage failures never silently fall back to environment.

Connection tests read model metadata; they do not generate content, verify
billing balance, publish posts, or send messages. Post Pilot's current Facebook
Storytelling workflow reads the saved provider, model and key on every AI call.
Google Gemini remains the default until an administrator saves another choice.
The menu offers Gemini Free tier and OpenRouter free models only. OpenRouter
defaults to `google/gemma-4-31b-it:free`, enforces the `:free` suffix, zero input
and output price ceilings, and disables provider fallback. Gemini defaults to
`gemini-3.8-flash`; saving requires the administrator to confirm their project
has Free tier without billing. The app cannot independently inspect Google's
billing tier, so this must also be verified in AI Studio. No billing is enabled.
Writing DNA, draft/revision/feedback storage and request quotas are unchanged.
Existing OpenAI/DeepSeek adapters remain for compatibility, but free-only saved
configuration cannot select them. No model or provider changes on quota errors.
There is no auto-posting in the current Storytelling workflow.

## Manual QA

- Open Settings > AI API Key, choose a provider, and check its masked status.
- Test an invalid key: a redacted error should appear without saving the key.
- Save a valid key: the password input clears and status changes to App.
- Test with the input empty: the server should use the stored credential.
- Switch provider: the unsaved input clears, with independent provider status.
- Gemini Save must refuse without Free tier confirmation; OpenRouter must
  refuse a paid model before sending any generation request.
- Close settings: unsaved key text is cleared.
- Unauthenticated requests must return 401; cross-site writes must return 403.
- Confirm Post Pilot displays the selected provider/model after Save & Use.
  The next generation, rewrite, quality check or DNA analysis uses that choice.
- Preserve unrelated settings and workflow controls. Do not publish real posts
  as part of this test.

Rollback the application without dropping the credential table. Existing
environment keys are not removed or overwritten by this feature.
