#!/usr/bin/env python3
"""Fetch a delayed US market snapshot into data/markets.json.

Standard library only; run by .github/workflows/markets.yml about every 30
minutes during US trading hours. The Markets page shows this snapshot first,
so it works even where TradingView cannot be reached (e.g. mainland China).

Several free public quote sources are tried in turn (CNBC, Yahoo Finance,
Sina Finance); each one only fills in symbols the previous ones missed. The
small trend line is built from this job's own successive snapshots during
the trading day. Prices are delayed and for general information only.

    python3 tools/fetch_markets.py            # writes data/markets.json
    python3 tools/fetch_markets.py --selftest # parser checks, no network
"""
import datetime as dt
import http.cookiejar
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "markets.json"
HISTORY = ROOT / "data" / "markets-history.json"   # daily closes, for the weekly report
HISTORY_DAYS = 140
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
SPARK_MAX = 40

# display symbol, name, yahoo, cnbc, sina
GROUPS = [
    ("indices", "Indices", "指數", [
        ("S&P 500", "S&P 500", "^GSPC", ".SPX", "gb_$inx"),
        ("Nasdaq", "Nasdaq Composite", "^IXIC", ".IXIC", "gb_ixic"),
        ("Dow 30", "Dow Jones Industrial", "^DJI", ".DJI", "gb_$dji"),
        ("Russell 2000", "Russell 2000", "^RUT", ".RUT", None),
        ("VIX", "Volatility index", "^VIX", ".VIX", None),
    ]),
    ("biotech", "Biotech", "生物科技", [
        ("IBB", "iShares Biotechnology ETF"), ("XBI", "SPDR S&P Biotech ETF"),
        ("AMGN", "Amgen"), ("GILD", "Gilead Sciences"), ("VRTX", "Vertex Pharmaceuticals"),
        ("REGN", "Regeneron"), ("LLY", "Eli Lilly"), ("MRNA", "Moderna"),
    ]),
    ("china", "China ADRs", "中概股", [
        ("BABA", "Alibaba"), ("PDD", "PDD Holdings"), ("JD", "JD.com"), ("BIDU", "Baidu"),
        ("NIO", "NIO"), ("KWEB", "KraneShares China Internet ETF"), ("FXI", "iShares China Large-Cap ETF"),
    ]),
    ("tech", "Mega-cap tech", "大型科技股", [
        ("NVDA", "NVIDIA"), ("AAPL", "Apple"), ("MSFT", "Microsoft"), ("AMZN", "Amazon"),
        ("GOOGL", "Alphabet"), ("META", "Meta Platforms"), ("TSLA", "Tesla"),
    ]),
]


def entries():
    """(display, name, {provider: symbol}) for every row, in order."""
    for gid, _, _, rows in GROUPS:
        for r in rows:
            if len(r) == 2:
                d, n = r
                ids = {"yahoo": d, "cnbc": d, "sina": "gb_" + d.lower()}
            else:
                d, n, y, c, s = r
                ids = {"yahoo": y, "cnbc": c, "sina": s}
            yield gid, d, n, ids


def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    v = str(v).replace(",", "").replace("%", "").replace("+", "").strip()
    try:
        return float(v)
    except ValueError:
        return None


class Http:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def get(self, url, referer=None):
        h = {"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9"}
        if referer:
            h["Referer"] = referer
        try:
            with self.op.open(urllib.request.Request(url, headers=h), timeout=20) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404 and "fc.yahoo.com" in url:   # only needed for its cookie
                return b""
            raise


# ---------------------------------------------------------------- providers
def parse_cnbc(data):
    out = {}
    quotes = json.loads(data)["FormattedQuoteResult"]["FormattedQuote"]
    if isinstance(quotes, dict):
        quotes = [quotes]
    for q in quotes:
        price = num(q.get("last"))
        change = num(q.get("change"))
        # Use the day's change: after the close CNBC rolls
        # previous_day_closing forward to the latest close.
        prev = price - change if price is not None and change is not None else num(q.get("previous_day_closing"))
        if price and prev:
            out[q["symbol"]] = (price, prev)
    return out


def cnbc(http, syms):
    url = ("https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols="
           + urllib.parse.quote("|".join(syms), safe="")
           + "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=0&output=json&events=0")
    return parse_cnbc(http.get(url, "https://www.cnbc.com/"))


def parse_yahoo(data):
    out = {}
    for q in json.loads(data)["quoteResponse"]["result"]:
        price = num(q.get("regularMarketPrice"))
        prev = num(q.get("regularMarketPreviousClose"))
        if price and prev:
            out[q["symbol"]] = (price, prev)
    return out


def yahoo(http, syms):
    http.get("https://fc.yahoo.com/")
    crumb = http.get("https://query2.finance.yahoo.com/v1/test/getcrumb").decode().strip()
    if not crumb or "<" in crumb:
        raise ValueError("no crumb")
    url = ("https://query2.finance.yahoo.com/v7/finance/quote?symbols="
           + urllib.parse.quote(",".join(syms), safe=",") + "&crumb=" + urllib.parse.quote(crumb))
    return parse_yahoo(http.get(url))


def parse_sina(text):
    out = {}
    for sym, body in re.findall(r'var hq_str_([\w$]+)="([^"]*)"', text):
        f = body.split(",")
        if len(f) < 5:
            continue
        price, change = num(f[1]), num(f[4])
        if price and change is not None:
            out[sym] = (price, price - change)
    return out


def sina(http, syms):
    url = "https://hq.sinajs.cn/list=" + ",".join(syms)
    return parse_sina(http.get(url, "https://finance.sina.com.cn/").decode("gbk", "replace"))


PROVIDERS = [("cnbc", "CNBC", cnbc), ("yahoo", "Yahoo Finance", yahoo), ("sina", "Sina Finance", sina)]


# ---------------------------------------------------------------- main
def selftest():
    c = parse_cnbc(b'{"FormattedQuoteResult":{"FormattedQuote":[{"symbol":".SPX","last":"5,712.20","change":"-23.10","previous_day_closing":"5,712.20"},{"symbol":"AAPL","last":"227.48","change":"+1.23"}]}}')
    assert c == {".SPX": (5712.2, 5735.3), "AAPL": (227.48, 226.25)}, c
    y = parse_yahoo(b'{"quoteResponse":{"result":[{"symbol":"^GSPC","regularMarketPrice":5712.2,"regularMarketPreviousClose":5735.3}]}}')
    assert y == {"^GSPC": (5712.2, 5735.3)}, y
    s = parse_sina('var hq_str_gb_aapl="Apple,227.4800,0.54,2026-11-04 04:00:00,1.2300,226.1";\nvar hq_str_gb_x="";')
    assert abs(s["gb_aapl"][1] - 226.25) < 1e-9, s
    print("selftest ok")


def main():
    if "--selftest" in sys.argv:
        selftest()
        return

    old = {}
    if OUT.exists():
        try:
            for g in json.loads(OUT.read_text(encoding="utf-8"))["groups"]:
                for it in g["items"]:
                    old[it["symbol"]] = it
        except (ValueError, KeyError):
            pass

    rows = list(entries())
    got, src = {}, {}
    http = Http()
    for key, label, fn in PROVIDERS:
        need = [(d, ids[key]) for _, d, _, ids in rows if d not in got and ids.get(key)]
        if not need:
            break
        try:
            res = fn(http, [s for _, s in need])
        except Exception as e:  # noqa: BLE001 - try the next source
            print(f"{label}: failed ({e})", file=sys.stderr)
            continue
        n = 0
        for d, s in need:
            if s in res:
                got[d], src[d] = res[s], label
                n += 1
        print(f"{label}: {n}/{len(need)}", file=sys.stderr)

    print(f"{len(got)}/{len(rows)} symbols fetched", file=sys.stderr)
    if not got:
        print("nothing fetched; keeping the existing file", file=sys.stderr)
        return

    now = dt.datetime.now(dt.timezone.utc)
    groups = {gid: {"id": gid, "name_en": en, "name_zh": zh, "items": []} for gid, en, zh, _ in GROUPS}
    for gid, d, name, _ in rows:
        prev_item = old.get(d)
        if d in got:
            price, prev = got[d]
            # Trend line: this job's own snapshots, reset when the previous
            # close changes (i.e. a new trading day has started).
            spark = []
            if prev_item and abs(prev_item.get("prev", 0) - prev) < 1e-6:
                spark = list(prev_item.get("spark") or [])
            if not spark:
                spark = [round(prev, 4)]
            if spark[-1] != round(price, 4):
                spark.append(round(price, 4))
            item = {"symbol": d, "name": name, "price": round(price, 4), "prev": round(prev, 4),
                    "change": round(price - prev, 4), "pct": round((price / prev - 1) * 100, 2),
                    "spark": spark[-SPARK_MAX:], "src": src[d]}
        elif prev_item:
            item = dict(prev_item, stale=True)
        else:
            continue
        groups[gid]["items"].append(item)

    out = {"updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "groups": list(groups.values())}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    record_history(groups, now)


def record_history(groups, now):
    """Keep the latest price of each New York trading day (the last run of the
    day, after the close, leaves the closing price) plus the previous close."""
    from zoneinfo import ZoneInfo
    sys.path.insert(0, str(ROOT / "tools"))
    from nyse_calendar import is_trading_day

    day = now.astimezone(ZoneInfo("America/New_York")).date()
    if not is_trading_day(day):
        return
    hist = {}
    if HISTORY.exists():
        try:
            hist = json.loads(HISTORY.read_text(encoding="utf-8"))
        except ValueError:
            hist = {}
    days = hist.setdefault("days", {})
    rec = days.setdefault(day.isoformat(), {})
    for g in groups.values():
        for it in g["items"]:
            if not it.get("stale"):
                rec[it["symbol"]] = {"c": it["price"], "p": it["prev"]}
    for old_day in sorted(days)[:-HISTORY_DAYS]:
        del days[old_day]
    hist["days"] = dict(sorted(days.items()))
    HISTORY.write_text(json.dumps(hist, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
