#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math

W = H = 1080

OUT = Path("facebook-posts/assets/ads-funnel-mastery-funnel-bocor-20260701-235212.png")

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def font(path, size):
    return ImageFont.truetype(path, size=size)


def draw_gradient(draw):
    top = (8, 11, 18)
    bottom = (22, 25, 36)
    for y in range(H):
        t = y / (H - 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        draw.line([(0, y), (W, y)], fill=color)


def text_bbox(draw, xy, text, fnt):
    return draw.textbbox(xy, text, font=fnt)


def center_text(draw, y, text, fnt, fill):
    box = text_bbox(draw, (0, 0), text, fnt)
    x = (W - (box[2] - box[0])) / 2
    draw.text((x, y), text, font=fnt, fill=fill)


def pill(draw, xy, fill, outline=None, width=1, radius=28):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def glow_line(base, points, fill, width=12, blur=18):
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.line(points, fill=fill, width=width, joint="curve")
    glow = overlay.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(glow)
    base.alpha_composite(overlay)


def draw_funnel(base):
    d = ImageDraw.Draw(base)
    cx = W // 2
    top_y = 365
    bottom_y = 665
    top_w = 520
    bottom_w = 150

    # Incoming lead dots.
    dot_color = (102, 255, 189, 255)
    for i, x in enumerate([310, 385, 465, 545, 625, 710, 775]):
        y = 290 + (i % 2) * 30
        d.ellipse((x - 10, y - 10, x + 10, y + 10), fill=dot_color)
    glow_line(base, [(310, 318), (420, 350), (540, 360), (660, 350), (770, 318)], (102, 255, 189, 120), 8, 14)

    # Funnel glass body.
    funnel = [
        (cx - top_w // 2, top_y),
        (cx + top_w // 2, top_y),
        (cx + bottom_w // 2, bottom_y),
        (cx + 38, bottom_y + 80),
        (cx - 38, bottom_y + 80),
        (cx - bottom_w // 2, bottom_y),
    ]
    d.polygon(funnel, fill=(23, 31, 45, 235), outline=(231, 238, 255, 210))
    d.line(funnel + [funnel[0]], fill=(231, 238, 255, 230), width=5)

    # Internal path.
    glow_line(base, [(cx, top_y + 25), (cx - 65, 455), (cx + 60, 548), (cx, bottom_y + 55)], (102, 255, 189, 155), 10, 16)

    # Leak crack and escaping dots.
    crack = [(cx + 112, 500), (cx + 160, 530), (cx + 118, 558), (cx + 175, 590)]
    d.line(crack, fill=(255, 94, 87, 255), width=8)
    glow_line(base, crack, (255, 94, 87, 130), 14, 14)
    for i in range(9):
        x = cx + 190 + i * 28
        y = 530 + int(math.sin(i) * 45) + i * 7
        r = 8 if i % 3 else 12
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 94, 87, 245))

    # Bottom retained dots.
    for i, x in enumerate([470, 505, 542, 580, 615]):
        y = 742 + (i % 2) * 14
        d.ellipse((x - 8, y - 8, x + 8, y + 8), fill=(102, 255, 189, 230))

    # Small labels embedded as design, not a fake screenshot.
    small = font(FONT_BOLD, 28)
    d.text((174, 394), "IKLAN", font=small, fill=(151, 164, 184, 255))
    d.text((714, 602), "BOCOR", font=small, fill=(255, 114, 103, 255))
    d.text((438, 790), "FUNNEL JELAS", font=small, fill=(102, 255, 189, 255))


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    draw_gradient(draw)

    # Subtle premium grid.
    for x in range(80, W, 80):
        draw.line([(x, 0), (x, H)], fill=(255, 255, 255, 10), width=1)
    for y in range(80, H, 80):
        draw.line([(0, y), (W, y)], fill=(255, 255, 255, 8), width=1)

    # Header badge.
    pill(draw, (80, 70, 360, 128), fill=(255, 255, 255, 18), outline=(255, 255, 255, 35), width=2, radius=29)
    draw.text((108, 87), "TIKTOK ADS", font=font(FONT_BOLD, 28), fill=(212, 222, 238, 255))

    # Headline.
    draw.text((76, 150), "Bukan Traffic.", font=font(FONT_BLACK, 86), fill=(255, 255, 255, 255))
    draw.text((76, 238), "Funnel Bocor.", font=font(FONT_BLACK, 86), fill=(102, 255, 189, 255))

    # Supporting copy.
    draw.text((82, 326), "Leads masuk, tapi follow up senyap?", font=font(FONT_BOLD, 34), fill=(218, 225, 236, 255))

    draw_funnel(img)
    draw = ImageDraw.Draw(img)

    # Bottom offer card.
    card = (80, 855, 1000, 1000)
    draw.rounded_rectangle(card, radius=38, fill=(246, 248, 252, 255))
    draw.text((120, 885), "Ads Funnel Mastery", font=font(FONT_BLACK, 38), fill=(14, 18, 28, 255))
    draw.text((120, 934), "18 Video + 4 Bonus + Group Support", font=font(FONT_BOLD, 28), fill=(47, 57, 77, 255))
    draw.text((120, 968), "RM197", font=font(FONT_BOLD, 26), fill=(122, 132, 151, 255))
    draw.line((120, 984, 200, 984), fill=(255, 94, 87, 255), width=5)
    draw.text((220, 958), "RM97", font=font(FONT_BLACK, 46), fill=(14, 18, 28, 255))
    pill(draw, (740, 914, 962, 978), fill=(14, 18, 28, 255), radius=32)
    center = text_bbox(draw, (0, 0), "Semak Sekarang", font(FONT_BOLD, 25))
    draw.text((740 + (222 - (center[2] - center[0])) / 2, 934), "Semak Sekarang", font=font(FONT_BOLD, 25), fill=(255, 255, 255, 255))

    img.convert("RGB").save(OUT, quality=95)
    print(OUT)


if __name__ == "__main__":
    main()
