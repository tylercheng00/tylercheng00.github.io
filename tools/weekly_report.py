#!/usr/bin/env python3
"""Write the weekly US-market data report as an Insights article.

Run on Saturdays by .github/workflows/weekly.yml. Uses only the daily closes
that tools/fetch_markets.py stores in data/markets-history.json, and fixed
sentence templates: numbers, no opinions, no forecasts.

    python3 tools/weekly_report.py                # the week that ended most recently
    python3 tools/weekly_report.py --week 2026-11-06   # the week ending that Friday
    python3 tools/weekly_report.py --force        # overwrite an existing report

Writes content/insights/us-markets-week-<friday>.md; skips (exit 0) when the
week has fewer than two trading days of data or the report already exists.
"""
import datetime as dt
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
HISTORY = ROOT / "data" / "markets-history.json"
OUTDIR = ROOT / "content" / "insights"
sys.path.insert(0, str(ROOT / "tools"))
from fetch_markets import GROUPS  # noqa: E402

# groups left out of the watchlist averages and the biggest-moves list
NOT_WATCHLISTS = ("indices", "metals_fx")

INDICES = ["S&P 500", "Nasdaq", "Dow 30", "Russell 2000"]
ZH_NAME = {"S&P 500": "標普 500", "Nasdaq": "納斯達克", "Dow 30": "道瓊斯", "Russell 2000": "羅素 2000"}
NAMES = {}
GROUP_OF = {}
for gid, en, zh, rows in GROUPS:
    for r in rows:
        NAMES[r[0]] = r[1]
        GROUP_OF[r[0]] = (gid, en, zh)


def pct(a, b):
    return (a / b - 1) * 100


def fmt(p):
    return f"{p:+.2f}%"


def zh_move(p):
    return f"升 {p:.2f}%" if p > 0 else (f"跌 {abs(p):.2f}%" if p < 0 else "持平")


def en_move(p):
    return f"rose {p:.2f}%" if p > 0 else (f"fell {abs(p):.2f}%" if p < 0 else "was flat")


def main():
    args = sys.argv[1:]
    force = "--force" in args
    days = json.loads(HISTORY.read_text(encoding="utf-8")).get("days", {}) if HISTORY.exists() else {}
    if "--week" in args:
        friday = dt.date.fromisoformat(args[args.index("--week") + 1])
    else:
        today = dt.date.today()
        friday = today - dt.timedelta(days=(today.weekday() - 4) % 7)  # most recent Friday (today if Friday)
    monday = friday - dt.timedelta(days=4)

    week = sorted(d for d in days if monday.isoformat() <= d <= friday.isoformat())
    if len(week) < 2:
        print(f"week ending {friday}: only {len(week)} trading day(s) recorded; no report")
        return
    out = OUTDIR / f"us-markets-week-{friday.isoformat()}.md"
    if out.exists() and not force:
        print(f"{out.name} already exists")
        return

    before = sorted(d for d in days if d < monday.isoformat())
    last = days[week[-1]]
    ref = days[before[-1]] if before else None

    moves = {}
    for sym, rec in last.items():
        if ref and sym in ref:
            base = ref[sym]["c"]
        elif sym in days[week[0]]:
            base = days[week[0]][sym]["p"]   # previous close before the first recorded day
        else:
            continue
        if base:
            moves[sym] = (pct(rec["c"], base), rec["c"])

    idx = [(s, *moves[s]) for s in INDICES if s in moves]
    if not idx:
        print("no index data; no report")
        return
    stocks = [(s, p) for s, (p, _) in moves.items() if s in GROUP_OF and GROUP_OF[s][0] not in NOT_WATCHLISTS]
    stocks.sort(key=lambda x: x[1], reverse=True)
    up, down = stocks[:3], [s for s in stocks[::-1][:3] if s[1] < 0]

    groups = []
    for gid, en, zh, rows in GROUPS:
        if gid in NOT_WATCHLISTS:
            continue
        vals = [moves[r[0]][0] for r in rows if r[0] in moves]
        if vals:
            groups.append((en, zh, sum(vals) / len(vals), len(vals)))

    vix = moves.get("VIX")
    sp = dict((s, p) for s, p, _ in idx).get("S&P 500", idx[0][1])
    d0, d1 = dt.date.fromisoformat(week[0]), dt.date.fromisoformat(week[-1])
    span_en = f"{d0:%-d %b}–{d1:%-d %b %Y}"
    span_zh = f"{d0.year}年{d0.month}月{d0.day}日至{d1.month}月{d1.day}日"
    ndays = len(week)

    en = [
        f"Weekly data summary for {span_en} ({ndays} trading days). Figures compare the last recorded close of the week "
        "with the close before the week began. This page is generated automatically from delayed public quotes and "
        "contains data only, no views.",
        "",
        "### Major indices",
    ]
    en += [f"- **{s}** {fmt(p)} to {c:,.2f}" for s, p, c in idx]
    if vix:
        en.append(f"- **VIX** (volatility) {fmt(vix[0])} to {vix[1]:.2f}")
    en += ["", "### Watchlists (simple average)"]
    en += [f"- **{g_en}** {fmt(a)} ({n} names)" for g_en, _, a, n in groups]
    en += ["", "### Biggest moves on the watchlists"]
    en += [f"- Up: " + ", ".join(f"**{s}** ({NAMES[s]}) {fmt(p)}" for s, p in up)] if up else []
    en += [f"- Down: " + ", ".join(f"**{s}** ({NAMES[s]}) {fmt(p)}" for s, p in down)] if down else []
    en += ["", "Live charts and today's numbers are on the [Markets](/markets.html) page."]

    zh = [
        f"{span_zh}（共 {ndays} 個交易日）的每週數據摘要。數字以本週最後一個收市價，與本週開始前的收市價比較。"
        "本頁根據延遲的公開報價自動生成，只列數據，不含任何觀點。",
        "",
        "### 主要指數",
    ]
    zh += [f"- **{ZH_NAME[s]}** {fmt(p)}，收報 {c:,.2f}" for s, p, c in idx]
    if vix:
        zh.append(f"- **VIX**（波動率指數）{fmt(vix[0])}，收報 {vix[1]:.2f}")
    zh += ["", "### 觀察名單（簡單平均）"]
    zh += [f"- **{g_zh}** {fmt(a)}（{n} 隻）" for _, g_zh, a, n in groups]
    zh += ["", "### 觀察名單中變動最大"]
    zh += [f"- 上升：" + "、".join(f"**{s}**（{NAMES[s]}）{fmt(p)}" for s, p in up)] if up else []
    zh += [f"- 下跌：" + "、".join(f"**{s}**（{NAMES[s]}）{fmt(p)}" for s, p in down)] if down else []
    zh += ["", "即時圖表及今日數字見[美股行情](/markets.html)頁。"]

    summary_en = "; ".join(f"{s} {fmt(p)}" for s, p, _ in idx[:3]) + f". Data for {span_en}, generated automatically."
    summary_zh = "；".join(f"{ZH_NAME[s]} {fmt(p)}" for s, p, _ in idx[:3]) + f"。{span_zh}數據，自動生成。"
    front = "\n".join([
        "---",
        f"slug: us-markets-week-{friday.isoformat()}",
        f"date: {(friday + dt.timedelta(days=1)).isoformat()}",
        "tags: weekly",
        "read: 2",
        f"title_en: US markets this week: S&P 500 {en_move(sp)}",
        f"title_zh: 本週美股：標普 500 {zh_move(sp)}",
        f"summary_en: {summary_en}",
        f"summary_zh: {summary_zh}",
        "---",
    ])
    out.write_text(front + "\n::: en\n" + "\n".join(en) + "\n\n::: zh\n" + "\n".join(zh) + "\n", encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
