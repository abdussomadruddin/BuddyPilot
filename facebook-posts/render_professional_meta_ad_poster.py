#!/usr/bin/env python3
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont


W = H = 1080

FONT_BOLD = "/System/Library/Fonts/Supplemental/Avenir Next.ttc"
FONT_REG = "/System/Library/Fonts/Supplemental/Avenir Next.ttc"
FONT_FALLBACK_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_FALLBACK_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def font(path, size, index=0):
    try:
        return ImageFont.truetype(path, size=size, index=index)
    except Exception:
        fallback = FONT_FALLBACK_BOLD if "Bold" in path or "Avenir" in path else FONT_FALLBACK_REG
        return ImageFont.truetype(fallback, size=size)


def text_size(draw, text, fnt):
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def fit_text(draw, text, font_path, max_width, start_size, min_size=24, index=0):
    for size in range(start_size, min_size - 1, -2):
        fnt = font(font_path, size, index=index)
        if text_size(draw, text, fnt)[0] <= max_width:
            return fnt
    return font(font_path, min_size, index=index)


def rounded_blur_card(base, box, radius, fill, blur=24):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle(box, radius=radius, fill=255)
    blurred = base.filter(ImageFilter.GaussianBlur(blur))
    base.paste(blurred, (0, 0), mask)
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=(255, 255, 255, 34), width=1)
    base.alpha_composite(layer)


def draw_gradient_overlay(base):
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for y in range(H):
        top_alpha = max(0, int(180 * (1 - y / 390)))
        bottom_alpha = max(0, int(205 * ((y - 690) / 390)))
        alpha = min(225, top_alpha + bottom_alpha)
        if alpha:
            d.line([(0, y), (W, y)], fill=(0, 0, 0, alpha), width=1)
    base.alpha_composite(overlay)


def draw_pill(draw, box, fill, outline=None, width=1):
    radius = (box[3] - box[1]) // 2
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: render_professional_meta_ad_poster.py <background.png> <output.png>")

    source = Path(sys.argv[1])
    out = Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(source).convert("RGB")
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    base = img.crop((left, top, left + side, top + side)).resize((W, H), Image.Resampling.LANCZOS).convert("RGBA")

    # Lift the funnel a little so the lower offer card has room to breathe.
    shifted = Image.new("RGBA", (W, H), (3, 8, 18, 255))
    shifted.alpha_composite(base, (0, -34))
    base = shifted
    draw_gradient_overlay(base)

    draw = ImageDraw.Draw(base)

    # Small premium label.
    draw_pill(draw, (80, 70, 260, 118), fill=(255, 255, 255, 24), outline=(255, 255, 255, 55), width=1)
    label_font = font(FONT_BOLD, 22)
    draw.text((108, 83), "TIKTOK ADS", font=label_font, fill=(18, 31, 48, 238))

    # Main headline.
    headline_font = fit_text(draw, "Leads Masuk.", FONT_BOLD, 920, 94)
    leak_font = fit_text(draw, "Duit Bocor.", FONT_BOLD, 920, 108)
    draw.text((80, 142), "Leads Masuk.", font=headline_font, fill=(255, 255, 255, 255))
    draw.text((80, 238), "Duit Bocor.", font=leak_font, fill=(255, 102, 80, 255))

    support = "Masalah bukan traffic. Funnel selepas klik yang belum kemas."
    support_font = fit_text(draw, support, FONT_REG, 850, 34)
    draw.text((84, 356), support, font=support_font, fill=(210, 222, 235, 232))

    # Minimal directional callout that supports the leak angle.
    callout_font = font(FONT_BOLD, 24)
    draw_pill(draw, (680, 505, 930, 558), fill=(255, 77, 54, 30), outline=(255, 108, 84, 85), width=1)
    draw.text((708, 520), "Bocor selepas klik", font=callout_font, fill=(255, 165, 145, 235))

    # Bottom frosted offer card.
    card = (80, 820, 1000, 1000)
    rounded_blur_card(base, card, radius=42, fill=(246, 249, 252, 236), blur=18)
    draw = ImageDraw.Draw(base)

    product_font = font(FONT_BOLD, 40)
    offer_font = font(FONT_REG, 27)
    cta_font = font(FONT_BOLD, 27)
    detail_font = font(FONT_REG, 23)

    draw.text((120, 856), "Ads Funnel Mastery", font=product_font, fill=(8, 14, 25, 255))
    draw.text((120, 908), "18 Video + 4 Bonus + Group Support", font=offer_font, fill=(46, 58, 74, 255))
    draw.text((120, 948), "Panduan TikTok Ads + Funnel", font=detail_font, fill=(79, 92, 111, 255))

    cta_box = (716, 890, 958, 962)
    draw_pill(draw, cta_box, fill=(8, 14, 25, 255))
    cta = "Semak Sekarang"
    tw, th = text_size(draw, cta, cta_font)
    draw.text((cta_box[0] + (cta_box[2] - cta_box[0] - tw) / 2, cta_box[1] + 21), cta, font=cta_font, fill=(255, 255, 255, 255))

    base.convert("RGB").save(out, quality=96)
    print(out)


if __name__ == "__main__":
    main()
