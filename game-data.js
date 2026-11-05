/* 《夢想家之路》Dreamer's Road: story and actions.
   Inspired by a real life story; names are generic and some scenes are dramatised. Edit text here; the engine is game.js.
   fx: changes to the five stats. money can go below zero (debt); energy blocks actions when too low. */
window.GAME_DATA = (function () {
  function t(en, zh) { return { en: en, zh: zh }; }

  var STATS = [
    { k: 'family', icon: '❤️', name: t('Family', '家人') },
    { k: 'dream', icon: '✨', name: t('Dream', '夢想') },
    { k: 'impact', icon: '🌍', name: t('Impact', '影響力') },
    { k: 'energy', icon: '⚡', name: t('Energy', '精力') },
    { k: 'money', icon: '💰', name: t('Funds', '資金'), debt: t('Debt', '負債') }
  ];

  // Buildings: name, the true story behind them (shown when tapped)
  var BUILD = {
    home: { name: t('Home', '家'), note: t('Where it all started: a small flat in Hong Kong.', '一切的起點：香港一個小小的家。') },
    school: { name: t('School', '學校'), note: t('Bullied here as a kid, and still walked in every morning.', '小時候在這裏被欺負，但每天都照樣走進校門。') },
    library: { name: t('Library', '圖書館'), note: t('Where the rockets and cities in my notebooks came from.', '筆記簿上那些火箭和城市，都是在這裏畫出來的。') },
    rooftop: { name: t('Rooftop', '天台'), note: t('Looking up at the sky, wondering how far a person can go.', '望着天空，想一個人可以走多遠。') },
    studio: { name: t('First company', '第一間公司'), note: t('Started at 20 with little more than a laptop.', '20 歲創業，起步時差不多只有一部手提電腦。') },
    harbor: { name: t('Going overseas', '走出海外'), note: t('By 22, the business had reached other countries.', '22 歲時，業務已拓展至其他國家。') },
    store: { name: t('Convenience store', '便利店'), note: t('The first shop of my own. It taught me cash flow the hard way.', '第一間自己的店。它用最痛的方式教會我現金流。') },
    factory: { name: t('Protection factory', '防護用品工廠'), note: t('Making better protection when people needed it most. It later grew into a nanotech company.', '在大家最需要的時候做出更好的防護。後來發展成一間納米科技公司。') },
    university: { name: t('University', '大學'), note: t('Learning science properly, in Hong Kong and abroad.', '在香港和海外，認真地學科學。') },
    nanolab: { name: t('Nanotech lab', '納米實驗室'), note: t('A nanotech company co-founded at university: nano-coatings and biomedical targeting.', '大學期間聯合創辦的納米科技公司：納米塗層及生物醫療標靶。') },
    patent: { name: t('Patent office', '專利局'), note: t('Granted patents protect years of research.', '獲授權的專利，保護多年的研發成果。') },
    exchange: { name: t('New York tower', '紐約大樓'), note: t('Helping companies reach the US capital market: IPOs and M&A.', '協助企業走進美國資本市場：IPO 上市及併購。') },
    btrdcc: { name: t('Biotech research centre', '生物科技研究中心'), note: t('AI-assisted biotech, nano-targeting and cancer therapy research.', '結合 AI 的生物科技、納米標靶及癌症治療研發。') },
    cat: { name: t('Cat café', '貓咪咖啡店'), note: t('A cat café and pet service, founded and run by hand.', '親手創辦並經營的貓咪寵物服務店。') },
    youth: { name: t('Youth hall', '青年中心'), note: t('Talks at schools, volunteering and youth forums.', '回校演講、做義工、參與青年論壇。') },
    rocket: { name: t('Rocket pad', '火箭發射台'), note: t('The childhood dream that never left: rockets and space.', '從小到大都沒有放下的夢：火箭和太空。') },
    hospital: { name: t('Hospital', '醫院'), note: t('Where the research finally meets patients.', '研究成果終於走到病人身邊的地方。') },
    apartments: { name: t('Homes for young families', '青年家庭住宅'), note: t('Affordable flats, so the next dreamer has a place to start.', '可負擔的住宅，讓下一個追夢的人有起步的地方。') },
    incubator: { name: t('Founders\' hub', '創業孵化中心'), note: t('Desks, mentors and a first cheque for young founders.', '給年輕創業者的辦公桌、導師和第一筆資金。') },
    museum: { name: t('Science museum', '科學館'), note: t('Free entry for every kid who wants to know how things work.', '每個想知道世界怎樣運作的孩子，都可以免費入場。') },
    station: { name: t('Train station', '火車站'), note: t('Connecting the city to everywhere else.', '把城市連接到世界各地。') },
    stadium: { name: t('Stadium', '運動場'), note: t('A place to cheer together.', '一個大家一起歡呼的地方。') },
    solar: { name: t('Solar farm', '太陽能發電場'), note: t('Clean power for the whole city.', '為整座城市提供潔淨能源。') },
    park: { name: t('Park', '公園'), note: t('Trees, a fountain and benches for old friends.', '樹、噴水池，還有給老朋友坐的長椅。') },
    dome: { name: t('City of the future', '未來之城'), note: t('"I don\'t just want to build a city. I want to build a future."', '「我不只想建造一座城市，我想建造一個未來。」') }
  };

  var ACT = {
    rest: { icon: '😴', name: t('Rest', '休息一下'), desc: t('Sleep. Tomorrow is another day.', '睡一覺，明天再戰。'), fx: { energy: 35 }, repeat: true },
    family: { icon: '🍲', name: t('Dinner at home', '回家食飯'), desc: t('Mum\'s soup fixes most things.', '媽媽的湯，可以治好大部分事情。'), fx: { family: 10, energy: 10 }, repeat: true },
    school: { build: 'school', icon: '🏫', name: t('Go to school', '上學去'), desc: t('Even on the bad days, walk through the gate.', '就算是難受的日子，也走進校門。'), fx: { energy: -15, dream: 5, impact: 3 } },
    library: { build: 'library', icon: '📚', name: t('The library', '圖書館'), desc: t('Fill notebooks with rockets and cities.', '在筆記簿上畫滿火箭和城市。'), fx: { energy: -10, dream: 12 } },
    rooftop: { build: 'rooftop', icon: '🔭', name: t('Rooftop nights', '天台的晚上'), desc: t('Look at the stars and plan.', '望着星星，想自己的計劃。'), fx: { energy: -10, dream: 12 } },
    parttime: { icon: '🧋', name: t('Part-time job', '打工儲錢'), desc: t('Save every dollar for the dream.', '每一蚊都儲起來，留給夢想。'), fx: { energy: -20, money: 12 }, repeat: true },
    studio: { build: 'studio', icon: '💻', name: t('Start a company', '成立公司'), desc: t('One laptop. One idea. Age 20.', '一部手提電腦，一個想法。20 歲。'), fx: { energy: -20, money: -5, dream: 12 } },
    clients: { icon: '🤝', name: t('Find customers', '見客跑生意'), desc: t('Knock on doors until one opens.', '一道一道門去敲，直到有一道打開。'), fx: { energy: -20, money: 18, impact: 4 }, repeat: true },
    harbor: { build: 'harbor', icon: '🚢', name: t('Go overseas', '走出海外'), desc: t('Take the business to other countries.', '把生意帶到其他國家。'), fx: { energy: -20, money: 10, impact: 12 } },
    store: { build: 'store', icon: '🏪', name: t('Open a store', '開便利店'), desc: t('A shop of your own. What could go wrong?', '開一間自己的店，會有甚麼問題？'), fx: { energy: -15, money: -15, dream: 5 } },
    nightshift: { icon: '🌙', name: t('Night shifts', '通宵兼職'), desc: t('Pay it back, one night at a time.', '一晚一晚，慢慢還。'), fx: { energy: -25, money: 15 }, repeat: true },
    factory: { build: 'factory', icon: '😷', name: t('Protection factory', '防護用品工廠'), desc: t('People need better protection. Build it.', '大家需要更好的防護，那就做出來。'), fx: { energy: -20, money: 15, impact: 10 } },
    university: { build: 'university', icon: '🎓', name: t('University', '大學'), desc: t('Study science, properly this time.', '這一次，認真讀科學。'), fx: { energy: -15, dream: 8, impact: 5 } },
    nanolab: { build: 'nanolab', icon: '🧪', name: t('Nanotech lab', '納米實驗室'), desc: t('Co-found a nanotech company.', '聯合創辦一間納米科技公司。'), fx: { energy: -20, money: -10, dream: 10, impact: 8 } },
    patent: { build: 'patent', icon: '📜', name: t('File patents', '申請專利'), desc: t('Protect the work with patents.', '用專利保護研發成果。'), fx: { energy: -10, money: 8, impact: 12 } },
    exchange: { build: 'exchange', icon: '🏙️', name: t('New York', '紐約'), desc: t('Help companies reach the US capital market.', '協助企業走進美國資本市場。'), fx: { energy: -20, money: 20, impact: 10 } },
    btrdcc: { build: 'btrdcc', icon: '🧬', name: t('AI biotech centre', 'AI 生物科技中心'), desc: t('AI + nano-targeting, aimed at cancer.', 'AI 加納米標靶，對準癌症。'), fx: { energy: -20, money: -10, dream: 12, impact: 12 } },
    cat: { build: 'cat', icon: '🐱', name: t('Cat café', '貓咪咖啡店'), desc: t('A cat café. Because why not.', '開一間貓咪店。為甚麼不？'), fx: { energy: -10, money: 5, family: 5 } },
    listing: { icon: '📈', name: t('Help a company list', '協助企業上市'), desc: t('Long nights, tight timetables, one bell.', '無數個通宵、緊湊的時間表，換來一下敲鐘。'), fx: { energy: -25, money: 15, impact: 10 }, repeat: true },
    youth: { build: 'youth', icon: '🎤', name: t('Youth hall', '青年中心'), desc: t('Give talks. Mentor. Volunteer.', '演講、做導師、做義工。'), fx: { energy: -15, impact: 15 } },
    volunteer: { icon: '🤲', name: t('Volunteer', '做義工'), desc: t('Give back to the city that raised you.', '回饋養大你的城市。'), fx: { energy: -10, impact: 10, family: 3 }, repeat: true },
    rocket: { build: 'rocket', icon: '🚀', name: t('Rocket pad', '火箭發射台'), desc: t('The childhood drawing, for real.', '把小時候的畫變成真的。'), fx: { energy: -15, money: -15, dream: 20 } },
    hospital: { build: 'hospital', icon: '🏥', name: t('Hospital', '醫院'), desc: t('Bring the research to patients.', '把研究帶到病人身邊。'), fx: { energy: -20, money: -15, impact: 18 } },
    apartments: { build: 'apartments', icon: '🏢', name: t('Affordable homes', '青年住宅'), desc: t('A start for the next dreamer.', '給下一個追夢者一個起點。'), fx: { energy: -15, money: 10, family: 8 } },
    incubator: { build: 'incubator', icon: '🚪', name: t('Founders\' hub', '創業孵化中心'), desc: t('Open the door you once knocked on.', '打開你當年敲過的那道門。'), fx: { energy: -15, money: -10, impact: 15, dream: 5 } },
    museum: { build: 'museum', icon: '🔬', name: t('Science museum', '科學館'), desc: t('Free entry for curious kids.', '好奇的孩子免費入場。'), fx: { energy: -15, money: -10, dream: 10, impact: 10 } },
    station: { build: 'station', icon: '🚆', name: t('Train station', '火車站'), desc: t('Connect the city to the world.', '把城市連接到世界。'), fx: { energy: -15, money: 12, impact: 8 } },
    stadium: { build: 'stadium', icon: '🏟️', name: t('Stadium', '運動場'), desc: t('A place to cheer together.', '大家一起歡呼的地方。'), fx: { energy: -15, money: 8, family: 8 } },
    solar: { build: 'solar', icon: '☀️', name: t('Solar farm', '太陽能發電場'), desc: t('Clean power for everyone.', '給每個人的潔淨能源。'), fx: { energy: -10, money: 6, impact: 10 } },
    park: { build: 'park', icon: '🌳', name: t('Park', '公園'), desc: t('Trees and a fountain.', '種樹，建個噴水池。'), fx: { energy: -5, family: 8, dream: 4 } },
    dome: { build: 'dome', icon: '🌐', name: t('City of the future', '未來之城'), desc: t('Not just a city. A future.', '不只是一座城市，而是一個未來。'), fx: { energy: -20, money: -15, dream: 15, impact: 15 } }
  };

  var CHAPTERS = [
    {
      age: t('Childhood', '童年'), title: t('Hong Kong', '香港'), ap: 2,
      intro: [t('A small flat in Hong Kong. You love staring at the sky, imagining rockets flying out of the city.',
                '香港，一個小小的家。你最喜歡望着天空，幻想火箭從城市飛出去的樣子。')],
      story: {
        text: t('At school, a group of "friends" throw your schoolbag into the bin. Everyone laughs. Someone shouts: "Loser!"',
                '學校裏，幾個所謂的「朋友」把你的書包丟進垃圾桶。全班都在笑。有人大叫：「廢柴！」'),
        opts: [
          { t: t('Come back tomorrow anyway.', '明天照樣上學。'), fx: { dream: 10, energy: -10 },
            r: t('You don\'t run. That stubbornness will save you many times later.', '你沒有逃。這份倔強，後來救了你很多次。') },
          { t: t('Go home and tell Mum and Dad.', '回家告訴爸媽。'), fx: { family: 15 },
            r: t('Mum doesn\'t scold you. She just holds you and says: "You did nothing wrong."', '媽媽沒有罵你，只是抱着你說：「你冇做錯。」') },
          { t: t('Hide in the library and draw.', '躲進圖書館，把夢想畫下來。'), fx: { dream: 15 },
            r: t('Your notebook fills with rockets and cities. A world of your own.', '筆記簿上畫滿了火箭和城市。那是只屬於你的世界。') }
        ]
      },
      actions: ['school', 'library', 'family', 'rest'],
      milestone: t('You didn\'t give up. Being bullied taught you something early: what others think of you is not who you are.',
                   '你沒有放棄。被欺負的日子很早就教會你：別人怎樣看你，不等於你是誰。')
    },
    {
      age: t('Teenage years', '少年'), title: t('Home', '家'), ap: 3,
      intro: [t('You tell your parents you want to start a business one day.', '你跟爸媽說，將來想自己做生意。')],
      story: {
        text: t('Dinner turns into a fight. "Business? Do you know how hard it is out there?" Dad puts down his chopsticks. A door slams.',
                '晚飯變成了吵架。「做生意？你知唔知出面幾難？」爸爸放下筷子。房門被大力關上。'),
        opts: [
          { t: t('"I\'ll prove it to you."', '「我會證明給你們看。」'), fx: { dream: 15, family: -10 },
            r: t('You lie awake, angry and sure of yourself.', '那一晚你睡不着，又氣，又更加肯定自己。') },
          { t: t('Sit down and explain the plan.', '坐下來，好好解釋你的計劃。'), fx: { family: 10, dream: 5 },
            r: t('They don\'t agree. But they listen to the end.', '他們沒有同意，但都聽完了。') },
          { t: t('Study first. Dream later.', '先讀好書，夢想遲啲再講。'), fx: { energy: 10, impact: 5 },
            r: t('You put the dream in a drawer. You never lock it.', '你把夢想放進抽屜，但從來沒有上鎖。') }
        ]
      },
      mid: {
        after: 1,
        text: t('Late that night, your parents knock on your door. "We\'re not against you. We\'re just scared you\'ll get hurt. If you want to try, go and try."',
                '那天深夜，爸媽敲門進來。「我哋唔係反對你，只係驚你辛苦。你想做，就去試吓啦。」'),
        opts: [{ t: t('Hug them.', '抱住他們。'), fx: { family: 15, dream: 5 },
                 r: t('Whatever happens next, you know where home is.', '以後無論發生甚麼事，你都知道家在哪裏。') }]
      },
      actions: ['rooftop', 'parttime', 'family', 'rest'],
      milestone: t('Families argue because they care. Yours ended up being your biggest supporter.',
                   '家人會吵，是因為在乎。你的家，最後成了你最大的支持。')
    },
    {
      age: t('Age 20', '20 歲'), title: t('One laptop', '一部手提電腦'), ap: 3,
      intro: [t('You\'re 20. You have a laptop, an idea and not much else. You register your first company.',
                '20 歲。你有一部手提電腦、一個想法，除此之外甚麼都沒有。你註冊了人生第一間公司。')],
      story: {
        text: t('How all-in are you?', '你準備投入多少？'),
        opts: [
          { t: t('All in. Full time.', '全職投入，破釜沉舟。'), fx: { dream: 15, money: -10, energy: -10 },
            r: t('No safety net. Exactly how you wanted it.', '沒有後路，正合你意。') },
          { t: t('Study and build at the same time.', '一邊讀書，一邊創業。'), fx: { dream: 8, impact: 5, energy: -10 },
            r: t('Lectures by day, emails until 3 a.m.', '白天上課，凌晨三點還在回電郵。') }
        ]
      },
      mid: {
        after: 1,
        text: t('At a dinner, someone laughs: "You\'re a kid. Who would ever trust you?" The whole table laughs with him. You grip your glass.',
                '飯局上，有人笑你：「咁後生，邊個會信你？」全枱人跟着一起笑。你握緊了手中的杯。'),
        opts: [
          { t: t('Laugh along. Results will answer.', '笑吧，結果會說話。'), fx: { dream: 10 },
            r: t('You write his words down. You\'ll need them later.', '你把那句話記下來。以後會用得着。') },
          { t: t('Go home and rewrite the business plan.', '回家，把計劃書改到最好。'), fx: { money: 8, impact: 5, energy: -5 },
            r: t('By sunrise, the plan is twice as good.', '天亮時，計劃書好了一倍。') }
        ]
      },
      actions: ['studio', 'clients', 'harbor', 'family', 'rest'],
      milestone: t('By 22, the business had reached other countries. The people who laughed went quiet.',
                   '22 歲，你的生意已經走到其他國家。當年笑你的人，安靜了。')
    },
    {
      age: t('The fall', '跌倒'), title: t('Debt', '欠債'), ap: 3,
      intro: [t('Things are going well. Maybe too well. You decide to open a convenience store.',
                '一切看起來很順利，也許太順利了。你決定開一間便利店。')],
      story: {
        text: t('Rent, stock, wages… The account goes negative. You owe money. At 3 a.m. you sit outside the shop, not knowing who to call.',
                '租金、貨款、人工……戶口變成負數，你欠下了一筆債。凌晨三點，你坐在店門口，不知道可以打給誰。'),
        fx: { money: -40, energy: -10 },
        opts: [
          { t: t('Call home.', '打電話回家。'), fx: { family: 20, energy: 20 },
            r: t('Mum says only: "Come home and eat first." Dad says: "Money can be earned again. You\'re what matters."',
                 '電話那頭，媽媽只說了一句：「返嚟食飯先。」爸爸說：「錢可以再搵，你冇事就得。」') },
          { t: t('Carry it alone.', '一個人扛。'), fx: { dream: 5, energy: -15, family: 10 },
            r: t('You carry it alone for a long time. Later you learn your parents were waiting, the whole time, for you to ask.',
                 '你一個人扛了很久。後來才知道，爸媽一直都在等你開口。') }
        ]
      },
      mid: {
        after: 1,
        text: t('An old "friend" posts: "Told you he couldn\'t do it." Some people stop replying to your messages. Some look straight through you.',
                '以前的「朋友」說：「早就話佢唔得啦。」有人不再回你的訊息，有人在街上當作看不見你。'),
        opts: [
          { t: t('Write it on the wall. Read it every day.', '把這句話寫在牆上，每天看一次。'), fx: { dream: 15 },
            r: t('Being looked down on becomes fuel.', '被看不起，變成了燃料。') },
          { t: t('Don\'t explain. Just pay it back.', '不解釋，慢慢還。'), fx: { money: 10, impact: 5 },
            r: t('Quietly, one payment at a time.', '靜靜地，一筆一筆還。') }
        ]
      },
      actions: ['store', 'nightshift', 'family', 'rest'],
      milestone: t('Falling wasn\'t the end. You learned cash flow, humility, and that home would always take you back.',
                   '跌倒不是終點。你學會了現金流、學會了低頭，也知道家永遠會接住你。')
    },
    {
      age: t('Getting back up', '重新站起'), title: t('Science', '科研'), ap: 4,
      intro: [t('Then the pandemic. People need better protection. You and your team start a company making protective products.',
                '然後，疫情來了。大家需要更好的防護。你和團隊創辦了一間做防護用品的公司。')],
      story: {
        text: t('A TV station asks you for an interview. Under the studio lights, you think of everyone who laughed.',
                '電視台邀請你做訪問。攝影棚的燈打在臉上，你想起每一個笑過你的人。'),
        opts: [
          { t: t('Tell the real story, debts and all.', '講真話，包括欠債的那段。'), fx: { impact: 15, dream: 5 },
            r: t('Strangers message you afterwards: "Thank you. I needed that."', '節目播出後，有陌生人傳訊息給你：「多謝你，我需要聽到這些。」') },
          { t: t('Talk about the product and the team.', '專心講產品和團隊。'), fx: { impact: 10, money: 10 },
            r: t('Orders come in the next morning.', '第二天早上，訂單來了。') }
        ]
      },
      mid: {
        after: 2,
        text: t('At university you co-found a nanotech company. Your work wins the 2023 award for the most innovative biotech cleaning and protection solution.',
                '大學期間，你聯合創辦了一間納米科技公司。公司獲頒 2023 年度最卓越生物科技相關清潔及防護解決方案大獎。'),
        opts: [{ t: t('Call Mum first.', '第一個打給媽媽。'), fx: { family: 10, impact: 10 },
                 r: t('She cries. Dad pretends he isn\'t.', '她哭了。爸爸假裝沒有。') }]
      },
      actions: ['factory', 'university', 'nanolab', 'patent', 'rest'],
      milestone: t('From a debt-ridden shop to granted patents. Science gave you a second start.',
                   '由欠債的小店，到獲授權的專利。科研給了你第二次起步。')
    },
    {
      age: t('Two worlds', '兩個世界'), title: t('New York', '紐約'), ap: 4,
      intro: [t('You move to New York and join a capital markets firm, helping companies reach the US market. You also co-found an AI biotech research project.',
                '你來到紐約，加入一間資本市場顧問公司，協助企業走進美國市場。同時，你聯合創辦了一個 AI 生物科技研發項目。')],
      story: {
        text: t('An investor leans back: "You\'re young. What do you know about capital markets?"',
                '會議室裏，一位投資者靠在椅背上：「你這麼年輕，懂資本市場嗎？」'),
        opts: [
          { t: t('Open the numbers. Walk through every page.', '打開數據，一頁一頁講。'), fx: { impact: 10, money: 10 },
            r: t('An hour later, he\'s the one taking notes.', '一小時後，抄筆記的人變成了他。') },
          { t: t('Smile. "Let me tell you where I started."', '微笑：「讓我先講講我是怎樣開始的。」'), fx: { impact: 8, dream: 8 },
            r: t('The story of the laptop, the debt and the store. The room goes quiet.', '手提電腦、欠債、便利店的故事。會議室安靜下來。') }
        ]
      },
      actions: ['exchange', 'btrdcc', 'cat', 'listing', 'rest'],
      milestone: t('Capital markets on one side, science on the other. You learned to speak both languages.',
                   '一邊是資本市場，一邊是科研。你學會了說兩種語言。')
    },
    {
      age: t('Giving back', '回饋'), title: t('City of dreams', '夢想之城'), ap: 3,
      intro: [t('You go back to a school to give a talk. In the back row sits a kid with his head down. He looks a lot like you once did.',
                '你回到學校演講。最後一排坐着一個低着頭的孩子，很像當年的你。')],
      story: {
        text: t('What do you do?', '你會怎樣做？'),
        opts: [
          { t: t('Walk down and tell him: "You can do this."', '走下台，跟他說：「你可以的。」'), fx: { impact: 15, family: 5 },
            r: t('He looks up. That\'s enough.', '他抬起了頭。這樣就夠了。') },
          { t: t('Tell the whole room about being bullied.', '向全場講出被欺負的故事。'), fx: { impact: 10, dream: 10 },
            r: t('Afterwards, three kids queue up to talk to you.', '演講後，有三個孩子排隊等着跟你說話。') }
        ]
      },
      actions: ['youth', 'rocket', 'dome', 'volunteer', 'family'],
      milestone: t('The kid who was laughed at built a city, and opened its doors to everyone.',
                   '那個被笑的孩子，建了一座城市，然後把門打開給每一個人。')
    },
    {
      age: t('The future (fiction)', '未來篇（虛構）'), title: t('The storm', '風暴'), ap: 3, future: true,
      intro: [t('Years later. The markets crash overnight. A deal you spent a year on falls apart, and the phone goes quiet again.',
                '多年後。市場一夜之間急跌，你花了一年的交易告吹，電話又再安靜下來。')],
      story: {
        text: t('Your team gathers in the office. Someone finally asks: "Do we keep going?"', '團隊在辦公室集合。終於有人問：「我哋仲要唔要繼續？」'),
        opts: [
          { t: t('"We\'ve been here before. We keep going."', '「我哋以前都經歷過，繼續。」'), fx: { dream: 12, energy: -10 },
            r: t('Nobody leaves. Somebody orders noodles for everyone.', '沒有人離開。有人幫大家叫了外賣。') },
          { t: t('Cut costs, protect the team, wait for the turn.', '節省開支、保住團隊，等待轉機。'), fx: { money: 12, family: 5 },
            r: t('Boring decisions. They save the company.', '很悶的決定，但保住了公司。') }
        ]
      },
      mid: {
        after: 1,
        text: t('An old classmate, the one who used to laugh at you, sends a message: "I saw your story. Sorry for back then. Are you hiring?"',
                '一個以前笑過你的舊同學傳來訊息：「我睇到你嘅故事。當年對唔住。你哋請唔請人？」'),
        opts: [
          { t: t('"Come for an interview."', '「嚟面試吧。」'), fx: { impact: 10, family: 5 },
            r: t('People change. You did too.', '人是會變的。你也一樣。') },
          { t: t('"Thanks. I wish you well."', '「多謝你。祝你一切順利。」'), fx: { dream: 8 },
            r: t('You close the chat and smile.', '你關掉對話，笑了一笑。') }
        ]
      },
      actions: ['hospital', 'apartments', 'listing', 'family', 'rest'],
      milestone: t('Storms pass. The ones who stay standing are the ones who learned to fall.', '風暴總會過去。站得住的，都是學會了跌倒的人。')
    },
    {
      age: t('The future (fiction)', '未來篇（虛構）'), title: t('Passing it on', '傳承'), ap: 3, future: true,
      intro: [t('Young founders start knocking on your door, the way you once knocked on everyone else\'s.', '年輕的創業者開始來敲你的門，就像當年你敲每一個人的門。')],
      story: {
        text: t('A 20-year-old with one laptop and a big idea sits across from you. Everyone else told her it was impossible.', '一個 20 歲、只有一部手提電腦和一個大想法的女孩坐在你對面。其他人都說她不可能成功。'),
        opts: [
          { t: t('Invest in her.', '投資她。'), fx: { impact: 12, money: -10, dream: 5 },
            r: t('"Why me?" she asks. "Because someone once bet on me," you say.', '她問：「點解揀我？」你說：「因為當年都有人肯賭我一次。」') },
          { t: t('Teach her to write the plan properly.', '教她把計劃書寫好。'), fx: { impact: 10, energy: -5 },
            r: t('Three weeks later, she raises her first round.', '三個星期後，她完成了第一輪融資。') }
        ]
      },
      actions: ['incubator', 'museum', 'volunteer', 'family', 'rest'],
      milestone: t('The best thing you can build is someone else\'s start.', '你能建造最好的東西，是別人的起點。')
    },
    {
      age: t('The future (fiction)', '未來篇（虛構）'), title: t('Liftoff', '升空'), ap: 3, future: true,
      intro: [t('The whole city gathers by the sea. Tonight, the rocket from your childhood notebook is ready.', '整座城市的人都聚在海邊。今晚，你小時候筆記簿上的那枚火箭準備好了。')],
      story: {
        text: t('Your parents stand next to you. Dad\'s hand is on your shoulder. Mum is already crying.', '爸媽站在你身邊。爸爸的手搭在你的肩上，媽媽已經在哭了。'),
        opts: [
          { t: t('Count down together.', '一起倒數。'), fx: { family: 15, dream: 10 },
            r: t('Ten, nine, eight… the kid who was called a loser is watching his dream go up.', '十、九、八……那個被叫做「廢柴」的孩子，看着自己的夢升空。') },
          { t: t('Hand the button to the youngest founder.', '把按鈕交給最年輕的創業者。'), fx: { impact: 15, dream: 8 },
            r: t('She presses it. The whole city cheers.', '她按下了。整座城市都在歡呼。') }
        ]
      },
      actions: ['stadium', 'station', 'solar', 'family'],
      milestone: t('From a small flat in Hong Kong to a city that launches dreams. And the road keeps going.', '由香港一個小小的家，到一座讓夢想升空的城市。而這條路，還在繼續。')
    }
  ];

  // Free play after the story: one of these each "year", forever
  var FREE = {
    actions: ['park', 'hospital', 'apartments', 'incubator', 'museum', 'station', 'stadium', 'solar', 'listing', 'volunteer', 'family', 'rest'],
    events: [
      { text: t('A typhoon warning goes up. Half the city loses power for a night.', '颱風訊號高掛，半個城市停電一晚。'),
        opts: [{ t: t('Open your buildings as shelters.', '開放大樓做臨時避難所。'), fx: { impact: 12, money: -8 }, r: t('By morning, strangers are sharing breakfast in your lobby.', '天亮時，陌生人在大堂一起吃早餐。') },
               { t: t('Help the repair crews.', '幫手搶修。'), fx: { impact: 8, energy: -15 }, r: t('Lights come back on, street by street.', '燈一條街一條街地亮回來。') }] },
      { text: t('A big company offers to buy everything you have built.', '一間大公司開價收購你建立的一切。'),
        opts: [{ t: t('Sell, and fund ten new founders.', '賣掉，再資助十個新創業者。'), fx: { money: 20, impact: 10, dream: -5 }, r: t('Ten new doors open.', '十道新的門打開了。') },
               { t: t('Say no. Not yet.', '拒絕。還未是時候。'), fx: { dream: 12 }, r: t('Some dreams aren\'t for sale.', '有些夢想是不賣的。') }] },
      { text: t('Your mum asks when you last took a holiday.', '媽媽問你上一次放假是甚麼時候。'),
        opts: [{ t: t('Take the family away for a week.', '帶家人去旅行一星期。'), fx: { family: 15, energy: 30, money: -8 }, r: t('Nobody checks email. Almost nobody.', '沒有人覆電郵。差不多沒有人。') },
               { t: t('Promise next month.', '答應下個月。'), fx: { money: 8, family: -5 }, r: t('She has heard that before.', '這句話她聽過很多次了。') }] },
      { text: t('A breakthrough at the lab: early results look promising.', '實驗室有新突破：初步結果很有希望。'),
        opts: [{ t: t('Stay humble. Run it again.', '保持謙虛，再做一次實驗。'), fx: { dream: 8, impact: 6 }, r: t('It holds up. Then the hard part starts.', '結果站得住。然後，困難的部分才開始。') },
               { t: t('Tell investors right away.', '立即通知投資者。'), fx: { money: 12, dream: -3 }, r: t('Money comes in fast. So do expectations.', '錢來得很快，期望也是。') }] },
      { text: t('A school invites you back. The kids want to hear about failure.', '一間學校邀請你回去。孩子們想聽關於失敗的故事。'),
        opts: [{ t: t('Tell them about the debt.', '講欠債的那段。'), fx: { impact: 12 }, r: t('The quietest kid asks the best question.', '最安靜的孩子問了最好的問題。') },
               { t: t('Tell them about being bullied.', '講被欺負的那段。'), fx: { impact: 10, family: 3 }, r: t('One kid stays behind to say: "Me too."', '一個孩子留下來說：「我都係。」') }] },
      { text: t('A rival copies your best idea and launches first.', '對手抄了你最好的點子，還搶先推出。'),
        opts: [{ t: t('Build something better.', '做一個更好的。'), fx: { dream: 10, energy: -10 }, r: t('Six months later, nobody remembers theirs.', '半年後，已經沒有人記得他們的版本。') },
               { t: t('Call your patent lawyer.', '找專利律師。'), fx: { money: 8, impact: 4 }, r: t('This is what the patents were for.', '專利就是為了這一天。') }] }
    ],
    milestone: t('Another year, another street. The city keeps growing with you.', '又一年，又多一條街。城市跟着你一起成長。')
  };

  // People standing in the city who talk to you (no real names)
  var TALKERS = [
    [{ who: t('Mum', '媽媽'), at: 'home', look: 'mum', line: t('"Don\'t be scared. Mum\'s here."', '「唔使驚，媽媽喺度。」') },
     { who: t('Classmate', '同學'), at: 'school', look: 'kid', line: t('"Oi, loser! Ha ha!"', '「喂，廢柴！哈哈！」') }],
    [{ who: t('Dad', '爸爸'), at: 'home', look: 'dad', line: t('"Business is tough… but if you want to try, go and try."', '「做生意好辛苦㗎……不過你想試，就去試吓啦。」') },
     { who: t('Mum', '媽媽'), at: 'home', look: 'mum', line: t('"Dinner\'s ready. Come and eat."', '「食飯喇！」') }],
    [{ who: t('Man at dinner', '飯局上的人'), at: 'studio', look: 'suitold', line: t('"You\'re a kid. Who would trust you?"', '「咁後生，邊個會信你？」') },
     { who: t('First customer', '第一位客人'), at: 'studio', look: 'woman', line: t('"Your plan is actually interesting."', '「你份計劃書幾有意思喎。」') }],
    [{ who: t('Landlord', '業主'), at: 'store', look: 'suitold', line: t('"Rent is due. No more excuses."', '「租要交喇，唔好再拖。」') },
     { who: t('Old "friend"', '舊「朋友」'), at: 'store', look: 'kid', line: t('"Told you he couldn\'t do it."', '「早就話佢唔得啦。」') },
     { who: t('Mum', '媽媽'), at: 'home', look: 'mum', line: t('"Come home and eat first."', '「返嚟食飯先。」') }],
    [{ who: t('Reporter', '記者'), at: 'factory', look: 'woman', line: t('"Can you tell us how it all started?"', '「可以講吓你點樣開始嗎？」') },
     { who: t('Professor', '教授'), at: 'university', look: 'suitold', line: t('"Science is slow. Don\'t give up on it."', '「科學係慢嘅，但唔好放棄。」') }],
    [{ who: t('Investor', '投資者'), at: 'exchange', look: 'suitold', line: t('"You\'re young. What do you know about capital markets?"', '「你咁後生，識資本市場咩？」') },
     { who: t('Researcher', '研究員'), at: 'btrdcc', look: 'lab', line: t('"AI narrows the search. The lab decides."', '「AI 幫我哋收窄範圍，最後由實驗決定。」') }],
    [{ who: t('Kid in the back row', '最後一排的孩子'), at: 'youth', look: 'kid', line: t('"Can… can I really do it too?"', '「我……真係都得嗎？」') }],
    [{ who: t('Teammate', '團隊成員'), at: 'exchange', look: 'woman', line: t('"Do we keep going?"', '「我哋仲要唔要繼續？」') }],
    [{ who: t('Young founder', '年輕創業者'), at: 'incubator', look: 'woman', line: t('"Can you show me how to write a business plan?"', '「可唔可以教我寫計劃書？」') }],
    [{ who: t('Dad', '爸爸'), at: 'rocket', look: 'dad', line: t('"We\'ve always been proud of you."', '「我哋一直都以你為榮。」') },
     { who: t('Mum', '媽媽'), at: 'rocket', look: 'mum', line: t('"Eat properly up there, OK?"', '「上到去都要食飽飯呀。」') }]
  ];

  var ENDINGS = {
    dream: { title: t('The Dream Architect', '夢想建築師'), text: t('You never stopped drawing rockets. Now other people get to live in your drawings.', '你從來沒有停止畫火箭。現在，別人可以住進你的畫裏。') },
    impact: { title: t('The Changemaker', '改變世界的人'), text: t('Every fall became something you could hand to someone else.', '每一次跌倒，都變成了你可以送給別人的東西。') },
    family: { title: t('The Founder with a Home', '有家可歸的創業家'), text: t('Whatever you built, the best thing was always the light on at home.', '無論建了甚麼，最好的始終是家裏那盞為你留着的燈。') },
    money: { title: t('The Builder', '實幹的建造者'), text: t('You paid back every debt and turned it into foundations.', '你還清了每一筆債，再把它們變成地基。') }
  };

  var UI = {
    title: t('Dreamer\'s Road', '夢想家之路'),
    sub: t('A life-sim inspired by a true story', '根據真實經歷改編的人生模擬遊戲'),
    start: t('Start', '開始'),
    resume: t('Continue', '繼續上次'),
    restart: t('Start over', '重新開始'),
    chapter: t('Chapter', '第'), chapterSuffix: t('', '章'),
    actionsLeft: t('actions left in this chapter', '個行動'), actionsLeftPre: t('', '這一章還有 '),
    next: t('Continue', '繼續'),
    expand: t('Grow the city', '擴展城市'),
    place: t('Tap a glowing plot to build', '點地圖上發光的空地來建造'),
    auto: t('Pick for me', '幫我選'),
    cancel: t('Cancel', '取消'),
    tired: t('Too tired. Rest first.', '太累了，先休息吧。'),
    milestone: t('Milestone', '里程碑'),
    yourPath: t('Your path', '你的人生'),
    built: t('buildings built', '座建築'),
    endNote: t('This game is based on my real life, with some scenes dramatised. I was bullied, I fell into debt, I was laughed at and looked down on. Each time, I chose to get back up. What will your road look like?',
               '這個遊戲根據我的真實經歷改編，部分情節經戲劇化處理。我被欺負過、欠過債、被人笑過、被人看不起過。每一次，我都選擇再站起來。你的路，會是怎樣的？'),
    playAgain: t('Play again', '再玩一次'),
    meet: t('The real story', '認識真實的我'),
    contact: t('Say hello', '聯絡我'),
    share: t('Share', '分享'),
    copied: t('Link copied', '已複製連結'),
    tapHint: t('Tap a building to see its true story', '點一下建築，看看背後的真實故事'),
    pick: t('Choose your character', '選擇你的角色'),
    pickNote: t('Walk around, meet people, and build your life one plot at a time.', '在小島上走動、遇見不同的人，一塊地一塊地建立你的人生。'),
    buildHere: t('Build here', '在這裏建造'),
    walkTo: t('Walk to a glowing plot, or tap one', '走到發光的空地，或直接點一下'),
    keys: t('Move: WASD / arrow keys, or tap the ground', '移動：WASD／方向鍵，或點擊地面'),
    joy: t('Move: joystick, or tap the ground', '移動：搖桿，或點擊地面'),
    view: t('Map view', '全景'),
    follow: t('Follow', '跟隨'),
    freePlay: t('Keep living (free play)', '繼續人生（自由模式）'),
    year: t('Year', '第'), yearSuffix: t('', '年'),
    freeTitle: t('Free play', '自由人生'),
    future: t('The story continues in fiction from here.', '以下是虛構的未來篇。'),
    note: t('About 10 minutes · names are fictional · some scenes are dramatised', '約 10 分鐘 · 名稱均為虛構 · 部分情節經戲劇化處理'),
    shareText: t('I just played the life-sim Dreamer\'s Road.', '我剛玩了人生模擬遊戲《夢想家之路》。')
  };

  // characters to pick from (original designs)
  var LOOKS = [
    { id: 'suit', name: t('The founder', '創業家'), skin: '#f1c7a0', hair: '#1d1a19', top: '#1f3557', bottom: '#2a2d36', shoes: '#1b1b1b', shirt: '#ffffff', glasses: true },
    { id: 'lab', name: t('The scientist', '科研人'), skin: '#f3cdaa', hair: '#2b211c', top: '#f5f6f8', bottom: '#3d5a80', shoes: '#4a4a4a', coat: true, glasses: true },
    { id: 'hoodie', name: t('The dreamer', '追夢少年'), skin: '#e9b98f', hair: '#3a2a20', top: '#d6453d', bottom: '#33507a', shoes: '#f2f2f2', hood: true },
    { id: 'blazer', name: t('The leader', '領袖'), skin: '#f4d0b0', hair: '#2a1b14', top: '#7a2e3b', bottom: '#2a2a33', shoes: '#2a1a1a', longHair: true, skirt: true },
    { id: 'sport', name: t('The runner', '永不放棄'), skin: '#d9a47c', hair: '#151515', top: '#2f9e6a', bottom: '#1f2a24', shoes: '#ffffff', cap: '#c9a35b' },
    { id: 'astro', name: t('The astronaut', '太空人'), skin: '#f1c7a0', hair: '#1d1a19', top: '#eef1f5', bottom: '#eef1f5', shoes: '#9aa3ad', helmet: true }
  ];

  return { FREE: FREE, TALKERS: TALKERS, LOOKS: LOOKS, STATS: STATS, BUILD: BUILD, ACT: ACT, CHAPTERS: CHAPTERS, ENDINGS: ENDINGS, UI: UI };
})();
