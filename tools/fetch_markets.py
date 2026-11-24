#!/usr/bin/env python3
"""Fetch delayed multi-region market snapshots into data/markets.json.

Regions: US, Hong Kong, A-shares, Taiwan, Japan, Korea, Australia.
Groups include indices plus AI / semiconductor / aerospace themes where listed.

Standard library only; run by .github/workflows/markets.yml.

    python3 tools/fetch_markets.py
    python3 tools/fetch_markets.py --selftest
"""
from __future__ import annotations

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
HISTORY = ROOT / "data" / "markets-history.json"
HISTORY_DAYS = 140
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
SPARK_MAX = 40

# region -> list of (group_id, name_en, name_zh, theme|None, rows)
# row: (display, name) or (display, name, yahoo, cnbc, sina)
REGIONS: dict[str, list] = {
    "us": [
        ("indices", "Indices", "指數", None, [
            ("S&P 500", "S&P 500", "^GSPC", ".SPX", "gb_$inx"),
            ("Nasdaq", "Nasdaq Composite", "^IXIC", ".IXIC", "gb_ixic"),
            ("Dow 30", "Dow Jones Industrial", "^DJI", ".DJI", "gb_$dji"),
            ("Russell 2000", "Russell 2000", "^RUT", ".RUT", None),
            ("VIX", "Volatility index", "^VIX", ".VIX", None),
        ]),
        ("ai", "Artificial intelligence", "人工智能", "ai", [
            ("NVDA", "NVIDIA"), ("MSFT", "Microsoft"), ("GOOGL", "Alphabet"),
            ("META", "Meta Platforms"), ("AMD", "AMD"), ("PLTR", "Palantir"),
        ]),
        ("chip", "Semiconductors", "晶片", "chip", [
            ("TSM", "TSMC ADR"), ("AVGO", "Broadcom"), ("ASML", "ASML"),
            ("AMAT", "Applied Materials"), ("LRCX", "Lam Research"), ("INTC", "Intel"),
        ]),
        ("aero", "Aerospace", "航天", "aero", [
            ("BA", "Boeing"), ("LMT", "Lockheed Martin"), ("RTX", "RTX"),
            ("NOC", "Northrop Grumman"), ("GD", "General Dynamics"), ("GE", "GE Aerospace"),
        ]),
        ("biotech", "Biotech", "生物科技", None, [
            ("IBB", "iShares Biotechnology ETF"), ("XBI", "SPDR S&P Biotech ETF"),
            ("AMGN", "Amgen"), ("GILD", "Gilead Sciences"), ("LLY", "Eli Lilly"),
        ]),
        ("china", "China ADRs", "中概股", None, [
            ("BABA", "Alibaba"), ("PDD", "PDD Holdings"), ("JD", "JD.com"),
            ("BIDU", "Baidu"), ("KWEB", "KraneShares China Internet ETF"),
        ]),
    ],
    "hk": [
        ("indices", "Indices", "指數", None, [
            ("HSI", "Hang Seng Index", "^HSI", None, "hkHSI"),
            ("0700.HK", "Tencent", "0700.HK", None, "hk00700"),
            ("9988.HK", "Alibaba-SW", "9988.HK", None, "hk09988"),
            ("3690.HK", "Meituan", "3690.HK", None, "hk03690"),
            ("0388.HK", "HKEX", "0388.HK", None, "hk00388"),
            ("1299.HK", "AIA", "1299.HK", None, "hk01299"),
        ]),
        ("leaders", "Market leaders", "市場龍頭", None, [
            ("0005.HK", "HSBC", "0005.HK", None, "hk00005"),
            ("0941.HK", "China Mobile", "0941.HK", None, "hk00941"),
            ("1398.HK", "ICBC", "1398.HK", None, "hk01398"),
            ("2318.HK", "Ping An", "2318.HK", None, "hk02318"),
            ("0939.HK", "CCB", "0939.HK", None, "hk00939"),
        ]),
        ("ai", "Artificial intelligence", "人工智能", "ai", [
            ("0700.HK", "Tencent", "0700.HK", None, "hk00700"),
            ("9988.HK", "Alibaba-SW", "9988.HK", None, "hk09988"),
            ("1810.HK", "Xiaomi", "1810.HK", None, "hk01810"),
            ("1024.HK", "Kuaishou", "1024.HK", None, "hk01024"),
            ("9618.HK", "JD-SW", "9618.HK", None, "hk09618"),
        ]),
        ("chip", "Semiconductors", "晶片", "chip", [
            ("0981.HK", "SMIC", "0981.HK", None, "hk00981"),
            ("1347.HK", "Hua Hong", "1347.HK", None, "hk01347"),
            ("2382.HK", "Sunny Optical", "2382.HK", None, "hk02382"),
            ("6869.HK", "Yangtze Optical", "6869.HK", None, "hk06869"),
        ]),
        ("aero", "Aerospace & transport", "航天及運輸", "aero", [
            ("0753.HK", "Air China", "0753.HK", None, "hk00753"),
            ("0670.HK", "China Eastern", "0670.HK", None, "hk00670"),
            ("0293.HK", "Cathay Pacific", "0293.HK", None, "hk00293"),
            ("0317.HK", "COSCO Shipping", "0317.HK", None, "hk00317"),
        ]),
        ("finance", "Banks & insurers", "銀行及保險", None, [
            ("0005.HK", "HSBC", "0005.HK", None, "hk00005"),
            ("1299.HK", "AIA", "1299.HK", None, "hk01299"),
            ("0388.HK", "HKEX", "0388.HK", None, "hk00388"),
            ("2318.HK", "Ping An", "2318.HK", None, "hk02318"),
        ]),
    ],
    "cn": [
        ("indices", "Indices", "指數", None, [
            ("000001.SS", "SSE Composite", "000001.SS", None, "sh000001"),
            ("399001.SZ", "SZSE Component", "399001.SZ", None, "sz399001"),
            ("000300.SS", "CSI 300", "000300.SS", None, "sh000300"),
            ("000688.SS", "STAR 50", "000688.SS", None, "sh000688"),
        ]),
        ("leaders", "Market leaders", "市場龍頭", None, [
            ("600519.SS", "Kweichow Moutai", "600519.SS", None, "sh600519"),
            ("300750.SZ", "CATL", "300750.SZ", None, "sz300750"),
            ("601318.SS", "Ping An", "601318.SS", None, "sh601318"),
            ("000858.SZ", "Wuliangye", "000858.SZ", None, "sz000858"),
            ("601012.SS", "LONGi", "601012.SS", None, "sh601012"),
        ]),
        ("ai", "Artificial intelligence", "人工智能", "ai", [
            ("002230.SZ", "iFlytek", "002230.SZ", None, "sz002230"),
            ("002415.SZ", "Hikvision", "002415.SZ", None, "sz002415"),
            ("603019.SS", "Dawning", "603019.SS", None, "sh603019"),
            ("688111.SS", "Kingsoft Office", "688111.SS", None, "sh688111"),
            ("300418.SZ", "Kunlun Tech", "300418.SZ", None, "sz300418"),
        ]),
        ("chip", "Semiconductors", "晶片", "chip", [
            ("688981.SS", "SMIC", "688981.SS", None, "sh688981"),
            ("002371.SZ", "NAURA", "002371.SZ", None, "sz002371"),
            ("603501.SS", "Will Semi", "603501.SS", None, "sh603501"),
            ("688012.SS", "AMEC", "688012.SS", None, "sh688012"),
            ("300782.SZ", "Maxscend", "300782.SZ", None, "sz300782"),
        ]),
        ("aero", "Aerospace", "航天", "aero", [
            ("600893.SS", "AECC Aviation", "600893.SS", None, "sh600893"),
            ("000768.SZ", "AVIC Aircraft", "000768.SZ", None, "sz000768"),
            ("600760.SS", "AVIC Shenfei", "600760.SS", None, "sh600760"),
            ("002179.SZ", "AVIC Jonhon", "002179.SZ", None, "sz002179"),
        ]),
        ("finance", "Banks & insurers", "銀行及保險", None, [
            ("601318.SS", "Ping An", "601318.SS", None, "sh601318"),
            ("600036.SS", "CMB", "600036.SS", None, "sh600036"),
            ("601166.SS", "Industrial Bank", "601166.SS", None, "sh601166"),
            ("601398.SS", "ICBC", "601398.SS", None, "sh601398"),
        ]),
    ],
    "tw": [
        ("indices", "Indices", "指數", None, [
            ("^TWII", "TAIEX", "^TWII", None, None),
            ("2330.TW", "TSMC", "2330.TW", None, None),
            ("2317.TW", "Hon Hai", "2317.TW", None, None),
            ("2454.TW", "MediaTek", "2454.TW", None, None),
        ]),
        ("leaders", "Market leaders", "市場龍頭", None, [
            ("2330.TW", "TSMC", "2330.TW", None, None),
            ("2317.TW", "Hon Hai", "2317.TW", None, None),
            ("2308.TW", "Delta", "2308.TW", None, None),
            ("2881.TW", "Fubon Financial", "2881.TW", None, None),
            ("2412.TW", "Chunghwa Telecom", "2412.TW", None, None),
        ]),
        ("ai", "Artificial intelligence", "人工智能", "ai", [
            ("2330.TW", "TSMC", "2330.TW", None, None),
            ("2382.TW", "Quanta", "2382.TW", None, None),
            ("3231.TW", "Wistron", "3231.TW", None, None),
            ("2356.TW", "Inventec", "2356.TW", None, None),
            ("6669.TW", "Wiwynn", "6669.TW", None, None),
        ]),
        ("chip", "Semiconductors", "晶片", "chip", [
            ("2330.TW", "TSMC", "2330.TW", None, None),
            ("2303.TW", "UMC", "2303.TW", None, None),
            ("3711.TW", "ASE", "3711.TW", None, None),
            ("2454.TW", "MediaTek", "2454.TW", None, None),
            ("3034.TW", "Novatek", "3034.TW", None, None),
            ("2379.TW", "Realtek", "2379.TW", None, None),
        ]),
        ("aero", "Aerospace & shipping", "航天及航運", "aero", [
            ("2634.TW", "AIDC", "2634.TW", None, None),
            ("2637.TW", "Wisdom Marine", "2637.TW", None, None),
            ("2603.TW", "Evergreen Marine", "2603.TW", None, None),
        ]),
        ("finance", "Financials", "金融", None, [
            ("2881.TW", "Fubon Financial", "2881.TW", None, None),
            ("2882.TW", "Cathay Financial", "2882.TW", None, None),
            ("2891.TW", "CTBC Financial", "2891.TW", None, None),
        ]),
    ],
    "jp": [
        ("indices", "Indices", "指數", None, [
            ("^N225", "Nikkei 225", "^N225", None, None),
            ("7203.T", "Toyota", "7203.T", None, None),
            ("6758.T", "Sony", "6758.T", None, None),
            ("9984.T", "SoftBank", "9984.T", None, None),
        ]),
        ("leaders", "Market leaders", "市場龍頭", None, [
            ("7203.T", "Toyota", "7203.T", None, None),
            ("6758.T", "Sony", "6758.T", None, None),
            ("6861.T", "Keyence", "6861.T", None, None),
            ("8306.T", "MUFG", "8306.T", None, None),
            ("4063.T", "Shin-Etsu", "4063.T", None, None),
        ]),
        ("ai", "Artificial intelligence", "人工智能", "ai", [
            ("9984.T", "SoftBank", "9984.T", None, None),
            ("6758.T", "Sony", "6758.T", None, None),
            ("6861.T", "Keyence", "6861.T", None, None),
            ("6501.T", "Hitachi", "6501.T", None, None),
            ("4063.T", "Shin-Etsu", "4063.T", None, None),
        ]),
        ("chip", "Semiconductors", "晶片", "chip", [
            ("8035.T", "Tokyo Electron", "8035.T", None, None),
            ("6857.T", "Advantest", "6857.T", None, None),
            ("6920.T", "Lasertec", "6920.T", None, None),
            ("7735.T", "SCREEN", "7735.T", None, None),
            ("4063.T", "Shin-Etsu", "4063.T", None, None),
        ]),
        ("aero", "Aerospace & airlines", "航天及航空", "aero", [
            ("7011.T", "Mitsubishi Heavy", "7011.T", None, None),
            ("9202.T", "ANA", "9202.T", None, None),
            ("9201.T", "JAL", "9201.T", None, None),
            ("7013.T", "IHI", "7013.T", None, None),
        ]),
        ("finance", "Banks", "銀行", None, [
            ("8306.T", "MUFG", "8306.T", None, None),
            ("8316.T", "SMFG", "8316.T", None, None),
            ("8411.T", "Mizuho", "8411.T", None, None),
        ]),
    ],
    "kr": [
        ("indices", "Indices", "指數", None, [
            ("^KS11", "KOSPI", "^KS11", None, None),
            ("005930.KS", "Samsung Electronics", "005930.KS", None, None),
            ("000660.KS", "SK Hynix", "000660.KS", None, None),
            ("035420.KS", "Naver", "035420.KS", None, None),
        ]),
        ("leaders", "Market leaders", "市場龍頭", None, [
            ("005930.KS", "Samsung Electronics", "005930.KS", None, None),
            ("000660.KS", "SK Hynix", "000660.KS", None, None),
            ("005380.KS", "Hyundai Motor", "005380.KS", None, None),
            ("051910.KS", "LG Chem", "051910.KS", None, None),
            ("006400.KS", "Samsung SDI", "006400.KS", None, None),
        ]),
        ("ai", "Artificial intelligence", "人工智能", "ai", [
            ("005930.KS", "Samsung Electronics", "005930.KS", None, None),
            ("035420.KS", "Naver", "035420.KS", None, None),
            ("035720.KS", "Kakao", "035720.KS", None, None),
            ("259960.KS", "Krafton", "259960.KS", None, None),
            ("035900.KS", "JYP Ent", "035900.KS", None, None),
        ]),
        ("chip", "Semiconductors", "晶片", "chip", [
            ("005930.KS", "Samsung Electronics", "005930.KS", None, None),
            ("000660.KS", "SK Hynix", "000660.KS", None, None),
            ("042700.KS", "Hanmi Semicon", "042700.KS", None, None),
            ("058470.KS", "LEENO", "058470.KS", None, None),
            ("039030.KS", "EO Technics", "039030.KS", None, None),
        ]),
        ("aero", "Aerospace", "航天", "aero", [
            ("047810.KS", "Korea Aerospace", "047810.KS", None, None),
            ("012450.KS", "Hanwha Aerospace", "012450.KS", None, None),
            ("003490.KS", "Korean Air", "003490.KS", None, None),
            ("272210.KS", "Hanwha Systems", "272210.KS", None, None),
        ]),
        ("finance", "Financials", "金融", None, [
            ("105560.KS", "KB Financial", "105560.KS", None, None),
            ("055550.KS", "Shinhan", "055550.KS", None, None),
            ("086790.KS", "Hana Financial", "086790.KS", None, None),
        ]),
    ],
    "au": [
        ("indices", "Indices", "指數", None, [
            ("^AXJO", "ASX 200", "^AXJO", None, None),
            ("BHP.AX", "BHP", "BHP.AX", None, None),
            ("CBA.AX", "Commonwealth Bank", "CBA.AX", None, None),
            ("CSL.AX", "CSL", "CSL.AX", None, None),
        ]),
        ("leaders", "Market leaders", "市場龍頭", None, [
            ("BHP.AX", "BHP", "BHP.AX", None, None),
            ("CBA.AX", "CBA", "CBA.AX", None, None),
            ("CSL.AX", "CSL", "CSL.AX", None, None),
            ("WBC.AX", "Westpac", "WBC.AX", None, None),
            ("NAB.AX", "NAB", "NAB.AX", None, None),
            ("RIO.AX", "Rio Tinto", "RIO.AX", None, None),
        ]),
        ("ai", "Artificial intelligence", "人工智能", "ai", [
            ("XRO.AX", "Xero", "XRO.AX", None, None),
            ("WTC.AX", "WiseTech", "WTC.AX", None, None),
            ("APX.AX", "Appen", "APX.AX", None, None),
            ("CPU.AX", "Computershare", "CPU.AX", None, None),
            ("TNE.AX", "Technology One", "TNE.AX", None, None),
        ]),
        ("chip", "Tech hardware", "科技硬件", "chip", [
            ("DDR.AX", "Dicker Data", "DDR.AX", None, None),
            ("NVX.AX", "Novonix", "NVX.AX", None, None),
            ("4DS.AX", "4DS Memory", "4DS.AX", None, None),
            ("ALU.AX", "Altium", "ALU.AX", None, None),
        ]),
        ("aero", "Aerospace & airlines", "航天及航空", "aero", [
            ("DRO.AX", "DroneShield", "DRO.AX", None, None),
            ("EOS.AX", "Electro Optic", "EOS.AX", None, None),
            ("QAN.AX", "Qantas", "QAN.AX", None, None),
        ]),
        ("finance", "Banks", "銀行", None, [
            ("CBA.AX", "CBA", "CBA.AX", None, None),
            ("WBC.AX", "Westpac", "WBC.AX", None, None),
            ("NAB.AX", "NAB", "NAB.AX", None, None),
            ("ANZ.AX", "ANZ", "ANZ.AX", None, None),
        ]),
    ],
}

REGION_META = {
    "us": ("United States", "美國"),
    "hk": ("Hong Kong", "香港"),
    "cn": ("A-shares", "A股"),
    "tw": ("Taiwan", "台灣"),
    "jp": ("Japan", "日本"),
    "kr": ("Korea", "韓國"),
    "au": ("Australia", "澳洲"),
}


def entries():
    for rid, groups in REGIONS.items():
        for gid, en, zh, theme, rows in groups:
            for r in rows:
                if len(r) == 2:
                    d, n = r
                    ids = {"yahoo": d, "cnbc": d if "." not in d and not d.startswith("^") else None, "sina": None}
                    if re.fullmatch(r"[A-Z.]{1,6}", d):
                        ids["sina"] = "gb_" + d.lower().replace(".", "")
                else:
                    d, n, y, c, s = r
                    ids = {"yahoo": y, "cnbc": c, "sina": s}
                yield rid, gid, en, zh, theme, d, n, ids


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
            if e.code == 404 and "fc.yahoo.com" in url:
                return b""
            raise


def parse_cnbc(data):
    out = {}
    quotes = json.loads(data)["FormattedQuoteResult"]["FormattedQuote"]
    if isinstance(quotes, dict):
        quotes = [quotes]
    for q in quotes:
        price = num(q.get("last"))
        change = num(q.get("change"))
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
    # batch in chunks of 40
    out = {}
    for i in range(0, len(syms), 40):
        chunk = syms[i:i + 40]
        url = ("https://query2.finance.yahoo.com/v7/finance/quote?symbols="
               + urllib.parse.quote(",".join(chunk), safe=",") + "&crumb=" + urllib.parse.quote(crumb))
        out.update(parse_yahoo(http.get(url)))
    return out


def parse_sina(text):
    out = {}
    for sym, body in re.findall(r'var hq_str_([\w$]+)="([^"]*)"', text):
        f = body.split(",")
        if len(f) < 5:
            continue
        # US gb_ format: name,price,pct,...,change  OR A-share: name,open,prev,price,...
        if sym.startswith("gb_"):
            price, change = num(f[1]), num(f[4])
            if price and change is not None:
                out[sym] = (price, price - change)
        elif len(f) >= 4:
            price, prev = num(f[3]), num(f[2])
            if price and prev:
                out[sym] = (price, prev)
    return out


def sina(http, syms):
    url = "https://hq.sinajs.cn/list=" + ",".join(syms)
    return parse_sina(http.get(url, "https://finance.sina.com.cn/").decode("gbk", "replace"))


PROVIDERS = [("yahoo", "Yahoo Finance", yahoo), ("cnbc", "CNBC", cnbc), ("sina", "Sina Finance", sina)]


def selftest():
    c = parse_cnbc(b'{"FormattedQuoteResult":{"FormattedQuote":[{"symbol":".SPX","last":"5,712.20","change":"-23.10","previous_day_closing":"5,712.20"},{"symbol":"AAPL","last":"227.48","change":"+1.23"}]}}')
    assert c == {".SPX": (5712.2, 5735.3), "AAPL": (227.48, 226.25)}, c
    y = parse_yahoo(b'{"quoteResponse":{"result":[{"symbol":"^GSPC","regularMarketPrice":5712.2,"regularMarketPreviousClose":5735.3}]}}')
    assert y == {"^GSPC": (5712.2, 5735.3)}, y
    print("selftest ok")


def main():
    if "--selftest" in sys.argv:
        selftest()
        return

    old_by_region = {}
    if OUT.exists():
        try:
            prev = json.loads(OUT.read_text(encoding="utf-8"))
            if "regions" in prev:
                for rid, pack in prev["regions"].items():
                    old_by_region[rid] = {it["symbol"]: it for g in pack.get("groups", []) for it in g.get("items", [])}
            elif "groups" in prev:
                old_by_region["us"] = {it["symbol"]: it for g in prev["groups"] for it in g.get("items", [])}
        except (ValueError, KeyError):
            pass

    rows = list(entries())
    got, src = {}, {}
    http = Http()
    for key, label, fn in PROVIDERS:
        need = []
        for rid, gid, en, zh, theme, d, n, ids in rows:
            uniq = f"{rid}:{d}"
            if uniq in got:
                continue
            sid = ids.get(key)
            if sid:
                need.append((uniq, sid))
        if not need:
            continue
        try:
            res = fn(http, [s for _, s in need])
        except Exception as e:  # noqa: BLE001
            print(f"{label}: failed ({e})", file=sys.stderr)
            continue
        n = 0
        for uniq, s in need:
            if s in res:
                got[uniq], src[uniq] = res[s], label
                n += 1
        print(f"{label}: {n}/{len(need)}", file=sys.stderr)

    print(f"{len(got)}/{len(rows)} symbols fetched", file=sys.stderr)
    if not got:
        print("nothing fetched; keeping the existing file", file=sys.stderr)
        return

    now = dt.datetime.now(dt.timezone.utc)
    regions_out = {}
    for rid, groups_def in REGIONS.items():
        en_r, zh_r = REGION_META[rid]
        groups = []
        for gid, en, zh, theme, _rows in groups_def:
            items = []
            for r in _rows:
                d = r[0]
                name = r[1]
                uniq = f"{rid}:{d}"
                prev_item = old_by_region.get(rid, {}).get(d)
                if uniq in got:
                    price, prev = got[uniq]
                    spark = []
                    if prev_item and abs(prev_item.get("prev", 0) - prev) < 1e-6:
                        spark = list(prev_item.get("spark") or [])
                    if not spark:
                        spark = [round(prev, 4)]
                    if spark[-1] != round(price, 4):
                        spark.append(round(price, 4))
                    items.append({
                        "symbol": d, "name": name, "price": round(price, 4), "prev": round(prev, 4),
                        "change": round(price - prev, 4), "pct": round((price / prev - 1) * 100, 2),
                        "spark": spark[-SPARK_MAX:], "src": src[uniq],
                    })
                elif prev_item:
                    items.append(dict(prev_item, stale=True))
            if items:
                g = {"id": gid, "name_en": en, "name_zh": zh, "items": items}
                if theme:
                    g["theme"] = theme
                groups.append(g)
        if groups:
            regions_out[rid] = {
                "name_en": en_r, "name_zh": zh_r,
                "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "groups": groups,
            }

    # Keep legacy top-level groups = US for older clients
    us_groups = regions_out.get("us", {}).get("groups", [])
    out = {
        "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "regions": regions_out,
        "groups": us_groups,
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    if us_groups:
        record_history(us_groups, now)
    print(f"wrote {len(regions_out)} regions", file=sys.stderr)


def record_history(us_groups, now):
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
    for g in us_groups:
        for it in g.get("items", []):
            sym = it["symbol"]
            if it.get("stale"):
                continue
            if re.fullmatch(r"[A-Z]{1,5}", sym) or sym in ("S&P 500", "Nasdaq", "Dow 30", "Russell 2000", "VIX"):
                rec[sym] = {"c": it["price"], "p": it["prev"]}
    for old_day in sorted(days)[:-HISTORY_DAYS]:
        del days[old_day]
    hist["days"] = dict(sorted(days.items()))
    HISTORY.write_text(json.dumps(hist, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
