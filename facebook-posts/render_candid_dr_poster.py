#!/usr/bin/env python3
from pathlib import Path
import json
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont


W = H = 1080

FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"

RED = (255, 28, 82, 255)
TEAL = (0, 224, 220, 255)
ORANGE = (255, 170, 15, 255)
DARK = (4, 6, 12, 255)


def font(path, size):
    return ImageFont.truetype(path, size=size)


def bbox(draw, text, fnt):
    return draw.textbbox((0, 0), text, font=fnt)


def text_w(draw, text, fnt):
    b = bbox(draw, text, fnt)
    return b[2] - b[0]


def fit(draw, text, max_width, start, min_size=20, path=FONT_BLACK):
    for size in range(start, min_size - 1, -2):
        fnt = font(path, size)
        if text_w(draw, text, fnt) <= max_width:
            return fnt
    return font(path, min_size)


def draw_text_shadow(draw, xy, text, fnt, fill, shadow=(0, 0, 0, 210), offset=4):
    x, y = xy
    draw.text((x + offset, y + offset), text, font=fnt, fill=shadow)
    draw.text((x, y), text, font=fnt, fill=fill)


def draw_slanted_bar(draw, xy, w, h, fill):
    x, y = xy
    poly = [(x, y), (x + w, y), (x + w - 18, y + h), (x, y + h)]
    draw.polygon(poly, fill=fill)


def rounded(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def add_vignette(base):
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for y in range(H):
        left_alpha = 210
        bottom_alpha = max(0, int(155 * ((y - 640) / 440)))
        top_alpha = max(0, int(90 * (1 - y / 340)))
        d.line([(0, y), (W, y)], fill=(0, 0, 0, min(235, left_alpha + bottom_alpha + top_alpha)), width=1)
    # Clear some of the right side so the emotional face still reads.
    clear = Image.new("L", (W, H), 0)
    cd = ImageDraw.Draw(clear)
    cd.ellipse((470, 110, 1280, 920), fill=150)
    clear = clear.filter(ImageFilter.GaussianBlur(100))
    transparent = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    overlay = Image.composite(transparent, overlay, clear)
    base.alpha_composite(overlay)


def add_clean_text_field(base):
    field = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(field)
    # A clean contrast field behind copy, while keeping the emotional face visible.
    d.rounded_rectangle((56, 56, 760, 512), radius=36, fill=(0, 0, 0, 178))
    d.rectangle((56, 300, 760, 512), fill=(0, 0, 0, 130))
    field = field.filter(ImageFilter.GaussianBlur(10))
    base.alpha_composite(field)


def add_texture(base):
    random.seed(42)
    noise = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(noise)
    for _ in range(2400):
        x = random.randrange(W)
        y = random.randrange(H)
        a = random.randrange(8, 24)
        d.point((x, y), fill=(255, 255, 255, a))
    base.alpha_composite(noise)


def load_config(path):
    config = {
        "hook": "IKLAN NAMPAK GAGAL?",
        "headline_white": "BUKAN ADS.",
        "headline_red": "JOURNEY KABUR.",
        "support": "Lead masuk, lepas tu senyap?",
        "product": "Ads Funnel Mastery",
        "offer": "18 Video + 4 Bonus + Group Support",
        "cta": "SEMAK SEKARANG",
    }
    if path:
        config.update(json.loads(Path(path).read_text()))
    return config


def main():
    if len(sys.argv) not in (3, 4):
        raise SystemExit("Usage: render_candid_dr_poster.py <background.png> <output.png> [config.json]")

    source = Path(sys.argv[1])
    out = Path(sys.argv[2])
    config = load_config(sys.argv[3] if len(sys.argv) == 4 else None)
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(source).convert("RGB")
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    base = img.crop((left, top, left + side, top + side)).resize((W, H), Image.Resampling.LANCZOS).convert("RGBA")
    add_vignette(base)
    add_clean_text_field(base)
    add_texture(base)

    draw = ImageDraw.Draw(base)

    # Attention point 1: huge headline, designed for 20% zoom readability.
    draw_slanted_bar(draw, (80, 80), 470, 62, RED)
    hook_font = fit(draw, config["hook"], 400, 36, path=FONT_BLACK)
    draw.text((106, 94), config["hook"], font=hook_font, fill=(255, 255, 255, 255))

    h1 = fit(draw, config["headline_white"], 650, 92)
    h2 = fit(draw, config["headline_red"], 740, 83)
    draw_text_shadow(draw, (80, 172), config["headline_white"], h1, (255, 255, 255, 255), offset=5)
    draw_text_shadow(draw, (80, 268), config["headline_red"], h2, RED, offset=5)

    support_font = fit(draw, config["support"], 610, 36, path=FONT_BOLD)
    rounded(draw, (80, 388, 660, 462), 22, (5, 8, 16, 226), outline=(255, 255, 255, 45), width=1)
    draw.text((112, 408), config["support"], font=support_font, fill=TEAL)

    # Attention point 3: clean CTA card with enough padding.
    offer_card = (80, 812, 1000, 1000)
    rounded(draw, offer_card, 34, (4, 6, 12, 232), outline=(255, 255, 255, 58), width=2)

    product_font = fit(draw, config["product"], 440, 38, path=FONT_BOLD)
    offer_font = fit(draw, config["offer"], 485, 25, path=FONT_BOLD)
    draw.text((120, 850), config["product"], font=product_font, fill=(255, 255, 255, 255))
    draw.text((120, 902), config["offer"], font=offer_font, fill=(218, 227, 236, 255))

    cta = (596, 866, 948, 948)
    rounded(draw, cta, 18, ORANGE, outline=(255, 221, 89, 255), width=3)
    cta_font = fit(draw, config["cta"], 270, 34, path=FONT_BLACK)
    draw.text((628, 889), config["cta"], font=cta_font, fill=(5, 6, 9, 255))

    base.convert("RGB").save(out, quality=96)
    print(out)


if __name__ == "__main__":
    main()
