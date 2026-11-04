#!/usr/bin/env python3
"""Build the Insights pages and the News / Markets page shells.

Standard library only. Run from the repository root:

    python3 tools/build_site.py

Inputs
  content/insights/*.md      one bilingual article per file (see below)
  content/pages/*.body.html  body fragments for news.html and markets.html

Outputs
  insights/index.html        article list with category filter
  insights/<slug>.html       one page per article
  news.html, markets.html    page shells around the fragments

Article format: a front-matter block between --- lines (slug, date, tags,
read, title_en, title_zh, summary_en, summary_zh), then a "::: en" section
and a "::: zh" section.  Inside a section: blank-line separated paragraphs,
"### " headings, "- " list items, **bold**, *italic* and [text](url).
"""
import datetime as dt
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://tylercheng00.github.io"

CATS = {
    "capital": ("US capital markets", "美國資本市場"),
    "biotech": ("Biotech", "生物科技"),
}

ZH_MONTHS = "一二三四五六七八九十"


def bi(en, zh):
    return f'<span lang="en">{en}</span><span lang="zh-Hant">{zh}</span>'


def fmt_date(d):
    en = d.strftime("%-d %b %Y")
    zh = f"{d.year}年{d.month}月{d.day}日"
    return en, zh


# ---------------------------------------------------------------- markdown
def inline(text):
    t = html.escape(text, quote=False)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+|/[^)\s]*)\)",
               lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>', t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", t)
    return t


def md_to_html(src):
    out, para, items = [], [], []

    def flush():
        if para:
            out.append("<p>" + "<br>".join(inline(x) for x in para) + "</p>")
            para.clear()
        if items:
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
            items.clear()

    for raw in src.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush()
        elif line.startswith("### "):
            flush()
            out.append(f"<h3>{inline(line[4:].strip())}</h3>")
        elif line.startswith("- "):
            if para:
                flush()
            items.append(line[2:].strip())
        elif items and raw.startswith("  "):
            items[-1] += " " + line.strip()
        else:
            if items:
                flush()
            para.append(line.strip())
    flush()
    return "\n".join(out)


def parse_article(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        raise SystemExit(f"{path}: missing front matter")
    meta = {}
    for line in m.group(1).splitlines():
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip()
    parts = re.split(r"^::: (en|zh)\s*$", m.group(2), flags=re.M)
    body = {parts[i]: parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}
    for key in ("en", "zh"):
        if key not in body:
            raise SystemExit(f"{path}: missing '::: {key}' section")
    meta["date"] = dt.date.fromisoformat(meta["date"])
    meta["tags"] = meta.get("tags", "").split()
    for t in meta["tags"]:
        if t not in CATS:
            raise SystemExit(f"{path}: unknown tag {t!r}")
    meta["read"] = int(meta.get("read", "3"))
    meta["html_en"] = md_to_html(body["en"])
    meta["html_zh"] = md_to_html(body["zh"])
    return meta


# ---------------------------------------------------------------- template
# Footer links (flat).
NAV = [
    ("index.html", "Home", "主頁", "home"),
    ("about.html", "About", "關於", "about"),
    ("ventures.html", "Ventures", "創業", "ventures"),
    ("projects.html", "Projects", "項目", "projects"),
    ("insights/", "Insights", "觀點", "insights"),
    ("news.html", "News", "新聞", "news"),
    ("markets.html", "Markets", "美股行情", "markets"),
]

# Header menu: a few categories, each opening a small list of pages/sections.
# Shared by every page; the static pages (index, projects, us-equities) get it
# written between their <!-- nav:start --> / <!-- nav:end --> markers.
NAV_GROUPS = [
    ("about", "About", "關於", [
        ("about.html#about", "About me", "簡介"),
        ("about.html#experience", "Experience", "工作經歷"),
        ("about.html#education", "Education", "學歷"),
        ("about.html#media", "Media & recognition", "媒體及認可"),
        ("index.html#vision", "Vision", "願景"),
    ]),
    ("ventures", "Ventures", "創業", [
        ("ventures.html#entrepreneurship", "Entrepreneurship", "創業經歷"),
        ("ventures.html#venture", "Nanotech Innovation", "納米科研技術"),
        ("ventures.html#patents", "Patents", "專利"),
        ("projects.html", "All projects", "所有項目"),
    ]),
    # a plain string instead of a list = a direct link with no dropdown
    ("capital", "Capital markets", "資本市場", "us-equities.html"),
    ("markets", "Markets", "美股行情", "markets.html"),
    ("insights", "Insights", "觀點", [
        ("insights/", "Articles", "觀點文章"),
        ("news.html", "News", "新聞"),
    ]),
]
# page key of the generated pages -> their file
CURRENT = {"insights": "insights/", "news": "news.html", "markets": "markets.html"}
CARET = ('<svg class="nav-caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">'
         '<path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" '
         'stroke-linecap="round" stroke-linejoin="round"/></svg>')


def nav_menu(prefix="", page=None):
    """Grouped header menu for the page `page` (e.g. "about.html", "insights/").

    Entries pointing into the current page are written as plain #anchors so the
    scroll highlighter in main.js can follow them."""
    page = CURRENT.get(page, page)
    out = []
    for key, en, zh, items in NAV_GROUPS:
        if isinstance(items, str):
            here = items == page
            out.append(f'        <a class="nav-link{" is-current" if here else ""}" href="{prefix}{items}"'
                       f'{" aria-current=\"page\"" if here else ""}>{bi(en, zh)}</a>')
            continue
        links = []
        group_cur = False
        for href, ien, izh in items:
            target, _, anchor = href.partition("#")
            same = target == page
            group_cur = group_cur or (same and target != "index.html")
            url = "#" + anchor if same and anchor else prefix + href
            links.append(f'            <a href="{url}"{" aria-current=\"page\"" if same and not anchor else ""}>'
                         f'{bi(html.escape(ien), izh)}</a>')
        out.append(
            f'        <div class="nav-group{" is-current" if group_cur else ""}">\n'
            f'          <button type="button" class="nav-top" aria-expanded="false" aria-controls="nav-{key}">'
            f'{bi(en, zh)}{CARET}</button>\n'
            f'          <div class="nav-menu" id="nav-{key}">\n' + "\n".join(links) + "\n"
            f'          </div>\n        </div>')
    return "\n".join(out)


def footer_links(prefix=""):
    return "\n".join(f'        <a href="{prefix}{href}">{bi(en, zh)}</a>' for href, en, zh, _ in NAV) + \
        f'\n        <a href="{prefix}contact.html">{bi("Contact", "聯絡")}</a>' + \
        f'\n        <a href="{prefix}privacy.html">{bi("Privacy", "私隱政策")}</a>'



def page(*, prefix, path, title, description, og_type, body, active,
         body_class="page-projects", scripts=(), jsonld=None, head_extra=""):
    url = f"{SITE}/{path}"
    nav = nav_menu(prefix, active)
    foot = footer_links(prefix)
    ld = ""
    if jsonld:
        ld = ('\n  <!-- Structured data -->\n  <script type="application/ld+json">'
              + json.dumps(jsonld, ensure_ascii=False) + "</script>\n")
    js = "\n".join(f'  <script src="{prefix}{s}"></script>' for s in ("main.js", *scripts))
    return f"""<!doctype html>
<html lang="en" data-lang="en">
<head>
  <!-- Basics -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(description)}">
  <link rel="canonical" href="{url}">
  <meta name="author" content="鄭迪珉 Tyler Tik Man Cheng">
  <meta name="theme-color" content="#0b1d33">

  <!-- Social preview (Open Graph; also used by X / Twitter) -->
  <meta property="og:type" content="{og_type}">
  <meta property="og:url" content="{url}">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{html.escape(description)}">
  <meta property="og:image" content="{SITE}/assets/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_US">
  <meta property="og:locale:alternate" content="zh_HK">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Assets -->
  <link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="{prefix}assets/fonts/fonts.css" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="{prefix}assets/fonts/fonts.css"></noscript>
  <link rel="stylesheet" href="{prefix}styles.css">{head_extra}
{ld}
  <!-- Language (before first paint, to avoid a flash of the wrong language) -->
  <script>
    (function () {{
      var lang = null;
      try {{
        var q = new URLSearchParams(location.search).get('lang');
        if (q === 'zh' || q === 'en') lang = q;
        if (!lang) lang = localStorage.getItem('lang');
      }} catch (e) {{}}
      if (lang !== 'zh' && lang !== 'en') lang = /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
      var d = document.documentElement;
      d.setAttribute('data-lang', lang);
      d.lang = lang === 'zh' ? 'zh-Hant' : 'en';
      d.classList.add('js');
    }})();
  </script>

  <!-- Visitor statistics (GoatCounter: cookie-free, no personal data) -->
  <script data-goatcounter="https://tylercheng00.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</head>
<body class="{body_class}">
  <!-- Generated by tools/build_site.py. Edit the sources in content/, then rebuild. -->
  <a class="skip" href="#main">{bi("Skip to content", "跳至內容")}</a>

  <header class="topbar" id="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="{prefix}index.html" aria-label="Tyler Cheng — home">
        <span class="brand-mark" aria-hidden="true">TC</span>
        <span class="brand-text"><span class="brand-name">鄭迪珉</span><span class="brand-sub">Tyler Tik Man Cheng</span></span>
      </a>
      <nav class="nav" id="nav" aria-label="Primary">
{nav}
        <a class="nav-cta" href="{prefix}contact.html">{bi("Contact", "聯絡")}</a>
      </nav>
      <div class="topbar-actions">
        <div class="lang-toggle" role="group" aria-label="Language / 語言">
          <button type="button" data-set-lang="en" aria-pressed="true">EN</button>
          <button type="button" data-set-lang="zh" aria-pressed="false">中</button>
        </div>
        <button class="menu-btn" id="menu-btn" type="button" aria-controls="nav" aria-expanded="false">
          <span class="sr-only">{bi("Menu", "選單")}</span>
          <span class="menu-icon" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </header>

  <main id="main">
{body}
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <span class="brand-mark" aria-hidden="true">TC</span>
        <div><p class="footer-name">鄭迪珉 Tyler Tik Man Cheng</p><p class="footer-tag">US Equities · Biotech · Patents · Startups</p></div>
      </div>
      <nav class="footer-nav" aria-label="Footer">
{foot}
      </nav>
      <p class="footer-copy">{bi("Privacy-friendly visitor counts by GoatCounter (no cookies).", "以 GoatCounter 作私隱友善的訪客統計（不使用 cookie）。")}<br>© <span id="year">2026</span> Tyler Tik Man Cheng. {bi("All rights reserved.", "版權所有。")}</p>
    </div>
  </footer>

  <a class="to-top" id="to-top" href="#top" aria-label="Back to top">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </a>

{js}
</body>
</html>
"""


def hero(eyebrow, title, lede, extra=""):
    return f"""    <section class="p-hero" id="top">
      <div class="hero-bg" aria-hidden="true"><span class="glow glow-1"></span><span class="glow glow-2"></span><span class="grid"></span></div>
      <div class="container p-hero-inner">
        <p class="eyebrow reveal"><span class="dot" aria-hidden="true"></span>{eyebrow}</p>
        <h1 class="p-title reveal">{title}</h1>
        <p class="p-lede reveal">{lede}</p>{extra}
      </div>
    </section>"""


def cat_labels(tags):
    return "".join(f'<span class="ins-tag">{bi(*CATS[t])}</span>' for t in tags)


DISCLAIMER = bi(
    "Views are my own and do not represent Fuway, Nanotech Innovation Limited or any client. "
    "This is general commentary, not investment, legal or medical advice.",
    "以上純屬個人觀點，不代表富輝集團、Nanotech Innovation Limited 或任何客戶。"
    "內容僅為一般評論，不構成投資、法律或醫療建議。",
)


def article_page(a, others):
    d_en, d_zh = fmt_date(a["date"])
    meta = (f'{cat_labels(a["tags"])}<span>{bi(d_en, d_zh)}</span>'
            f'<span>{bi(f"{a["read"]} min read", f"閱讀約 {a["read"]} 分鐘")}</span>')
    more = "\n".join(
        f'          <a class="ins-more-link" href="{o["slug"]}.html">{bi(html.escape(o["title_en"]), html.escape(o["title_zh"]))}</a>'
        for o in others
    )
    body = hero(
        bi("Insights", "觀點") + " · " + " / ".join(bi(*CATS[t]) for t in a["tags"]),
        bi(html.escape(a["title_en"]), html.escape(a["title_zh"])),
        bi(html.escape(a["summary_en"]), html.escape(a["summary_zh"])),
    ) + f"""

    <section class="section">
      <div class="container">
        <article class="prose">
          <p class="ins-meta">{meta}</p>
          <div lang="en">
{a["html_en"]}
          </div>
          <div lang="zh-Hant">
{a["html_zh"]}
          </div>
          <p class="ins-byline">— 鄭迪珉 Tyler Tik Man Cheng</p>
          <p class="ins-disclaimer">{DISCLAIMER}</p>
        </article>
        <nav class="ins-more" aria-label="More insights">
          <p class="kicker">{bi("More insights", "更多觀點")}</p>
{more}
          <a class="p-link" href="./">{bi("← All insights", "← 所有觀點")}</a>
        </nav>
      </div>
    </section>"""
    ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": a["title_en"],
        "alternativeHeadline": a["title_zh"],
        "description": a["summary_en"],
        "datePublished": a["date"].isoformat(),
        "inLanguage": ["en", "zh-Hant"],
        "author": {"@type": "Person", "name": "Tyler Tik Man Cheng", "alternateName": "鄭迪珉", "url": SITE + "/"},
        "mainEntityOfPage": f"{SITE}/insights/{a['slug']}.html",
        "image": f"{SITE}/assets/og-image.png",
    }
    return page(
        prefix="../", path=f"insights/{a['slug']}.html",
        title=f"{a['title_en']} · {a['title_zh']} | 鄭迪珉 Tyler Cheng",
        description=a["summary_en"], og_type="article", body=body, active="insights",
        jsonld=ld,
    )


def card(a, prefix=""):
    d_en, d_zh = fmt_date(a["date"])
    return f"""          <a class="ins-card reveal" href="{prefix}{a['slug']}.html" data-cats="{' '.join(a['tags'])}">
            <p class="ins-meta">{cat_labels(a['tags'])}<span>{bi(d_en, d_zh)}</span><span>{bi(f"{a['read']} min", f"{a['read']} 分鐘")}</span></p>
            <h3>{bi(html.escape(a['title_en']), html.escape(a['title_zh']))}</h3>
            <p>{bi(html.escape(a['summary_en']), html.escape(a['summary_zh']))}</p>
            <span class="ins-read">{bi("Read →", "閱讀 →")}</span>
          </a>"""


def index_page(arts):
    counts = {k: sum(k in a["tags"] for a in arts) for k in CATS}
    btns = [f'<button type="button" class="on" data-cat-filter="all" aria-pressed="true">{bi("All", "全部")}<b>{len(arts)}</b></button>']
    btns += [f'<button type="button" data-cat-filter="{k}" aria-pressed="false">{bi(*CATS[k])}<b>{counts[k]}</b></button>' for k in CATS]
    extra = '\n        <div class="filters reveal" role="group" aria-label="Category">\n          ' + "\n          ".join(btns) + "\n        </div>"
    body = hero(
        bi("Insights · Personal views", "觀點 · 個人看法"),
        bi("Notes from two rooms", "兩個房間的筆記"),
        bi("Short pieces on <b>US capital markets</b> and <b>biotech</b>, written from the work I do in both. "
           "Plain opinions, not research reports — and not investment advice.",
           "關於<b>美國資本市場</b>和<b>生物科技</b>的短文，來自我在兩個領域的實際工作。"
           "是個人看法，不是研究報告，亦不構成投資建議。"),
        extra,
    ) + f"""

    <section class="section">
      <div class="container">
        <div class="ins-grid">
{chr(10).join(card(a) for a in arts)}
        </div>
        <p class="ins-disclaimer">{DISCLAIMER}</p>
      </div>
    </section>"""
    ld = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Insights — Tyler Tik Man Cheng",
        "url": f"{SITE}/insights/",
        "author": {"@type": "Person", "name": "Tyler Tik Man Cheng", "alternateName": "鄭迪珉"},
        "blogPost": [{"@type": "BlogPosting", "headline": a["title_en"], "datePublished": a["date"].isoformat(),
                      "url": f"{SITE}/insights/{a['slug']}.html"} for a in arts],
    }
    return page(
        prefix="../", path="insights/",
        title="Insights · 觀點 — US capital markets & biotech | 鄭迪珉 Tyler Cheng",
        description="Personal views by 鄭迪珉 Tyler Tik Man Cheng on US capital markets (IPO, M&A, fundraising) and biotech (nanomedicine, AI in drug discovery).",
        og_type="website", body=body, active="insights", jsonld=ld,
    )


def fragment_page(name, **kw):
    frag = (ROOT / "content" / "pages" / f"{name}.body.html").read_text(encoding="utf-8").rstrip()
    return page(prefix="", path=f"{name}.html", body=frag, active=name, **kw)


def main():
    arts = [parse_article(p) for p in sorted((ROOT / "content" / "insights").glob("*.md"))]
    order = ["us-listing-is-a-calendar-problem", "nanomedicine-is-a-manufacturing-problem",
             "what-makes-a-fundraise-fast", "ai-changes-which-experiments-you-run",
             "ipo-spac-or-ma", "scientists-and-investors"]
    arts.sort(key=lambda a: (-a["date"].toordinal(), order.index(a["slug"]) if a["slug"] in order else 99))
    out = ROOT / "insights"
    out.mkdir(exist_ok=True)
    for a in arts:
        others = [o for o in arts if o is not a][:3]
        (out / f"{a['slug']}.html").write_text(article_page(a, others), encoding="utf-8")
    (out / "index.html").write_text(index_page(arts), encoding="utf-8")

    # homepage teaser data (three latest)
    teaser = "\n".join(card(a, "insights/") for a in arts[:3])
    home = ROOT / "index.html"
    h = home.read_text(encoding="utf-8")
    h2 = re.sub(r"(<!-- insights:start[^>]*-->).*?(<!-- insights:end -->)",
                lambda m: m.group(1) + "\n" + teaser + "\n          " + m.group(2), h, flags=re.S)
    if h2 == h and "<!-- insights:start" not in h:
        raise SystemExit("index.html: insights markers missing")
    home.write_text(h2, encoding="utf-8")

    # grouped header menu on the hand-written pages
    for name in ("index.html", "about.html", "ventures.html", "projects.html", "us-equities.html", "contact.html"):
        f = ROOT / name
        s = f.read_text(encoding="utf-8")
        s2, n = re.subn(r"(<!-- nav:start -->).*?(\n\s*<!-- nav:end -->)",
                        lambda m: m.group(1) + "\n" + nav_menu("", name) + m.group(2), s, flags=re.S)
        if not n:
            raise SystemExit(f"{name}: nav markers missing")
        # the Contact button: to the contact page (us-equities keeps its own "Enquire" button)
        cta = ' aria-current="page"' if name == "contact.html" else ""
        s2 = re.sub(r'<a class="nav-cta" href="(?:index\.html)?#contact"[^>]*>|<a class="nav-cta" href="contact\.html"[^>]*>',
                    f'<a class="nav-cta" href="contact.html"{cta}>', s2)
        s2 = re.sub(r'(<nav class="footer-nav" aria-label="Footer">\n).*?(\n      </nav>)',
                    lambda m: m.group(1) + footer_links() + m.group(2), s2, flags=re.S)
        f.write_text(s2, encoding="utf-8")

    (ROOT / "news.html").write_text(fragment_page(
        "news",
        title="News · 新聞 — Finance and US–China politics | 鄭迪珉 Tyler Cheng",
        description="Headlines on markets, finance and US–China politics, gathered automatically from public news feeds. Links go to the original publishers.",
        og_type="website", scripts=("news.js",)), encoding="utf-8")
    (ROOT / "markets.html").write_text(fragment_page(
        "markets",
        title="Markets · 美股行情 — Live US stock market overview | 鄭迪珉 Tyler Cheng",
        description="Live US market overview: major indices, S&P 500 heatmap, top movers, biotech and China ADR watchlists. Data by TradingView; not investment advice.",
        og_type="website", scripts=("markets.js",),
        head_extra='\n  <link rel="preconnect" href="https://s3.tradingview.com">'
                   '\n  <link rel="preconnect" href="https://www.tradingview-widget.com">'
                   '\n  <link rel="dns-prefetch" href="https://www.tradingview.com">'), encoding="utf-8")
    (ROOT / "privacy.html").write_text(fragment_page(
        "privacy",
        title="Privacy policy · 私隱政策 | 鄭迪珉 Tyler Tik Man Cheng",
        description="What tylercheng00.github.io / tylerfuture.com collects through its contact form, booking calendar and visit statistics, why, where it is stored, and how to ask for it to be deleted.",
        og_type="website"), encoding="utf-8")
    # 404 page: served for any missing path, so every link is root-relative
    (ROOT / "404.html").write_text(page(
        prefix="/", path="404.html",
        title="Page not found · 找不到頁面 | 鄭迪珉 Tyler Tik Man Cheng",
        description="This page does not exist.", og_type="website", active=None,
        head_extra='\n  <meta name="robots" content="noindex">',
        body=hero(bi("404", "404"), bi("Page not found", "找不到這一頁"),
                  bi("The page may have moved, or the address may be mistyped.", "這一頁可能已經搬走，或者網址有誤。"),
                  extra='\n        <div class="hero-cta reveal">'
                        f'<a class="btn btn-gold" href="/">{bi("Home", "返回主頁")}</a>'
                        f'<a class="btn btn-outline-light" href="/about.html">{bi("About me", "關於我")}</a>'
                        f'<a class="btn btn-outline-light" href="/contact.html">{bi("Contact", "聯絡")}</a>'
                        '</div>')
        + '\n    <section class="section nf-links"><div class="container"><div class="engage-grid">'
        + "".join(f'<a class="engage reveal" href="/{u}"><h3>{bi(en, zh)}</h3><span class="engage-link">{bi(ce, cz)} →</span></a>'
                  for u, en, zh, ce, cz in (("ventures.html", "Ventures &amp; patents", "創業與專利", "Open", "前往"),
                                            ("insights/", "Insights", "觀點文章", "Read", "閱讀"),
                                            ("markets.html", "US markets", "美股行情", "Open", "前往")))
        + '</div></div></section>'), encoding="utf-8")
    stamp_assets()
    print(f"built {len(arts)} articles, insights index, news, markets, privacy and 404 pages")


ASSETS = ("styles.css", "main.js", "news.js", "markets.js", "us-equities.js", "contact.js", "assets/fonts/fonts.css")


def stamp_assets():
    """Add ?v=<content hash> to CSS/JS links so browsers never mix a new page with an old cached file."""
    import hashlib
    ver = {a: hashlib.md5((ROOT / a).read_bytes()).hexdigest()[:8] for a in ASSETS if (ROOT / a).exists()}
    for f in [*ROOT.glob("*.html"), *(ROOT / "insights").glob("*.html")]:
        s = f.read_text(encoding="utf-8")
        s2 = s
        for a, v in ver.items():
            s2 = re.sub(r'((?:href|src)="(?:\.\./|/)?' + re.escape(a) + r')(?:\?v=[0-9a-f]+)?"', r"\g<1>?v=" + v + '"', s2)
        if s2 != s:
            f.write_text(s2, encoding="utf-8")


if __name__ == "__main__":
    main()
