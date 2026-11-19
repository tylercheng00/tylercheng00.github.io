#!/usr/bin/env python3
"""Draft one bilingual Insights article with Claude.

The daily workflow calls this when content/daily has nothing due, then
commits the file straight to main. It can also be run by hand:

    ANTHROPIC_API_KEY=... python3 tools/draft_article.py [--topic "..."]

Do not invent facts about Tyler, his companies or clients.

From 2026-11-14 (Hong Kong time) onward, every draft must be anchored to
that calendar day's major news, summits, holidays or market events
(e.g. APEC in Shenzhen → APEC / US–China–Russia / China's economic rise;
Jensen Huang / Nvidia chip-export politics when that story leads the day).
"""
import datetime as dt
import json
import pathlib
import re
import sys

import anthropic

ROOT = pathlib.Path(__file__).resolve().parent.parent
INSIGHTS = ROOT / "content" / "insights"
sys.path.insert(0, str(ROOT / "tools"))
from build_site import CATS, parse_article  # noqa: E402

MODEL = "claude-opus-5-5"
HK = dt.timezone(dt.timedelta(hours=8))
# User rule: event/holiday-tied topics — apply from 2026-11-14 HKT (backfill + ongoing).
DAY_EVENT_FROM = dt.date(2026, 11, 14)

SYSTEM = """You draft articles for the personal website of 鄭迪珉 Tyler Tik Man Cheng, a Hong Kong-born \
US Equities Market Specialist at Fuway Capital (IPO advisory, M&A, financing for China-based companies listed or \
listing in the US) and co-founder & COO of Nanotech Innovation Limited (nano-coatings, biomedical targeting, \
patents). Readers are founders and investors in Hong Kong and mainland China.

Write one new article in the same voice as the examples: plain, practical, specific, no hype. \
About 550-750 English words, then Traditional Chinese in natural Hong Kong written Chinese (書面語, 繁體) \
of similar depth — not a thin gloss. The Chinese is the same argument, rewritten as Chinese, \
not a line-by-line translation and not Chinglish calques (avoid 買日曆 / 信息流 / soft circle / yes as English leftovers). \
title_zh must read like a clear Hong Kong business-column headline that ordinary readers understand at a glance \
(about 8–18 Chinese characters when possible). Prefer plain advice over metaphor fog. \
A heading is "### " and you do not need the same number every time. Two headings is fine. So is none. \
Set read: to 6–8 minutes.

Sound like a person who does this work, not like a language model:
- Do not open with "X is not Y". Do not use that shape more than once in the piece.
- Do not give every section the same rhythm, and do not end by restating the title as a moral.
- Mix short and longer paragraphs. A blunt sentence is better than a neat one.
- No "delve", "landscape", "unlock", "robust", "tapestry", "it's worth noting", "the truth is", "here's the thing", \
"in today's world", or stacks of parallel triads.
- One concrete habit beats a framework. Leave something slightly unfinished if that is how you would actually say it.

Day-event rule (mandatory when the user message says day-event mode is ON):
- The piece MUST be clearly about something that matters on that Hong Kong calendar day: a major news story, \
summit/forum (e.g. APEC), holiday, market open/close ritual, earnings season marker, or policy calendar item.
- Prefer hooks from the "Today's day context" list in the user message. If several are listed, pick one and stay with it.
- Tie it to Tyler's lane when you can (US listing / China companies / capital markets / biotech manufacturing), \
but the day's event is the reason the piece exists — not a generic evergreen tip with a news name pasted on.
- If the suggested topic conflicts with the day, follow the day.
- Do not invent that an event happened if it is not in the day context or long-established calendar knowledge. \
You may discuss implications and process without fabricating attendance, quotes, or unpublished outcomes.

Hard rules - the draft is published under Tyler's name, so:
- Do not invent facts about Tyler, his employer, his companies, clients, deals, numbers, meetings or results. \
Do not write "I recently helped..." or any other claim of personal experience. General professional \
observations ("founders often...", "in my view...") are fine.
- Do not state market figures, prices, dates of events or regulatory details unless they appear in the data \
provided below or are long-established, widely known rules. If unsure, leave it out.
- No investment advice, no price predictions, no recommendations to buy or sell anything.
- Pick a topic that is not already covered by the existing titles listed below.

Output only the article file, exactly in this format and nothing else:
---
slug: <lowercase-words-joined-by-hyphens>
date: <given date>
tags: <capital or biotech, or both separated by a space>
read: <minutes, integer>
title_en: <title>
title_zh: <title>
summary_en: <one sentence>
summary_zh: <one sentence>
---
::: en
<markdown body>

::: zh
<markdown body>
"""


def hk_today():
    return dt.datetime.now(HK).date()


def known_calendar_hooks(day: dt.date):
    """Lightweight recurring hooks. Prefer live news.json; these fill gaps."""
    hooks = []
    # Weekday market rhythm (Hong Kong / US overlap framing)
    if day.weekday() < 5:
        hooks.append(f"US–Hong Kong trading week in progress ({day.strftime('%A')})")
    # Month markers
    if day.day == 1:
        hooks.append("Month-start calendar: boards and financing updates often reset here")
    if day.day in (14, 15, 16):
        hooks.append("Mid-month window: many China filings and board packs land around now")
    # Fixed / well-known seasons (approximate; do not invent outcomes)
    if day.month == 11 and 10 <= day.day <= 25:
        hooks.append(
            "November Asia-Pacific diplomacy / summit season (e.g. APEC-related coverage); "
            "US–China–Russia and regional capital-market implications are in play"
        )
    if day.month == 1 and day.day <= 5:
        hooks.append("New-year planning week for IPO calendars and board targets")
    # Chinese New Year window varies; keep soft
    if day.month in (1, 2):
        hooks.append("Lunar New Year season nearby: liquidity, staffing and deal timing questions for China teams")
    return hooks


def news_hooks(limit=12):
    path = ROOT / "data" / "news.json"
    if not path.exists():
        return []
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    items = doc.get("items") or []
    out = []
    for it in items[:limit]:
        title = (it.get("title") or "").strip()
        source = (it.get("source") or "").strip()
        if not title:
            continue
        cats = ",".join(it.get("cats") or [])
        bit = f"- {title}"
        if source:
            bit += f" ({source}"
            if cats:
                bit += f"; {cats}"
            bit += ")"
        elif cats:
            bit += f" [{cats}]"
        out.append(bit)
    return out


def day_context_block(day: dt.date, enabled: bool):
    if not enabled:
        return (
            "Day-event mode: OFF (before 2026-11-14 HKT). You may choose a practical "
            "capital-markets or biotech topic that is not a repeat of existing titles.\n"
        )
    lines = [
        "Day-event mode: ON.",
        f"Hong Kong calendar date: {day.isoformat()} ({day.strftime('%A')}).",
        "Anchor the article to one major item for THIS day (news, summit, holiday, or market calendar).",
        "Examples of the intended style: if APEC is in Shenzhen, write about APEC, a US–China–Russia meeting angle,",
        "or how China's economic rise shows up in listing / financing work — not a generic evergreen note.",
        "",
        "Today's day context (use one; do not invent extra events):",
    ]
    cal = known_calendar_hooks(day)
    news = news_hooks()
    if cal:
        lines.append("Calendar / season hooks:")
        lines.extend(f"- {h}" for h in cal)
    if news:
        lines.append("Recent headlines from the site news desk (prefer those dated for this day when possible):")
        lines.extend(news)
    if not cal and not news:
        lines.append(
            "- No live headline file; pick a widely known same-day public calendar item "
            "(markets open/close, a named summit week, or a public holiday) without inventing private facts."
        )
    return "\n".join(lines) + "\n"


def main():
    topic = None
    if "--topic" in sys.argv:
        topic = sys.argv[sys.argv.index("--topic") + 1]
    day = hk_today()
    today = day.isoformat()
    event_mode = day >= DAY_EVENT_FROM

    arts = [parse_article(p) for p in sorted(INSIGHTS.glob("*.md"))]
    essays = [a for a in arts if "weekly" not in a["tags"]]
    examples = "\n\n".join((INSIGHTS / f"{a['slug']}.md").read_text(encoding="utf-8")
                           for a in sorted(essays, key=lambda a: a["date"], reverse=True)[:3])
    titles = "\n".join(f"- {a['title_en']} / {a['title_zh']}" for a in essays)
    data = ""
    snap = ROOT / "data" / "markets.json"
    if snap.exists():
        m = json.loads(snap.read_text(encoding="utf-8"))
        rows = [f"{it['symbol']}: {it['price']} ({it['pct']:+.2f}% on the day)" for g in m["groups"] for it in g["items"]]
        data = f"Latest delayed market snapshot ({m['updated']}):\n" + "\n".join(rows)

    topic_line = (
        f"Suggested topic (still must fit today's event if day-event mode is ON): {topic}"
        if topic
        else "Choose the topic yourself from today's day context."
    )
    user = (
        f"Date for the article: {today}\n"
        f"{day_context_block(day, event_mode)}\n"
        f"{topic_line}\n\n"
        f"Existing titles (do not repeat):\n{titles}\n\n"
        f"{data}\n\n"
        f"Example articles (format and voice to follow):\n\n{examples}"
    )

    client = anthropic.Anthropic()
    try:
        with client.beta.messages.stream(
            model=MODEL,
            max_tokens=32000,
            output_config={"effort": "high"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=SYSTEM,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            msg = stream.get_final_message()
    except anthropic.RateLimitError as e:
        raise SystemExit(f"rate limited, try again later (request {getattr(e, 'request_id', '')})")
    except anthropic.APIStatusError as e:
        raise SystemExit(f"API error {e.status_code}: {e.message}")
    except anthropic.APIConnectionError:
        raise SystemExit("could not reach the Anthropic API")

    if msg.stop_reason == "refusal":
        raise SystemExit("the model declined to write this draft; try another topic")
    if msg.stop_reason == "max_tokens":
        raise SystemExit("the draft was cut off; try again")
    text = "".join(b.text for b in msg.content if b.type == "text").strip()
    text = re.sub(r"^```[a-z]*\n|\n```$", "", text).strip() + "\n"

    m = re.search(r"^slug:\s*([a-z0-9-]+)\s*$", text, re.M)
    if not text.startswith("---") or not m:
        raise SystemExit("unexpected output format:\n" + text[:500])
    slug = m.group(1)
    out = INSIGHTS / f"{slug}.md"
    if out.exists():
        raise SystemExit(f"{out.name} already exists")
    text = re.sub(r"^date:.*$", f"date: {today}", text, count=1, flags=re.M)
    out.write_text(text, encoding="utf-8")
    try:
        a = parse_article(out)   # same checks the site build runs
        bad = [t for t in a["tags"] if t not in CATS or t == "weekly"]
        if bad:
            raise SystemExit(f"bad tags {bad}")
    except SystemExit:
        out.unlink()
        raise
    print(out.relative_to(ROOT))


if __name__ == "__main__":
    main()
