# BuddyPilot Post Pilot for Chrome

This extension prepares Facebook drafts for manual review. For Threads, it
publishes only new auto-post jobs initiated by tapping Threads in BuddyPilot.
It does not read passwords or cookies, and uses no Facebook or Threads API token.
The BuddyPilot tab must already be authenticated; only administrators can access
the queue. Facebook and Threads must be signed in on the same Chrome profile.

## Setup

1. Deploy the matching BuddyPilot code. The queue uses the existing
   Storytelling table in a separate owner scope; no new migration is required.
2. In Chrome, open `chrome://extensions`, enable Developer mode, select
   Load unpacked and choose the `chrome-post-pilot` directory.
3. Open BuddyPilot on the Mac and leave the signed-in tab open. Pin the
   extension, click its icon and choose Aktifkan. Use Semak sekarang to check
   the connection without waiting for the next alarm. Service worker (Inactive)
   in Chrome's extension list is normal between events.
4. From Post Pilot on the phone, generate or edit text and tap Facebook
   personal or Threads. Threads uses this queue only when no API account is
   connected. Semak status Mac checks the latest handoff.
5. For Threads, set the account username in the extension popup once. Chrome
   checks the username in the composer, fills all parts and presses Post once.
   Jobs created before auto-post was added are still manual.
6. Chrome checks at roughly two-minute intervals while running and awake.
   For Facebook, inspect the account, text and audience, then publish manually.
   Close the Facebook review tab to allow the next manual draft.

Only text is supported for browser auto-post. Long Threads drafts are split
into parts of at most 500 characters. If
Chrome is asleep or logged out, queued drafts wait up to 24 hours; stale
drafts are not handed off. Claimed or failed jobs are not automatically retried.
Inspect the browser before sending a draft again, especially on an uncertain
publish result. A review status is not confirmation of publication. Unclaimed expired drafts remain in the
database until cleaned up by an administrator.
