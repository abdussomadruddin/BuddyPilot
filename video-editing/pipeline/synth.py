import numpy as np, wave, os, sys
SR = 48000
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def save(name, x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1: x = np.stack([x, x], 1)
    pk = np.max(np.abs(x)) or 1; x = x / pk * 0.89
    with wave.open(f'{OUT}/{name}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())

def t(d): return np.arange(int(SR * d)) / SR
def env(n, a, r):
    e = np.ones(n); A = int(SR*a); R = int(SR*r)
    if A: e[:A] = np.linspace(0, 1, A)
    if R: e[-R:] *= np.linspace(1, 0, R) ** 2
    return e
def lp(x, k):  # one-pole lowpass, k in (0,1)
    y = np.zeros_like(x); s = 0
    for i, v in enumerate(x): s += k * (v - s); y[i] = s
    return y
def bandnoise(n, f0, f1):
    X = np.fft.rfft(rng.standard_normal(n)); fr = np.fft.rfftfreq(n, 1/SR)
    X[(fr < f0) | (fr > f1)] = 0; return np.fft.irfft(X, n)

# --- SFX ---
d = 0.45; n = int(SR*d); tt = t(d)
# whoosh: noise with sweeping band
X = []; seg = 1024
for i in range(0, n, seg):
    p = i / n; fc = 300 + 5000 * np.sin(np.pi * p)
    X.append(bandnoise(seg, fc*0.6, fc*1.4))
wh = np.concatenate(X)[:n] * np.sin(np.pi * tt / d) ** 2
pan = np.linspace(-1, 1, n)
save('whoosh', np.stack([wh*(1-pan)/2, wh*(1+pan)/2], 1))
# pop
tt = t(0.12); f = 900 * np.exp(-tt*30) + 300
save('pop', np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt*40))
# hit / boom (sub kick + noise)
tt = t(0.9); f = 120*np.exp(-tt*8) + 40
save('hit', np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*4) + 0.3*bandnoise(len(tt), 50, 3000)*np.exp(-tt*25))
# cash ding (cha-ching)
tt = t(0.9)
ding = sum(np.sin(2*np.pi*fr*tt)*np.exp(-tt*k) for fr, k in [(2093, 5), (2637, 6), (3136, 7), (4186, 9)])
rattle = bandnoise(len(tt), 3000, 9000) * np.exp(-tt*30) * 0.6
save('cash', ding + rattle)
# riser 1.2s
d = 1.2; tt = t(d); f = 200 + 1800 * (tt/d) ** 2
save('riser', (0.5*np.sin(2*np.pi*np.cumsum(f)/SR) + bandnoise(len(tt), 500, 8000)*0.6) * (tt/d) ** 2)
# click / tick
tt = t(0.05); save('tick', bandnoise(len(tt), 2000, 8000) * np.exp(-tt*120))
# swoosh-up short (for text)
d = 0.25; tt = t(d); save('swish', bandnoise(len(tt), 2000, 10000) * np.sin(np.pi*tt/d) ** 3)

# --- MUSIC (128 BPM, A minor) ---
BPM = 128; beat = 60 / BPM
def kick(): tt = t(0.35); f = 150*np.exp(-tt*25)+45; return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*9)
def snare(): tt = t(0.25); return bandnoise(len(tt), 200, 8000)*np.exp(-tt*18)*0.6 + np.sin(2*np.pi*190*tt)*np.exp(-tt*25)*0.4
def hat(): tt = t(0.06); return bandnoise(len(tt), 6000, 15000)*np.exp(-tt*70)*0.35
def saw(fr, d):
    tt = t(d); return 2*((fr*tt) % 1) - 1
def pluck(fr, d):
    tt = t(d); x = sum(saw(fr*m, d) * g for m, g in [(1, 1), (1.005, .6), (2, .25)]); return lp(x * np.exp(-tt*6), 0.18)
def bassn(fr, d):
    tt = t(d); return np.tanh(2*np.sin(2*np.pi*fr*tt)) * env(len(tt), .005, .05)
def pad(frs, d):
    tt = t(d); x = sum(saw(f, d) + saw(f*1.004, d) for f in frs); return lp(x, 0.03) * env(len(tt), .3, .4)

def add(buf, x, at):
    i = int(at*SR); j = min(len(buf), i+len(x)); buf[i:j] += x[:j-i]

prog = [(220.0, [220, 261.6, 329.6]), (174.6, [174.6, 220, 261.6]), (130.8, [130.8, 164.8, 196]), (196.0, [196, 246.9, 293.7])]  # Am F C G
arp = [0, 2, 1, 2, 0, 2, 1, 2]
def section(bars, drums=True, full=True, buildup=False):
    L = bars*4*beat; buf = np.zeros(int(L*SR)+SR)
    for b in range(bars):
        root, ch = prog[b % 4]; t0 = b*4*beat
        add(buf, pad([c for c in ch], 4*beat) * 0.10, t0)
        for s in range(8):
            if full or s % 2 == 0: add(buf, pluck(ch[arp[s]]*2, beat/2) * 0.16, t0 + s*beat/2)
        for q in range(4):
            if full: add(buf, bassn(root/2, beat*0.45) * 0.30, t0 + q*beat + beat/2)
            if drums:
                add(buf, kick() * 0.9, t0 + q*beat)
                if q in (1, 3): add(buf, snare() * 0.5, t0 + q*beat)
            for h in range(2): add(buf, hat(), t0 + q*beat + h*beat/2 + beat/4*0)
        if buildup and b == bars-1:
            for k in range(8): add(buf, snare()*0.15*(k+1)/8*3, t0 + k*beat/2)
    return buf[:int(L*SR)]

save('music_intro', section(4, drums=False, full=False, buildup=True))   # ~7.5s soft build
save('music_main', section(8, drums=True, full=True))                   # 15s loop
save('music_outro', section(4, drums=True, full=False))                 # 7.5s
print('ok')
