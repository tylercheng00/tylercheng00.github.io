#!/usr/bin/env python3
"""Generate sc.js: the Simplified Chinese (简体) view of the site.

The site is written in English and Traditional Chinese. When a visitor picks
简, sc.js converts the Traditional text on the page to Simplified in the
browser, so there is only one copy of every page to maintain.

The conversion table comes from OpenCC (Hong Kong Traditional -> Simplified),
plus a short list of mainland word choices (e.g. 私隐 -> 隐私, 电邮 -> 邮箱).
Re-run after adding a lot of new Chinese text, or after editing VOCAB:

    pip install opencc-python-reimplemented
    python3 tools/build_sc.py
"""
import json
import pathlib
import re

import opencc

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "sc.js"

# Mainland word choices, applied after the character conversion (longest first).
VOCAB = [
    ("私隐政策", "隐私政策"), ("私隐", "隐私"),
    ("电邮至", "发邮件至"), ("以电邮回复", "通过邮件回复"), ("以电邮方式", "通过邮件方式"),
    ("确认电邮", "确认邮件"), ("电邮程式", "邮件应用"), ("电邮服务供应商", "电子邮件服务商"),
    ("电邮", "邮箱"),
    ("联络", "联系"), ("营运总监", "运营总监"), ("营运", "运营"), ("透过", "通过"),
    ("资讯", "信息"), ("讯息", "信息"), ("影片", "视频"), ("视像会议", "视频会议"),
    ("程式", "程序"), ("载入", "加载"), ("支援", "支持"), ("会议连结", "会议链接"), ("连结", "连接"), ("预设", "默认"),
    ("提早收市", "提前收盘"), ("收市价", "收盘价"), ("收市", "收盘"),
    ("升跌榜", "涨跌榜"), ("升跌", "涨跌"), ("网上预约", "在线预约"),
    ("手提电脑", "笔记本电脑"), ("寄存", "托管"), ("萤幕", "屏幕"),
    ("帐户", "账户"), ("帐号", "账号"), ("主页", "首页"), ("选单", "菜单"),
    ("储存", "存储"), ("模组", "模块"), ("义工服务", "志愿服务"), ("义工", "志愿者"),
    ("上载", "上传"), ("列印", "打印"), ("查询类别", "咨询类别"),
    ("第一间公司", "第一家公司"),
    ("甚么", "什么"), ("澳洲", "澳大利亚"), ("工作天", "工作日"), ("送出", "提交"),
    ("标靶", "靶向"), ("电视访问", "电视采访"), ("储存联络资料", "保存联系方式"),
    ("日内完成", "天内完成"), ("合作查询", "合作咨询"), ("留言查询", "留言咨询"), ("这次查询", "这次咨询"),
]


def main():
    cc = opencc.OpenCC("hk2s")
    ddir = pathlib.Path(opencc.__file__).parent / "dictionary"

    def keys(name):
        out = []
        for line in (ddir / name).read_text(encoding="utf-8").splitlines():
            if line.strip():
                out.append(line.split("\t")[0])
        return out

    chars = {}
    for k in keys("TSCharacters.txt") + keys("HKVariantsRev.txt"):
        if len(k) == 1:
            v = cc.convert(k)
            if v != k and len(v) == 1:
                chars[k] = v

    def by_char(s):
        return "".join(chars.get(c, c) for c in s)

    # Phrases only where character-by-character conversion would be wrong,
    # and only those that occur in the site's own text (keeps the file small).
    corpus = ""
    for p in ROOT.rglob("*"):
        if p.suffix in (".html", ".js", ".md", ".py") and not {"legacy", ".git", "assets"} & set(p.parts) and p.name != "sc.js":
            corpus += p.read_text(encoding="utf-8", errors="ignore")
    phrases = {}
    for name in ("TSPhrases.txt", "HKVariantsRevPhrases.txt"):
        for k in keys(name):
            if len(k) > 1 and k in corpus:
                v = cc.convert(k)
                if v != by_char(k):
                    phrases[k] = v

    T = "".join(chars)
    S = "".join(chars[k] for k in chars)
    vocab = sorted(VOCAB, key=lambda kv: -len(kv[0]))
    data = (f"var T={json.dumps(T, ensure_ascii=False)},S={json.dumps(S, ensure_ascii=False)},"
            f"P={json.dumps(phrases, ensure_ascii=False, separators=(',', ':'))},"
            f"V={json.dumps(vocab, ensure_ascii=False, separators=(',', ':'))};")
    js = (ROOT / "tools" / "sc_runtime.js").read_text(encoding="utf-8").replace("/*DATA*/", data)
    OUT.write_text(js, encoding="utf-8")
    print(f"sc.js: {len(chars)} characters, {len(phrases)} phrases, {len(vocab)} word choices, "
          f"{OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
