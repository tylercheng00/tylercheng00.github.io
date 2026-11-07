#!/usr/bin/env python3
"""Publish the day's pre-written Insights note straight onto the site.

Finished bilingual articles wait in content/daily/*.md. Each file carries the
date it should go live. This moves every note dated today or earlier, in Hong
Kong time (UTC+8), into content/insights/ and adds it to sitemap.xml.
tools/build_site.py then builds the page. Nothing here calls a model or opens
a pull request.

    python3 tools/publish_daily.py
    python3 tools/publish_daily.py --date 2026-11-08

A missed morning catches up: every note already due is published, with the
date written in the file. Notes dated in the future stay in content/daily.
"""
import datetime as dt
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DAILY = ROOT / "content" / "daily"
INSIGHTS = ROOT / "content" / "insights"
SITEMAP = ROOT / "sitemap.xml"
SITE = "https://tylercheng00.github.io"
HK = dt.timezone(dt.timedelta(hours=8))

sys.path.insert(0, str(ROOT / "tools"))
from build_site import parse_article  # noqa: E402


def as_of(argv):
    if "--date" in argv:
        raw = argv[argv.index("--date") + 1]
        try:
            return dt.date.fromisoformat(raw)
        except ValueError:
            raise SystemExit(f"bad --date {raw!r}; use YYYY-MM-DD")
    return dt.datetime.now(HK).date()


def update_sitemap(moved):
    if not moved or not SITEMAP.exists():
        return
    text = SITEMAP.read_text(encoding="utf-8")
    latest = max(a["date"] for a in moved).isoformat()
    text2, n = re.subn(
        r"(<loc>https://tylercheng00\.github\.io/insights/</loc><lastmod>)[^<]+",
        r"\g<1>" + latest,
        text,
        count=1,
    )
    if n:
        text = text2
    additions = []
    for a in moved:
        loc = f"{SITE}/insights/{a['slug']}.html"
        if loc in text:
            continue
        additions.append(
            f"  <url><loc>{loc}</loc><lastmod>{a['date'].isoformat()}</lastmod></url>\n"
        )
    if additions:
        if "</urlset>" not in text:
            raise SystemExit("sitemap.xml: missing </urlset>")
        text = text.replace("</urlset>", "".join(additions) + "</urlset>")
    if text != SITEMAP.read_text(encoding="utf-8"):
        SITEMAP.write_text(text, encoding="utf-8")


def main():
    today = as_of(sys.argv)
    if not DAILY.exists():
        print(f"No queue ({DAILY.relative_to(ROOT)}).")
        return
    moved = []
    for path in sorted(DAILY.glob("*.md")):
        try:
            article = parse_article(path)
        except SystemExit as exc:
            print(f"skip {path.name}: {exc}", file=sys.stderr)
            continue
        if path.stem != article["slug"]:
            print(f"skip {path.name}: slug is {article['slug']}", file=sys.stderr)
            continue
        if article["date"] > today:
            continue
        dest = INSIGHTS / f"{article['slug']}.md"
        if dest.exists():
            print(f"skip {path.name}: {dest.name} already exists", file=sys.stderr)
            continue
        path.rename(dest)
        # Re-read from the published path so a bad move fails loudly.
        parse_article(dest)
        moved.append(article)
        print(dest.relative_to(ROOT))
    update_sitemap(moved)
    if not moved:
        print(f"No article due on or before {today.isoformat()} (Hong Kong).")


if __name__ == "__main__":
    main()
