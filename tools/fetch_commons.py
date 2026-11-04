#!/usr/bin/env python3
"""TEMPORARY helper (removed before merge): download candidate hero photos
from Wikimedia Commons with their licence data, into _img-candidates/.
Run by .github/workflows/fetch-images.yml on pushes to the working branch."""
import html
import json
import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "_img-candidates"
UA = "tylercheng00-site-images/1.0 (https://tylercheng00.github.io; hero photos)"
QUERIES = {
    "markets": ["New York Stock Exchange facade", "New York Stock Exchange trading floor"],
    "capital": ["Wall Street sign New York", "Wall Street Manhattan financial district"],
    "ventures": ["vaccine vials laboratory", "biotechnology laboratory pipette", "bioreactor laboratory"],
    "projects": ["laboratory microscope research", "scientist laboratory"],
    "about": ["Victoria Harbour Hong Kong skyline night", "Hong Kong skyline"],
    "insights": ["open book desk reading", "notebook pen desk"],
    "news": ["newspapers stack", "newspaper printing press"],
    "contact": ["Manhattan skyline dusk", "Hong Kong Central skyline dusk"],
}
OK_LIC = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?)", re.I)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def text(v):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", v or ""))).strip()


def main():
    OUT.mkdir(exist_ok=True)
    meta = {}
    for topic, qs in QUERIES.items():
        n = 0
        for q in qs:
            api = ("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
                "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
                "gsrsearch": q + " filetype:bitmap", "gsrlimit": 20, "prop": "imageinfo",
                "iiprop": "url|size|extmetadata|mime", "iiurlwidth": 1800}))
            try:
                pages = json.loads(get(api)).get("query", {}).get("pages", {})
            except Exception as e:  # noqa: BLE001
                print("search failed", q, e)
                continue
            for p in sorted(pages.values(), key=lambda p: p.get("index", 99)):
                ii = (p.get("imageinfo") or [{}])[0]
                em = ii.get("extmetadata", {})
                lic = text(em.get("LicenseShortName", {}).get("value"))
                w, h = ii.get("width", 0), ii.get("height", 0)
                if ii.get("mime") != "image/jpeg" or w < 1800 or w / max(h, 1) < 1.3 or not OK_LIC.match(lic):
                    continue
                n += 1
                name = f"{topic}-{n:02d}.jpg"
                try:
                    (OUT / name).write_bytes(get(ii["thumburl"]))
                except Exception as e:  # noqa: BLE001
                    print("download failed", p["title"], e)
                    continue
                meta[name] = {"title": p["title"], "query": q, "artist": text(em.get("Artist", {}).get("value")),
                              "license": lic, "license_url": em.get("LicenseUrl", {}).get("value", ""),
                              "page": ii.get("descriptionurl"), "size": [w, h]}
                print("ok", name, lic, p["title"])
                if n >= 6 * len(qs) or sum(1 for k in meta if k.startswith(topic + "-")) >= 8:
                    break
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
