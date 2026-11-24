#!/usr/bin/env python3
"""Fetch recent finance, US / China politics and biotech / health headlines into data/news.json.

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

# (source name, category, url, outlet_bucket)
#
# US politics balancing (outlet_bucket) — HOW IT WORKS
# ----------------------------------------------------
# We do NOT classify individual articles by NLP or keywords.
# We only tag the *publisher* into one of three outlet buckets, then
# interleave those buckets when building the US politics quota so one
# newsroom style cannot dominate the list.
#
#   prog  — progressive / centre-left English newsrooms (NPR, Guardian, BBC US)
#   biz   — business / markets desk politics (CNBC Politics)
#   cons  — conservative English newsrooms (Fox News, Washington Examiner)
#
# outlet_bucket is stripped before writing news.json and is NEVER shown
# on the site. Public items keep only title, summary, link, source, cats, date.
#
# zhpress = Chinese-language mainland official / establishment finance & politics press
FEEDS = [
    ("CNBC", "finance", "https://www.cnbc.com/id/10000664/device/rss/rss.html", None),
    ("CNBC", "finance", "https://www.cnbc.com/id/20910258/device/rss/rss.html", None),
    ("BBC News", "finance", "https://feeds.bbci.co.uk/news/business/rss.xml", None),
    # US politics — publisher buckets only (see header comment)
    ("NPR", "us", "https://feeds.npr.org/1014/rss.xml", "prog"),
    ("BBC News", "us", "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", "prog"),
    ("The Guardian", "us", "https://www.theguardian.com/us-news/rss", "prog"),
    ("CNBC", "us", "https://www.cnbc.com/id/10000113/device/rss/rss.html", "biz"),
    ("Fox News", "us", "https://moxie.foxnews.com/google-publisher/politics.xml", "cons"),
    ("Washington Examiner", "us", "https://www.washingtonexaminer.com/section/news/feed", "cons"),
    ("BBC News", "china", "https://feeds.bbci.co.uk/news/world/asia/china/rss.xml", None),
    ("SCMP", "china", "https://www.scmp.com/rss/4/feed", None),
    ("SCMP", "china", "https://www.scmp.com/rss/318421/feed", None),
    ("人民日報", "zhpress", "http://www.people.com.cn/rss/finance.xml", None),
    ("人民日報", "zhpress", "http://www.people.com.cn/rss/politics.xml", None),
    ("中國新聞網", "zhpress", "https://www.chinanews.com.cn/rss/finance.xml", None),
    ("中國新聞網", "zhpress", "https://www.chinanews.com.cn/rss/china.xml", None),
    ("中國新聞網", "zhpress", "https://www.chinanews.com.cn/rss/importnews.xml", None),
    ("新華網", "zhpress", "http://www.news.cn/fortune/news_fortune.xml", None),
    ("新華網", "zhpress", "http://www.news.cn/politics/news_politics.xml", None),
    ("STAT News", "biotech", "https://www.statnews.com/feed/", None),
    ("Fierce Biotech", "biotech", "https://www.fiercebiotech.com/rss/xml", None),
    ("BioPharma Dive", "biotech", "https://www.biopharmadive.com/feeds/news/", None),
    ("GEN", "biotech", "https://www.genengnews.com/feed/", None),
    ("Nature Biotechnology", "biotech", "https://www.nature.com/nbt.rss", None),
    ("ScienceDaily", "biotech", "https://www.sciencedaily.com/rss/health_medicine.xml", None),
    ("BBC News", "biotech", "https://feeds.bbci.co.uk/news/health/rss.xml", None),
    ("NIH", "biotech", "https://www.nih.gov/news-releases/feed.xml", None),
    ("US FDA", "biotech", "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml", None),
    ("WHO", "biotech", "https://www.who.int/rss-feeds/news-english.xml", None),
]

# CCTV JSONP pages (official mainland headlines; not RSS — kept for freshness when RSS lags)
JSONP_FEEDS = [
    ("央視網", "zhpress", "https://news.cctv.com/2019/07/gaiban/cmsdatainterface/page/china_1.jsonp"),
    ("央視網", "zhpress", "https://news.cctv.com/2019/07/gaiban/cmsdatainterface/page/news_1.jsonp"),
]

PER_FEED = {"biotech": 5, "zhpress": 6}   # newest items kept from each feed (default 8)
QUOTA = {"finance": 18, "us": 14, "china": 14, "zhpress": 24, "biotech": 26}   # most items kept per feed category
MAX_AGE_DAYS = {"biotech": 10, "zhpress": 5}   # drop anything older (default 4); journals and agencies post less often
CHINA_RE = re.compile(r"\b(China|Chinese|Beijing|Xi Jinping|Hong Kong|Taiwan|Shanghai|Shenzhen|Yuan|PBOC)\b", re.I)
BIO_RE = re.compile(r"\b(biotech\w*|pharma\w*|drug ?maker|FDA|vaccine\w*|clinical trial|gene therapy|oncology|Moderna|Pfizer|Eli Lilly|Novo Nordisk|AstraZeneca|Merck|GLP-1)\b", re.I)
US_POL_RE = re.compile(r"\b(Trump|White House|Congress|Senate|Republican|Democrat|tariff|Fed\b|Federal Reserve|Treasury)\b", re.I)
UA = "Mozilla/5.0 (compatible; tylercheng00-site-newsbot/1.0; +https://tylercheng00.github.io/news.html)"
CCTV_JSONP_RE = re.compile(r"^[^(]+\((.*)\)\s*;?\s*$", re.S)

def decode_feed(raw, headers):
    """Decode RSS bytes; mainland feeds are often GB18030 rather than UTF-8."""
    ctype = headers.get("Content-Type", "") if headers else ""
    m = re.search(r"charset=([\w-]+)", ctype, re.I)
    if m:
        try:
            return raw.decode(m.group(1))
        except (LookupError, UnicodeDecodeError):
            pass
    head = raw[:240].decode("ascii", errors="ignore")
    m = re.search(r"encoding=[\"']([\w-]+)[\"']", head, re.I)
    if m:
        try:
            return raw.decode(m.group(1))
        except (LookupError, UnicodeDecodeError):
            pass
    for enc in ("utf-8", "gb18030", "gbk", "big5"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


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


def date_from_link(url):
    """Infer a publish day from common mainland CMS URL patterns."""
    if not url:
        return None
    m = re.search(r"/(\d{4})-(\d{2})/(\d{2})/", url)
    if not m:
        m = re.search(r"/n\d+/(\d{4})/(\d{2})(\d{2})/", url)  # people.com.cn
    if not m:
        m = re.search(r"/(\d{4})/(\d{2})-(\d{2})/", url)  # chinanews.com.cn
    if not m:
        return None
    try:
        d = dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None
    return dt.datetime(d.year, d.month, d.day, tzinfo=dt.timezone.utc)


def local(tag):
    return tag.rsplit("}", 1)[-1]


def child(el, *names):
    for c in el:
        if local(c.tag) in names:
            return c
    return None


def parse_feed(data):
    if isinstance(data, bytes):
        text = decode_feed(data, {})
    else:
        text = data
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    root = ET.fromstring(text)
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
        when = parse_date(date.text if date is not None else None) or date_from_link(href)
        items.append({
            "title": t,
            "link": href,
            "summary": clean(desc.text if desc is not None else "", 220),
            "date": when,
        })
    return items


def fetch(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
            "Referer": "https://news.cctv.com/" if "cctv.com" in url else "https://tylercheng00.github.io/",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return decode_feed(r.read(), r.headers)


def fetch_bytes(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/javascript, application/json, */*",
            "Referer": "https://news.cctv.com/",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def parse_cctv_jsonp(data):
    """Parse CCTV cmsdatainterface JSONP pages into the same shape as parse_feed()."""
    text = data.decode("utf-8", "replace") if isinstance(data, (bytes, bytearray)) else data
    m = CCTV_JSONP_RE.match(text.strip())
    if not m:
        raise ValueError("not CCTV JSONP")
    payload = json.loads(m.group(1))
    rows = (payload.get("data") or {}).get("list") or []
    items = []
    for row in rows:
        title = clean(row.get("title") or "")
        href = (row.get("url") or "").strip()
        if not title or not href.startswith("http"):
            continue
        raw = (row.get("focus_date") or "").strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}", raw):
            raw = raw.replace(" ", "T") + "+08:00"
        when = parse_date(raw) or date_from_link(href)
        items.append({
            "title": title,
            "link": href,
            "summary": clean(row.get("brief") or "", 220),
            "date": when,
        })
    return items


def collect(source, cat, got, now, seen, items, outlet_bucket=None):
    """Deduplicate, tag and append items from one feed; return count kept."""
    cutoff = now - dt.timedelta(days=MAX_AGE_DAYS.get(cat, 4))
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
        # China tab = English / foreign coverage only; zhpress stays in Chinese press.
        if cat != "zhpress" and CHINA_RE.search(text):
            cats.add("china")
        if cat == "finance" and US_POL_RE.search(text):
            cats.add("us")
        if cat == "finance" and BIO_RE.search(text):
            cats.add("biotech")
        row = {
            "title": g["title"],
            "summary": g["summary"],
            "link": g["link"],
            "source": source,
            "cats": sorted(cats),
            "date": (g["date"] or now).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "_feed": cat,
        }
        # Internal only — stripped before writing news.json
        if outlet_bucket and cat == "us":
            row["_bucket"] = outlet_bucket
        items.append(row)
        n += 1
        if n >= PER_FEED.get(cat, 8):
            break
    return n


def balance_us(mine, n):
    """Rotate prog / cons / biz outlet buckets so the US politics pool is mixed.

    Classification is by publisher (see FEEDS header), not by article text.
    Bucket tags are removed before public JSON is written.
    """
    buckets = {"prog": [], "cons": [], "biz": [], "other": []}
    for i in mine:
        buckets.get(i.get("_bucket") or "other", buckets["other"]).append(i)
    for b in buckets.values():
        b.sort(key=lambda i: i["date"], reverse=True)
    # Alternate progressive and conservative first, then business, then leftovers
    order = ("prog", "cons", "biz", "other")
    out, idx = [], {k: 0 for k in order}
    while len(out) < n:
        progressed = False
        for k in order:
            if idx[k] < len(buckets[k]):
                out.append(buckets[k][idx[k]])
                idx[k] += 1
                progressed = True
                if len(out) >= n:
                    break
        if not progressed:
            break
    return out


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--test":
        for it in parse_feed(pathlib.Path(sys.argv[2]).read_bytes()):
            print(it)
        return

    now = dt.datetime.now(dt.timezone.utc)
    seen, items, ok = set(), [], 0
    for source, cat, url, outlet_bucket in FEEDS:
        try:
            got = parse_feed(fetch(url))
            ok += 1
        except Exception as e:  # noqa: BLE001 - any failure just skips the feed
            print(f"skip {url}: {e}", file=sys.stderr)
            continue
        n = collect(source, cat, got, now, seen, items, outlet_bucket=outlet_bucket)
        print(f"ok   {url}: {n} items", file=sys.stderr)

    for source, cat, url in JSONP_FEEDS:
        try:
            got = parse_cctv_jsonp(fetch_bytes(url))
            ok += 1
        except Exception as e:  # noqa: BLE001
            print(f"skip {url}: {e}", file=sys.stderr)
            continue
        n = collect(source, cat, got, now, seen, items)
        print(f"ok   {url}: {n} items", file=sys.stderr)

    if not ok or not items:
        print("no feeds succeeded; keeping the existing file", file=sys.stderr)
        return

    # newest first within each feed category, up to its quota, then merge
    kept = []
    for cat, n in QUOTA.items():
        mine = [i for i in items if i["_feed"] == cat]
        if cat == "us":
            kept += balance_us(mine, n)
        else:
            mine.sort(key=lambda i: i["date"], reverse=True)
            kept += mine[:n]
    for i in kept:
        i.pop("_feed", None)
        i.pop("_bucket", None)  # never publish outlet-bucket labels
    kept.sort(key=lambda i: i["date"], reverse=True)
    out = {
        "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": sorted({s for s, _, _, _ in FEEDS} | {s for s, _, _ in JSONP_FEEDS}),
        "items": kept,
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
