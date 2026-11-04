#!/usr/bin/env python3
"""Fetch a delayed US market snapshot into data/markets.json.

Standard library only; run by .github/workflows/markets.yml about every 30
minutes during US trading hours. The Markets page shows this snapshot first,
so it works even where TradingView cannot be reached (e.g. mainland China).

Source: Yahoo Finance chart endpoint, with Stooq daily data as a fallback for
any symbol that fails. Prices are delayed and for general information only.

    python3 tools/fetch_markets.py                 # writes data/markets.json
    python3 tools/fetch_markets.py --test f.json   # parse a saved Yahoo reply
"""
import csv
import datetime as dt
import io
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "markets.json"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# (yahoo symbol, display symbol, stooq symbol, name)
GROUPS = [
    ("indices", "Indices", "指數", [
        ("^GSPC", "S&P 500", "^spx", "S&P 500"),
        ("^IXIC", "Nasdaq", "^ndq", "Nasdaq Composite"),
        ("^DJI", "Dow 30", "^dji", "Dow Jones Industrial"),
        ("^RUT", "Russell 2000", None, "Russell 2000"),
        ("^VIX", "VIX", None, "Volatility index"),
    ]),
    ("biotech", "Biotech", "生物科技", [
        ("IBB", "IBB", "ibb.us", "iShares Biotechnology ETF"),
        ("XBI", "XBI", "xbi.us", "SPDR S&P Biotech ETF"),
        ("AMGN", "AMGN", "amgn.us", "Amgen"),
        ("GILD", "GILD", "gild.us", "Gilead Sciences"),
        ("VRTX", "VRTX", "vrtx.us", "Vertex Pharmaceuticals"),
        ("REGN", "REGN", "regn.us", "Regeneron"),
        ("LLY", "LLY", "lly.us", "Eli Lilly"),
        ("MRNA", "MRNA", "mrna.us", "Moderna"),
    ]),
    ("china", "China ADRs", "中概股", [
        ("BABA", "BABA", "baba.us", "Alibaba"),
        ("PDD", "PDD", "pdd.us", "PDD Holdings"),
        ("JD", "JD", "jd.us", "JD.com"),
        ("BIDU", "BIDU", "bidu.us", "Baidu"),
        ("NIO", "NIO", "nio.us", "NIO"),
        ("KWEB", "KWEB", "kweb.us", "KraneShares China Internet ETF"),
        ("FXI", "FXI", "fxi.us", "iShares China Large-Cap ETF"),
    ]),
    ("tech", "Mega-cap tech", "大型科技股", [
        ("NVDA", "NVDA", "nvda.us", "NVIDIA"),
        ("AAPL", "AAPL", "aapl.us", "Apple"),
        ("MSFT", "MSFT", "msft.us", "Microsoft"),
        ("AMZN", "AMZN", "amzn.us", "Amazon"),
        ("GOOGL", "GOOGL", "googl.us", "Alphabet"),
        ("META", "META", "meta.us", "Meta Platforms"),
        ("TSLA", "TSLA", "tsla.us", "Tesla"),
    ]),
]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def thin(values, n=40):
    vals = [round(v, 4) for v in values if v is not None]
    if len(vals) <= n:
        return vals
    step = (len(vals) - 1) / (n - 1)
    return [vals[round(i * step)] for i in range(n)]


def parse_yahoo(data):
    res = json.loads(data)["chart"]["result"][0]
    meta = res["meta"]
    price = meta.get("regularMarketPrice")
    prev = meta.get("chartPreviousClose") or meta.get("previousClose")
    closes = ((res.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    if price is None or not prev:
        raise ValueError("no price")
    t = meta.get("regularMarketTime")
    return {
        "price": round(price, 4),
        "prev": round(prev, 4),
        "spark": thin(closes),
        "time": dt.datetime.fromtimestamp(t, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if t else None,
        "src": "Yahoo Finance",
    }


def yahoo(sym):
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(sym)
           + "?range=1d&interval=5m&includePrePost=false")
    return parse_yahoo(get(url))


def stooq(sym):
    rows = list(csv.DictReader(io.StringIO(get(f"https://stooq.com/q/d/l/?s={urllib.parse.quote(sym)}&i=d").decode())))
    rows = [r for r in rows if r.get("Close") not in (None, "", "N/D")]
    if len(rows) < 2:
        raise ValueError("not enough rows")
    last, prev = rows[-1], rows[-2]
    return {
        "price": round(float(last["Close"]), 4),
        "prev": round(float(prev["Close"]), 4),
        "spark": thin([float(r["Close"]) for r in rows[-30:]]),
        "time": last["Date"] + "T21:00:00Z",
        "src": "Stooq (daily close)",
    }


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--test":
        print(parse_yahoo(pathlib.Path(sys.argv[2]).read_bytes()))
        return

    old = {}
    if OUT.exists():
        try:
            for g in json.loads(OUT.read_text(encoding="utf-8"))["groups"]:
                for it in g["items"]:
                    old[it["symbol"]] = it
        except (ValueError, KeyError):
            pass

    groups, ok, total = [], 0, 0
    for gid, name_en, name_zh, syms in GROUPS:
        items = []
        for ysym, disp, ssym, name in syms:
            total += 1
            q = None
            for fn, s in ((yahoo, ysym), (stooq, ssym)):
                if not s:
                    continue
                try:
                    q = fn(s)
                    break
                except Exception as e:  # noqa: BLE001 - try the next source
                    print(f"{fn.__name__} {s}: {e}", file=sys.stderr)
            time.sleep(0.3)
            if q:
                ok += 1
                item = {"symbol": disp, "name": name, **q,
                        "change": round(q["price"] - q["prev"], 4),
                        "pct": round((q["price"] / q["prev"] - 1) * 100, 2)}
            elif disp in old:
                item = dict(old[disp], stale=True)   # keep the last good value
            else:
                continue
            items.append(item)
        groups.append({"id": gid, "name_en": name_en, "name_zh": name_zh, "items": items})

    print(f"{ok}/{total} symbols fetched", file=sys.stderr)
    if ok == 0:
        print("nothing fetched; keeping the existing file", file=sys.stderr)
        return
    out = {"updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "groups": groups}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
