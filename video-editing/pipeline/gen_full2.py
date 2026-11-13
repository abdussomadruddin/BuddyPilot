"""Stage 2: motion graphics (HyperFrames HTML) + SFX/music mix keyed to word timestamps."""
import json, subprocess, wave, os
import numpy as np
S = '/tmp/claude-0/-home-user-BuddyPilot/5f8f0aae-2815-55c9-8476-f5202601522e/scratchpad'
WK = f'{S}/full2'; HF = f'{S}/hf/full2'
D = json.load(open(f'{WK}/data.json')); PS, PE = D['ph_start'], D['ph_end']; TOT = round(D['total'], 3)
WT = {int(k): v for k, v in D['wt'].items()}; WE = {int(k): v for k, v in D['we'].items()}
words = json.load(open(f'{S}/work/words0851.json'))
PH = D['ph']; r = lambda x: round(x, 3)
def ph_of(i): return next(k for k, (a, b) in enumerate(PH) if a <= i <= b)
def T(i): return WT[i]

els, an, sfx = [], [], []
uid = [0]
def nid(p='e'): uid[0] += 1; return f'{p}{uid[0]}'
def clip(start, end, cls, inner='', style='', track=3):
    i = nid(); els.append(f'<div id="{i}" class="clip {cls}" data-start="{r(start)}" data-duration="{r(max(0.1, end-start))}" data-track-index="{track}" style="{style}">{inner}</div>'); return i
def pop(i, t): an.append(f'tl.from("#{i}",{{opacity:0,y:50,scale:1.4,filter:"blur(10px)",duration:0.3,ease:"back.out(2.2)"}},{r(t)});')
def slide(i, t, x=-700): an.append(f'tl.from("#{i}",{{x:{x},opacity:0,duration:0.32,ease:"power3.out"}},{r(t)});')
def counter(sel, t0, t1, to, prefix='RM'):
    an.append(f'(function(){{const o={{v:0}};const el=document.querySelector("{sel}");tl.fromTo(o,{{v:0}},{{v:{to},duration:{r(max(0.4, t1-t0))},ease:"power2.out",'
              f'onUpdate:()=>{{el.textContent="{prefix}"+Math.round(o.v).toLocaleString("en-US");}}}},{r(t0)});}})();')
def shake(t, a=18): an.append(f'tl.to("#base",{{keyframes:[{{x:{a},y:-{a//2}}},{{x:-{a},y:{a//2}}},{{x:{a//2},y:0}},{{x:0,y:0}}],duration:0.24,ease:"none"}},{r(t)});')
def flash(t):
    i = clip(t, t + 0.18, 'flash', track=8); an.append(f'tl.fromTo("#{i}",{{opacity:0.55}},{{opacity:0,duration:0.18}},{r(t)});')

# ---- building blocks ----
def title(k, l1, l2=None, w1=None, w2=None, c2='y', end=None, big2='huge'):
    end = end or PE[k]; t1 = T(w1) if w1 is not None else PS[k]
    a = clip(t1, end, 'cap big w', l1, 'top:8%'); pop(a, t1); sfx.append(('pop', t1, .35))
    if l2:
        t2 = T(w2) if w2 is not None else t1 + 0.3
        b = clip(t2, end, f'cap {big2} {c2}', l2, 'top:13.5%'); pop(b, t2); sfx.append(('hit' if big2 == 'huge' else 'swish', t2, .35)); shake(t2, 12)
def money(k, label, wnum, val, prefix='RM', end=None, t0=None):
    end = end or PE[k]; t0 = t0 if t0 is not None else PS[k]
    a = clip(t0, end, 'cap big w', label, 'top:8%'); pop(a, t0)
    b = clip(t0 + 0.2, end, 'cap huge y', prefix + '0', 'top:13.5%'); pop(b, t0 + 0.2)
    counter(f'#{b}', t0 + 0.2, T(wnum) + 0.3, val, prefix); sfx.append(('cash', T(wnum), .42)); shake(T(wnum)); sfx.append(('pop', t0, .3))
def tag(k, html, w, top=25, end=None):
    t = T(w); a = clip(t, end or PE[k], 'tag', html, f'top:{top}%'); slide(a, t); sfx.append(('swish', t, .3))
def card(rows, start, end, head, total=None):
    """rows: (label, value_text, word, cls). total: (word_start, word_hit, prefix, value) or ('text', word, html)"""
    h = 7.5 + 6.5 * len(rows) + (9 if total else 0)
    bg = clip(start, end, 'card', '', f'top:5%;height:{h}%', track=2)
    an.append(f'tl.from("#{bg}",{{scaleY:0,opacity:0,duration:0.3,ease:"power3.out",transformOrigin:"50% 0%"}},{r(start)});')
    hd = clip(start, end, 'eqh', head, 'top:7%', track=4); pop(hd, start)
    for n, (lab, val, w, cls) in enumerate(rows):
        t = T(w) if w is not None else start + 0.3
        e = clip(t, end, f'eqrow {cls}', f'<span>{lab}</span><span>{val}</span>', f'top:{13 + n * 6.5}%', track=4); slide(e, t, 700 if n % 2 else -700)
        sfx.append(('cash' if 'RM' in val else 'pop', t, .32))
    if total:
        y = 13 + len(rows) * 6.5
        ln = clip(T(total[1]) - 0.4, end, 'eqline', '', f'top:{y}%', track=4)
        an.append(f'tl.from("#{ln}",{{scaleX:0,duration:0.3,ease:"power2.out"}},{r(T(total[1]) - 0.4)});')
        if total[0] == 'text':
            tt = clip(T(total[1]), end, 'eqtot', total[2], f'top:{y + 1}%', track=4); pop(tt, T(total[1]))
        else:
            tt = clip(T(total[0]), end, 'eqtot', total[2] + '0', f'top:{y + 1}%', track=4); pop(tt, T(total[0]))
            counter(f'#{tt}', T(total[0]), T(total[1]) + 0.3, total[3], total[2])
        sfx.append(('cash', T(total[1]), .45)); shake(T(total[1])); flash(T(total[1]))
def checklist(head, items, start, end):
    hd = clip(start, end, 'eqh', head, 'top:7%', track=4); pop(hd, start)
    for n, (txt, w) in enumerate(items):
        t = T(w); c = clip(t, end, 'ckrow', f'<em>✓</em>{txt}', f'top:{12.5 + n * 5.4}%', track=4); slide(c, t)
        an.append(f'tl.from("#{c} em",{{scale:0,rotation:-90,duration:0.3,ease:"back.out(3)"}},{r(t + 0.15)});')
        sfx.append(('tick', t, .6)); sfx.append(('swish', t, .22))

P = {i: k for k, (a, b) in enumerate(PH) for i in [a]}
K = lambda w: ph_of(w)
# ---- scene graphics (keyed to words actually spoken) ----
title(0, 'HONDA', 'TAK BIJAK?', 3, 9, c2='r'); sfx.append(('hit', 0.0, .5)); shake(0.05)
tag(1, 'kenapa?', 14, top=24)
tag(2, 'warranty sampai <b>8 TAHUN</b>?!', 26, top=24)
title(3, 'RAMAI CONDEMN', 'TAK RELIABLE?', 35, 41, c2='r', big2='big')
title(4, 'KALAU TAK RELIABLE', 'KENAPA 8 TAHUN?', 44, 55, big2='big')
title(5, 'CONFIDENT', 'DENGAN BARANG', 64, 66, big2='big')
tag(6, 'SA Honda: <b>TAK TAKUT LANGSUNG</b>', 78, top=10)
title(7, 'WARRANTY', 'SATU MALAYSIA', 94, 98, big2='big')
checklist('CENTER SERVIS <b>SELURUH NEGARA</b>', [('Perak', 104), ('Perlis', 105), ('Kedah', 106), ('Johor', 107), ('Semua negeri', 108)], PS[8], PE[8])
title(9, 'MILEAGE', '1 JUTA', 124, 126)
card([('Dah pakai', '7 tahun', 132, ''), ('Mileage', '1 juta', 136, 'y')], PS[10], PE[10], 'NAK <b>CLAIM</b>?', total=('text', 141, 'BOLEH ✓'))
tag(10, 'selagi bawah <b>8 TAHUN</b>', 147, top=40, end=PE[10])
tag(11, 'City Hatchback <b>HYBRID</b>', 158, top=10)
title(12, 'HYBRID', 'BANYAK MASALAH?', 166, 168, c2='r', big2='big')
title(13, 'HYBRID SEKARANG', 'DAH LAIN', 176, 183)
tag(14, 'takut <b>BATERI PROBLEM</b>?', 194, top=10)
bt = clip(T(215), PE[17], 'batt', '<div class="bfill" id="bfill"></div><div class="bcap"></div><div class="btxt">HYBRID BATTERY</div>', 'top:6%', track=4)
an.append(f'tl.from("#{bt}",{{opacity:0,scale:0.5,duration:0.3,ease:"back.out(2)"}},{r(T(215))});')
an.append(f'tl.fromTo("#bfill",{{scaleX:0}},{{scaleX:1,duration:{r(max(0.6, T(229) - T(215) - 0.2))},ease:"power2.inOut"}},{r(T(215) + 0.2)});')
b = clip(T(229), PE[17], 'cap huge y', '10 TAHUN', 'top:18.5%'); pop(b, T(229)); sfx.append(('hit', T(229), .45)); shake(T(229)); flash(T(229))
tag(15, 'bukan 5, bukan 6', 219, top=30, end=T(229) - 0.05)
tag(16, 'loan 9 tahun pun <b>COVERED</b>', 234, top=30, end=PE[16])
tag(17, '<b>PEACE OF MIND</b>', 273, top=30, end=PE[17])
card([('General warranty', '8 TAHUN', 291, 'y')], PS[18], PE[19], 'CITY HATCHBACK <b>HYBRID</b>')
card([('Brand lain', '5–7 tahun', 312, ''), ('Capping mileage', '100 ribu', 346, ''), ('Honda', '8 tahun', 353, 'y')],
     PS[20], PE[22], 'BANDING <b>WARRANTY</b>', total=('text', 355, '∞ UNLIMITED'))
title(23, 'MEMANG', 'RELIABLE', 360, 367)
title(24, 'SEKALI PAKAI', 'CARI HONDA BALIK', 369, 376, big2='big'); tag(24, 'tak pening <b>spare part & servis</b>', 382, top=25)
tag(25, 'berminat? <b>TENGOK SAMPAI HABIS</b>', 394, top=10)
card([('General warranty', '8 TAHUN', 421, ''), ('Bateri hybrid', '10 TAHUN', 427, 'y')], PS[26], PE[27], 'RECAP <b>WARRANTY</b>', total=('text', 431, 'HONDA YAKIN'))
title(28, 'DEAL PALING BEST', 'PENUH BONNET', 456, 459, big2='big'); flash(PS[28])
checklist('PERCUMA <b>DENGAN KERETA</b>', [('Tinted siap pasang', 480), ('Gelap / spec JPJ ikut korang', 489), ('Dashcam', 504),
          ('Payung x2', 532), ('10 merchandise Honda', 536)], PS[29], PE[34])
tag(32, 'tagline aku: <b>CONFIRM PENUH BONNET</b>', 519, top=44, end=PE[32])
flash(PS[35])
card([('Terawal', 'RM600', 554, 'y'), ('Lepas tu', 'RM40', 560, ''), ('+ Free labour', '5 kali', 569, '')], PS[35], PE[35], 'SERVICE VOUCHER <b>3 JENIS</b>')
vc = clip(T(577) - 0.2, PE[37], 'voucher', '<div class="vt">SERVICE VOUCHER</div><div class="vv" id="vvn">RM0</div><div class="vs">macam free servis 5 tahun</div>', 'top:6%', track=4)
an.append(f'tl.from("#{vc}",{{rotation:-12,scale:0.3,opacity:0,duration:0.45,ease:"back.out(1.8)"}},{r(T(577) - 0.2)});')
counter('#vvn', T(577), T(579) + 0.3, 3000); sfx += [('whoosh', T(577) - 0.2, .3), ('cash', T(579), .45)]; shake(T(579))
title(38, 'WARRANTY', '8 + 10 TAHUN', 594, 598); tag(38, 'memang <b>GILA</b> Honda ni', 601, top=25); flash(PS[38])
# CTA
a = clip(T(604), TOT, 'cap big w', 'TEKAN BUTANG', 'top:52%'); pop(a, T(604)); sfx.append(('hit', T(604), .45)); shake(T(604))
b = clip(T(604) + 0.2, TOT, 'cap big y', 'DI BAWAH', 'top:58%'); pop(b, T(604) + 0.2)
ar = clip(T(604) + 0.35, TOT, 'arrow', '↓', 'top:64%')
an.append(f'tl.from("#{ar}",{{opacity:0,duration:0.2}},{r(T(604) + 0.35)});')
an.append(f'tl.to("#{ar}",{{y:40,duration:0.3,repeat:{max(1, int((TOT - T(604)) / 0.3))},yoyo:true,ease:"sine.inOut"}},{r(T(604) + 0.5)});')

# ---- word captions ----
FIX = {'tamar': 'Tambah', 'ash': 'hatch', 'bag': 'back', 'mercendise': 'merchandise', 'center': 'center', 'puntut': ''}
cap = []
for k, (i0, i1) in enumerate(PH):
    if k == len(PH) - 1: break
    for i in range(i0, i1 + 1):
        t = words[i][2].strip()
        if (t.startswith(',') or t.startswith('-')) and cap and cap[-1]['k'] == k:
            cap[-1]['w'] += t.rstrip('.,?'); cap[-1]['e'] = WE[i]; continue
        t = t.strip('.,?'); t = FIX.get(t.lower(), t)
        if t.lower() == 'in' and cap and cap[-1]['w'].lower() == 'trade': cap[-1]['w'] = 'trade-in'; cap[-1]['e'] = WE[i]; continue
        cap.append(dict(w=t, s=WT[i], e=WE[i], k=k))
groups, g = [], []
for w in cap:
    if g and (len(g) == 3 or w['k'] != g[-1]['k'] or w['s'] - g[-1]['e'] > 0.5): groups.append(g); g = []
    g.append(w)
groups.append(g)
for gi, g in enumerate(groups):
    s = g[0]['s'] - 0.05; e = g[-1]['e'] + 0.25
    if gi + 1 < len(groups): e = min(e, groups[gi+1][0]['s'] - 0.06)
    inner = ' '.join(f'<span id="w{gi}_{j}">{w["w"]}</span>' for j, w in enumerate(g))
    i = clip(s, e, 'sub', inner, 'top:74%', track=6)
    an.append(f'tl.from("#{i}",{{scale:0.8,opacity:0,duration:0.12,ease:"power2.out"}},{r(s)});')
    for j, w in enumerate(g):
        an.append(f'tl.to("#w{gi}_{j}",{{color:"#ffd400",scale:1.12,duration:0.06}},{r(w["s"])});')
        an.append(f'tl.to("#w{gi}_{j}",{{color:"#ffffff",scale:1,duration:0.06}},{r(max(w["e"], w["s"] + 0.12))});')

css = open(f'{S}/full_style.css').read()
html = f'''<!doctype html>
<html lang="ms" data-resolution="portrait">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="gsap.min.js"></script><style>{css}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOT}" data-width="1080" data-height="1920">
<video id="base" class="clip" src="base.mp4" playsinline data-start="0" data-duration="{TOT}" data-track-index="0" data-has-audio="true" style="position:absolute;inset:-30px;width:1140px;height:1980px;object-fit:cover"></video>
<div id="scrim" class="clip scrim" data-start="0" data-duration="{TOT}" data-track-index="1"></div>
<div id="scrimb" class="clip scrimb" data-start="0" data-duration="{TOT}" data-track-index="1"></div>
{chr(10).join(els)}
<div id="bar" class="clip bar" data-start="0" data-duration="{TOT}" data-track-index="9"></div>
</div>
<script>
window.__timelines = window.__timelines || {{}};
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(an)}
tl.fromTo("#bar",{{scaleX:0}},{{scaleX:1,duration:{TOT},ease:"none"}},0);
window.__timelines["main"] = tl;
</script>
</body></html>'''
os.makedirs(HF, exist_ok=True); open(f'{HF}/index.html', 'w').write(html)

# ---- audio mix: voice + scene music + sfx ----
SR = 48000
def load(p):
    rr = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(rr.stdout, '<i2').reshape(-1, 2).astype(np.float64) / 32768
voice = np.load(f'{WK}/voice.npy').astype(np.float64); N = len(voice)
FX = {k: load(f'{S}/audio/{k}.wav') for k in ['whoosh', 'pop', 'hit', 'cash', 'riser', 'tick', 'swish']}
fx = np.zeros((N, 2))
for t in D['shots']: sfx.append(('whoosh', t - 0.12, .28))
for name, t, g in sfx:
    x = FX[name] * g; i = int(max(t, 0) * SR); j = min(N, i + len(x)); fx[i:j] += x[:j-i]
intro, main, outro = (load(f'{S}/audio/{n}.wav') for n in ['music_intro', 'music_main', 'music_outro'])
# scene map: intro(hook) | main(offers) | breakdown=outro loop (warranty/battery, calmer) | main(gifts) | outro(CTA)
sec = [(0, PS[2], 'intro'), (PS[2], PS[11], main), (PS[11], PS[23], outro), (PS[23], PS[39], main), (PS[39], TOT + 0.5, outro)]
mus = np.zeros((N, 2))
for a, b, src in sec:
    i, j = int(a * SR), min(N, int(b * SR))
    if isinstance(src, str):
        x = intro[-(j - i):] if j - i <= len(intro) else np.vstack([np.zeros((j - i - len(intro), 2)), intro])
    else:
        x = np.tile(src, (int((j - i) / len(src)) + 2, 1))[:j - i]
    x = x.copy(); f = int(0.04 * SR); x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
    mus[i:j] += x
    if a > 0: sfx_i = i  # transitions get a riser
for a, _, _ in sec[1:]:
    x = FX['riser'] * .3; i = int(max(a - 1.2, 0) * SR); j = min(N, i + len(x)); fx[i:j] += x[:j-i]
mus[-SR:] *= np.linspace(1, 0, SR)[:, None] ** 2
env = np.abs(voice).mean(1); k = int(0.03 * SR); env = np.convolve(env, np.ones(k) / k, 'same')
duck = 1 - 0.55 * np.clip(env / (np.percentile(env, 90) + 1e-9), 0, 1)
mix = np.tanh((voice + mus * 0.16 * duck[:, None] + fx * 0.9) * 1.1) * 0.9
with wave.open(f'{WK}/mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{WK}/video.mp4', '-i', f'{WK}/mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-t', f'{TOT:.3f}', f'{HF}/base.mp4'], check=True)
ev = sorted(set([0] + D['shots'] + [t for _, t, _ in sfx] + [TOT])); gaps = [b - a for a, b in zip(ev, ev[1:])]
print('ok', TOT, 'clips', len(els), 'tweens', len(an), 'sfx', len(sfx), 'max event gap %.2f' % max(gaps))
