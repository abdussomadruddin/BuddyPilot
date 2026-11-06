# Video Editing Playbook: short-form sales video (TikTok/Reels)

Built while editing the Honda City promo (Nov 2026). Tools: **FFmpeg** (cut and mix),
**HyperFrames** (captions and motion graphics), **yt-dlp** (save reference reels only),
**Whisper** (transcription). Pipeline scripts are in `pipeline/`.

---

## A. User rules (must follow)

1. **Use the full A-roll.** Keep every point. Drop only flubs, false starts and duplicate sentences.
   Do not shorten the content to hit a target length.
2. **Cut silence and flubs accurately.** Verify every cut by re-transcribing the edited audio.
3. **Pace:** something must change visually about every 2s (shot change, zoom, text pop, graphic, shake or flash).
4. **Sound:** music that changes by scene, plus SFX on every cut and reveal.
5. **Motion explainer graphics** for numbers and offers (counters, equation cards, timelines, checklists).
6. **Finish fully without asking for approval of steps.** Report when the final file is ready to download.
7. Do not invent numbers. Every figure on screen must come from what the speaker actually said.
   Remind the user to confirm promo figures with the dealer before posting.

## B. Shoot rules (to get close to the premium reference style)

- Shoot vertically, 4K, **60fps** (gives room for speed ramps).
- Every B-roll shot needs movement: push-in, orbit, tracking.
  Shoot deliberate transition moves (a whip pan at the end of one clip and the start of the next).
- Use FPV drone exteriors if the budget allows. This is the "wow" factor of the reference video.
- Talent speaks in short sentences (3–5s), each in a different spot. Use a clip-on mic, because showrooms echo.
- Leave headroom above the subject for big text.
- Script: hook in 2s, one idea per sentence, CTA at the end.

## C. Pipeline steps

1. **Ingest.** Share the Drive folder as "Anyone with link". List the files with `gdown --folder --skip-download`,
   then download each one with
   `curl -L "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`.
   The googleusercontent redirect hosts are blocked, so don't use them.
   Network allowlist needed: `drive.google.com`, `drive.usercontent.google.com`, `openaipublic.azureedge.net` (Whisper models).
2. **Probe.** Use `ffprobe` and contact sheets (`fps=1/3,scale=240:-1,tile=7x2`) to see every clip.
   iPhone .MOV files are rotated; ffmpeg auto-rotates them to 2160x3840 / 1080x1920.
3. **Transcribe** with Whisper `medium`, `language='ms'`, `word_timestamps=True`, and an `initial_prompt`
   containing the domain words (Honda City, rebate, trade-in, ringgit, warranty, hybrid...).
4. **Pick sentences** by word-index ranges. Drop duplicates, flubs, filler ("okay", "yang mana?") and repeated CTAs.
   Resolve ambiguous words by re-transcribing that span in isolation. Example: "hingga 5 tahun" vs "RM5,000".
5. **Cut rules:** pre-roll 0.06s, post-roll 0.12s, remove internal gaps over 0.28s,
   use 12ms audio fades at every join.
   Whisper sometimes marks a word start late. Check the RMS energy (in 50ms windows) around suspicious cuts
   and override the start/end (`START_FIX` / `END_FIX`).
6. **Shots:** split each sentence into shots of 1.9s or less, alternating A-roll and topic-matched B-roll
   (exterior / interior / wheel / hybrid / tint pools), rotating offsets to avoid repeats.
   Motion per shot: continuous push-in of +6%, a whoosh zoom (1.35→1.0 in 0.22s) plus a boxblur on the first frames,
   alternating A-roll punch-in levels (1.0 / 1.13, +0.07 on jump cuts), and the grade
   `eq=contrast=1.08:saturation=1.15`, `vignette`.
7. **Audio mix** (numpy): voice (normalised) + music × 0.16 with sidechain ducking (−55% while talking) + SFX × 0.9,
   tanh limiter, then `loudnorm I=-14 TP=-1.5`.
   Music sections: intro build (hook) → main beat (offers) → calm breakdown (warranty) → main (gifts) → outro (CTA),
   with a riser into every section. Music and SFX are synthesised in `pipeline/synth.py`, so they are copyright-free.
8. **Graphics (HyperFrames):** a project with local `gsap.min.js` (the CDN is blocked) and bundled fonts via `@font-face`
   (the linter fails on system font names). Building blocks:
   - title pop (white label + big yellow value), with shake and a hit SFX
   - money counter that counts up and **lands exactly on the spoken word**, with a cash SFX
   - equation/recap card (rows slide in, line, total)
   - voucher card, warranty year timeline, battery fill, round badge
   - checklist with ticks (tick SFX)
   - CTA with a bouncing arrow and a WhatsApp pill
   - 3-word captions at 74% height, with the spoken word highlighted in yellow
   - top/bottom gradient scrims for contrast, a progress bar, white flash on big reveals
9. **QA loop:** run `npm run check` (lint + contrast), then `npx hyperframes snapshot --at ...`, and read the frames.
   Fix:
   - text over faces (keep graphics in the top 35%)
   - counters stuck on "RM0"
   - overlapping captions (end each group before the next one starts)
   - badges overflowing their shape
   - CTA subtitle colliding with the CTA graphic
10. **Verify:** re-transcribe the final audio, check the max gap between visual events (≤ ~2.3s),
    and check loudness (≈ −14 LUFS).
11. **Render** with `npx hyperframes render -o FINAL.mp4` (≈ 15 min per minute of video in this container).
    Send it to the user with SendUserFile.

## D. Gotchas

- The Google Drive MCP connector fails ("dynamic client registration"), so use share links instead.
- HuggingFace is blocked, so use `openai-whisper` (from azureedge), not faster-whisper.
- `cdn.jsdelivr.net` is blocked, so `npm i gsap` and reference it locally.
- Short B-roll in a long slot desyncs audio. Use `-stream_loop -1` or split the slot across 2 clips.
- Never repost other creators' reels; yt-dlp is for style reference only.
