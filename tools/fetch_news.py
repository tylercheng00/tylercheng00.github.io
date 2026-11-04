#!/usr/bin/env python3
"""Fetch recent finance and US / China politics headlines into data/news.json.

Standard library only; run by .github/workflows/news.yml every few hours.
Only the headline, a short excerpt, the source name, the date and a link to
the original article are stored. Feeds that fail are skipped, so one broken
source never empties the page; if every feed fails, the old file is kept.

    python3 tools/fetch_news.py            # writes data/news.json
    python3 tools/fetch_news.py --test f.xml  # parse a local file, print items
"""
import datetime as dt
import email.utils
import html
import json
import pathlib
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "news.json"

# (source name, category, url)
FEEDS = [
    ("CNBC", "finance", "https://www.cnbc.com/id/10000664/device/rss/rss.html"),          # Finance
    ("CNBC", "finance", "https://www.cnbc.com/id/20910258/device/rss/rss.html"),          # Economy
    ("BBC News", "finance", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("CNBC", "us", "https://www.cnbc.com/id/10000113/device/rss/rss.html"),               # Politics
    ("NPR", "us", "https://feeds.npr.org/1014/rss.xml"),                                  # Politics
    ("BBC News", "us", "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml"),
    ("BBC News", "china", "https://feeds.bbci.co.uk/news/world/asia/china/rss.xml"),
    ("SCMP", "china", "https://www.scmp.com/rss/4/feed"),                                 # China
    ("SCMP", "china", "https://www.scmp.com/rss/318421/feed"),                            # China economy
]

PER_FEED = 8          # newest items kept from each feed
MAX_ITEMS = 48        # total kept
MAX_AGE_DAYS = 4      # drop anything older
CHINA_RE = re.compile(r"\b(China|Chinese|Beijing|Xi Jinping|Hong Kong|Taiwan|Shanghai|Shenzhen|Yuan|PBOC)\b", re.I)
US_POL_RE = re.compile(r"\b(Trump|White House|Congress|Senate|Republican|Democrat|tariff|Fed\b|Federal Reserve|Treasury)\b", re.I)
UA = "Mozilla/5.0 (compatible; tylercheng00-site-newsbot/1.0; +https://tylercheng00.github.io/news.html)"


def clean(text, limit=None):
    if not text:
        return ""
    t = re.sub(r"<[^>]+>", " ", text)
    t = html.unescape(t)
    t = re.sub(r"\s+", " ", t).strip()
    if limit and len(t) > limit:
        t = t[:limit].rsplit(" ", 1)[0].rstrip(",.;:") + "…"
    return t


def parse_date(s):
    if not s:
        return None
    s = s.strip()
    try:
        d = email.utils.parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


def local(tag):
    return tag.rsplit("}", 1)[-1]


def child(el, *names):
    for c in el:
        if local(c.tag) in names:
            return c
    return None


def parse_feed(data):
    root = ET.fromstring(data)
    items = []
    for el in root.iter():
        name = local(el.tag)
        if name not in ("item", "entry"):
            continue
        title = child(el, "title")
        link = child(el, "link")
        href = None
        if link is not None:
            href = (link.text or "").strip() or link.get("href")
        if not href:
            guid = child(el, "guid")
            if guid is not None and (guid.text or "").startswith("http"):
                href = guid.text.strip()
        desc = child(el, "description", "summary", "content")
        date = child(el, "pubDate", "published", "updated", "date")
        t = clean(title.text if title is not None else "")
        if not t or not href or not href.startswith("http"):
            continue
        items.append({
            "title": t,
            "link": href,
            "summary": clean(desc.text if desc is not None else "", 220),
            "date": parse_date(date.text if date is not None else None),
        })
    return items


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--test":
        for it in parse_feed(pathlib.Path(sys.argv[2]).read_bytes()):
            print(it)
        return

    now = dt.datetime.now(dt.timezone.utc)
    cutoff = now - dt.timedelta(days=MAX_AGE_DAYS)
    seen, items, ok = set(), [], 0
    for source, cat, url in FEEDS:
        try:
            got = parse_feed(fetch(url))
            ok += 1
        except Exception as e:  # noqa: BLE001 - any failure just skips the feed
            print(f"skip {url}: {e}", file=sys.stderr)
            continue
        got = [g for g in got if g["date"] is None or g["date"] >= cutoff]
        got.sort(key=lambda g: g["date"] or now, reverse=True)
        n = 0
        for g in got:
            key = re.sub(r"\W+", "", g["title"].lower())[:80]
            if key in seen or g["link"] in seen:
                continue
            seen.update((key, g["link"]))
            text = g["title"] + " " + g["summary"]
            cats = {cat}
            if CHINA_RE.search(text):
                cats.add("china")
            if cat == "finance" and US_POL_RE.search(text):
                cats.add("us")
            items.append({
                "title": g["title"],
                "summary": g["summary"],
                "link": g["link"],
                "source": source,
                "cats": sorted(cats),
                "date": (g["date"] or now).strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
            n += 1
            if n >= PER_FEED:
                break
        print(f"ok   {url}: {n} items", file=sys.stderr)

    if not ok or not items:
        print("no feeds succeeded; keeping the existing file", file=sys.stderr)
        return

    items.sort(key=lambda i: i["date"], reverse=True)
    out = {
        "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": sorted({s for s, _, _ in FEEDS}),
        "items": items[:MAX_ITEMS],
    }
    OUT.parent.mkdir(exist_ok=True)
    old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    new = json.dumps(out, ensure_ascii=False, indent=1) + "\n"
    # Only the timestamp changed? Leave the file alone to avoid empty commits.
    strip = lambda s: re.sub(r'"updated": "[^"]*"', "", s)
    if strip(old) == strip(new):
        print("no new headlines", file=sys.stderr)
        return
    OUT.write_text(new, encoding="utf-8")
    print(f"wrote {len(out['items'])} items", file=sys.stderr)


if __name__ == "__main__":
    main()
