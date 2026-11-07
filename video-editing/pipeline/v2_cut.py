"""V2 (kinetic-typography style) stage 1: cut list -> face-tracked punch-in pieces -> base video + voice.
Usage: python3 v2_cut.py <workdir>   (workdir holds IMG_0851.MOV, a.wav, words.json, face.json)
"""
import json, subprocess, os, sys
import numpy as np
S = sys.argv[1]
A = f'{S}/IMG_0851.MOV'
WK = f'{S}/cut'; os.makedirs(f'{WK}/p', exist_ok=True)
SR = 48000
words = json.load(open(f'{S}/words.json'))
NW = len(words)

# dropped: 309-314 duplicate "general warranty 8 tahun", 473-476 mid-video CTA (kept only the final one),
# 586 "Tamam" filler
DROP = set(range(309, 315)) | set(range(473, 477)) | {586}
# phrase breaks (first word of each phrase); a phrase never spans a dropped range
BREAKS = [0, 11, 14, 15, 21, 28, 33, 44, 57, 68, 90, 95, 98, 101, 113, 126, 130, 137, 146, 153, 158, 169, 175, 181,
          193, 198, 210, 221, 227, 238, 244, 255, 265, 276, 288, 296, 304, 315, 331, 338, 349, 363, 369, 380, 390,
          403, 418, 435, 441, 455, 461, 465, 470, 477, 486, 501, 511, 518, 528, 535, 546, 551, 559, 571, 577, 587,
          594, 601, 609, 615, 619]
PH = []
for k, a in enumerate(BREAKS):
    b = (BREAKS[k + 1] if k + 1 < len(BREAKS) else NW) - 1
    run = [i for i in range(a, b + 1) if i not in DROP]
    # split around dropped words
    seg = [run[0]] if run else []
    for i in run[1:]:
        if i != seg[-1] + 1: PH.append((seg[0], seg[-1])); seg = []
        seg.append(i)
    if seg: PH.append((seg[0], seg[-1]))
START_FIX = {}
END_FIX = {}
PRE, POST, GAP = 0.06, 0.14, 0.30
wst = lambda i: words[i][0]; wen = lambda i: words[i][1]

chunks = []
for pi, (i0, i1) in enumerate(PH):
    prev_end = wen(i0 - 1) + 0.02 if i0 else 0
    a = START_FIX.get(i0, max(wst(i0) - PRE, prev_end if (i0 - 1) not in DROP else 0)); cur = a
    for i in range(i0, i1):
        if wst(i + 1) - wen(i) > GAP:
            chunks.append((cur, wen(i) + 0.10, pi)); cur = wst(i + 1) - 0.06
    nxt = wst(i1 + 1) - 0.02 if i1 + 1 < NW else wen(i1) + 0.6
    chunks.append((cur, END_FIX.get(i1, min(wen(i1) + POST, nxt) if i1 + 1 < NW else wen(i1) + 0.6), pi))
C = []; out = 0
for a, b, pi in chunks:
    if b - a < 0.05: continue
    C.append(dict(a=a, b=b, o=out, pi=pi)); out += b - a
TOTAL = out; print(f'phrases={len(PH)} chunks={len(C)} total={TOTAL:.2f}s', flush=True)

def o_of(s):
    best = None
    for c in C:
        if c['a'] - 0.2 <= s <= c['b'] + 0.2:
            v = c['o'] + min(max(s - c['a'], 0), c['b'] - c['a'])
            if best is None: best = v
    return best
ph_start = [min(c['o'] for c in C if c['pi'] == k) for k in range(len(PH))]
ph_end = [max(c['o'] + c['b'] - c['a'] for c in C if c['pi'] == k) for k in range(len(PH))]

# ---- face track (source time -> normalised face centre) ----
F = json.load(open(f'{S}/face.json'))
ft = np.array([f[0] for f in F]); ok = np.array([f[1] is not None for f in F])
fx = np.interp(ft, ft[ok], [f[1] for f in F if f[1] is not None])
fy = np.interp(ft, ft[ok], [f[2] for f in F if f[2] is not None])
# reject single-sample jumps (false detections), then smooth with a ~1.2s gaussian so the crop glides
from scipy.ndimage import median_filter, gaussian_filter1d
fx = gaussian_filter1d(median_filter(fx, 5, mode='nearest'), 2.0, mode='nearest')
fy = gaussian_filter1d(median_filter(fy, 5, mode='nearest'), 2.0, mode='nearest')
def lin(t0, d, arr):
    # piecewise-linear expression of the smoothed track over local piece time t (0..d)
    ts = np.arange(0, d + 0.25, 0.25); vs = np.interp(t0 + ts, ft, arr)
    e = f'{vs[-1]:.4f}'
    for k in range(len(ts) - 2, -1, -1):
        e = f"if(lt(on/30\\,{ts[k+1]:.2f})\\,{vs[k]:.4f}+({vs[k+1]-vs[k]:.4f})*(on/30-{ts[k]:.2f})/0.25\\,{e})"
    return e
def face_at(t0, t1):
    m = (ft >= t0 - 0.25) & (ft <= t1 + 0.25)
    if not m.any(): m = np.abs(ft - t0) == np.abs(ft - t0).min()
    return float(np.median(fx[m])), float(np.median(fy[m]))

# ---- shots: ~2.6s, cycling framings; cut at phrase starts when possible ----
FRAMES = [('M', 1.75, 0.37), ('C', 2.25, 0.39), ('W', 1.30, 0.34), ('C', 2.1, 0.39), ('M', 1.6, 0.36), ('W', 1.4, 0.35)]
SHOT = 2.6
bounds = [0.0]
for k in range(len(PH)):
    s0, s1 = ph_start[k], ph_end[k]
    if s0 - bounds[-1] > 1.4: bounds.append(s0)
    n = max(1, round((s1 - s0) / SHOT))
    for j in range(1, n): bounds.append(s0 + j * (s1 - s0) / n)
bounds = sorted(set(round(b, 4) for b in bounds if b < TOTAL - 0.8)) + [TOTAL]
pieces = []
for sid, (a0, a1) in enumerate(zip(bounds, bounds[1:])):
    cuts = sorted({a0, a1} | {c['o'] for c in C if a0 < c['o'] < a1})
    for x0, x1 in zip(cuts, cuts[1:]):
        if x1 - x0 < 0.02: continue
        c = next(c for c in C if c['o'] <= x0 + 1e-6 < c['o'] + c['b'] - c['a'] + 1e-6)
        st = c['a'] + (x0 - c['o'])
        pieces.append(dict(x0=x0, x1=x1, st=st, sid=sid, rel=x0 - a0, shl=a1 - a0))

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-2000:]); sys.exit(1)

TRANS = ['blur', 'glitch', 'zoom']
json.dump(dict(pieces=pieces), open(f'{WK}/pieces.json', 'w'))
if '--skip-video' not in sys.argv:
    from concurrent.futures import ThreadPoolExecutor
    jobs = []; prev = None
    for n, p in enumerate(pieces):
        d = p['x1'] - p['x0']; newshot = p['sid'] != prev; prev = p['sid']
        name, Z, ty = FRAMES[p['sid'] % len(FRAMES)]
        if not newshot: Z *= 1.08 if n % 2 else 0.94   # jump cut inside a shot: change size
        cx, cy = lin(p['st'], d, fx), lin(p['st'], d, fy)
        rel, shl = p['rel'], p['shl']
        tr = TRANS[p['sid'] % 3] if newshot and n else ''
        zexp = f"({Z}*(1+0.05*(({rel:.3f}+on/30)/{shl:.3f}))" + (f"*(1+0.30*max(0\\,1-(on/30)/0.22))" if tr == 'zoom' else '') + ")"
        fx_ = "boxblur=30:1:enable='lt(t,0.07)',boxblur=12:1:enable='between(t,0.07,0.17)'," if tr == 'blur' else \
              "rgbashift=rh=-18:bh=18:enable='lt(t,0.1)',noise=alls=40:allf=t:enable='lt(t,0.1)'," if tr == 'glitch' else ''
        vf = (f"zoompan=z='{zexp}':x='clip(({cx})*iw-iw/zoom/2\\,0\\,iw-iw/zoom)':y='clip(({cy})*ih-{ty}*ih/zoom\\,0\\,ih-ih/zoom)'"
              f":d=1:s=1080x1920:fps=30,{fx_}curves=all='0/0 0.5/0.46 0.85/0.76 1/0.86',"
              f"colorbalance=rs=0.04:bs=-0.06:rm=0.05:bm=-0.05:rh=0.02:bh=-0.04,eq=contrast=1.1:saturation=1.05,format=yuv420p")
        f = f'{WK}/p/v{n:03d}.mp4'
        if not os.path.exists(f):
            jobs.append(['ffmpeg', '-v', 'error', '-y', '-ss', f"{p['st']:.3f}", '-i', A, '-t', f'{d:.3f}', '-an',
                         '-vf', vf, '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-r', '30', f])
    with ThreadPoolExecutor(2) as ex:
        for i, _ in enumerate(ex.map(run, jobs)):
            if i % 10 == 0: print('v', i, len(jobs), flush=True)
    L = []
    for n, p in enumerate(pieces):
        f = f'{WK}/p/v{n:03d}.mp4'; N = round(p['x1'] * 30) - round(p['x0'] * 30)
        if N <= 0: continue
        M = int(subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries',
                                'stream=nb_read_packets', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip())
        if M < N:
            run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-vf', f'tpad=stop_mode=clone:stop={N - M + 1}', '-c:v', 'libx264',
                 '-preset', 'fast', '-crf', '16', f + '.pad.mp4'])
            os.replace(f + '.pad.mp4', f)
        L.append(f"file '{f}'\noutpoint {N/30:.6f}\n")
    open(f'{WK}/v.txt', 'w').write(''.join(L))
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{WK}/v.txt', '-c:v', 'libx264', '-preset', 'fast',
         '-crf', '16', '-r', '30', f'{WK}/video.mp4'])

# ---------- voice ----------
def load(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-af', 'highpass=f=80,afftdn=nf=-25', '-f', 's16le', '-ac', '2',
                        '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(r.stdout, '<i2').reshape(-1, 2).astype(np.float64) / 32768
N = int((TOTAL + 0.5) * SR); voice = np.zeros((N, 2)); full = load(A)
for c in C:
    i, j = int(c['a'] * SR), int(c['b'] * SR); seg = full[i:j].copy(); L = len(seg)
    f = min(int(0.012 * SR), L // 2); r = np.linspace(0, 1, f)[:, None]; seg[:f] *= r; seg[-f:] *= r[::-1]
    o = int(c['o'] * SR); voice[o:o + L] += seg[:N - o]
pk = np.percentile(np.abs(voice), 99.9); voice = np.tanh(voice / pk * 1.2) * 0.8

kept = [i for (a, b) in PH for i in range(a, b + 1)]
json.dump(dict(total=TOTAL, ph=PH, ph_start=ph_start, ph_end=ph_end,
               wt={i: o_of(wst(i)) for i in kept}, we={i: o_of(wen(i)) for i in kept},
               shots=[p['x0'] for p in pieces if p['rel'] < 1e-6 and p['x0'] > 0]),
          open(f'{WK}/data.json', 'w'))
np.save(f'{WK}/voice.npy', voice.astype(np.float32))
print('stage1 ok', TOTAL)
