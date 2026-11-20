/* Shared BaZi + tropical natal engine for member services.
 *
 * BaZi: year/month from solar terms (sun ecliptic longitude), day pillar with
 * 子時換日 (from 23:00 local), hour via 五鼠遁.
 * Natal: Jean Meeus–style sun/moon longitude + local sidereal ascendant.
 * Research desk only — not a substitute for a professional 道長 reading.
 */
(function (global) {
  var STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var ANIMALS = ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"];
  var ELEMENTS = ["木", "火", "土", "金", "水"];
  var STEM_EL = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  var BRANCH_EL = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
  var STEM_EN = {
    "甲": "Jia (Yang Wood)", "乙": "Yi (Yin Wood)", "丙": "Bing (Yang Fire)", "丁": "Ding (Yin Fire)",
    "戊": "Wu (Yang Earth)", "己": "Ji (Yin Earth)", "庚": "Geng (Yang Metal)", "辛": "Xin (Yin Metal)",
    "壬": "Ren (Yang Water)", "癸": "Gui (Yin Water)"
  };
  var BRANCH_EN = {
    "子": "Zi", "丑": "Chou", "寅": "Yin", "卯": "Mao", "辰": "Chen", "巳": "Si",
    "午": "Wu", "未": "Wei", "申": "Shen", "酉": "You", "戌": "Xu", "亥": "Hai"
  };
  /** 地支藏干（主氣在前） */
  var HIDDEN_STEMS = {
    "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"], "卯": ["乙"],
    "辰": ["戊", "乙", "癸"], "巳": ["丙", "庚", "戊"], "午": ["丁", "己"], "未": ["己", "丁", "乙"],
    "申": ["庚", "壬", "戊"], "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "甲"]
  };
  var SIGNS = [
    { en: "Aries", zh: "白羊" }, { en: "Taurus", zh: "金牛" }, { en: "Gemini", zh: "雙子" },
    { en: "Cancer", zh: "巨蟹" }, { en: "Leo", zh: "獅子" }, { en: "Virgo", zh: "處女" },
    { en: "Libra", zh: "天秤" }, { en: "Scorpio", zh: "天蠍" }, { en: "Sagittarius", zh: "射手" },
    { en: "Capricorn", zh: "摩羯" }, { en: "Aquarius", zh: "水瓶" }, { en: "Pisces", zh: "雙魚" }
  ];
  var HOUSE_MEANING_ZH = [
    "第一宮·命主／自我", "第二宮·財帛／資源", "第三宮·兄弟／溝通", "第四宮·家庭／根基",
    "第五宮·子女／創造", "第六宮·健康／工作", "第七宮·婚姻／合夥", "第八宮·轉化／共同資源",
    "第九宮·學問／遠行", "第十宮·事業／地位", "第十一宮·朋友／社群", "第十二宮·潛意識／隱事"
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

  /** Common birth-place → approx lat/lng (for ascendant). Default Hong Kong. */
  var PLACE_COORDS = [
    [/hong\s*kong|香港|hk\b/i, 22.3193, 114.1694, 8],
    [/深圳|shenzhen/i, 22.5431, 114.0579, 8],
    [/廣州|guangzhou|canton/i, 23.1291, 113.2644, 8],
    [/上海|shanghai/i, 31.2304, 121.4737, 8],
    [/北京|beijing/i, 39.9042, 116.4074, 8],
    [/台北|taipei/i, 25.0330, 121.5654, 8],
    [/台南|tainan/i, 22.9997, 120.2270, 8],
    [/仙桃|xiantao/i, 30.3600, 113.4400, 8],
    [/杭州|hangzhou/i, 30.2741, 120.1551, 8],
    [/奧馬哈|omaha/i, 41.2565, -95.9345, -6],
    [/武漢|wuhan/i, 30.5928, 114.3055, 8],
    [/新加坡|singapore/i, 1.3521, 103.8198, 8],
    [/東京|tokyo/i, 35.6762, 139.6503, 9],
    [/倫敦|london/i, 51.5074, -0.1278, 0],
    [/queen'?s|紐約|new\s*york|nyc|brooklyn|manhattan/i, 40.7282, -73.7949, -5],
    [/洛杉磯|los\s*angeles|la\b/i, 34.0522, -118.2437, -8],
    [/三藩市|san\s*francisco|sf\b/i, 37.7749, -122.4194, -8],
    [/悉尼|sydney/i, -33.8688, 151.2093, 10],
    [/比勒陀利亞|pretoria|南非|south\s*africa/i, -25.7479, 28.2293, 2],
    [/約翰尼斯堡|johannesburg/i, -26.2041, 28.0473, 2]
  ];

  function parseYmd(iso) {
    var p = String(iso || "").slice(0, 10).split("-").map(Number);
    return { y: p[0] || 2000, m: p[1] || 1, d: p[2] || 1 };
  }
  function parseHm(hhmm) {
    var parts = String(hhmm || "12:00").split(":");
    return { h: Number(parts[0]) || 0, mi: Number(parts[1]) || 0 };
  }
  function norm360(x) {
    x = x % 360;
    return x < 0 ? x + 360 : x;
  }
  function deg2rad(d) { return d * Math.PI / 180; }
  function rad2deg(r) { return r * 180 / Math.PI; }

  function resolvePlace(place) {
    var s = String(place || "Hong Kong");
    var i, row;
    for (i = 0; i < PLACE_COORDS.length; i++) {
      row = PLACE_COORDS[i];
      if (row[0].test(s)) return { lat: row[1], lng: row[2], tzHours: row[3], label: s, matched: true };
    }
    return { lat: 22.3193, lng: 114.1694, tzHours: 8, label: s, matched: false };
  }


  /** Rough civil DST for US/Canada zones (-5/-8 etc.): March–November → +1 hour (EDT/PDT). */
  function tzOffsetHours(place, y, m, d) {
    var tz = place.tzHours;
    if (tz > -3 || tz < -9) return tz; // not US-style zone
    if (m > 3 && m < 11) return tz + 1;
    if (m === 3 && d >= 8) return tz + 1;
    if (m === 11 && d <= 6) return tz + 1;
    return tz;
  }

  /** Julian Day (UT), Meeus. */
  function julianDayUT(y, m, d, hourUT) {
    var yy = y, mm = m;
    if (mm <= 2) { yy -= 1; mm += 12; }
    var A = Math.floor(yy / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524.5 + (hourUT || 0) / 24;
  }

  /** Civil calendar day index used by sexagenary day formula (noon-based integer JD). */
  function civilDayIndex(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var y2 = y + 4800 - a;
    var m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }

  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    var Mr = deg2rad(M);
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
      + 0.000289 * Math.sin(3 * Mr);
    return norm360(L0 + C);
  }

  function moonLongitude(jd) {
    /* Meeus-style lunar longitude with extra periodic terms — fixes many sign-boundary misses. */
    var T = (jd - 2451545.0) / 36525;
    var Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T);
    var D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T);
    var M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
    var Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T);
    var F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T);
    function S(a) { return Math.sin(deg2rad(a)); }
    var lon = Lp
      + 6.288774 * S(Mp)
      + 1.274027 * S(2 * D - Mp)
      + 0.658314 * S(2 * D)
      + 0.213618 * S(2 * Mp)
      - 0.185116 * S(M)
      - 0.114332 * S(2 * F)
      + 0.058793 * S(2 * D - 2 * Mp)
      + 0.057066 * S(2 * D - M - Mp)
      + 0.053322 * S(2 * D + Mp)
      + 0.045758 * S(2 * D - M)
      + 0.040986 * S(2 * D - Mp - M)
      + 0.034718 * S(D)
      + 0.030465 * S(Mp - M)
      + 0.015326 * S(2 * D - 2 * F)
      - 0.012528 * S(2 * F + Mp)
      - 0.010980 * S(2 * F - Mp)
      + 0.010674 * S(4 * D - Mp)
      + 0.010034 * S(3 * Mp)
      + 0.008548 * S(4 * D - 2 * Mp)
      - 0.007910 * S(M - Mp + 2 * D)
      - 0.006766 * S(2 * D + M)
      + 0.005162 * S(Mp - D);
    var Omega = norm360(125.04452 - 1934.136261 * T);
    lon += -0.0124 * S(Omega) - 0.000145;
    return norm360(lon);
  }

  function obliquity(jd) {
    var T = (jd - 2451545.0) / 36525;
    return 23.439291 - 0.0130042 * T;
  }

  function localSiderealTime(jd, lng) {
    var T = (jd - 2451545.0) / 36525;
    var gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0)
      + 0.000387933 * T * T - T * T * T / 38710000);
    return norm360(gmst + lng);
  }

  function ascendant(jd, lat, lng) {
    /* Ecliptic ascendant from RAMC (standard atan2 form — prior sign flip put charts 180° off). */
    var ramc = deg2rad(localSiderealTime(jd, lng));
    var eps = deg2rad(obliquity(jd));
    var phi = deg2rad(lat);
    var y = Math.cos(ramc);
    var x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
    return norm360(rad2deg(Math.atan2(y, x)));
  }

  function signFromLon(lon) {
    var i = Math.floor(norm360(lon) / 30) % 12;
    var degIn = norm360(lon) - i * 30;
    return {
      index: i,
      en: SIGNS[i].en,
      zh: SIGNS[i].zh,
      deg: degIn,
      label: SIGNS[i].zh + " / " + SIGNS[i].en + " " + degIn.toFixed(1) + "°"
    };
  }

  function hourBranchFromTime(hhmm) {
    var hm = parseHm(hhmm);
    var h = hm.h;
    var mi = hm.mi;
    var mins = h * 60 + mi;
    // 子 23:00–00:59, 丑 01:00–02:59, ... 各 2 小時
    if (mins >= 23 * 60 || mins < 60) return "子";
    var slots = ["丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    var idx = Math.floor((mins - 60) / 120);
    return slots[Math.max(0, Math.min(10, idx))];
  }

  /** Day used for 日柱：子時（≥23:00）起算下一日。 */
  function dayPillarDate(iso, hhmm) {
    var p = parseYmd(iso);
    var hm = parseHm(hhmm);
    var y = p.y, m = p.m, d = p.d;
    if (hm.h >= 23) {
      var dt = new Date(Date.UTC(y, m - 1, d + 1));
      y = dt.getUTCFullYear();
      m = dt.getUTCMonth() + 1;
      d = dt.getUTCDate();
    }
    return { y: y, m: m, d: d };
  }

  function dayPillar(iso, hhmm) {
    var p = dayPillarDate(iso, hhmm || "12:00");
    var idx = (civilDayIndex(p.y, p.m, p.d) + 49) % 60;
    return {
      stem: STEMS[idx % 10],
      branch: BRANCHES[idx % 12],
      label: STEMS[idx % 10] + BRANCHES[idx % 12],
      index: idx,
      civilYmd: p.y + "-" + String(p.m).padStart(2, "0") + "-" + String(p.d).padStart(2, "0")
    };
  }

  /** Month branch index 0=寅 … from sun longitude (立春=315°). */
  function monthBranchIndexFromLon(lon) {
    return Math.floor(norm360(lon - 315) / 30) % 12;
  }

  function yearPillarFromLon(lon, civilYear, civilMonth) {
    // 八字年以立春（太陽黃經≈315°）換年：1 月必為上一年；2 月看是否已過立春；其餘為當年。
    var year = civilYear;
    if (civilMonth === 1) year = civilYear - 1;
    else if (civilMonth === 2) year = lon >= 315 ? civilYear : civilYear - 1;
    var idx = ((year - 1984) % 60 + 60) % 60;
    return {
      stem: STEMS[idx % 10],
      branch: BRANCHES[idx % 12],
      label: STEMS[idx % 10] + BRANCHES[idx % 12],
      animal: ANIMALS[idx % 12],
      element: STEM_EL[idx % 10],
      solarYear: year
    };
  }

  function monthPillarFromLon(lon, yearStem) {
    var yinIndex = monthBranchIndexFromLon(lon); // 0=寅月（立春起）
    var yearStemIndex = STEMS.indexOf(yearStem);
    var base = [2, 4, 6, 8, 0][yearStemIndex % 5]; // 五虎遁
    var stemIndex = (base + yinIndex) % 10;
    var branch = BRANCHES[(yinIndex + 2) % 12];
    return {
      stem: STEMS[stemIndex],
      branch: branch,
      label: STEMS[stemIndex] + branch,
      element: BRANCH_EL[(yinIndex + 2) % 12],
      jieQiIndex: yinIndex
    };
  }

  function hourPillar(dayStem, hhmm) {
    var branch = hourBranchFromTime(hhmm);
    var branchIndex = BRANCHES.indexOf(branch);
    var dayStemIndex = STEMS.indexOf(dayStem);
    var base = [0, 2, 4, 6, 8][dayStemIndex % 5]; // 五鼠遁
    var stemIndex = (base + branchIndex) % 10;
    return {
      stem: STEMS[stemIndex],
      branch: branch,
      label: STEMS[stemIndex] + branch,
      element: BRANCH_EL[branchIndex]
    };
  }

  function elOfStem(stem) { return STEM_EL[STEMS.indexOf(stem)] || "土"; }
  function generates(a) { return ELEMENTS[(ELEMENTS.indexOf(a) + 1) % 5]; }
  function generatedBy(a) { return ELEMENTS[(ELEMENTS.indexOf(a) + 4) % 5]; }
  function controls(a) { return ELEMENTS[(ELEMENTS.indexOf(a) + 2) % 5]; }
  function controlledBy(a) { return ELEMENTS[(ELEMENTS.indexOf(a) + 3) % 5]; }

  function lunarPhaseFromLon(sunLon, moonLon) {
    var phase = norm360(moonLon - sunLon) / 360;
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

  function luckyFromElements(favor) {
    var out = [], n;
    for (n = 1; n <= 49 && out.length < 8; n++) {
      if (favor.indexOf(NUMBER_ELEMENT[n]) >= 0) out.push(n);
    }
    return out;
  }

  function elementCounts(pillars) {
    var counts = { "木": 0, "火": 0, "土": 0, "金": 0, "水": 0 };
    pillars.forEach(function (p) {
      counts[elOfStem(p.stem)]++;
      counts[BRANCH_EL[BRANCHES.indexOf(p.branch)]]++;
      (HIDDEN_STEMS[p.branch] || []).forEach(function (hs) {
        counts[elOfStem(hs)] += 0.35;
      });
    });
    return counts;
  }

  function buildNatal(input) {
    var iso = String(input.birthIso || "").slice(0, 10);
    var time = input.birthTime || "12:00";
    var place = resolvePlace(input.birthPlace || "Hong Kong");
    var ymd = parseYmd(iso);
    var hm = parseHm(time);
    var tz = tzOffsetHours(place, ymd.y, ymd.m, ymd.d);
    var hourUT = hm.h + hm.mi / 60 - tz;
    var jd = julianDayUT(ymd.y, ymd.m, ymd.d, hourUT);
    place = Object.assign({}, place, { tzHoursUsed: tz });
    var sunLon = sunLongitude(jd);
    var moonLon = moonLongitude(jd);
    var ascLon = ascendant(jd, place.lat, place.lng);

    var year = yearPillarFromLon(sunLon, ymd.y, ymd.m);
    var month = monthPillarFromLon(sunLon, year.stem);
    var day = dayPillar(iso, time);
    var hour = hourPillar(day.stem, time);

    var dm = day.stem;
    var dmEl = elOfStem(dm);
    var favor = [generatedBy(dmEl), dmEl, generates(dmEl)];
    var avoid = [controls(dmEl)];
    favor = favor.filter(function (el, i, arr) { return arr.indexOf(el) === i; });

    var sun = signFromLon(sunLon);
    var moon = signFromLon(moonLon);
    var asc = signFromLon(ascLon);
    var pillarsArr = [year.label, month.label, day.label, hour.label];
    var hidden = {
      year: HIDDEN_STEMS[year.branch] || [],
      month: HIDDEN_STEMS[month.branch] || [],
      day: HIDDEN_STEMS[day.branch] || [],
      hour: HIDDEN_STEMS[hour.branch] || []
    };

    return {
      nameZh: input.nameZh || "",
      nameEn: input.nameEn || "",
      birthIso: iso,
      birthTime: time,
      birthPlace: input.birthPlace || place.label,
      geo: place,
      jd: jd,
      sunLon: sunLon,
      moonLon: moonLon,
      ascLon: ascLon,
      pillars: pillarsArr,
      pillarsMap: { year: year.label, month: month.label, day: day.label, hour: hour.label },
      hiddenStems: hidden,
      year: year, month: month, day: day, hour: hour,
      dayMaster: dm,
      dayMasterEn: STEM_EN[dm] || dm,
      dayMasterElement: dmEl,
      dayElement: dmEl,
      favorElements: favor,
      avoidElements: avoid,
      yearAnimal: year.animal,
      animal: year.animal,
      sunSign: sun.label,
      sunSignObj: { zh: sun.zh, en: sun.en, deg: sun.deg },
      moonSign: moon.label,
      moonSignObj: { zh: moon.zh, en: moon.en, deg: moon.deg },
      ascSign: asc.label,
      ascSignObj: { zh: asc.zh, en: asc.en, deg: asc.deg },
      housesHintZh: HOUSE_MEANING_ZH[asc.index] + "落在上升；太陽在" + sun.zh + "，月亮在" + moon.zh + "。",
      luckyNumbers: luckyFromElements(favor),
      lunar: lunarPhaseFromLon(sunLon, moonLon),
      weekdayPlanet: weekdayPlanet(iso),
      methodNoteZh: "八字按節氣（太陽黃經）定年月，子時（23:00）換日柱；時柱五鼠遁。星盤為黃道太陽／月亮／上升近似（出生地經緯推算）。研究用，非道長面診。",
      methodNoteEn: "BaZi year/month from solar terms (sun longitude); day pillar rolls at Zi hour (23:00); hour from 五鼠遁. Tropical sun/moon/asc from birth-place coordinates. Research only."
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

  function stemBranchOfCivilYear(y) {
    var idx = ((y - 1984) % 60 + 60) % 60;
    return { stem: STEMS[idx % 10], branch: BRANCHES[idx % 12], label: STEMS[idx % 10] + BRANCHES[idx % 12], animal: ANIMALS[idx % 12], index: idx };
  }

  function relationScore(dmEl, otherEl) {
    if (otherEl === dmEl) return 1.1;
    if (otherEl === generatedBy(dmEl)) return 1.35;
    if (otherEl === generates(dmEl)) return 0.55;
    if (otherEl === controlledBy(dmEl)) return 0.15;
    if (otherEl === controls(dmEl)) return -1.25;
    return 0;
  }

  /** Research-style luck windows: score civil years by stem/branch vs day master. */
  function luckYears(natal, fromYear, span) {
    var dmEl = natal.dayMasterElement;
    var favor = natal.favorElements || [];
    var avoid = natal.avoidElements || [];
    var rows = [];
    var y, sb, stemEl, branchEl, score, tier, noteZh, noteEn;
    for (y = fromYear; y < fromYear + span; y++) {
      sb = stemBranchOfCivilYear(y);
      stemEl = elOfStem(sb.stem);
      branchEl = BRANCH_EL[BRANCHES.indexOf(sb.branch)];
      score = relationScore(dmEl, stemEl) + relationScore(dmEl, branchEl) * 0.85;
      if (favor.indexOf(stemEl) >= 0) score += 0.45;
      if (favor.indexOf(branchEl) >= 0) score += 0.35;
      if (avoid.indexOf(stemEl) >= 0) score -= 0.9;
      if (avoid.indexOf(branchEl) >= 0) score -= 0.7;
      if (sb.animal === natal.yearAnimal) score += 0.25;
      if (score >= 1.35) {
        tier = "good";
        noteZh = "流年" + sb.label + "（" + sb.animal + "）對日主" + natal.dayMaster + "偏幫扶／生扶，宜推進事業、簽約、公開曝光；仍要看當月細節。";
        noteEn = "Year " + sb.label + " (" + sb.animal + ") supports day master " + natal.dayMaster + " — better for launches, contracts, visibility. Still check the month.";
      } else if (score <= -0.55) {
        tier = "hard";
        noteZh = "流年" + sb.label + "偏耗洩或克制喜用，宜守成、控槓桿、少開大仗；健康與現金流要預留緩衝。";
        noteEn = "Year " + sb.label + " drains or clashes favour elements — consolidate, control leverage, avoid oversized bets; keep health and cash buffers.";
      } else {
        tier = "caution";
        noteZh = "流年" + sb.label + "平穩偏震盪，適合練內功、補流程與人脈，不宜把命運押在單一賭注。";
        noteEn = "Year " + sb.label + " is mixed — build systems and relationships; do not stake everything on one bet.";
      }
      rows.push({ year: y, pillar: sb.label, animal: sb.animal, score: Math.round(score * 100) / 100, tier: tier, zh: noteZh, en: noteEn });
    }
    return rows;
  }

  function chartAnalysis(natal) {
    var dm = natal.dayMaster;
    var persona = DM_PERSONA[dm] || DM_PERSONA["甲"];
    var el = natal.dayMasterElement;
    var dayPill = natal.pillarsMap.day;
    var counts = elementCounts([natal.year, natal.month, natal.day, natal.hour]);
    var strong = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var weak = strong.slice().reverse();
    var sunZh = natal.sunSignObj.zh;
    var sunEn = natal.sunSignObj.en;
    var moonZh = natal.moonSignObj.zh;
    var moonEn = natal.moonSignObj.en;
    var ascZh = natal.ascSignObj.zh;
    var ascEn = natal.ascSignObj.en;
    var hiddenDay = (natal.hiddenStems.day || []).join("、");
    var hiddenAll = ["年", "月", "日", "時"].map(function (lab, i) {
      var k = ["year", "month", "day", "hour"][i];
      return lab + "柱藏干" + ((natal.hiddenStems[k] || []).join("") || "—");
    }).join("；");
    var birthY = parseYmd(natal.birthIso).y;
    var nowY = new Date().getUTCFullYear();
    var years = luckYears(natal, Math.max(nowY - 1, birthY + 18), 12);
    var goodYears = years.filter(function (r) { return r.tier === "good"; }).map(function (r) { return String(r.year); });
    var hardYears = years.filter(function (r) { return r.tier === "hard"; }).map(function (r) { return String(r.year); });
    var zh = {
      personality: "日主「" + dm + el + "」（" + (STEM_EN[dm] || dm) + "）。四柱 " + natal.pillars.join(" · ") + "。" + hiddenAll + "。盤面五行能量排序：" + strong.map(function (k) { return k + counts[k].toFixed(1); }).join("、") + "——偏旺「" + strong.slice(0, 2).join("、") + "」，偏弱「" + weak.slice(0, 2).join("、") + "」。喜用神方向偏「" + natal.favorElements.join("、") + "」，壓力／忌神偏「" + natal.avoidElements.join("、") + "」。" + persona.trait + " 西洋盤輔助：太陽" + sunZh + "（" + natal.sunSignObj.deg.toFixed(1) + "°）、月亮" + moonZh + "（" + natal.moonSignObj.deg.toFixed(1) + "°）、上升" + ascZh + "（" + natal.ascSignObj.deg.toFixed(1) + "°）；月相「" + natal.lunar.label + "」。月亮代表情緒節奏與內在安全感，上升是第一印象與起盤宮位——解讀時先日主，再月亮，再上升。",
      career: persona.career + " 結合生肖「" + natal.yearAnimal + "」、日柱「" + dayPill + "」、太陽" + sunZh + "與上升" + ascZh + "：" + natal.housesHintZh + " 實務上，喜用年／月適合對外談判、融資、換跑道；忌神年宜把流程、合規與現金跑道寫死，再談擴張。若盤面土／金偏重，管理與制度崗較順；水／木偏重，內容、貿易與國際線較順；火偏重，品牌與公開表達較順——仍要以你實際履歷校正，不是命運判決。",
      wealth: persona.wealth + " 財的讀法分三層：（1）正財——工資、客戶續約、可審計收入；（2）偏財——投資、一次性項目、機會型現金；（3）資源——人脈、知識產權、時間。喜用「" + natal.favorElements.join("、") + "」的年份，較適合開源與談條款；忌神「" + natal.avoidElements.join("、") + "」年份，優先降槓桿、鎖成本、延遲非必要投機。把「賺不賺錢」拆成毛利、經營現金與股本稀釋三句話，比只看感覺準。",
      health: persona.health + " 五行對身體的提示僅供作息參考：木→肝膽筋眼；火→心神血壓；土→脾胃濕；金→肺鼻皮；水→腎與睡眠。你盤面偏旺「" + strong[0] + "」、偏弱「" + weak[0] + "」，日常用睡眠、飲食與運動平衡，而不是用焦慮替代醫療。重大不適請看醫生。",
      family: persona.family + " 感情／合夥上，上升" + ascZh + "與月亮" + moonZh + "常決定「別人怎麼感覺你」與「你半夜在想什麼」。月相「" + natal.lunar.label + "」時出生的人，情緒起伏節奏不同——溝通時先說事實再說情緒，減少誤會。家庭決策遇忌神年，宜少翻舊帳、多寫共同日曆。",
      outlook: "以日柱「" + dayPill + "」為軸，未來約十二年流年（研究用，非鐵口直斷）：偏利年份包括 " + (goodYears.join("、") || "（本段較平均）") + "；需小心／守成的年份包括 " + (hardYears.join("、") || "（本段未見極端）") + "。細節見下方「流年表」。整體原則：喜用年敢推項目，忌神年修系統；任何年份都不取代盡職調查與現金管理。" + natal.methodNoteZh
    };
    var en = {
      personality: "Day master " + dm + " (" + el + "). Pillars " + natal.pillars.join(" · ") + ". Element weights favour " + strong.slice(0, 2).join(", ") + "; lighter " + weak.slice(0, 2).join(", ") + ". Favour " + natal.favorElements.join(", ") + "; pressure around " + natal.avoidElements.join(", ") + ". " + persona.trait + " Western overlay: Sun " + sunEn + " " + natal.sunSignObj.deg.toFixed(1) + "°, Moon " + moonEn + " " + natal.moonSignObj.deg.toFixed(1) + "°, Asc " + ascEn + " " + natal.ascSignObj.deg.toFixed(1) + "°; lunar phase " + natal.lunar.label + ". Read day master first, then Moon (pace/security), then Asc (first impression).",
      career: "Career lean: " + persona.career + " Animal " + natal.yearAnimal + "; day pillar " + dayPill + "; Sun " + sunEn + ", Asc " + ascEn + ". Push launches in favour years; lock process, compliance and runway in pressure years. Match to your real CV — this is research framing, not destiny.",
      wealth: "Wealth in three layers: earned income, opportunity cash, and resources (network/IP/time). Favour-element years suit opening terms; avoid-element years suit cutting leverage. Separate gross margin, operating cash and dilution when you ask whether a venture “makes money.”",
      health: "Health notes track " + el + " symbolism — keep sleep, food and movement rhythmic. Stronger " + strong[0] + ", lighter " + weak[0] + " in this chart sketch. Not medical advice.",
      family: "Bonds: " + persona.family + " Asc " + ascEn + " and Moon " + moonEn + " colour how others meet you and how you self-soothe. In harder years, write shared calendars instead of replaying old arguments.",
      outlook: "Axis " + dayPill + ". Favourable windows in the next ~12 civil years include " + (goodYears.join(", ") || "(mostly mixed)") + "; caution/defence years include " + (hardYears.join(", ") || "(none extreme in this slice)") + ". See the year table below. " + natal.methodNoteEn
    };
    return {
      personality: { zh: zh.personality, en: en.personality },
      career: { zh: zh.career, en: en.career },
      wealth: { zh: zh.wealth, en: en.wealth },
      health: { zh: zh.health, en: en.health },
      family: { zh: zh.family, en: en.family },
      outlook: { zh: zh.outlook, en: en.outlook },
      elementCounts: counts,
      luckYears: years
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
    NUMBER_ELEMENT: NUMBER_ELEMENT, HIDDEN_STEMS: HIDDEN_STEMS,
    buildNatal: buildNatal,
    chartAnalysis: chartAnalysis,
    luckYears: luckYears,
    stemBranchOfCivilYear: stemBranchOfCivilYear,
    scoreMarkSixForNatal: scoreMarkSixForNatal,
    animalOfNumber: animalOfNumber,
    dayPillar: dayPillar,
    hourBranchFromTime: hourBranchFromTime,
    sunLongitude: sunLongitude,
    moonLongitude: moonLongitude
  };
})(typeof window !== "undefined" ? window : globalThis);
