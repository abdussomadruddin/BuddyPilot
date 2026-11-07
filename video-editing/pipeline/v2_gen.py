"""V2 stage 2: kinetic typography (white sans + red serif-italic keywords), full-screen cards, icon orbs,
top badges/counters, SFX + music mix. Usage: python3 v2_gen.py <workdir> <hyperframes project dir>"""
import json, subprocess, wave, os, re, sys
import numpy as np
S, HF = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
PIPE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.join(os.path.dirname(S.rstrip('/')), 'audio')
WK = f'{S}/cut'
D = json.load(open(f'{WK}/data.json')); TOT = round(D['total'], 3)
WT = {int(k): v for k, v in D['wt'].items() if v is not None}; WE = {int(k): v for k, v in D['we'].items() if v is not None}
words = json.load(open(f'{S}/words.json')); PH = D['ph']
r = lambda x: round(x, 3)
T = lambda i: WT[i]; E = lambda i: WE[i]

els, an, sfx = [], [], []
uid = [0]
def nid(p='e'): uid[0] += 1; return f'{p}{uid[0]}'
def clip(start, end, cls, inner='', style='', track=3, eid=None):
    i = eid or nid()
    els.append(f'<div id="{i}" class="clip {cls}" data-start="{r(start)}" data-duration="{r(max(0.1, end - start))}" '
               f'data-track-index="{track}" style="z-index:{track};{style}">{inner}</div>'); return i
def A(s): an.append(s)
def pop(sel, t, d=0.3): A(f'tl.from("{sel}",{{opacity:0,y:40,scale:1.3,filter:"blur(10px)",duration:{d},ease:"back.out(2)"}},{r(t)});')
def out(sel, t): A(f'tl.to("{sel}",{{opacity:0,filter:"blur(12px)",duration:0.14,ease:"power1.in"}},{r(t)});')
def flash(t, a=0.5):
    i = clip(t, t + 0.2, 'flash', track=9); A(f'tl.fromTo("#{i}",{{opacity:{a}}},{{opacity:0,duration:0.2}},{r(t)});')
def counter(sel, t0, t1, to, prefix='', suffix=''):
    A(f'(function(){{const o={{v:0}};const el=document.querySelector("{sel}");tl.fromTo(o,{{v:0}},{{v:{to},duration:{r(max(0.35, t1 - t0))},'
      f'ease:"power2.out",onUpdate:()=>{{el.textContent="{prefix}"+Math.round(o.v).toLocaleString("en-US")+"{suffix}";}}}},{r(t0)});}})();')
def shake(t, a=14): A(f'tl.to("#base",{{keyframes:[{{x:{a},y:-{a//2}}},{{x:-{a},y:{a//2}}},{{x:{a//2},y:0}},{{x:0,y:0}}],duration:0.22,ease:"none"}},{r(t)});')

# ---------------- icons (inline SVG, white stroke) ----------------
P = 'fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'
ICON = {
 'shield': f'<svg viewBox="0 0 64 64"><path {P} d="M32 6 52 13v16c0 14-9 24-20 29C21 53 12 43 12 29V13z"/><path {P} d="m23 32 7 7 12-14"/></svg>',
 'battery': f'<svg viewBox="0 0 64 64"><rect {P} x="8" y="18" width="42" height="28" rx="5"/><path {P} d="M54 27v10M24 24l-5 9h10l-5 9"/></svg>',
 'car': f'<svg viewBox="0 0 64 64"><path {P} d="M8 40V31l6-12h36l6 12v9z"/><circle {P} cx="19" cy="42" r="5"/><circle {P} cx="45" cy="42" r="5"/><path {P} d="M14 30h36"/></svg>',
 'pin': f'<svg viewBox="0 0 64 64"><path {P} d="M32 58S14 38 14 25a18 18 0 0 1 36 0c0 13-18 33-18 33z"/><circle {P} cx="32" cy="25" r="6"/></svg>',
 'inf': f'<svg viewBox="0 0 64 64"><path {P} d="M32 32c-6-8-10-11-15-11a11 11 0 0 0 0 22c5 0 9-3 15-11s10-11 15-11a11 11 0 0 1 0 22c-5 0-9-3-15-11z"/></svg>',
 'money': f'<svg viewBox="0 0 64 64"><rect {P} x="6" y="16" width="52" height="32" rx="4"/><circle {P} cx="32" cy="32" r="8"/><path {P} d="M14 24v16M50 24v16"/></svg>',
 'gift': f'<svg viewBox="0 0 64 64"><rect {P} x="10" y="26" width="44" height="30" rx="3"/><path {P} d="M6 18h52v8H6zM32 18v38M32 18c-4-10-16-10-14-2 1 3 8 2 14 2zM32 18c4-10 16-10 14-2-1 3-8 2-14 2z"/></svg>',
 'cam': f'<svg viewBox="0 0 64 64"><rect {P} x="6" y="18" width="40" height="28" rx="5"/><path {P} d="m46 28 12-7v22l-12-7z"/><circle {P} cx="20" cy="32" r="3"/></svg>',
 'umb': f'<svg viewBox="0 0 64 64"><path {P} d="M6 32a26 26 0 0 1 52 0zM32 32v18a5 5 0 0 1-10 0M32 6v4"/></svg>',
 'wrench': f'<svg viewBox="0 0 64 64"><path {P} d="M40 8a14 14 0 0 0-13 19L9 45a5 5 0 0 0 7 7l18-18A14 14 0 0 0 53 21l-8 8-8-2-2-8 8-8z"/></svg>',
 'q': f'<svg viewBox="0 0 64 64"><path {P} d="M22 22a10 10 0 1 1 14 9c-3 2-4 4-4 8"/><circle cx="32" cy="50" r="3.5" fill="#fff"/></svg>',
 'warn': f'<svg viewBox="0 0 64 64"><path {P} d="M32 8 58 54H6z"/><path {P} d="M32 26v13"/><circle cx="32" cy="46" r="3.5" fill="#fff"/></svg>',
 'check': f'<svg viewBox="0 0 64 64"><path {P} d="m14 33 12 12 24-26"/></svg>',
 'heart': f'<svg viewBox="0 0 64 64"><path {P} d="M32 54S8 40 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 30-24 30z"/></svg>',
 'x': f'<svg viewBox="0 0 64 64"><path {P} d="M16 16l32 32M48 16 16 48"/></svg>',
 'tint': f'<svg viewBox="0 0 64 64"><path {P} d="M10 46 18 18h28l8 28z"/><path {P} d="M24 24l-4 16M34 24l-4 16"/></svg>',
}
def orb(name, grey=False): return f'<div class="orb{" grey" if grey else ""}">{ICON[name]}</div>'

# ---------------- word tokens ----------------
FIX = {130: 'Mileage', 132: '', 142: 'mileage', 161: 'hujung', 166: 'City', 167: 'Hatchback', 293: 'City', 306: 'ada cerita',
       501: 'Spec', 516: 'dashcam', 517: '', 548: 'merchandise', 554: 'voucher', 570: 'voucher', 576: 'voucher',
       592: 'voucher', 593: 'RM3,000', 584: 'labour', 71: 'SA', 72: '', 14: 'Kenapa?'}
KEYW = {'bijak', 'reliable', 'warranty', 'confident', 'rosak', 'steady', 'malaysia', 'best', 'cover', 'masalah', 'hybrid',
        'different', 'bateri', 'takut', 'unlimited', 'tricky', 'capping', 'berbaloi', 'yakin', 'berminat', 'deal', 'bonet',
        'tinted', 'gelap', 'dashcam', 'payung', 'merchandise', 'voucher', 'gilalah', 'condemn', 'mileage', 'claim', 'service',
        'loan', 'pening-pening', 'covered', 'semua', 'free', 'honda', 'satu-satu', 'kenapa?', 'johor', 'perak', 'perlis', 'kedah',
        'pemikiran', 'faham', 'spare', 'tagline', 'dua', 'labour', 'terawal', 'offer', 'lain'}
UNITS = {'tahun', 'kali', 'juta', 'jenis'}
NUMW = {'satu', 'tujuh'}
ICON_FOR = {'warranty': 'shield', 'reliable': 'check', 'hybrid': 'battery', 'bateri': 'battery', 'rosak': 'warn',
            'masalah': 'warn', 'malaysia': 'pin', 'mileage': 'inf', 'unlimited': 'inf', 'voucher': 'money', 'bonet': 'gift',
            'dashcam': 'cam', 'payung': 'umb', 'service': 'wrench', 'tinted': 'tint', 'gelap': 'tint', 'confident': 'heart',
            'yakin': 'heart', 'bijak': 'q', 'merchandise': 'gift', 'honda': 'car', 'capping': 'x', 'berbaloi': 'x'}
toks = []
for k, (i0, i1) in enumerate(PH):
    for i in range(i0, i1 + 1):
        if i not in WT: continue
        t = FIX.get(i, words[i][2].strip())
        if t == '': continue
        if (t.startswith(',') or t.startswith('-')) and toks and toks[-1]['k'] == k:
            toks[-1]['w'] += t.rstrip('.,'); toks[-1]['e'] = WE[i]; continue
        t = t.strip('.,') if not t.endswith('?') else t.rstrip('.,')
        t = re.sub(r'^RM(\d+)000$', r'RM\1,000', t)
        if t.lower().rstrip('?') in UNITS and toks and toks[-1]['k'] == k and (re.match(r'^(RM)?[\d,]+$', toks[-1]['w']) or toks[-1]['w'].lower() in NUMW):
            toks[-1]['w'] += ' ' + t.rstrip('?'); toks[-1]['e'] = WE[i]; toks[-1]['num'] = True; continue
        if t.lower() == 'mind' and len(toks) > 1 and toks[-1]['w'] == 'of' and toks[-2]['w'] == 'peace':
            toks[-2]['w'] = 'peace of mind'; toks[-2]['e'] = WE[i]; toks.pop(); toks[-1]['key'] = True; continue
        if t.lower() == 'part' and toks and toks[-1]['w'] == 'spare':
            toks[-1]['w'] = 'spare part'; toks[-1]['e'] = WE[i]; continue
        tok = dict(w=t, s=WT[i], e=WE[i], k=k, i=i, num=bool(re.match(r'^(RM)?[\d,]+$', t)))
        toks.append(tok)
for t in toks:
    t['key'] = t.get('key') or t['num'] or t['w'].lower().rstrip('?') in KEYW or t['w'].lower() in KEYW

# ---------------- full-screen cards (word ranges) ----------------
CARDS = [  # (first word, last word, theme, extras)
    (14, 14, 'red', 'q'), (169, 180, 'white', 'battery'), (232, 243, 'red', 'battery'), (315, 330, 'white', 'car'),
    (363, 368, 'red', 'inf'), (467, 472, 'red', 'gift'), (601, 614, 'white', 'shield'), (619, 622, 'red', 'end')]
card_iv = []
for a, b, th, ex in CARDS:
    s = T(a) - 0.12
    nxt = min([T(i) for i in WT if i > b] or [TOT])
    e = TOT if ex == 'end' else min(E(b) + 0.35, nxt - 0.06)
    card_iv.append((s, e, a, b, th, ex))
def in_card(t): return next((c for c in card_iv if c[0] - 0.05 <= t <= c[1]), None)

# ---------------- grouping ----------------
groups, g = [], []
def gkey(g): return any(x['key'] for x in g)
last_key_t = -9
for t in toks:
    cd = in_card(t['s']); cid = cd[2] if cd else None
    # suppress weak keys that come too soon after another key
    if t['key'] and not t['num'] and cid is None and t['s'] - last_key_t < 1.1: t['key'] = False
    if t['key']: last_key_t = t['s']
    brk = (not g or len(g) >= 5 or t['k'] != g[-1]['k'] or t['s'] - g[-1]['e'] > 0.45 or cid != g[-1]['cid']
           or (t['key'] and gkey(g)) or (g and g[-1]['key'] and len(g) >= 3))
    t['cid'] = cid
    if g and brk: groups.append(g); g = []
    g.append(t)
groups.append(g)

def keysize(txt): return int(min(168, 930 / max(1, 0.5 * len(txt))))
STRIKE = set()
for t in toks:
    j = toks.index(t)
    if j and toks[j - 1]['w'].lower() == 'bukan' and t['num']: STRIKE.add(id(t))
last_icon = -9
for gi, g in enumerate(groups):
    s = g[0]['s'] - 0.06; e = g[-1]['e'] + 0.45
    if gi + 1 < len(groups): e = min(e, groups[gi + 1][0]['s'] - 0.08)
    e = max(e, g[-1]['s'] + 0.25)
    oncard = g[0]['cid'] is not None
    kidx = next((j for j, x in enumerate(g) if x['key']), None)
    lines = []  # (cls, [tokens])
    if kidx is None:
        if len(g) <= 3: lines = [('ln ' + 'lcr'[gi % 3], g)]
        else: lines = [('ln l', g[:len(g) // 2]), ('ln r', g[len(g) // 2:])]
    else:
        if kidx: lines.append(('ln ' + ('l' if gi % 2 else 'c'), g[:kidx]))
        lines.append(('key', [g[kidx]]))
        if kidx + 1 < len(g): lines.append(('ln ' + ('r' if gi % 2 else 'c'), g[kidx + 1:]))
    html = []
    for cls, ts in lines:
        style = f' style="font-size:{keysize(ts[0]["w"])}px"' if cls == 'key' else ''
        spans = ''.join(f'<span id="g{gi}_{toks.index(x)}">{x["w"]}{"<i class=strike></i>" if id(x) in STRIKE else ""}</span>' for x in ts)
        html.append(f'<div class="{cls}"{style}>{spans}</div>')
    top = 760 if oncard else 1110
    th = next((c[4] for c in card_iv if c[2] == g[0]['cid']), '') if oncard else ''
    gid = clip(s, e, 'grp' + (' c' + th[0] if th else ''), ''.join(html), f'top:{top}px', track=8 if oncard else 4)
    for x in g:
        sel = f'#g{gi}_{toks.index(x)}'
        if x['key']:
            A(f'tl.fromTo("{sel}",{{clipPath:"inset(0% 100% 0% 0%)",opacity:0.4,scale:1.12}},{{clipPath:"inset(0% 0% 0% 0%)",opacity:1,scale:1,duration:0.34,ease:"power2.out"}},{r(x["s"] - 0.02)});')
            sfx.append(('swish', x['s'] - 0.04, 0.22))
            if id(x) in STRIKE:
                A(f'tl.fromTo("{sel} .strike",{{scaleX:0}},{{scaleX:1,duration:0.18,ease:"power2.out"}},{r(x["e"] + 0.05)});'); sfx.append(('tick', x['e'] + 0.05, .6))
            ic = ICON_FOR.get(x['w'].lower().rstrip('?'))
            if ic and not oncard and x['s'] - last_icon > 2.2 and e - x['s'] > 0.6:
                last_icon = x['s']; side = 'left:70px' if gi % 2 else 'right:70px'
                o = clip(x['s'], e, 'float', orb(ic), f'top:{top - 175}px;{side}', track=5)
                A(f'tl.from("#{o}",{{scale:0,rotation:-25,opacity:0,duration:0.38,ease:"back.out(2.4)"}},{r(x["s"])});')
                A(f'tl.to("#{o}",{{y:-14,duration:{r(max(0.3, e - x["s"] - 0.4))},ease:"sine.inOut"}},{r(x["s"] + 0.38)});')
                sfx.append(('pop', x['s'], 0.32))
        else:
            A(f'tl.from("{sel}",{{opacity:0,y:26,filter:"blur(8px)",duration:0.22,ease:"power2.out"}},{r(x["s"] - 0.03)});')
    out(f'#{gid}', e - 0.14)

# ---------------- cards ----------------
FLOAT_POS = [(70, 160), (820, 260), (120, 1420), (790, 1560), (460, 90), (900, 980)]
for ci, (s, e, a, b, th, ex) in enumerate(card_iv):
    inner = ''
    if ex != 'end':
        for n, (fxp, fyp) in enumerate(FLOAT_POS[:4 if th == 'white' else 3]):
            sc = [1.0, 0.7, 0.85, 0.6][n]
            inner += f'<div class="float fl{n}" style="left:{fxp}px;top:{fyp}px;transform:scale({sc})">{orb(ex, grey=(th == "white"))}</div>'
    cid = clip(s, e, f'card {th}', inner, '', track=7)
    A(f'tl.from("#{cid}",{{opacity:0,scale:1.14,filter:"blur(24px)",duration:0.24,ease:"power2.out"}},{r(s)});')
    if ex != 'end': A(f'tl.to("#{cid}",{{opacity:0,filter:"blur(20px)",duration:0.18}},{r(e - 0.18)});')
    for n in range(4):
        A(f'tl.to("#{cid} .fl{n}",{{y:{[-60, 50, -40, 70][n]},x:{[20, -30, 25, -15][n]},rotation:{[8, -10, 6, -6][n]},duration:{r(e - s)},ease:"none"}},{r(s)});')
    sfx.append(('whoosh', s - 0.1, 0.4)); sfx.append(('hit', s + 0.05, 0.35))
    if ex == 'end':
        ar = clip(s + 0.6, TOT, 'arrow', '<svg viewBox="0 0 64 64" width="220" height="220"><path fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" d="M32 8v44M14 34l18 18 18-18"/></svg>', 'top:1250px', track=8)
        A(f'tl.from("#{ar}",{{opacity:0,duration:0.2}},{r(s + 0.6)});')
        A(f'tl.to("#{ar}",{{y:50,duration:0.32,repeat:{max(1, int((TOT - s - 0.8) / 0.32))},yoyo:true,ease:"sine.inOut"}},{r(s + 0.8)});')

# ---------------- hook title ----------------
def hook(txt, t0, t1, top=150):
    spans = ''.join(f'<span>{c if c != " " else "&nbsp;"}</span>' for c in txt)
    h = clip(t0, t1, 'hook', spans, f'top:{top}px', track=6)
    A(f'tl.from("#{h} span",{{opacity:0,duration:0.01,stagger:0.055}},{r(t0)});'); sfx.append(('hit', t0, 0.4)); shake(t0, 10)
    out(f'#{h}', t1 - 0.14)
hook('HONDA', T(3), T(9) - 0.05)
hook('TAK BIJAK?', T(9), T(14) - 0.12)

# ---------------- top badges / counters ----------------
def badge(t0, t1, label, val, sub='', top=110, cnt=None):
    vid = nid('bv')
    inner = f'<div class="bl">{label}</div><div class="bv" id="{vid}">{val}</div>' + (f'<div class="bs">{sub}</div>' if sub else '')
    b = clip(t0, t1, 'badge', inner, f'top:{top}px', track=6)
    A(f'tl.from("#{b}",{{opacity:0,y:-60,scale:0.6,duration:0.34,ease:"back.out(2)"}},{r(t0)});')
    out(f'#{b}', t1 - 0.14); sfx.append(('pop', t0, 0.35))
    if cnt:
        to, pre, suf, thit = cnt; counter(f'#{vid}', t0 + 0.1, thit, to, pre, suf)
        sfx.append(('cash' if pre.startswith('RM') else 'hit', thit, 0.4)); shake(thit, 10)
    return b
def chips(t_items, t1, top=120, red_last=False):
    html = ''.join(f'<span class="chip{" red" if red_last and n == len(t_items) - 1 else ""}" id="cp{uid[0]}_{n}">{w}</span>' for n, (w, _) in enumerate(t_items))
    base = uid[0]; c = clip(t_items[0][1], t1, 'chips', html, f'top:{top}px', track=6)
    for n, (_, t) in enumerate(t_items):
        A(f'tl.from("#cp{base}_{n}",{{opacity:0,scale:0.3,y:-30,duration:0.25,ease:"back.out(3)"}},{r(t)});'); sfx.append(('pop', t, 0.3))
    out(f'#{c}', t1 - 0.14)
def rows(items, t1, top=100):
    for n, (lab, val, t, cnt) in enumerate(items):
        vid = nid('rv')
        rc = clip(t, t1, 'rowcard', f'<span class="rl">{lab}</span><span class="rv" id="{vid}">{val}</span>', f'top:{top + n * 118}px', track=6)
        A(f'tl.from("#{rc}",{{x:{-900 if n % 2 == 0 else 900},opacity:0,duration:0.32,ease:"power3.out"}},{r(t)});')
        out(f'#{rc}', t1 - 0.14); sfx.append(('whoosh', t - 0.08, 0.25))
        if cnt: counter(f'#{vid}', t + 0.05, cnt[1], cnt[0], cnt[2], cnt[3]); sfx.append(('cash', cnt[1], 0.4))
        else: sfx.append(('hit', t + 0.1, 0.3))

PS, PE = D['ph_start'], D['ph_end']
def phend(i): return next(PE[k] for k, (a, b) in enumerate(PH) if a <= i <= b)
badge(T(23), phend(27) + 0.2, 'WARRANTY', '0 tahun', cnt=(8, '', ' tahun', T(26) + 0.25))
badge(T(53), phend(56) + 0.2, 'WARRANTY', '8 tahun')
chips([('Perak', T(105)), ('Perlis', T(107)), ('Kedah', T(109)), ('Johor', T(111)), ('SEMUA NEGERI', T(113))], phend(125) + 0.1, red_last=True)
badge(T(130), phend(136) + 0.1, 'MILEAGE', '0', 'pun boleh cover', cnt=(1000000, '', '', T(134) + 0.3))
badge(T(155), phend(157) + 0.1, 'SELAGI', 'bawah 8 tahun')
badge(T(247), phend(254) + 0.1, 'LOAN 9 TAHUN', 'covered', 'warranty bateri 10 tahun')
badge(T(297), phend(303) + 0.15, 'GENERAL WARRANTY', '0 tahun', cnt=(8, '', ' tahun', T(302) + 0.25))
badge(T(346), phend(348) + 0.1, 'CHECK', 'capping mileage?')
badge(T(352), phend(362) + 0.1, '7 TAHUN + CAP 100,000', 'tak berbaloi', '')
rows([('General warranty', '8 tahun', T(431), None), ('Bateri hybrid', '10 tahun', T(437), None)], phend(454) + 0.1)
chips([('Tinted', T(492)), ('Spec JPJ', T(501)), ('Gelap habis', T(507))], phend(510) + 0.1)
badge(T(538), phend(545) + 0.1, 'PAYUNG', 'x0', 'bukan satu', cnt=(2, 'x', '', T(545) + 0.2))
badge(T(546), phend(550) + 0.1, 'MERCHANDISE HONDA', '0', '', cnt=(10, '', '', T(547) + 0.25))
badge(T(553), phend(558) + 0.1, 'SERVICE VOUCHER', '3 jenis')
rows([('Antara terawal', 'RM0', T(567), (600, T(568) + 0.3, 'RM', '')), ('Lepas tu', 'RM0', T(573), (40, T(574) + 0.3, 'RM', '')),
      ('Free labour charge', '5 kali', T(581), None)], phend(585) + 0.1)
badge(T(589), phend(593) + 0.1, 'OFFER BULAN NI', 'RM0', 'service voucher', cnt=(3000, 'RM', '', T(593) + 0.3))
badge(T(595), phend(600) + 0.1, 'MACAM', 'free service', '5 tahun')
for c in card_iv: flash(c[0] + 0.02, 0.25)

# ---------------- html ----------------
css = open(f'{PIPE}/v2_style.css').read()
html = f'''<!doctype html>
<html lang="ms" data-resolution="portrait">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="gsap.min.js"></script><style>{css}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOT}" data-width="1080" data-height="1920">
<video id="base" class="clip" src="base.mp4" playsinline data-start="0" data-duration="{TOT}" data-track-index="0" data-has-audio="true" style="position:absolute;inset:-30px;width:1140px;height:1980px;object-fit:cover"></video>
<div id="spot" class="clip spot" data-start="0" data-duration="{TOT}" data-track-index="1"></div>
{chr(10).join(els)}
<div id="bar" class="clip bar" data-start="0" data-duration="{TOT}" data-track-index="10"></div>
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
json.dump(dict(groups=[[x['w'] for x in g] for g in groups], cards=card_iv), open(f'{WK}/groups.json', 'w'), ensure_ascii=False)
if '--no-audio' in sys.argv: print('html only', len(els)); sys.exit()

# ---------------- audio ----------------
SR = 48000
def load(p, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', p] + (['-af', af] if af else []) + ['-f', 's16le', '-ac', '2', '-ar', str(SR), '-']
    rr = subprocess.run(cmd, capture_output=True)
    return np.frombuffer(rr.stdout, '<i2').reshape(-1, 2).astype(np.float64) / 32768
voice = np.load(f'{WK}/voice.npy').astype(np.float64); N = len(voice)
FX = {k: load(f'{AUD}/{k}.wav') for k in ['whoosh', 'pop', 'hit', 'cash', 'riser', 'tick', 'swish']}
fx = np.zeros((N, 2))
for i, t in enumerate(D['shots']): sfx.append(('whoosh', t - 0.12, 0.16 if i % 3 else 0.24))
for name, t, gg in sfx:
    x = FX[name] * gg; i = int(max(t, 0) * SR); j = min(N, i + len(x)); fx[i:j] += x[:j - i]
LP = 'lowpass=f=3200,bass=g=3'
intro, main, outro = (load(f'{AUD}/{n}.wav', LP) for n in ['music_intro', 'music_main', 'music_outro'])
b1, b2, b3, b4 = T(28), T(158), T(315), T(477)
sec = [(0, b1, intro), (b1, b2, main), (b2, b3, outro), (b3, b4, main), (b4, T(615), main), (T(615), TOT + 0.5, outro)]
mus = np.zeros((N, 2))
for a, b, src in sec:
    i, j = int(a * SR), min(N, int(b * SR))
    x = np.tile(src, (int((j - i) / len(src)) + 2, 1))[:j - i].copy()
    f = int(0.05 * SR); x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
    mus[i:j] += x
for a, _, _ in sec[1:]:
    x = FX['riser'] * .25; i = int(max(a - 1.2, 0) * SR); j = min(N, i + len(x)); fx[i:j] += x[:j - i]
mus[-SR:] *= np.linspace(1, 0, SR)[:, None] ** 2
env = np.abs(voice).mean(1); k = int(0.03 * SR); env = np.convolve(env, np.ones(k) / k, 'same')
duck = 1 - 0.55 * np.clip(env / (np.percentile(env, 90) + 1e-9), 0, 1)
mix = np.tanh((voice + mus * 0.15 * duck[:, None] + fx * 0.8) * 1.1) * 0.9
with wave.open(f'{WK}/mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{WK}/video.mp4', '-i', f'{WK}/mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-t', f'{TOT:.3f}', f'{HF}/base.mp4'], check=True)
print('ok', TOT, 'clips', len(els), 'tweens', len(an), 'sfx', len(sfx), 'groups', len(groups))
