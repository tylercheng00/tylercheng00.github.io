# Insights queue (`content/daily`)

Notes here publish via `.github/workflows/daily.yml` → `tools/publish_daily.py`.

## Permanent standard (from 2026-11-14 HKT)

Every note that goes live must match the Nov 2026 shipping standard (see also
`docs` in the Project store: `insights-day-events.md`):

1. **Length:** about **550–750 English words** (`read:` 6–8). Soft floor **520**.
2. **Same-day hook:** open on that Hong Kong calendar day’s major news, summit,
   holiday, or market-calendar item (APEC, chip politics, Anthropic IPO week,
   NIH headlines, etc.) — not a generic evergreen tip.
3. **Chinese:** independent BBC中文 / 香港01 / 台媒評論 commentary in 繁體書面語.
   **Do not** translate the English. Titles must be clear to a Chinese reader
   alone（觀察／為何／從…看…／冒號）.

`tools/insights_quality.py` enforces length + Chinese calque checks on publish.
Short tip files left in this folder are **skipped** until rewritten; the daily
job then drafts proper long notes with `tools/draft_article.py`.

Gold-standard examples on the site: the five **2026-11-20** Insights.
