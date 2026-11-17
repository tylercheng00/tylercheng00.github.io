/* Shared BaZi / calendar helpers for member services (Mark Six + personal chart). */
(function (global) {
  var STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var ANIMALS = ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"];
  var ELEMENTS = ["木", "火", "土", "金", "水"];
  var STEM_EL = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  var BRANCH_EL = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
  var HOUR_BRANCHES = [
    [23, 1, "子"], [1, 3, "丑"], [3, 5, "寅"], [5, 7, "卯"], [7, 9, "辰"], [9, 11, "巳"],
    [11, 13, "午"], [13, 15, "未"], [15, 17, "申"], [17, 19, "酉"], [19, 21, "戌"], [21, 23, "亥"]
  ];
  var ZODIAC = [
    [1, 20, "摩羯", "Capricorn"], [1, 21, "水瓶", "Aquarius"], [2, 19, "水瓶", "Aquarius"],
    [2, 20, "雙魚", "Pisces"], [3, 20, "雙魚", "Pisces"], [3, 21, "白羊", "Aries"],
    [4, 20, "白羊", "Aries"], [4, 21, "金牛", "Taurus"], [5, 20, "金牛", "Taurus"],
    [5, 21, "雙子", "Gemini"], [6, 21, "雙子", "Gemini"], [6, 22, "巨蟹", "Cancer"],
    [7, 22, "巨蟹", "Cancer"], [7, 23, "獅子", "Leo"], [8, 22, "獅子", "Leo"],
    [8, 23, "處女", "Virgo"], [9, 22, "處女", "Virgo"], [9, 23, "天秤", "Libra"],
    [10, 23, "天秤", "Libra"], [10, 24, "天蠍", "Scorpio"], [11, 22, "天蠍", "Scorpio"],
    [11, 23, "射手", "Sagittarius"], [12, 21, "射手", "Sagittarius"], [12, 22, "摩羯", "Capricorn"]
  ];
  var NUMBER_ELEMENT = {};
  (function () {
    var i, n;
    for (n of [3, 4, 11, 12, 19, 20, 27, 28, 35, 36, 43, 44]) NUMBER_ELEMENT[n] = "金";
    for (n of [7, 8, 15, 16, 23, 24, 31, 32, 39, 40, 47, 48]) NUMBER_ELEMENT[n] = "木";
    for (n of [5, 6, 13, 14, 21, 22, 29, 30, 37, 38, 45, 46]) NUMBER_ELEMENT[n] = "水";
    for (n of [1, 2, 9, 10, 17, 18, 25, 26, 33, 34, 41, 42, 49]) NUMBER_ELEMENT[n] = "火";
    for (i = 1; i <= 49; i++) if (!NUMBER_ELEMENT[i]) NUMBER_ELEMENT[i] = ELEMENTS[(i - 1) % 5];
  })();

  function julianDay(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var y2 = y + 4800 - a;
    var m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }
  function parseYmd(iso) {
    var p = String(iso).slice(0, 10).split("-").map(Number);
    return { y: p[0], m: p[1], d: p[2] };
  }
  function dayPillar(iso) {
    var p = parseYmd(iso);
    var idx = (julianDay(p.y, p.m, p.d) + 49) % 60;
    return { stem: STEMS[idx % 10], branch: BRANCHES[idx % 12], label: STEMS[idx % 10] + BRANCHES[idx % 12], index: idx };
  }
  function yearPillar(iso) {
    var p = parseYmd(iso);
    var year = p.y;
    if (p.m < 2 || (p.m === 2 && p.d < 4)) year -= 1;
    var idx = ((year - 1984) % 60 + 60) % 60;
    return {
      stem: STEMS[idx % 10], branch: BRANCHES[idx % 12], label: STEMS[idx % 10] + BRANCHES[idx % 12],
      animal: ANIMALS[idx % 12], element: STEM_EL[idx % 10]
    };
  }
  function monthPillar(iso) {
    var p = parseYmd(iso);
    var solarMonthStarts = [0, 6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7];
    var monthIndex = p.m - 1;
    if (p.d < solarMonthStarts[p.m]) monthIndex = (monthIndex + 11) % 12;
    var branchIndex = (monthIndex + 2) % 12;
    var year = yearPillar(iso);
    var yearStemIndex = STEMS.indexOf(year.stem);
    var base = [2, 4, 6, 8, 0][yearStemIndex % 5];
    var stemIndex = (base + branchIndex) % 10;
    return { stem: STEMS[stemIndex], branch: BRANCHES[branchIndex], label: STEMS[stemIndex] + BRANCHES[branchIndex], element: BRANCH_EL[branchIndex] };
  }
  function hourBranchFromTime(hhmm) {
    var parts = String(hhmm || "12:00").split(":");
    var h = Number(parts[0]) || 0;
    var i, row;
    for (i = 0; i < HOUR_BRANCHES.length; i++) {
      row = HOUR_BRANCHES[i];
      if (row[0] > row[1]) {
        if (h >= row[0] || h < row[1]) return row[2];
      } else if (h >= row[0] && h < row[1]) return row[2];
    }
    return "午";
  }
  function hourPillar(iso, hhmm) {
    var day = dayPillar(iso);
    var branch = hourBranchFromTime(hhmm);
    var branchIndex = BRANCHES.indexOf(branch);
    var dayStemIndex = STEMS.indexOf(day.stem);
    // 五鼠遁: 甲己→甲子, 乙庚→丙子, 丙辛→戊子, 丁壬→庚子, 戊癸→壬子
    var base = [0, 2, 4, 6, 8][dayStemIndex % 5];
    var stemIndex = (base + branchIndex) % 10;
    return { stem: STEMS[stemIndex], branch: branch, label: STEMS[stemIndex] + branch, element: BRANCH_EL[branchIndex] };
  }
  function elOfStem(stem) { return STEM_EL[STEMS.indexOf(stem)] || "土"; }
  function generates(a) { return ELEMENTS[(ELEMENTS.indexOf(a) + 1) % 5]; }
  function generatedBy(a) { return ELEMENTS[(ELEMENTS.indexOf(a) + 4) % 5]; }
  function controls(a) { return ELEMENTS[(ELEMENTS.indexOf(a) + 2) % 5]; }
  function sunSign(iso) {
    var p = parseYmd(iso);
    var i, row, best = ZODIAC[0];
    for (i = 0; i < ZODIAC.length; i++) {
      row = ZODIAC[i];
      if (p.m > row[0] || (p.m === row[0] && p.d >= row[1])) best = row;
    }
    return { zh: best[2], en: best[3] };
  }
  function lunarPhase(iso) {
    var p = parseYmd(iso);
    var jd = julianDay(p.y, p.m, p.d);
    var synodic = 29.53058867;
    var phase = ((jd - 2451550.1) / synodic) % 1;
    if (phase < 0) phase += 1;
    var label = "蛾眉月";
    if (phase < 0.03 || phase > 0.97) label = "朔月";
    else if (phase < 0.22) label = "蛾眉月";
    else if (phase < 0.28) label = "上弦";
    else if (phase < 0.47) label = "盈凸月";
    else if (phase < 0.53) label = "望月";
    else if (phase < 0.72) label = "虧凸月";
    else if (phase < 0.78) label = "下弦";
    else label = "殘月";
    return { phase: phase, label: label };
  }
  function weekdayPlanet(iso) {
    var names = ["日(太陽)", "月(太陰)", "火(火星)", "水(水星)", "木(木星)", "金(金星)", "土(土星)"];
    var p = parseYmd(iso);
    return names[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  }
  function animalOfNumber(n, yearAnimal) {
    var y = ANIMALS.indexOf(yearAnimal);
    return ANIMALS[(y - ((n - 1) % 12) + 120) % 12];
  }
  var STEM_EN = {
    "甲": "Jia (Yang Wood)", "乙": "Yi (Yin Wood)", "丙": "Bing (Yang Fire)", "丁": "Ding (Yin Fire)",
    "戊": "Wu (Yang Earth)", "己": "Ji (Yin Earth)", "庚": "Geng (Yang Metal)", "辛": "Xin (Yin Metal)",
    "壬": "Ren (Yang Water)", "癸": "Gui (Yin Water)"
  };
  var ZODIAC_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  var ZODIAC_ZH = {
    Aries: "白羊", Taurus: "金牛", Gemini: "雙子", Cancer: "巨蟹", Leo: "獅子", Virgo: "處女",
    Libra: "天秤", Scorpio: "天蠍", Sagittarius: "射手", Capricorn: "摩羯", Aquarius: "水瓶", Pisces: "雙魚"
  };
  function signOffset(sunEn, offset) {
    var i = ZODIAC_ORDER.indexOf(sunEn);
    if (i < 0) i = 0;
    return ZODIAC_ORDER[(i + offset + 12) % 12];
  }
  function luckyFromElements(favor) {
    var out = [], n;
    for (n = 1; n <= 49 && out.length < 8; n++) {
      if (favor.indexOf(NUMBER_ELEMENT[n]) >= 0) out.push(n);
    }
    return out;
  }
  function buildNatal(input) {
    var iso = input.birthIso;
    var time = input.birthTime || "12:00";
    var y = yearPillar(iso);
    var m = monthPillar(iso);
    var d = dayPillar(iso);
    var h = hourPillar(iso, time);
    var dm = d.stem;
    var dmEl = elOfStem(dm);
    var favor = [generatedBy(dmEl), dmEl, generates(dmEl)];
    var avoid = [controls(dmEl)];
    favor = favor.filter(function (el, i, arr) { return arr.indexOf(el) === i; });
    var sun = sunSign(iso);
    var hh = Number(String(time).split(":")[0]) || 12;
    var moonEn = signOffset(sun.en, hh >= 12 ? 1 : -1);
    var ascEn = signOffset(sun.en, Math.floor(hh / 2) % 12);
    var pillarsArr = [y.label, m.label, d.label, h.label];
    return {
      nameZh: input.nameZh || "",
      nameEn: input.nameEn || "",
      birthIso: iso,
      birthTime: time,
      birthPlace: input.birthPlace || "",
      pillars: pillarsArr,
      pillarsMap: { year: y.label, month: m.label, day: d.label, hour: h.label },
      year: y, month: m, day: d, hour: h,
      dayMaster: dm,
      dayMasterEn: STEM_EN[dm] || dm,
      dayMasterElement: dmEl,
      dayElement: dmEl,
      favorElements: favor,
      avoidElements: avoid,
      yearAnimal: y.animal,
      animal: y.animal,
      sunSign: sun.zh + " / " + sun.en,
      sunSignObj: sun,
      moonSign: ZODIAC_ZH[moonEn] + " / " + moonEn,
      ascSign: ZODIAC_ZH[ascEn] + " / " + ascEn,
      luckyNumbers: luckyFromElements(favor),
      lunar: lunarPhase(iso),
      weekdayPlanet: weekdayPlanet(iso)
    };
  }

  var DM_PERSONA = {
    "甲": { trait: "正直進取、有領導欲，像大樹般要空間發展。", career: "管理、教育、公共事務、樹木／環保相關。", wealth: "財來自長線布局與信用，忌急功近利。", health: "肝膽、筋骨、頭部；宜規律運動與睡眠。", family: "重責任與面子，需學習柔軟溝通。" },
    "乙": { trait: "柔韌聰慧、適應力強，像藤蔓能借勢。", career: "設計、顧問、媒介、醫療、細膩服務業。", wealth: "偏財機會多，宜控風險、勿跟風。", health: "肝氣、免疫、眼部；忌焦慮積壓。", family: "情感細膩，需界限清楚才安穩。" },
    "丙": { trait: "熱情光明、感染力強，像太陽照人。", career: "展演、品牌、銷售、能源、文化傳播。", wealth: "財隨名聲與人脈；開源同時要節流。", health: "心臟、血壓、眼睛；忌過勞興奮。", family: "重溫暖表達，伴侶需被看見。" },
    "丁": { trait: "內斂敏銳、洞察力強，像燭火細照。", career: "研究、寫作、心理、精密技術、策展。", wealth: "正財穩、偏財靠專長變現。", health: "心神、睡眠、血液循環；宜靜心。", family: "重精神契合，忌冷戰累積。" },
    "戊": { trait: "厚重可靠、承載力強，像高山大地。", career: "地產、工程、行政、倉儲物流、農業。", wealth: "置產與實體資產較合；忌槓桿過高。", health: "脾胃、消化、濕氣；宜清淡飲食。", family: "護短但慢熱，穩定承諾很重要。" },
    "己": { trait: "細心培育、包容度高，像田土養萬物。", career: "教育、餐飲、人力、農業、照護。", wealth: "積少成多；適合穩健儲蓄與技能變現。", health: "脾胃、濕、血糖；宜定時進食。", family: "重照顧與安全感，需被感謝。" },
    "庚": { trait: "果斷剛強、執行力高，像金屬利刃。", career: "金融、法律、軍警、手術、機械製造。", wealth: "適合目標導向收入；忌衝動投機。", health: "肺、呼吸道、皮膚；宜呼吸鍛鍊。", family: "愛恨分明，溝通要避免過硬。" },
    "辛": { trait: "精緻敏銳、品味高，像珠玉寶石。", career: "珠寶、美學、精品、談判、專業顧問。", wealth: "重質不重量；品牌與專業溢價。", health: "肺氣、過敏、皮膚；忌過度挑剔自耗。", family: "重儀式感與被尊重。" },
    "壬": { trait: "流動智慧、格局大，像江河奔流。", career: "貿易、航海物流、資訊、投資、國際事務。", wealth: "財路廣；要設閘口控現金流。", health: "腎、泌尿、水腫、疲勞；宜作息。", family: "自由與陪伴需平衡。" },
    "癸": { trait: "細膩直覺、潛力深，像雨露泉源。", career: "研究、靈性諮詢、化驗、軟體、隱性知識工作。", wealth: "後期發力多；宜長期複利思維。", health: "腎精、內分泌、睡眠；忌思慮過甚。", family: "情感深但內斂，需安全感。" }
  };

  function chartAnalysis(natal) {
    var dm = natal.dayMaster;
    var persona = DM_PERSONA[dm] || DM_PERSONA["甲"];
    var el = natal.dayMasterElement;
    var dayPill = (natal.pillarsMap && natal.pillarsMap.day) || (natal.pillars && natal.pillars[2]) || "";
    var sunZh = (natal.sunSignObj && natal.sunSignObj.zh) || String(natal.sunSign || "").split(" / ")[0];
    var sunEn = (natal.sunSignObj && natal.sunSignObj.en) || String(natal.sunSign || "").split(" / ")[1] || "";
    var zh = {
      personality: persona.trait + " 日主" + dm + el + "，喜用偏" + natal.favorElements.join("、") + "，壓力位偏" + natal.avoidElements.join("、") + "。",
      career: persona.career + " 結合生肖" + natal.yearAnimal + "與太陽星座" + sunZh + "，對外形象偏" + sunEn + "特質。",
      wealth: persona.wealth,
      health: persona.health,
      family: persona.family,
      outlook: "近況以日柱" + dayPill + "為軸：月相近「" + natal.lunar.label + "」、主星「" + natal.weekdayPlanet + "」。走勢宜順喜用（" + natal.favorElements.join("、") + "），少硬碰忌神（" + natal.avoidElements.join("、") + "）。此為傳統符號與日主推演的研究參考，不是宿命斷語。"
    };
    var en = {
      personality: "Day master " + dm + " (" + el + "). Favour " + natal.favorElements.join(", ") + "; pressure around " + natal.avoidElements.join(", ") + ". Core tone: upright drive with room to grow.",
      career: "Fit paths lean " + persona.career + " Animal " + natal.yearAnimal + " + Sun " + sunEn + " colour the public style.",
      wealth: "Wealth style: build through steady skill and credit; avoid leverage that fights your day-master element.",
      health: "Health focus tracks " + el + " imbalance — keep sleep, motion and diet rhythmic.",
      family: "Family / bonds: clarity and warmth matter more than performance.",
      outlook: "Near-term axis is day pillar " + dayPill + " with lunar cue 「" + natal.lunar.label + "」 and weekday planet " + natal.weekdayPlanet + ". Lean into favour elements (" + natal.favorElements.join(", ") + "); ease off avoid elements (" + natal.avoidElements.join(", ") + "). Research reading only — not destiny."
    };
    return {
      personality: { zh: zh.personality, en: en.personality },
      career: { zh: zh.career, en: en.career },
      wealth: { zh: zh.wealth, en: en.wealth },
      health: { zh: zh.health, en: en.health },
      family: { zh: zh.family, en: en.family },
      outlook: { zh: zh.outlook, en: en.outlook }
    };
  }

  function laneFromScores(ranked, natal, mode) {
    var pool = ranked.slice();
    if (mode === "conservative") {
      pool = pool.filter(function (s) { return natal.avoidElements.indexOf(s.element) < 0; });
      if (pool.length < 8) pool = ranked.slice();
    } else if (mode === "aggressive") {
      pool = ranked.slice().sort(function (a, b) {
        var ah = a.reasons.indexOf("近段偏熱") >= 0 ? 1 : 0;
        var bh = b.reasons.indexOf("近段偏熱") >= 0 ? 1 : 0;
        return (bh - ah) || (b.score - a.score);
      });
    }
    var lucky = natal.luckyNumbers || [];
    var mains = [];
    var i, n;
    for (i = 0; i < pool.length && mains.length < 6; i++) {
      n = pool[i].n;
      if (mains.indexOf(n) < 0) mains.push(n);
    }
    if (mode === "aggressive") {
      for (i = 0; i < lucky.length && mains.length < 6; i++) {
        if (mains.indexOf(lucky[i]) < 0) mains.push(lucky[i]);
      }
    }
    mains = mains.slice(0, 6).sort(function (a, b) { return a - b; });
    var special = (pool[0] && pool[0].n) || mains[0] || 1;
    if (mains.indexOf(special) >= 0) {
      for (i = 0; i < pool.length; i++) {
        if (mains.indexOf(pool[i].n) < 0) { special = pool[i].n; break; }
      }
    }
    var whyBits = (pool[0] && pool[0].reasons) || [];
    return {
      mains: mains,
      special: special,
      why: "日主" + natal.dayMaster + natal.dayElement + " · 喜" + natal.favorElements.join("/") +
        (whyBits.length ? " · " + whyBits.slice(0, 3).join("、") : "")
    };
  }

  function scoreMarkSixForNatal(natal, summary) {
    var scores = [];
    var n, el, animal, score, reasons, hotMap = {}, freqMap = {}, omitMap = {};
    (summary.topHot50 || summary.topHot || []).forEach(function (r) { hotMap[r.n] = r.count; });
    (summary.topFreq || []).forEach(function (r) { freqMap[r.n] = r.count; });
    (summary.topOmission || []).forEach(function (r) { omitMap[r.n] = r.missed; });
    for (n = 1; n <= 49; n++) {
      el = NUMBER_ELEMENT[n];
      animal = animalOfNumber(n, natal.yearAnimal || natal.animal);
      score = 0;
      reasons = [];
      if (freqMap[n]) { score += 0.35; reasons.push("長期偏熱"); }
      if (hotMap[n]) { score += 0.55 + Math.min(0.4, (hotMap[n] || 0) / 20); reasons.push("近段偏熱"); }
      if (omitMap[n] && omitMap[n] >= 15) { score += Math.min(0.7, omitMap[n] / 40); reasons.push("遺漏偏高"); }
      if (natal.favorElements.indexOf(el) >= 0) { score += 0.85; reasons.push("五行喜" + el); }
      if (natal.avoidElements.indexOf(el) >= 0) { score -= 1.2; reasons.push("五行忌" + el); }
      if (animal === (natal.yearAnimal || natal.animal)) { score += 0.45; reasons.push("生肖合" + animal); }
      if ((natal.luckyNumbers || []).indexOf(n) >= 0) { score += 0.35; reasons.push("幸運號"); }
      if (STEMS[(n - 1) % 10] === natal.dayMaster && natal.avoidElements.indexOf(el) < 0) {
        score += 0.2; reasons.push("干同日主");
      }
      scores.push({ n: n, score: score, reasons: reasons, element: el, animal: animal });
    }
    scores.sort(function (a, b) { return b.score - a.score; });
    return {
      ranked: scores.slice(0, 12),
      conservative: laneFromScores(scores, natal, "conservative"),
      balanced: laneFromScores(scores, natal, "balanced"),
      aggressive: laneFromScores(scores, natal, "aggressive")
    };
  }

  global.MemberBazi = {
    STEMS: STEMS, BRANCHES: BRANCHES, ANIMALS: ANIMALS, ELEMENTS: ELEMENTS,
    NUMBER_ELEMENT: NUMBER_ELEMENT,
    buildNatal: buildNatal,
    chartAnalysis: chartAnalysis,
    scoreMarkSixForNatal: scoreMarkSixForNatal,
    animalOfNumber: animalOfNumber,
    dayPillar: dayPillar,
    yearPillar: yearPillar
  };
})(window);
