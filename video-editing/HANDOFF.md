# Handoff: Honda City video edit (session summary, 7 Nov 2026)

Read `video-editing/PLAYBOOK.md` first for the full rules and pipeline.

## User preferences

- Reply in casual Malay-English (Malaysian style, no Indonesian words). Address the user as "tuan".
  Use emoji bullets and end every reply with a question.
- The user wants: the **full A-roll** (every point kept; drop only duplicates and flubs), accurate cuts,
  high pace (a visual change about every 2s), SFX, music by scene, and motion explainer graphics.
- Finish the work without asking for approval of each step. Report when the final file is ready.

## Source footage

- Drive folder (shared, editor): https://drive.google.com/drive/folders/1USG2l0hx-iaPx0AyvkvDL55Yct1KD3X9
  - `a-roll/IMG_0848.MOV`: the main take, 3:48, salesman (SAFRICH t-shirt) in a Honda showroom.
    `IMG_0847.MOV` is a shorter take that was not used.
  - `b-roll/IMG_0745–0754.MOV` (white/grey City, interior, wheel) and `IMG_8375–8381.MOV` (red City RS e:HEV).
- Style reference: a real-estate TikTok reel (FPV drone, kinetic serif text, text behind the subject).

## Deliverables made

| File | Notes |
|---|---|
| `HONDA_CITY_FINAL.mp4` | 53s highlight cut (16 sentences), verified |
| `HONDA_CITY_FULL_FINAL.mp4` | 2:59 full A-roll cut, 47 scenes, 1080x1920, -14.3 LUFS, 127MB |
| `HONDA_CITY_FULL_1080p.mp4` / `_720p.mp4` | 44MB / 22MB compressed copies |
| Google Drive | Full 1080p version uploaded: https://drive.google.com/file/d/1l-q0KZYVsG_d4NP2DcaoQ-qESxjHNBM2/view |

The local files lived in the old session's scratchpad and are **not** carried over.
To rebuild them, re-download the footage and run `pipeline/` (see the PLAYBOOK).

## Verification done

- Every scene was re-transcribed and compared to the source.
- Clipped words fixed with overrides: "Honda bagi" (28.68), "kita bagi minyak" (181.47),
  "Warranty" (161.62), "spec JPJ" (157.90), and the end of "value kereta" (31.54).
- "boleh guna hingga 5 tahun" confirmed by isolated re-transcription (not "RM5,000").

## Open items / cautions

- The user must confirm all promo figures with the dealer before posting
  (RM7k rebate, +RM2k trade-in, total RM9k, hatchback RM4k/RM6k, RM3k voucher, first buyer +RM3k,
  8-year warranty, 10-year hybrid battery).
- Security: the user exposed an OAuth Playground token in a screenshot. Remind them to remove
  "OAuth 2.0 Playground" at myaccount.google.com/permissions.
  A short-lived Drive token is saved as a network secret for www.googleapis.com on the Default environment.
- Next ideas the user may want: 15–30s ad clips cut from the full version, a SAFRICH logo outro,
  or a trending track added in TikTok.
