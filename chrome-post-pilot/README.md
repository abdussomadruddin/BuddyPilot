# BuddyPilot Post Pilot for Chrome

This initial version prepares one text draft at a time. It never clicks Publish,
does not read passwords or cookies, and uses no Facebook or Threads API token.
The BuddyPilot tab must already be authenticated; only administrators can access
the queue. Facebook and Threads must be signed in on the same Chrome profile.

## Setup

1. Apply `supabase/migrations/20261115000200_post_pilot_queue.sql` and deploy
   the matching BuddyPilot code. Do not point the extension at another project.
2. In Chrome, open `chrome://extensions`, enable Developer mode, select
   Load unpacked and choose the `chrome-post-pilot` directory.
3. Open BuddyPilot on the Mac and leave the signed-in tab open. Pin the
   extension, click its icon and choose Aktifkan. Use Semak sekarang to check
   the connection without waiting for the next alarm. Service worker (Inactive)
   in Chrome's extension list is normal between events.
4. From Post Pilot on the phone, generate or edit text, pick a platform and
   choose Hantar draf ke Mac. Semak status checks the latest handoff.
5. Chrome checks at roughly two-minute intervals while running and awake.
   Inspect the account, text and audience in the new tab, then publish manually.
   If the composer is not recognized, use the displayed copy option.
   Close the review tab to allow the next queued draft.

Only text is supported. Threads drafts are limited to 500 characters. If
Chrome is asleep or logged out, queued drafts wait up to 24 hours; stale
drafts are not handed off. Claimed or failed jobs are not automatically retried.
Inspect the browser before sending a draft again. A review status is not
confirmation that a post was published. Unclaimed expired drafts remain in the
database until cleaned up by an administrator.
