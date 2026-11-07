"""Full-length A-roll edit: keep every point, drop only duplicates/flubs.
Stage 1: cut list -> ffmpeg video pieces -> audio mix (voice+music+sfx) -> base.mp4 + data.json
"""
import json, subprocess, os, sys, wave
import numpy as np
S = '/tmp/claude-0/-home-user-BuddyPilot/5f8f0aae-2815-55c9-8476-f5202601522e/scratchpad'
A = f'{S}/src2/IMG_0851.MOV'
B = lambda n: f'{S}/src/b-roll/IMG_{n}.MOV'
WK = f'{S}/full2'; os.makedirs(f'{WK}/p', exist_ok=True)
SR = 48000
words = json.load(open(f'{S}/work/words0851.json'))

# (first_word, last_word, b-roll pool) -- dropped: 31-34 dup, 74-86 dup recap, 168-175 dup, 239-240 filler,
# 294-301 dup, 409-412 dup, 419-421 dup, 427-437 dup, 478-495 dup/false start, 507-509, 550, 582-586 dup CTA
EXT = ['8376', '8375', '0746', '0747', '0745', '8377', '0748', '8381', '0753']
INT = ['0751', '0750']; WHL = ['0752', '0753', '0754', '0749']; HYB = ['8380', '8381', '8376', '8375']
TNT = ['0749', '0745', '0747', '0754']
PH = [(0, 10, EXT), (11, 14, EXT), (15, 27, EXT), (28, 43, EXT), (44, 56, EXT), (57, 67, EXT), (68, 87, EXT),
      (88, 99, EXT), (100, 119, WHL), (120, 128, WHL), (129, 149, WHL), (150, 161, HYB), (162, 169, HYB),
      (170, 186, HYB), (187, 207, HYB), (208, 230, HYB), (231, 252, HYB), (253, 275, HYB), (276, 284, HYB),
      (285, 292, WHL), (304, 319, WHL), (320, 347, WHL), (351, 356, WHL), (357, 367, EXT), (368, 390, EXT),
      (391, 410, EXT), (411, 428, HYB), (429, 442, EXT), (443, 460, EXT), (465, 484, TNT), (485, 498, TNT),
      (499, 505, INT), (506, 522, EXT), (523, 533, EXT), (534, 546, INT), (547, 571, INT), (572, 585, INT),
      (586, 593, INT), (594, 603, EXT), (604, 607, [])]
# dropped: 293-297 unclear ("tak termasuk bateri"), 298-303 dup, 348-350 unclear, 461-464 first CTA (dup of final CTA)
START_FIX = {}
END_FIX = {}
PRE, POST, GAP = 0.06, 0.12, 0.28
wst = lambda i: words[i][0]; wen = lambda i: words[i][1]

chunks = []
for pi, (i0, i1, _) in enumerate(PH):
    a = START_FIX.get(i0, max(wst(i0) - PRE, (wen(i0-1) + 0.02) if i0 else 0)); cur = a
    for i in range(i0, i1):
        if wst(i+1) - wen(i) > GAP:
            chunks.append((cur, wen(i) + 0.09, pi)); cur = wst(i+1) - 0.06
    chunks.append((cur, END_FIX.get(i1, min(wen(i1) + POST, wst(i1+1) - 0.02 if i1 + 1 < len(words) else 1e9)), pi))
C = []; out = 0
for a, b, pi in chunks: C.append(dict(a=a, b=b, o=out, pi=pi)); out += b - a
TOTAL = out; print(f'chunks={len(C)} total={TOTAL:.2f}s', flush=True)

def o_of(s):
    for c in C:
        if c['a'] - 0.15 <= s <= c['b'] + 0.15: return c['o'] + min(max(s - c['a'], 0), c['b'] - c['a'])
ph_start = [min(c['o'] for c in C if c['pi'] == k) for k in range(len(PH))]
ph_end = [max(c['o'] + c['b'] - c['a'] for c in C if c['pi'] == k) for k in range(len(PH))]

# shots <=1.9s, alternate A-roll and b-roll from the phrase's pool (rotating offsets to avoid repeats)
SHOT = 1.9; pieces = []; sid = 0; use = {}; flip = 0
for k, (_, _, pool) in enumerate(PH):
    s0, s1 = ph_start[k], ph_end[k]; n = max(1, round((s1 - s0) / SHOT)); L = (s1 - s0) / n
    for j in range(n):
        a0, a1 = s0 + j*L, s0 + (j+1)*L
        src = 'A' if (not pool or (sid + flip) % 2 == 0 or k == 0 and j == 0) else pool[(use.setdefault('_' + str(id(pool)), 0)) % len(pool)]
        if src != 'A':
            use['_' + str(id(pool))] += 1; u = use.get(src, 0); use[src] = u + 1
            boff = 0.15 + (u * 1.1) % 2.2
        cuts = sorted({a0, a1} | {c['o'] for c in C if a0 < c['o'] < a1})
        for x0, x1 in zip(cuts, cuts[1:]):
            c = next(c for c in C if c['o'] <= x0 + 1e-6 < c['o'] + c['b'] - c['a'])
            st = c['a'] + (x0 - c['o']) if src == 'A' else boff + (x0 - a0)
            pieces.append((x0, x1, src, st, sid, x0 - a0, a1 - a0))
        sid += 1

WB = {}
def neutral_mean(path, times):
    px = []
    for t in times:
        raw = subprocess.run(['ffmpeg','-v','error','-ss',f'{t:.2f}','-i',path,'-frames:v','1','-vf','scale=270:480','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
        a = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(float); L = a.mean(1); ch = a.max(1) - a.min(1)
        px.append(a[(L > np.percentile(L, 60)) & (ch < 45) & (L < 250)])   # bright, low-chroma (white/grey) pixels only
    return np.vstack(px).mean(0)
def wb(path):
    if path in WB: return WB[path]
    d = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',path],capture_output=True,text=True).stdout)
    m = neutral_mean(path, [d*0.2, d*0.5, d*0.8]); g = m.mean() / m   # fully neutral whites (user: no yellowish look)
    WB[path] = g; print('wb', os.path.basename(path), g.round(3), flush=True); return g
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-2000:]); sys.exit(1)

json.dump(pieces, open(f'{WK}/pieces.json','w'))
if '--skip-video' not in sys.argv:
    prev = None; plist = []
    for n, (x0, x1, src, st, sh, rel, shl) in enumerate(pieces):
        d = x1 - x0
        if d < 0.02: continue  # float-duplicate cut points give empty pieces that break concat
        path = A if src == 'A' else B(src); newshot = sh != prev; prev = sh
        base = (1.0 if sh % 4 in (0, 1) else 1.13) if src == 'A' else 1.0
        if src == 'A' and not newshot: base += 0.07 * (n % 2)
        g = wb(path)
        z = f"({base}+0.06*(({rel:.3f}+t)/{shl:.3f})+0.35*max(0\\,1-({rel:.3f}+t)/0.22))"
        blur = "boxblur=24:1:enable='lt(t,0.06)',boxblur=10:1:enable='between(t,0.06,0.14)'," if newshot and n else ""
        vf = (f"scale=1080:1920,fps=30,scale=w='trunc(1080*{z}/2)*2':h='trunc(1920*{z}/2)*2':eval=frame,"
              f"crop=1080:1920:(iw-1080)/2:(ih-1920)*0.32,{blur}colorchannelmixer=rr={g[0]:.3f}:gg={g[1]:.3f}:bb={g[2]:.3f},"
              f"eq=contrast=1.06:saturation=1.03:brightness=0.015,format=yuv420p")
        f = f'{WK}/p/v{n:03d}.mp4'
        if not os.path.exists(f):
            run(['ffmpeg', '-v', 'error', '-y', '-stream_loop', '-1' if src != 'A' else '0', '-ss', f'{st:.3f}', '-i', path,
                 '-t', f'{d:.3f}', '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-r', '30', f])
        plist.append(f); print('v', n, len(pieces), flush=True)
    # frame-exact concat: each piece trimmed to its frame-grid length (pad by 2 cloned frames if short)
    L = []
    for n, p in enumerate(pieces):
        if p[1] - p[0] < 0.02: continue
        f = f'{WK}/p/v{n:03d}.mp4'; N = round(p[1] * 30) - round(p[0] * 30)
        M = int(subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries',
                                'stream=nb_read_packets', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip())
        if M < N:
            run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-vf', 'tpad=stop_mode=clone:stop=2', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', f + '.pad.mp4'])
            os.replace(f + '.pad.mp4', f)
        L.append(f"file '{f}'\noutpoint {N/30:.6f}\n")
    open(f'{WK}/v.txt', 'w').write(''.join(L))
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{WK}/v.txt', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-r', '30', f'{WK}/video.mp4'])

# ---------- audio ----------
def load(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(r.stdout, '<i2').reshape(-1, 2).astype(np.float64) / 32768
N = int((TOTAL + 0.5) * SR); voice = np.zeros((N, 2)); full = load(A)
for c in C:
    i, j = int(c['a'] * SR), int(c['b'] * SR); seg = full[i:j].copy(); L = len(seg)
    f = min(int(0.012 * SR), L // 2); r = np.linspace(0, 1, f)[:, None]; seg[:f] *= r; seg[-f:] *= r[::-1]
    o = int(c['o'] * SR); voice[o:o+L] += seg[:N-o]
pk = np.percentile(np.abs(voice), 99.9); voice = np.tanh(voice / pk * 1.2) * 0.8

json.dump(dict(total=TOTAL, ph_start=ph_start, ph_end=ph_end, ph=[p[:2] for p in PH],
               wt={i: o_of(wst(i)) for k in PH for i in range(k[0], k[1] + 1)},
               we={i: o_of(wen(i)) for k in PH for i in range(k[0], k[1] + 1)},
               shots=sorted({p[0] for p in pieces if p[5] < 1e-6 and p[0] > 0})),
          open(f'{WK}/data.json', 'w'))
np.save(f'{WK}/voice.npy', voice.astype(np.float32))
print('stage1 ok', TOTAL)
