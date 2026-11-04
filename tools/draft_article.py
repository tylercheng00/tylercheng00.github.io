#!/usr/bin/env python3
"""Draft one bilingual Insights article with Claude, for Tyler to review.

Run monthly by .github/workflows/monthly-draft.yml, which opens a pull request
with the draft. Nothing is published until that pull request is merged.

    ANTHROPIC_API_KEY=... python3 tools/draft_article.py [--topic "..."]

Writes content/insights/<slug>.md in the site's article format and prints the
path. The draft must not invent facts about Tyler, his companies or clients;
every draft still needs a human read before it goes live.
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

SYSTEM = """You draft short articles for the personal website of 鄭迪珉 Tyler Tik Man Cheng, a Hong Kong-born \
US Equities Market Specialist at Fuway Capital (IPO advisory, M&A, financing for China-based companies listed or \
listing in the US) and co-founder & COO of Nanotech Innovation Limited (nano-coatings, biomedical targeting, \
patents). Readers are founders and investors in Hong Kong and mainland China.

Write one new article in the same voice, length and structure as the examples: plain, practical, specific, \
no hype, short paragraphs, three to five "### " sub-headings, about 450-650 English words, then a faithful \
Traditional Chinese version in natural Hong Kong written Chinese (書面語, 繁體).

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


def main():
    topic = None
    if "--topic" in sys.argv:
        topic = sys.argv[sys.argv.index("--topic") + 1]
    today = dt.date.today().isoformat()

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

    user = (f"Date for the article: {today}\n"
            f"{'Suggested topic: ' + topic if topic else 'Choose the topic yourself.'}\n\n"
            f"Existing titles (do not repeat):\n{titles}\n\n"
            f"{data}\n\n"
            f"Example articles (format and voice to follow):\n\n{examples}")

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
