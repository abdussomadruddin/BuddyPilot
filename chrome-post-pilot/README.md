# BuddyPilot Post Pilot for Chrome

This extension publishes only new auto-post jobs initiated explicitly in
BuddyPilot. It ignores old manual-review jobs instead of promoting or
replaying them as auto-post jobs.
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
5. Save the Threads username and the exact Facebook personal profile name
   once in the extension popup. It checks the destination profile and content
   before clicking Post. Facebook goes through Next when needed and leaves the
   existing audience setting unchanged.
6. With Chrome open and awake, BuddyPilot on the same Mac wakes the extension
   when a job is queued. Jobs from another device are picked up by periodic
   checks, normally about 30 seconds apart. No Semak sekarang click is required.

Facebook personal auto-post supports text with an optional JPEG/PNG. Long Threads drafts
are split into parts of at most 500 characters, with the optional JPEG/PNG
attached to part one only. Missing or unverified attachments stop publishing.
Use Belajar sekarang in Post Pilot on the same Chrome profile to read dated
posts from the last 30 days on both configured profiles. The extension reads
visible engagement counts where available. BuddyPilot uses the posts it could
read for that learning run. This workflow requires the matching BuddyPilot web release.
If
Chrome is asleep or logged out, queued drafts wait up to 24 hours; stale
drafts are not handed off. Claimed or failed jobs are not automatically retried.
Inspect the browser before sending a draft again, especially on an uncertain
publish result. A review status is not confirmation of publication. Unclaimed expired drafts remain in the
database until cleaned up by an administrator.
