"""Stage 2: motion graphics (HyperFrames HTML) + SFX/music mix keyed to word timestamps."""
import json, subprocess, wave, os
import numpy as np
S = '/tmp/claude-0/-home-user-BuddyPilot/5f8f0aae-2815-55c9-8476-f5202601522e/scratchpad'
WK = f'{S}/full'; HF = f'{S}/hf/full'
D = json.load(open(f'{WK}/data.json')); PS, PE = D['ph_start'], D['ph_end']; TOT = round(D['total'], 3)
WT = {int(k): v for k, v in D['wt'].items()}; WE = {int(k): v for k, v in D['we'].items()}
words = json.load(open(f'{S}/work/words.json'))
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
title(0, 'JANGAN BELI', 'HONDA', 0, 2, c2='r'); tag(0, 'kalau tak tahu <b>PROMO BULAN NI</b>', 8, top=24); sfx.append(('hit', 0.0, .5)); shake(0.05)
title(1, 'PROMO', 'SANGAT WOW', 12, 21)
money(2, 'REBATE CITY', 29, 7000, t0=T(24))
tag(3, 'yang best: ada <b>TRADE-IN?</b>', 44, top=10)
title(4, 'VALUE', 'TERTINGGI', 58, 60); tag(4, 'kita cek kereta lama korang', 62, top=25)
money(5, 'EXTRA TRADE-IN', 69, 2000, prefix='+RM', t0=T(66))
card([('Rebate', 'RM4,000', 93, ''), ('+ Trade-in', 'RM2,000', 105, 'y')], PS[6], PE[7], 'CITY <b>HATCHBACK</b>', total=(107, 109, 'TOTAL RM', 6000))
money(8, 'CITY TOTAL', 117, 9000, prefix='RM', t0=T(114))
tag(9, '*untuk yang <b>TRADE-IN</b> sahaja', 124, top=10)
tag(10, 'TAK NAK <b>TRADE-IN?</b>', 133, top=10)
title(11, 'APA KORANG', 'DAPAT?', 148, 152)
vc = clip(T(161) - 0.2, PE[12], 'voucher', '<div class="vt">SERVICE VOUCHER</div><div class="vv" id="vvn">RM0</div><div class="vs">ganti RM2,000 trade-in</div>', 'top:6%', track=4)
an.append(f'tl.from("#{vc}",{{rotation:-12,scale:0.3,opacity:0,duration:0.45,ease:"back.out(1.8)"}},{r(T(161) - 0.2)});')
counter('#vvn', T(161), T(164) + 0.3, 3000); sfx += [('whoosh', T(161) - 0.2, .3), ('cash', T(164), .45)]; shake(T(164))
title(13, 'TAK PERLU', 'KELUAR DUIT', 182, 185)
title(14, 'BOLEH GUNA', '5 TAHUN', 205, 208)
title(15, 'TAK PENING', 'KEPALA', 218, 222)
# warranty timeline spans 16-19
ws, we_ = T(224), PE[19]
a = clip(ws, we_, 'cap big w', 'WARRANTY', 'top:7%'); pop(a, ws); sfx.append(('riser', ws - 1.2, .3)); sfx.append(('hit', ws, .45))
tlid = clip(ws + 0.2, we_, 'tline', ''.join(f'<i>{y}</i>' for y in range(1, 9)) + '<div class="tfill" id="tfill"></div>', 'top:15.5%', track=4)
fill_d = max(0.6, T(229) - ws - 0.2)
an.append(f'tl.from("#{tlid}",{{opacity:0,y:30,duration:0.25}},{r(ws + 0.2)});')
an.append(f'tl.fromTo("#tfill",{{scaleX:0}},{{scaleX:1,duration:{r(fill_d)},ease:"power1.inOut"}},{r(ws + 0.3)});')
for y in range(8):
    tt = ws + 0.3 + y * fill_d / 8; an.append(f'tl.from("#{tlid} i:nth-child({y+1})",{{scale:0,opacity:0,duration:0.15,ease:"back.out(3)"}},{r(tt)});'); sfx.append(('tick', tt, .35))
b = clip(T(229), we_, 'cap huge y', '8 TAHUN', 'top:21.5%'); pop(b, T(229)); sfx.append(('hit', T(229), .4)); shake(T(229))
tag(17, 'bukan 5, bukan 6 — <b>8 TAHUN</b>', 231, top=33, end=PE[17])
tag(18, '<b>∞</b> UNLIMITED MILEAGE', 246, top=33, end=PE[18])
tag(19, '<b>1 – 2 JUTA</b> mileage pun cover', 249, top=33, end=PE[19])
flash(PS[20])
bt = clip(T(263), PE[22], 'batt', '<div class="bfill" id="bfill"></div><div class="bcap"></div><div class="btxt">HYBRID BATTERY</div>', 'top:6%', track=4)
an.append(f'tl.from("#{bt}",{{opacity:0,scale:0.5,duration:0.3,ease:"back.out(2)"}},{r(T(263))});')
an.append(f'tl.fromTo("#bfill",{{scaleX:0}},{{scaleX:1,duration:{r(max(0.6, T(270) - T(263) - 0.2))},ease:"power2.inOut"}},{r(T(263) + 0.2)});')
b = clip(T(270), PE[22], 'cap huge y', '10 TAHUN', 'top:18.5%'); pop(b, T(270)); sfx.append(('hit', T(270), .4)); shake(T(270))
tag(21, 'mana ada <b>BRAND LAIN</b>?', 272, top=30, end=PE[21])
tag(22, 'Honda <b>SATU-SATUNYA</b>', 284, top=30, end=PE[22])
title(23, 'APA KITA', 'BAGI?', 303, 307)
card([('Rebate City', 'RM7,000', 319, ''), ('+ Trade-in', 'RM2,000', 327, 'y'), ('+ Pembeli pertama', 'RM3,000', 336, 'y')],
     PS[24], PE[27], 'RECAP <b>REBATE</b>', total=('text', 342, 'RM9K – RM10K'))
checklist('PERCUMA <b>DENGAN KERETA</b>', [('Free gift penuh bonnet', 351), ('Tinted siap pasang', 381), ('Lulus spec JPJ', 393),
          ('Warranty tinted 3 tahun', 406), ('Premium grade', 416)], PS[28], PE[34])
tag(29, 'tak perlu ke <b>KEDAI AKSESORI</b>', 363, top=44, end=PE[29])
tag(31, 'gelap atau cerah — <b>IKUT KORANG</b>', 382, top=44, end=PE[31])
flash(PS[35])
checklist('BONUS <b>LAGI</b>', [('Dashcam', 425), ('Goodies bag 10 barang', 443), ('Payung x2', 446), ('Minyak penuh', 454),
          ('Duit minyak', 458)], PS[35], PE[39])
tag(39, 'terus boleh <b>JALAN-JALAN</b>', 475, top=44, end=PE[39])
title(40, 'YEAR END', 'SALE', 504, 505, c2='r'); flash(PS[40])
title(41, 'TRADE-IN', 'LAMA → BARU', 518, 523, big2='big')
title(42, 'HONDA', '→ HONDA', 529, 531, c2='r')
title(43, 'REBATE', 'SANGAT TINGGI', 539, 540, big2='big')
title(44, 'FREE GIFT', '+ AKSESORI', 543, 548, big2='big')
title(45, 'TAK PERLU RISAU', 'AKU BAGI SIAP', 558, 571, big2='big')
# CTA
c0 = PS[46]
a = clip(T(574), TOT, 'cap big w', 'KLIK BUTANG', 'top:52%'); pop(a, T(574)); sfx.append(('hit', T(574), .45)); shake(T(574))
b = clip(T(574) + 0.25, TOT, 'cap big y', 'DI BAWAH', 'top:58%'); pop(b, T(574) + 0.25)
ar = clip(T(574) + 0.4, TOT, 'arrow', '↓', 'top:64%')
an.append(f'tl.from("#{ar}",{{opacity:0,duration:0.2}},{r(T(574) + 0.4)});')
an.append(f'tl.to("#{ar}",{{y:40,duration:0.3,repeat:{int((TOT - T(574)) / 0.3)},yoyo:true,ease:"sine.inOut"}},{r(T(574) + 0.6)});')
wa = clip(T(579) - 0.3, TOT, 'wa', 'WhatsApp sekarang', 'top:72%'); pop(wa, T(579) - 0.3); sfx.append(('pop', T(579) - 0.3, .4))

# ---- word captions ----
FIX = {'wasabi': 'WhatsApp', 'hasbat': 'hatchback', 'track': 'trade', 'tray': 'trade', 'in': 'in'}
cap = []
for k, (i0, i1) in enumerate(PH):
    if k == len(PH) - 1: break
    for i in range(i0, i1 + 1):
        t = words[i][2].strip()
        if i in (208, 209):  # verified by isolated re-transcription: "hingga 5 tahun"
            if i == 208: cap.append(dict(w='5', s=WT[i], e=WE[i], k=k))
            else: cap.append(dict(w='tahun', s=WT[i], e=WE[i], k=k))
            continue
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
sec = [(0, PS[1], 'intro'), (PS[1], PS[16], main), (PS[16], PS[23], outro), (PS[23], PS[46], main), (PS[46], TOT + 0.5, outro)]
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
