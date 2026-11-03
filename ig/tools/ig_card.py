#!/usr/bin/env python3
"""Render a 1080x1350 Instagram text card for @tyler_capital.
Usage: python3 ig_card.py spec.json out.png
spec.json: {"tag": "IPO 拆解", "title": "標題（建議 8-22 字）",
            "points": ["重點一", "重點二", "重點三"], "date": "2026.11.04"}
"""
import json, sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
BG, BG2 = (14, 22, 40), (22, 34, 60)
GOLD, WHITE, MUTED = (214, 175, 92), (244, 241, 234), (150, 160, 180)
FONT_DIR = "/usr/share/fonts/opentype/noto/"


def font(weight, size):
    path = FONT_DIR + f"NotoSansCJK-{weight}.ttc"
    for i in range(10):  # pick the Traditional Chinese (TC) face in the collection
        try:
            f = ImageFont.truetype(path, size, index=i)
        except OSError:
            break
        if "TC" in f.getname()[0]:
            return f
    return ImageFont.truetype(path, size)


def wrap(draw, text, f, max_w):
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur); cur = ""; continue
        if draw.textlength(cur + ch, font=f) > max_w and cur:
            # keep closing punctuation on the same line
            if ch in "，。、！？：；）」』,.!?)":
                cur += ch; continue
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


def main(spec_path, out_path):
    s = json.load(open(spec_path, encoding="utf-8"))
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    for y in range(0):  # flat background (keeps file small)
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(BG[k] + (BG2[k] - BG[k]) * t) for k in range(3)))
    M = 96
    # top: tag pill + date
    ft = font("Bold", 34)
    tag = s.get("tag", "美股")
    tw = d.textlength(tag, font=ft)
    d.rounded_rectangle([M, 110, M + tw + 48, 172], radius=31, outline=GOLD, width=3)
    d.text((M + 24, 141), tag, font=ft, fill=GOLD, anchor="lm")
    if s.get("date"):
        d.text((W - M, 141), s["date"], font=font("Regular", 30), fill=MUTED, anchor="rm")
    # title, auto-shrink to fit 4 lines
    y = 250
    for size in (92, 84, 76, 68, 60):
        fh = font("Black", size)
        tl = wrap(d, s["title"], fh, W - 2 * M)
        if len(tl) <= 4:
            break
    for line in tl:
        d.text((M, y), line, font=fh, fill=WHITE)
        y += int(size * 1.28)
    y += 30
    d.rectangle([M, y, M + 120, y + 8], fill=GOLD)
    y += 70
    # points
    fp = font("Regular", 42)
    for i, p in enumerate(s.get("points", [])[:4], 1):
        d.text((M, y), f"{i:02d}", font=font("Bold", 42), fill=GOLD)
        for j, line in enumerate(wrap(d, p, fp, W - 2 * M - 90)):
            d.text((M + 90, y + j * 60), line, font=fp, fill=WHITE)
        y += 60 * max(1, len(wrap(d, p, fp, W - 2 * M - 90))) + 34
        if y > H - 260:
            break
    # footer
    d.line([(M, H - 170), (W - M, H - 170)], fill=(60, 72, 100), width=2)
    d.text((M, H - 118), "@tyler_capital", font=font("Bold", 36), fill=GOLD, anchor="lm")
    d.text((W - M, H - 118), "美股 · IPO · 併購 · 翻身", font=font("Regular", 30), fill=MUTED, anchor="rm")
    d.text((M, H - 70), "僅供參考，不構成任何投資建議", font=font("Regular", 24), fill=MUTED, anchor="lm")
    # 64-colour palette keeps the PNG ~40KB so it can be uploaded as base64
    img.quantize(64, method=Image.Quantize.FASTOCTREE).save(out_path, "PNG", optimize=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
