#!/usr/bin/env python3
"""Download the site's web fonts from Google Fonts into assets/fonts/.

Google Fonts is blocked in mainland China, so the site serves its own copies
(this also keeps the Hong Kong mirror fully self-contained). Run this again
only when the font list below changes:

    python3 tools/vendor_fonts.py

It writes assets/fonts/fonts.css (with relative URLs) and one folder of
.woff2 files per family. The CJK families are split by Google into many
small unicode-range slices; browsers download only the slices a page uses.
"""
import pathlib
import re
import shutil
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"
CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600"
    "&family=Space+Grotesk:wght@500;600"
    "&family=Inter:wght@400;500;600;700"
    "&family=Noto+Sans+TC:wght@400;500;700"
    "&family=Noto+Serif+TC:wght@500;700"
    "&display=swap"
)
# A current browser user agent, so Google returns woff2 with unicode-range slices.
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    css = get(CSS_URL).decode("utf-8")
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    def local(m):
        url = m.group(1)
        # https://fonts.gstatic.com/s/<family>/<version>/<file>.woff2
        parts = url.split("/s/", 1)[1].split("/")
        family, name = parts[0], parts[-1]
        dest = OUT / family / name
        if not dest.exists():
            dest.parent.mkdir(exist_ok=True)
            dest.write_bytes(get(url))
        return f"url({family}/{name})"

    css = re.sub(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", local, css)
    header = "/* Self-hosted copy of Google Fonts; regenerate with tools/vendor_fonts.py */\n"
    (OUT / "fonts.css").write_text(header + css, encoding="utf-8")
    files = list(OUT.rglob("*.woff2"))
    size = sum(f.stat().st_size for f in files)
    print(f"{len(files)} font files, {size / 1e6:.1f} MB, {css.count('@font-face')} @font-face rules")


if __name__ == "__main__":
    main()
