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
- When an expired network secret is saved for `www.googleapis.com`, the proxy overwrites your own Authorization header there.
  Call the Drive API through `content.googleapis.com` instead. Upload with
  `content.googleapis.com/upload/drive/v3/files?uploadType=resumable`, keep the token in a 0600 file passed as `curl -H @file`,
  and delete the file afterwards.
- The Claude app on a phone cannot download large video file cards, and the mobile browser player has no save button.
  Deliver through a Drive link.

---

## E. V2 recipe: kinetic-typography talking head (Honda IMG_0851, Nov 2026)

Style reference: a TikTok reel the user supplied (talking head, white sans and red serif-italic words, icon props,
full-screen cards). Output: `HONDA_V3_FULL.mp4`, 3:41, 1080x1920, about -14 LUFS.

### Rules for this style

1. Keep the **full A-roll**. Drop only duplicate sentences, mid-video CTAs and filler. List every drop in a comment in `v2_cut.py`.
2. **Every spoken word appears on screen**, word by word, timed to Whisper word timestamps. No separate subtitles.
3. Small words use Montserrat 800, white, 62px. **One keyword per group** uses Playfair Display 900 italic, red `#e3172d`, up to 168px,
   revealed with a clip-path wipe. Numbers merge with their unit ("8 tahun", "5 kali", "satu juta").
4. A group holds at most 5 words or ends at a pause over 0.45s. Each group ends before the next one starts.
   Long lines shrink to fit inside an 800px width. Text never sits over the face.
5. Layout: face at 34–39% of frame height. Kinetic text at about 1110px from the top. White badges and counters in the top 6–16%.
6. **Full-screen cards** (red or white with floating icon orbs) on hook questions and big reveals, about 1.5–4.5s each.
   The voice keeps playing, and the card's words appear inside it in themed colours (dark on white, white on red).
7. Shots last about 2.6s and cycle through framings M 1.75x / C 2.25x / W 1.3x, with a 5% push-in.
   Shot changes rotate blur, glitch (RGB shift + noise) and whoosh-zoom.
8. **Grade must stay neutral, not yellow.** Showroom lighting is already warm. Use the warm-ish base grade *followed by* the
   neutralising `colorbalance=rs=-0.04:bs=0.07:rm=-0.09:gm=-0.01:bm=0.12:rh=-0.04:bh=0.08,curves 0.5→0.53,saturation 0.9`.
   The moody look comes only from the HTML spotlight overlay (a radial vignette plus a bottom fade to black).
   Check: in mid-tones, B should not sit more than about 15 points below R.
9. Numbers on screen come only from the speaker's words. Re-transcribe uncertain figures in isolation and flag any doubt
   to the user (here RM40 vs RM400). The user confirms promo figures with the dealer.
10. Deliver **both** ways: send the file in chat **and** upload to Drive. Phones cannot download from the in-app file card,
    so the Drive link is the reliable download.

### Steps

1. **Ingest:** `curl -L "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t" -o IMG_0851.MOV`.
2. **Audio + transcript:** `ffmpeg -i IMG_0851.MOV -vn -ac 1 -ar 16000 a.wav`, then Whisper `medium` (`language='ms'`,
   `word_timestamps`, domain `initial_prompt`). Save `words.json` as `[start, end, word]`.
3. **Face track:** `pip install "opencv-python-headless<5" scipy` (OpenCV 5 has no Haar cascades). Run the frontal and profile Haar
   cascades at 4fps on a 360x640 copy, then save `face.json`. `v2_cut.py` median-filters and gaussian-smooths the track.
4. **Cut:** `python3 pipeline/v2_cut.py <workdir>`. This sets the phrase list (`BREAKS`, `DROP`), the chunks (pre 0.06 / post 0.14 / gap 0.30),
   and per-piece `zoompan` crops that follow the face frame by frame (use `on/30`, not `t`; never `scale eval=frame` + `crop`).
   It writes `cut/video.mp4`, `voice.npy` and `data.json`. It takes about 35 min on 4 cores, with 2 parallel 4K HEVC decodes.
5. **Music/SFX:** `python3 pipeline/synth.py <scratch>/audio`. The music is low-passed at 3.2kHz for the moodier tone.
6. **HyperFrames project:** `npm i hyperframes gsap @fontsource/montserrat @fontsource/playfair-display`. Copy `gsap.min.js` and the
   fonts (`fonts/montserrat-800.woff2`, `montserrat-600.woff2`, `playfair-900i.woff2`) into the project.
7. **Graphics + mix:** `python3 pipeline/v2_gen.py <workdir> <project>`. This writes `index.html` (text groups, cards,
   badges, counters, icon orbs, z-index = track) and `base.mp4` (video + voice + music ducked 55% + SFX, `loudnorm I=-14`).
   Add `--no-audio` to rebuild only the HTML.
8. **QA:** `npx hyperframes lint` (the nested-structure warnings are expected), then `npx hyperframes snapshot --at <times> --no-end`.
   Check text over the face, clipped lines, card text contrast and badge overlap.
9. **Render:** `npx hyperframes render -o HONDA_V3_FULL.mp4 --crf 18` (about 20 min for 3:41 when nothing else runs; stop Whisper first).
   Make a delivery copy: `-crf 23 -maxrate 4M -movflags +faststart` (about 86MB).
10. **Verify:** re-transcribe the final audio, check loudness with `ebur128`, and spot-check frames.
11. **Deliver:** use SendUserFile with `display: attach`, then do the Drive resumable upload through `content.googleapis.com`
    (see Gotchas) into folder `1USG2l0hx-iaPx0AyvkvDL55Yct1KD3X9`. Compare the md5 checksums, then delete the token file.
