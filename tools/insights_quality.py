#!/usr/bin/env python3
"""Quality gate for Insights notes shipped from 2026-11-14 HKT onward.

Used by draft_article.py (reject bad Claude drafts) and publish_daily.py
(skip short / calqued queue notes so the daily job can fill with proper drafts).

Standard (Tyler, Nov 2026):
- ~550–750 English words (soft floor 520; soft ceiling 900)
- Anchored to that Hong Kong calendar day's major news / summit / holiday / market item
- Chinese is independent BBC中文 / 香港01 / 台媒評論 commentary — not an English calque
- title_zh must be readable on its own (觀察／為何／從…看…／冒號), not a tip slogan
"""
from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

DAY_EVENT_FROM = dt.date(2026, 11, 14)
MIN_EN_WORDS = 520
MAX_EN_WORDS = 900
MIN_ZH_CHARS = 700  # roughly matching depth; not a hard literary score

# Slogan / Chinglish shapes that kept failing Tyler's "不通順" feedback.
CALQUE_RES = [
    re.compile(p)
    for p in (
        r"最好的那個星期二",
        r"動能有用",
        r"懸崖沒用",
        r"踩在空氣",
        r"帶燃耗",
        r"穿上資訊外衣",
        r"倒數時計",
        r"不等于",  # should be 不等於 in zh-Hant
        r"看见",  # 看見
        r"记账",  # 記賬
        r"激動的生物學",
        r"動物勝利坐落",
        r"人格審判",
        r"霧氣傳不動",
        r"氣氛屬新聞欄",
        r"價錢屬一句話",
    )
]

# Tip-slogan titles: short, no commentary framing.
SLOGAN_TITLE_RES = [
    re.compile(p)
    for p in (
        r"^跟進一次",
        r"^然後停",
        r"不是獎盃$",
        r"有牙齒$",
        r"^附理由的",
    )
]


def split_bodies(text: str) -> tuple[str, str]:
    en_m = re.search(r"::: en\n(.*?)(?:\n::: zh|\Z)", text, re.S)
    zh_m = re.search(r"::: zh\n(.*)\Z", text, re.S)
    return (en_m.group(1) if en_m else "", zh_m.group(1) if zh_m else "")


def en_word_count(en: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", en))


def zh_char_count(zh: str) -> int:
    # CJK ideographs + common punctuation density proxy
    return len(re.findall(r"[\u4e00-\u9fff]", zh))


def front(text: str, key: str) -> str:
    m = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, re.M)
    return m.group(1).strip() if m else ""


def article_date(text: str) -> dt.date | None:
    raw = front(text, "date")
    try:
        return dt.date.fromisoformat(raw)
    except ValueError:
        return None


def check_text(text: str, *, require_day_hook: bool = False) -> list[str]:
    """Return a list of human-readable problems (empty = pass)."""
    problems: list[str] = []
    day = article_date(text)
    if day is None:
        problems.append("missing or bad date")
        return problems
    if day < DAY_EVENT_FROM:
        return []  # legacy short tips allowed before the rule

    en, zh = split_bodies(text)
    wc = en_word_count(en)
    if wc < MIN_EN_WORDS:
        problems.append(f"English too short ({wc} words; need ≥{MIN_EN_WORDS}, target 550–750)")
    elif wc > MAX_EN_WORDS:
        problems.append(f"English too long ({wc} words; soft max {MAX_EN_WORDS})")

    zc = zh_char_count(zh)
    if zc < MIN_ZH_CHARS:
        problems.append(f"Chinese too thin ({zc} Han chars; need ≥{MIN_ZH_CHARS})")

    title_zh = front(text, "title_zh")
    if not title_zh:
        problems.append("missing title_zh")
    else:
        if len(title_zh) < 12:
            problems.append(f"title_zh too short / slogan-like: {title_zh!r}")
        for rx in SLOGAN_TITLE_RES:
            if rx.search(title_zh):
                problems.append(f"title_zh looks like a tip slogan: {title_zh!r}")
                break
        # Prefer commentary framing when possible (warn-only soft signal via require)
    for rx in CALQUE_RES:
        if rx.search(zh) or rx.search(title_zh):
            problems.append(f"Chinese calque / broken traditional: /{rx.pattern}/")

    if require_day_hook:
        blob = en + "\n" + zh + "\n" + title_zh
        hooks = (
            "APEC", "亞太經合", "峰會", "Anthropic", "英偉達", "Nvidia", "黃仁勳",
            "芯片", "晶片", "出口管制", "NIH", "NIAID", "質譜", "王毅", "特朗普",
            "習近平", "Trump", "Xi", "上市", "IPO", "聯儲", "Fed", "財報",
            "假期", "假日", "開市", "收市", "美股", "港股", "國會", "商務部",
        )
        if not any(h in blob for h in hooks):
            problems.append(
                "no same-day news/summit/market hook detected — "
                "anchor to that Hong Kong calendar day's major event"
            )

    return problems


def check_file(path: Path, *, require_day_hook: bool = False) -> list[str]:
    return check_text(path.read_text(encoding="utf-8"), require_day_hook=require_day_hook)


if __name__ == "__main__":
    import sys

    paths = [Path(a) for a in sys.argv[1:]] or sorted(Path("content/insights").glob("*.md"))
    failed = 0
    for p in paths:
        issues = check_file(p, require_day_hook=False)
        if issues:
            failed += 1
            print(f"FAIL {p}:")
            for i in issues:
                print(f"  - {i}")
        else:
            print(f"ok   {p}")
    raise SystemExit(1 if failed else 0)
