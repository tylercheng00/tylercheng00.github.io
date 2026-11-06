/* 《交叉點》Crossroads (交叉點): the story, told as quests across Hong Kong, New York and space.
   Names are generic and some scenes are dramatised. The engine is game.js; the places are in game-worlds.js.
   A step: { type: 'go' | 'build' | 'travel' | 'outdoor', place, label, room, cast, shots, choice, fx }
   A shot: { cam: 'wide' | actor, say: [who, text], pose: { actor: pose }, put: { actor: slot }, fx, t } */
window.GAME_DATA = (function () {
  function t(en, zh) { return { en: en, zh: zh }; }
  var N = t('', '');
  var ME = t('You', '你'), MUM = t('Mum', '媽媽'), DAD = t('Dad', '爸爸');

  var STATS = [
    { k: 'family', icon: '❤️', name: t('Family', '家人') },
    { k: 'dream', icon: '✨', name: t('Dream', '夢想') },
    { k: 'impact', icon: '🌍', name: t('Impact', '影響力') },
    { k: 'money', icon: '💰', name: t('Funds', '資金'), debt: t('Debt', '負債') }
  ];

  var PLACES = {
    home: t('Home', '家'), school: t('School', '學校'), library: t('Library', '圖書館'), rooftop: t('Rooftop', '天台'),
    studio: t('Your first office', '第一間公司'), restaurant: t('Harbour Restaurant', '海景酒家'), harbor: t('The pier', '碼頭'),
    store: t('Your convenience store', '你的便利店'), factory: t('Protection factory', '防護用品廠'), tv: t('TV station', '電視台'),
    university: t('University lab', '大學實驗室'), airport: t('Airport', '機場'),
    nyoffice: t('Dream Tower', '夢想大廈'), nyexchange: t('Stock exchange', '證券交易所'), biolab: t('AI biotech lab', 'AI 生物科技中心'),
    nyschool: t('Public school', '公立學校'), park: t('The park', '公園'), incubator: t('Founders\' hub', '創業中心'), spaceport: t('Spaceport', '太空港'),
    lander: t('Your rocket', '你的火箭'), moonbase: t('Moon base', '月球基地'), flag: t('Flag site', '插旗地點'),
    marshab: t('Mars habitat', '火星基地'), city: t('City site', '城市預定地')
  };
  var NOTES = {
    home: t('A small flat in Hong Kong, where it all started.', '香港一個小小的家，一切的起點。'),
    school: t('Bullied here, and still walked in every morning.', '在這裏被欺負過，但每天都照樣走進校門。'),
    library: t('Where the rockets in your notebook came from.', '筆記簿上的火箭，都是在這裏畫出來的。'),
    rooftop: t('Looking at the stars, wondering how far a person can go.', '望着星星，想一個人可以走多遠。'),
    studio: t('Age 20, one laptop, one idea.', '20 歲，一部手提電腦，一個想法。'),
    store: t('The shop that taught you cash flow the hard way.', '用最痛的方式教會你現金流的店。'),
    factory: t('Better protection, when people needed it most.', '在大家最需要的時候，做出更好的防護。'),
    university: t('Nano-coatings, patents and a second start.', '納米塗層、專利，還有第二次起步。'),
    nyoffice: t('Helping companies reach the US market.', '協助企業走進美國市場。'),
    nyexchange: t('Where a listing becomes real.', '上市成真的地方。'),
    biolab: t('AI-assisted biotech and cancer research.', '結合 AI 的生物科技和癌症研究。'),
    incubator: t('Open the door you once knocked on.', '打開你當年敲過的那道門。')
  };

  var CHAPTERS = [
    /* ---------------- Hong Kong ---------------- */
    { world: 'hk', grow: [-1, 1, -1, 1], age: t('Childhood', '童年'), title: t('Hong Kong', '香港'),
      intro: t('A small flat in Hong Kong. You love staring at the sky and drawing rockets.', '香港，一個小小的家。你最喜歡望着天空，畫火箭。'),
      steps: [
        { type: 'go', place: 'school', room: 'classroom', label: t('Go to school', '去學校'),
          cast: { bully1: 'kid', bully2: 'kid2', bully3: 'kid', kid1: 'kid2', kid2: 'kid' },
          shots: [
            { cam: 'wide', say: [N, t('Break time. The classroom is loud.', '小息，課室裏很吵。')], t: 2.6 },
            { cam: 'bully1', say: [t('Classmate', '同學'), t('"Oi, loser! What\'s with your ugly bag?"', '「喂，廢柴！你個書包好核突呀！」')], pose: { bully1: 'point', bully2: 'laugh', bully3: 'laugh', me: 'sad' }, t: 3 },
            { cam: 'wide', say: [N, t('They throw your bag in the bin. The whole class laughs.', '他們把你的書包丟進垃圾桶。全班都在笑。')], pose: { kid1: 'laugh', kid2: 'laugh', bully1: 'laugh' }, t: 3.2 },
            { cam: 'me', say: [ME, t('"…"', '「……」')], pose: { me: 'cry' }, t: 2.4 }
          ],
          choice: [
            { t: t('Come back tomorrow anyway.', '明天照樣上學。'), fx: { dream: 6 }, r: t('You don\'t run. That stubbornness will save you many times.', '你沒有逃。這份倔強，後來救了你很多次。') },
            { t: t('Go home and tell Mum.', '回家告訴媽媽。'), fx: { family: 8 }, r: t('You walk home with your bag in your arms.', '你抱着書包走回家。') },
            { t: t('Pick up the bag and smile.', '拾起書包，笑一笑。'), fx: { impact: 4, dream: 3 }, r: t('They stop laughing. They don\'t know what to do with a smile.', '他們笑不下去了。他們不知道怎樣對付一個微笑。') }
          ] },
        { type: 'go', place: 'home', room: 'home', label: t('Go home', '回家'),
          cast: { mum: 'mum' },
          shots: [
            { cam: 'wide', say: [N, t('Mum sees your red eyes the moment you walk in.', '你一進門，媽媽就看見你紅了的眼。')], pose: { me: 'sad' }, put: { me: 'stand1', mum: 'stand2' }, t: 2.8 },
            { cam: 'mum', say: [MUM, t('"You did nothing wrong. Mum is always here."', '「你冇做錯。媽媽永遠喺度。」')], pose: { mum: 'hug', me: 'hug' }, t: 3.2 },
            { cam: 'wide', say: [N, t('Dinner tastes better than usual tonight.', '那晚的飯，特別好吃。')], put: { me: 'me', mum: 'mum' }, pose: { me: 'sit', mum: 'sit' }, t: 2.6 }
          ], fx: { family: 6 } },
        { type: 'go', place: 'library', room: 'library', label: t('Go to the library', '去圖書館'),
          cast: { librarian: 'woman', kid1: 'kid2' },
          shots: [
            { cam: 'wide', say: [N, t('You fill your notebook with rockets and cities.', '你在筆記簿上畫滿了火箭和城市。')], pose: { me: 'type' }, t: 2.8 },
            { cam: 'librarian', say: [t('Librarian', '圖書館姨姨'), t('"Lovely drawings. What do you want to be?"', '「畫得好靚喎。你大個想做咩？」')], pose: { librarian: 'talk' }, t: 3 },
            { cam: 'me', say: [ME, t('"I\'ll build a city. Then fly a rocket to space!"', '「我要建一座城市，再坐火箭去太空！」')], pose: { me: 'cheer' }, t: 3 }
          ], fx: { dream: 8 } }
      ],
      milestone: t('Being bullied taught you early: what others think of you is not who you are.', '被欺負的日子很早就教會你：別人怎樣看你，不等於你是誰。') },

    { world: 'hk', grow: [-1, 2, -1, 2], age: t('Teenage years', '少年'), title: t('Home', '家'),
      intro: t('You tell your parents you want to start a business one day.', '你跟爸媽說，將來想自己做生意。'),
      steps: [
        { type: 'go', place: 'home', room: 'home', label: t('Go home for dinner', '回家食飯'),
          cast: { mum: 'mum', dad: 'dad' },
          shots: [
            { cam: 'wide', say: [N, t('Dinner. You finally say it out loud.', '晚飯時，你終於說了出口。')], pose: { me: 'sit', mum: 'sit', dad: 'sit' }, t: 2.6 },
            { cam: 'dad', say: [DAD, t('"Business? Do you know how hard it is out there?"', '「做生意？你知唔知出面幾難？」')], pose: { dad: 'point' }, t: 3 },
            { cam: 'mum', say: [MUM, t('"Your dad is just worried about you."', '「你爸爸只係擔心你。」')], pose: { mum: 'sad' }, t: 2.8 },
            { cam: 'me', say: [ME, t('"I want to try!"', '「我想試吓！」')], pose: { me: 'talk' }, t: 2.4 }
          ],
          choice: [
            { t: t('"I\'ll prove it to you."', '「我會證明畀你哋睇。」'), fx: { dream: 8, family: -4 }, r: t('A door slams. You lie awake, angry and sure.', '房門被大力關上。你一夜沒睡，又氣，又更加肯定。') },
            { t: t('Explain the plan calmly.', '冷靜地解釋你的計劃。'), fx: { family: 6, dream: 3 }, r: t('They don\'t agree. But they listen to the end.', '他們沒有同意，但都聽完了。') }
          ] },
        { type: 'go', place: 'rooftop', room: 'rooftop', label: t('Go up to the rooftop', '上天台'),
          cast: {},
          shots: [
            { cam: 'wide', say: [N, t('That night you climb to the roof alone.', '那晚，你一個人上了天台。')], pose: { me: 'lookup' }, t: 3 },
            { cam: 'me', say: [ME, t('"One day, I\'ll go really far."', '「總有一日，我會去到好遠。」')], pose: { me: 'lookup' }, t: 3 }
          ], fx: { dream: 6 } },
        { type: 'go', place: 'home', room: 'home', label: t('Go home', '回家'),
          cast: { mum: 'mum', dad: 'dad' },
          shots: [
            { cam: 'wide', say: [N, t('Late at night, your parents knock on your door.', '深夜，爸媽敲門進來。')], put: { me: 'door', dad: 'stand1', mum: 'stand2' }, t: 2.6 },
            { cam: 'dad', say: [DAD, t('"We\'re not against you. We\'re just scared you\'ll get hurt. If you want to try, go and try."', '「我哋唔係反對你，只係驚你辛苦。你想做，就去試吓啦。」')], pose: { dad: 'talk' }, t: 4 },
            { cam: 'wide', say: [N, t('Whatever happens next, you know where home is.', '以後無論發生甚麼事，你都知道家在哪裏。')], pose: { me: 'hug', mum: 'hug', dad: 'hug' }, t: 3 }
          ], fx: { family: 10 } }
      ],
      milestone: t('Families argue because they care. Yours became your biggest supporter.', '家人會吵，是因為在乎。你的家，成了你最大的支持。') },

    { world: 'hk', grow: [-2, 2, -2, 2], age: t('Age 20', '20 歲'), title: t('One laptop', '一部手提電腦'),
      intro: t('You\'re 20. One laptop, one idea, and nothing else.', '20 歲。一部手提電腦、一個想法，除此之外甚麼都沒有。'),
      steps: [
        { type: 'build', build: 'studio', label: t('Pick an empty plot for your first office', '揀一塊空地，開你的第一間公司') },
        { type: 'go', place: 'studio', room: 'studio', label: t('Go into your office', '走進你的公司'),
          cast: {},
          shots: [
            { cam: 'wide', say: [N, t('An empty office. One desk is enough.', '空空的辦公室，一張枱已經足夠。')], pose: { me: 'type' }, t: 2.8 },
            { cam: 'me', say: [ME, t('"From today I\'m the boss. And the only staff."', '「由今日開始，我係老闆，亦都係唯一嘅員工。」')], pose: { me: 'type' }, t: 3.2 }
          ],
          choice: [
            { t: t('All in. Full time.', '全職投入，破釜沉舟。'), fx: { dream: 8, money: -10 }, r: t('No safety net. Exactly how you wanted it.', '沒有後路，正合你意。') },
            { t: t('Study and build at the same time.', '一邊讀書，一邊創業。'), fx: { dream: 5, impact: 3 }, r: t('Lectures by day, emails until 3 a.m.', '白天上課，凌晨三點還在回電郵。') }
          ] },
        { type: 'go', place: 'restaurant', room: 'restaurant', label: t('Dinner with "friends"', '去飯局'),
          cast: { laugher: 'suitold', g1: 'woman', g2: 'kid2', g3: 'dad' },
          shots: [
            { cam: 'wide', say: [N, t('A big dinner. Someone asks what you do.', '一個大飯局。有人問你在做甚麼。')], pose: { me: 'sit', laugher: 'sit', g1: 'sit', g2: 'sit', g3: 'sit' }, t: 2.6 },
            { cam: 'laugher', say: [t('Man at dinner', '飯局上的人'), t('"You\'re a kid. Who would ever trust you?"', '「咁後生，邊個會信你？」')], pose: { laugher: 'laugh' }, t: 3 },
            { cam: 'wide', say: [N, t('The whole table laughs. You grip your glass.', '全枱人一起笑。你握緊了手中的杯。')], pose: { g1: 'laugh', g2: 'laugh', g3: 'laugh', me: 'sad' }, t: 3 }
          ],
          choice: [
            { t: t('Laugh along. Results will answer.', '笑吧，結果會說話。'), fx: { dream: 6 }, r: t('You write his words down. You\'ll need them.', '你把那句話記下來。以後會用得着。') },
            { t: t('Go home and rewrite the plan.', '回家，把計劃書改到最好。'), fx: { money: 8, impact: 3 }, r: t('By sunrise, the plan is twice as good.', '天亮時，計劃書好了一倍。') }
          ] },
        { type: 'build', build: 'harbor', label: t('Take the business overseas: build a pier', '把生意帶出海外：建一個碼頭') },
        { type: 'outdoor', place: 'harbor', label: t('Go to the pier', '去碼頭'), cast: { worker: ['suitold', [2.2, 3.8], Math.PI] }, me: [0, 3.8, Math.PI],
          shots: [
            { cam: 'wide', say: [N, t('At 22, your first shipment leaves for another country.', '22 歲，第一批貨運往其他國家。')], pose: { me: 'wave', worker: 'wave' }, t: 3.4 },
            { cam: 'me', say: [ME, t('"This is only the start."', '「呢個只係開始。」')], pose: { me: 'cheer' }, t: 2.6 }
          ], fx: { impact: 8, money: 15 } }
      ],
      milestone: t('By 22, the business had reached other countries. The people who laughed went quiet.', '22 歲，生意已經走到其他國家。當年笑你的人，安靜了。') },

    { world: 'hk', grow: [-2, 3, -2, 3], age: t('The fall', '跌倒'), title: t('Debt', '欠債'),
      intro: t('Things are going well. Maybe too well. You decide to open a convenience store.', '一切看起來很順利，也許太順利了。你決定開一間便利店。'),
      steps: [
        { type: 'build', build: 'store', label: t('Open a convenience store', '開一間便利店') },
        { type: 'go', place: 'store', room: 'store', label: t('Go to your store', '去你的便利店'), fx: { money: -40 },
          cast: { landlord: 'suitold', friend: 'kid' },
          shots: [
            { cam: 'wide', say: [N, t('Rent, stock, wages… the bills pile up on the counter.', '租金、貨款、人工……帳單堆滿了櫃台。')], pose: { me: 'think' }, t: 3 },
            { cam: 'landlord', say: [t('Landlord', '業主'), t('"Rent is due. No more excuses."', '「租要交喇，唔好再拖。」')], pose: { landlord: 'point' }, t: 3 },
            { cam: 'friend', say: [t('Old "friend"', '舊「朋友」'), t('"Told you he couldn\'t do it."', '「早就話佢唔得啦。」')], pose: { friend: 'laugh' }, t: 2.8 },
            { cam: 'me', say: [N, t('The account goes negative. At 3 a.m. you sit by the door, not knowing who to call.', '戶口變成負數。凌晨三點，你坐在店門口，不知道可以打給誰。')], pose: { me: 'sad' }, t: 3.6 }
          ],
          choice: [
            { t: t('Call home.', '打電話回家。'), fx: { family: 10 }, r: t('Mum says only: "Come home and eat first."', '電話那頭，媽媽只說了一句：「返嚟食飯先。」') },
            { t: t('Carry it alone.', '一個人扛。'), fx: { dream: 4 }, r: t('You carry it alone for a long time. Later you learn your parents were waiting for you to ask.', '你一個人扛了很久。後來才知道，爸媽一直在等你開口。') }
          ] },
        { type: 'go', place: 'home', room: 'home', label: t('Go home', '回家'),
          cast: { mum: 'mum', dad: 'dad' },
          shots: [
            { cam: 'wide', say: [N, t('A hot meal is waiting on the table.', '飯枱上，熱騰騰的飯菜在等你。')], pose: { me: 'sit', mum: 'sit', dad: 'sit' }, t: 2.6 },
            { cam: 'dad', say: [DAD, t('"Money can be earned again. You\'re what matters."', '「錢可以再搵，你冇事就得。」')], pose: { dad: 'talk' }, t: 3.2 },
            { cam: 'mum', say: [MUM, t('"Eat first. We\'ll figure it out together."', '「食飽先，我哋一齊諗辦法。」')], pose: { mum: 'talk' }, t: 3 }
          ], fx: { family: 10, money: 15 } }
      ],
      milestone: t('Falling wasn\'t the end. You learned cash flow, humility, and that home would always catch you.', '跌倒不是終點。你學會了現金流、學會了低頭，也知道家永遠會接住你。') },

    { world: 'hk', grow: [-3, 3, -3, 3], age: t('Getting back up', '重新站起'), title: t('Science', '科研'),
      intro: t('Then the pandemic. People need better protection.', '然後，疫情來了。大家需要更好的防護。'),
      steps: [
        { type: 'build', build: 'factory', label: t('Build a protection factory', '建一間防護用品廠') },
        { type: 'go', place: 'factory', room: 'factory', label: t('Go into the factory', '走進工廠'),
          cast: { w1: 'lab', w2: 'woman', w3: 'kid2', team: 'dad' },
          shots: [
            { cam: 'wide', say: [N, t('Day and night, the lines keep running.', '日日夜夜，生產線沒有停過。')], t: 3 },
            { cam: 'team', say: [t('Teammate', '團隊'), t('"Together, we protect everyone!"', '「我哋一齊守護大家！」')], pose: { team: 'cheer', me: 'cheer', w3: 'clap', w1: 'clap' }, t: 3 }
          ], fx: { impact: 10, money: 15 } },
        { type: 'go', place: 'tv', room: 'tvstudio', label: t('TV interview at the station', '去電視台接受訪問'),
          cast: { host: 'woman', crew: 'kid2' },
          shots: [
            { cam: 'wide', say: [N, t('Studio lights. Cameras rolling.', '攝影棚燈光亮起，鏡頭開始拍攝。')], t: 2.4 },
            { cam: 'host', say: [t('Host', '主持'), t('"Tell us how it all started."', '「可以講吓你點樣開始嗎？」')], pose: { host: 'talk' }, t: 3 },
            { cam: 'me', say: [N, t('You think of everyone who laughed.', '你想起每一個笑過你的人。')], pose: { me: 'talk' }, t: 2.8 }
          ],
          choice: [
            { t: t('Tell the real story, debt and all.', '講真話，包括欠債的那段。'), fx: { impact: 10 }, r: t('Strangers write afterwards: "Thank you. I needed that."', '節目播出後，有陌生人留言：「多謝你，我需要聽到這些。」') },
            { t: t('Talk about the product and the team.', '專心講產品和團隊。'), fx: { impact: 6, money: 10 }, r: t('Orders come in the next morning.', '第二天早上，訂單來了。') }
          ] },
        { type: 'go', place: 'university', room: 'lab', label: t('Go to the university lab', '去大學實驗室'),
          cast: { prof: 'suitold', sci1: 'lab', sci2: 'woman' },
          shots: [
            { cam: 'prof', say: [t('Professor', '教授'), t('"The nano-coating results look promising."', '「納米塗層嘅結果好有希望。」')], pose: { prof: 'talk' }, t: 3 },
            { cam: 'wide', say: [N, t('You co-found a nanotech company. Your patents are granted.', '你聯合創辦了一間納米科技公司，專利獲得授權。')], pose: { sci1: 'clap', sci2: 'clap', me: 'cheer' }, fx: 'confetti', t: 3.4 },
            { cam: 'me', say: [N, t('Then the call: your company wins an innovation award.', '然後電話響起：公司獲得了創新大獎。')], pose: { me: 'phone' }, t: 3 }
          ], fx: { impact: 12, dream: 6 } }
      ],
      milestone: t('From a debt-ridden shop to granted patents. Science gave you a second start.', '由欠債的小店，到獲授權的專利。科研給了你第二次起步。') },

    /* ---------------- New York ---------------- */
    { world: 'ny', age: t('Two worlds', '兩個世界'), title: t('New York', '紐約'),
      intro: t('A new chapter, on the other side of the world.', '新的篇章，在地球的另一邊。'),
      steps: [
        { type: 'travel', from: 'hk', place: 'airport', to: 'ny', via: 'flight', label: t('Go to the airport and fly to New York', '去機場，飛往紐約') },
        { type: 'go', place: 'nyoffice', room: 'meeting', label: t('Meeting in Dream Tower', '去夢想大廈開會'),
          cast: { inv1: 'suitold', inv2: 'woman', inv3: 'dad', team: 'kid2' },
          shots: [
            { cam: 'wide', say: [N, t('Your first big meeting in New York.', '你在紐約的第一個大會議。')], pose: { inv1: 'sit', inv2: 'sit', inv3: 'sit', team: 'sit' }, t: 2.6 },
            { cam: 'inv1', say: [t('Investor', '投資者'), t('"You\'re young. What do you know about capital markets?"', '「你咁後生，識資本市場咩？」')], pose: { inv1: 'talk' }, t: 3.2 }
          ],
          choice: [
            { t: t('Open the numbers. Walk through every page.', '打開數據，一頁一頁講。'), fx: { impact: 8, money: 10 }, r: t('An hour later, he\'s the one taking notes.', '一小時後，抄筆記的人變成了他。') },
            { t: t('"Let me tell you where I started."', '「讓我先講講我是怎樣開始的。」'), fx: { impact: 6, dream: 6 }, r: t('The laptop, the debt, the store. The room goes quiet.', '手提電腦、欠債、便利店。會議室安靜下來。') }
          ] },
        { type: 'go', place: 'biolab', room: 'lab', label: t('Visit the AI biotech lab', '參觀 AI 生物科技中心'),
          cast: { sci1: 'lab', sci2: 'woman', prof: 'dad' },
          shots: [
            { cam: 'sci1', say: [t('Researcher', '研究員'), t('"AI narrows the search. The lab decides."', '「AI 幫我哋收窄範圍，最後由實驗決定。」')], pose: { sci1: 'talk' }, t: 3.2 },
            { cam: 'me', say: [ME, t('"Then let\'s aim it at cancer."', '「咁就對準癌症啦。」')], pose: { me: 'point' }, t: 2.8 }
          ], fx: { impact: 8, dream: 8 } }
      ],
      milestone: t('Capital markets on one side, science on the other. You learned both languages.', '一邊是資本市場，一邊是科研。你學會了兩種語言。') },

    { world: 'ny', age: t('Ring the bell', '敲鐘'), title: t('Listing day', '上市成功'),
      intro: t('A company you helped for two years is about to list.', '一間你協助了兩年的企業，準備上市。'),
      steps: [
        { type: 'go', place: 'nyoffice', room: 'nyoffice', label: t('Final night in the office', '上市前夜，回到辦公室'),
          cast: { p1: 'woman', p2: 'kid2', p3: 'lab', boss: 'suitold' },
          shots: [
            { cam: 'wide', say: [N, t('Countless all-nighters. One last check of every page.', '無數個通宵。最後一次檢查每一頁文件。')], pose: { me: 'type', p1: 'type', p2: 'type', p3: 'type' }, t: 3 },
            { cam: 'boss', say: [t('Client CEO', '客戶 CEO'), t('"We couldn\'t have done this without you."', '「冇你哋，我哋做唔到。」')], pose: { boss: 'talk' }, t: 3 }
          ] },
        { type: 'go', place: 'nyexchange', room: 'exchange', label: t('Go to the stock exchange', '去證券交易所'),
          cast: { vip: 'suitold', host: 'woman', c1: 'kid2', c3: 'lab', c4: 'woman', c5: 'kid' },
          shots: [
            { cam: 'wide', say: [N, t('The trading floor goes quiet. Everyone looks at the bell.', '交易大堂安靜下來，所有人望着那個鐘。')], put: { me: 'c2' }, t: 3 },
            { cam: 'vip', say: [t('Client CEO', '客戶 CEO'), t('"Three, two, one…"', '「三、二、一……」')], pose: { vip: 'bell' }, t: 3 },
            { cam: 'wide', say: [N, t('The bell rings. The ticker turns green. The floor erupts.', '鐘聲響起，股價變綠，全場歡呼。')], pose: { c1: 'cheer', c3: 'cheer', c4: 'clap', c5: 'cheer', me: 'cheer', host: 'clap', vip: 'cheer' }, fx: 'confetti', t: 3.6 }
          ],
          choice: [
            { t: t('Celebrate with the team.', '和團隊一起慶祝。'), fx: { impact: 10, money: 12 }, r: t('Someone opens champagne. You remember the empty office.', '有人開香檳。你想起那間空空的辦公室。') },
            { t: t('Step outside and call your parents.', '走出去，打電話給爸媽。'), fx: { family: 12 }, r: t('"We saw it on the news," Dad says. His voice shakes a little.', '爸爸說：「我哋喺新聞見到喇。」他的聲音有點抖。') }
          ] }
      ],
      milestone: t('The bell rang for them. Part of it rang for every person who once said no.', '鐘聲為他們而響，也為每一個曾經說「不」的人而響。') },

    { world: 'ny', age: t('Giving back', '回饋'), title: t('The kid in the back row', '最後一排的孩子'),
      intro: t('A school invites you to speak.', '一間學校邀請你去演講。'),
      steps: [
        { type: 'go', place: 'nyschool', room: 'talk', label: t('Give a talk at the school', '到學校演講'),
          cast: { a1: 'kid', a2: 'kid2', a3: 'kid', a4: 'kid2', kid: 'kid', host: 'woman' },
          shots: [
            { cam: 'wide', say: [N, t('A hall full of students.', '禮堂坐滿了學生。')], pose: { me: 'talk', a1: 'sit', a2: 'sit', a3: 'sit', a4: 'sit' }, t: 2.6 },
            { cam: 'kid', say: [N, t('In the back row, a kid sits with his head down. He looks a lot like you once did.', '最後一排，一個孩子低着頭，很像當年的你。')], pose: { kid: 'sad' }, t: 3.4 }
          ],
          choice: [
            { t: t('Walk down and tell him: "You can do this."', '走下台，跟他說：「你可以的。」'), fx: { impact: 10, family: 3 }, r: t('He looks up. That\'s enough.', '他抬起了頭。這樣就夠了。') },
            { t: t('Tell the whole hall about being bullied.', '向全場講出被欺負的故事。'), fx: { impact: 8, dream: 6 }, r: t('Afterwards, three kids queue to talk to you.', '演講後，有三個孩子排隊等着跟你說話。') }
          ] }
      ],
      milestone: t('The kid who was laughed at now tells other kids they can.', '那個被笑的孩子，現在告訴其他孩子：你們可以的。') },

    { world: 'ny', age: t('Years later', '多年後'), title: t('The storm', '風暴'),
      intro: t('The markets crash overnight. A deal you spent a year on falls apart.', '市場一夜之間急跌，你花了一年的交易告吹。'),
      steps: [
        { type: 'go', place: 'nyoffice', room: 'meeting', label: t('Emergency team meeting', '團隊緊急會議'),
          cast: { inv1: 'kid2', inv2: 'woman', inv3: 'lab', team: 'dad' },
          shots: [
            { cam: 'wide', say: [N, t('Nobody touches the coffee.', '沒有人碰過桌上的咖啡。')], pose: { inv1: 'sit', inv2: 'sit', inv3: 'sit', team: 'sit' }, t: 2.6 },
            { cam: 'inv2', say: [t('Teammate', '團隊成員'), t('"Do we keep going?"', '「我哋仲要唔要繼續？」')], pose: { inv2: 'talk' }, t: 2.8 }
          ],
          choice: [
            { t: t('"We\'ve been here before. We keep going."', '「我哋以前都經歷過，繼續。」'), fx: { dream: 8 }, r: t('Nobody leaves. Someone orders noodles for everyone.', '沒有人離開。有人幫大家叫了外賣。') },
            { t: t('Cut costs, protect the team, wait for the turn.', '節省開支、保住團隊，等待轉機。'), fx: { money: 12, family: 3 }, r: t('Boring decisions. They save the company.', '很悶的決定，但保住了公司。') }
          ] }
      ],
      milestone: t('Storms pass. The ones still standing learned how to fall.', '風暴總會過去。站得住的，都是學會了跌倒的人。') },

    { world: 'ny', age: t('Love', '愛'), title: t('The wedding', '婚禮'),
      intro: t('In the middle of everything, you found someone who believes in you too.', '在一切之中，你遇到了一個同樣相信你的人。'),
      steps: [
        { type: 'outdoor', place: 'park', label: t('Go to the park: it\'s your wedding day', '去公園：今天是你的婚禮'),
          cast: { partner: ['partner', [0.6, 3.4], Math.PI], mum: ['mum', [-2.0, 5.6], Math.PI], dad: ['dad', [-1.2, 5.8], Math.PI], g1: ['woman', [1.6, 5.8], Math.PI], g2: ['kid2', [2.4, 5.6], Math.PI], officiant: ['suitold', [0, 1.9], 0] },
          me: [-0.6, 3.4, Math.PI],
          shots: [
            { cam: 'wide', say: [N, t('Family and friends under the white arch.', '家人和朋友，聚在白色拱門下。')], pose: { mum: 'clap', g1: 'clap' }, t: 3 },
            { cam: 'officiant', say: [t('Officiant', '證婚人'), t('"Do you promise to keep dreaming, together?"', '「你們願意一起繼續追夢嗎？」')], pose: { officiant: 'talk' }, t: 3.2 },
            { cam: 'me', say: [ME, t('"I do."', '「我願意。」')], pose: { me: 'hug', partner: 'hug' }, t: 2.6 },
            { cam: 'wide', say: [N, t('Mum cries. Dad pretends he isn\'t.', '媽媽哭了。爸爸假裝沒有。')], pose: { mum: 'cry', dad: 'clap', g1: 'cheer', g2: 'cheer', me: 'dance', partner: 'dance' }, fx: 'confetti', t: 3.6 }
          ], fx: { family: 15 } }
      ],
      milestone: t('Two dreamers now. The road is wider.', '現在是兩個追夢的人。路，更寬了。') },

    { world: 'ny', age: t('Passing it on', '傳承'), title: t('The next founder', '下一個創業者'),
      intro: t('Young founders start knocking on your door, the way you once did.', '年輕的創業者開始來敲你的門，就像當年的你。'),
      steps: [
        { type: 'go', place: 'incubator', room: 'incubator', label: t('Go to the founders\' hub', '去創業中心'),
          cast: { boss: 'woman', p1: 'kid2', p2: 'kid', p3: 'lab' },
          shots: [
            { cam: 'boss', say: [t('Young founder', '年輕創業者'), t('"I\'m 20. I have one laptop. Everyone says it\'s impossible."', '「我 20 歲，得一部手提電腦。人人都話冇可能。」')], pose: { boss: 'talk', p1: 'type', p2: 'type', p3: 'type' }, t: 3.4 },
            { cam: 'me', say: [ME, t('"I know exactly how that feels."', '「我完全明白嗰種感覺。」')], pose: { me: 'talk' }, t: 2.8 }
          ],
          choice: [
            { t: t('Invest in her.', '投資她。'), fx: { impact: 10, money: -8 }, r: t('"Why me?" "Because someone once bet on me."', '「點解揀我？」「因為當年都有人肯賭我一次。」') },
            { t: t('Teach her to write the plan.', '教她把計劃書寫好。'), fx: { impact: 8, dream: 4 }, r: t('Three weeks later, she raises her first round.', '三個星期後，她完成了第一輪融資。') }
          ] }
      ],
      milestone: t('The best thing you can build is someone else\'s start.', '你能建造最好的東西，是別人的起點。') },

    { world: 'ny', age: t('The dream', '夢想'), title: t('Liftoff', '升空'),
      intro: t('The rocket from your childhood notebook is ready.', '你小時候筆記簿上的那枚火箭，準備好了。'),
      steps: [
        { type: 'outdoor', place: 'spaceport', label: t('Go to the spaceport', '去太空港'),
          cast: { mum: ['mum', [-1.6, 4.4], Math.PI], dad: ['dad', [-0.8, 4.6], Math.PI], partner: ['partner', [1.6, 4.4], Math.PI], kid: ['kid', [2.4, 4.6], Math.PI] },
          me: [0.4, 3.8, Math.PI],
          shots: [
            { cam: 'wide', say: [N, t('Your family came to see you off.', '家人都來送你。')], pose: { mum: 'wave', kid: 'wave' }, t: 2.8 },
            { cam: 'dad', say: [DAD, t('"We\'ve always been proud of you."', '「我哋一直都以你為榮。」')], pose: { dad: 'talk' }, t: 3 },
            { cam: 'mum', say: [MUM, t('"Eat properly up there, OK?"', '「上到去都要食飽飯呀。」')], pose: { mum: 'cry' }, t: 2.8 }
          ],
          choice: [
            { t: t('Count down together.', '一起倒數。'), fx: { family: 8, dream: 8 }, r: t('Ten, nine, eight… the kid called a loser is going to space.', '十、九、八……那個被叫做「廢柴」的孩子，要上太空了。') },
            { t: t('Salute, and climb aboard.', '敬一個禮，登上火箭。'), fx: { dream: 12 }, r: t('The hatch closes. The engines start to roar.', '艙門關上，引擎開始咆哮。') }
          ] },
        { type: 'travel', from: 'ny', place: 'spaceport', to: 'moon', via: 'moon', label: t('Launch!', '發射！'), launch: true }
      ],
      milestone: t('Leaving Earth with everyone you love watching.', '在所有愛你的人注視下，離開地球。') },

    /* ---------------- Space ---------------- */
    { world: 'moon', age: t('The Moon', '月球'), title: t('One small step', '一小步'),
      intro: t('Grey dust, black sky, and the Earth hanging above you. Try jumping!', '灰色的塵土、黑色的天空，地球就掛在頭頂。試試跳起來！'),
      steps: [
        { type: 'outdoor', place: 'flag', label: t('Plant the flag at the glowing ring', '到發光的圓圈插旗'), cast: {}, me: [0.8, 0.6, Math.PI],
          shots: [
            { cam: 'wide', say: [N, t('You plant the flag of every dreamer.', '你插上了屬於所有追夢者的旗。')], fx: 'flag', pose: { me: 'salute' }, t: 3.4 },
            { cam: 'me', say: [ME, t('"Mum, Dad… I made it."', '「爸、媽……我做到了。」')], pose: { me: 'lookup' }, t: 3 }
          ], fx: { dream: 12 } },
        { type: 'go', place: 'moonbase', room: 'moonbase', label: t('Go to the moon base', '去月球基地'),
          cast: { crew: 'astro' },
          shots: [
            { cam: 'wide', say: [N, t('A video call to Earth.', '你和地球視像通話。')], pose: { me: 'phone' }, t: 2.6 },
            { cam: 'me', say: [MUM, t('"Have you eaten?"', '「食咗飯未呀？」')], pose: { me: 'laugh' }, t: 2.8 },
            { cam: 'crew', say: [t('Crew', '隊員'), t('"Next stop: Mars."', '「下一站：火星。」')], pose: { crew: 'point' }, t: 2.6 }
          ], fx: { family: 8 } },
        { type: 'travel', from: 'moon', place: 'lander', to: 'mars', via: 'mars', label: t('Back to the rocket: on to Mars', '回到火箭：出發去火星') }
      ],
      milestone: t('The Moon was the first drawing in your notebook. Now there\'s a footprint on it.', '月球是你筆記簿上第一幅畫。現在，上面有了你的腳印。') },

    { world: 'mars', age: t('Mars', '火星'), title: t('City of dreams', '夢想之城'),
      intro: t('Red sky, red sand. Somewhere here, a city is waiting to be built.', '紅色的天空，紅色的沙。這裏有一座城市等着被建造。'),
      steps: [
        { type: 'go', place: 'marshab', room: 'marshab', label: t('Go into the Mars habitat', '走進火星基地'),
          cast: { crew: 'astro', kid: 'kid' },
          shots: [
            { cam: 'wide', say: [N, t('The first greenhouse on Mars. The first leaves.', '火星上第一個溫室，第一片葉。')], t: 2.8 },
            { cam: 'kid', say: [t('Kid', '孩子'), t('"When I grow up, I want to build a city too!"', '「我大個都要建一座城市！」')], pose: { kid: 'cheer' }, t: 3 },
            { cam: 'me', say: [ME, t('"Then let\'s build it together."', '「咁我哋一齊建。」')], pose: { me: 'talk' }, t: 2.6 }
          ], fx: { impact: 10 } },
        { type: 'outdoor', place: 'city', label: t('Go to the city site', '去城市預定地'), cast: { crew: ['astro', [1.6, 1.2], Math.PI], kid: ['kid', [-1.4, 1.4], Math.PI] }, me: [0, 1.6, Math.PI],
          shots: [
            { cam: 'wide', say: [N, t('"I don\'t just want to build a city. I want to build a future."', '「我不只想建造一座城市，我想建造一個未來。」')], fx: 'city', pose: { me: 'cheer', kid: 'cheer', crew: 'clap' }, t: 4.4 },
            { cam: 'me', say: [N, t('From a small flat in Hong Kong, to a city on Mars.', '由香港一個小小的家，到火星上的一座城市。')], pose: { me: 'lookup' }, t: 3.4 }
          ], fx: { dream: 15, impact: 10 } }
      ],
      milestone: t('The kid who was laughed at built a city, and opened its doors to everyone.', '那個被笑的孩子，建了一座城市，然後把門打開給每一個人。') }
  ];

  var ENDINGS = {
    dream: { title: t('The Dream Architect', '夢想建築師'), text: t('You never stopped drawing rockets. Now other people live in your drawings.', '你從來沒有停止畫火箭。現在，別人住進了你的畫裏。') },
    impact: { title: t('The Changemaker', '改變世界的人'), text: t('Every fall became something you could hand to someone else.', '每一次跌倒，都變成了你可以送給別人的東西。') },
    family: { title: t('The Founder with a Home', '有家可歸的創業家'), text: t('Whatever you built, the best thing was always the light on at home.', '無論建了甚麼，最好的始終是家裏那盞為你留着的燈。') },
    money: { title: t('The Builder', '實幹的建造者'), text: t('You paid back every debt and turned it into foundations.', '你還清了每一筆債，再把它們變成地基。') }
  };

  var LOOKS = [
    { id: 'suit', name: t('The founder', '創業家'), skin: '#f1c7a0', hair: '#1d1a19', top: '#1f3557', bottom: '#23262e', shoes: '#141414', shirt: '#ffffff', tie: '#1f3d63', jacket: true, glasses: true, side: true },
    { id: 'lab', name: t('The scientist', '科研人'), skin: '#f3cdaa', hair: '#2b211c', top: '#f5f6f8', bottom: '#3d5a80', shoes: '#4a4a4a', coat: true, glasses: true },
    { id: 'hoodie', name: t('The dreamer', '追夢少年'), skin: '#e9b98f', hair: '#3a2a20', top: '#d6453d', bottom: '#33507a', shoes: '#f2f2f2', hood: true, side: true },
    { id: 'blazer', name: t('The leader', '領袖'), skin: '#f4d0b0', hair: '#2a1b14', top: '#7a2e3b', bottom: '#2a2a33', shoes: '#2a1a1a', longHair: true, skirt: true, jacket: true, shirt: '#ffffff', tie: '#7a2e3b' },
    { id: 'sport', name: t('The runner', '永不放棄'), skin: '#d9a47c', hair: '#151515', top: '#2f9e6a', bottom: '#1f2a24', shoes: '#ffffff', cap: '#c9a35b', short: true },
    { id: 'astro', name: t('The astronaut', '太空人'), skin: '#f1c7a0', hair: '#1d1a19', top: '#eef1f5', bottom: '#eef1f5', shoes: '#9aa3ad', helmet: true }
  ];

  var UI = {
    title: t('Crossroads', '交叉點'),
    sub: t('A 3D life adventure from Hong Kong to Mars', '由香港到火星的 3D 人生冒險'),
    note: t('About 15 minutes · names are fictional', '約 15 分鐘 · 名稱均為虛構'),
    start: t('Start', '開始'), resume: t('Continue', '繼續上次'), restart: t('Start over', '重新開始'),
    chapter: t('Chapter', '第'), chapterSuffix: t('', '章'),
    next: t('Continue', '繼續'), skip: t('Skip', '跳過'),
    goal: t('Goal', '目標'), enter: t('Enter', '進入'), leave: t('Leave', '離開'),
    buildHere: t('Build here', '在這裏建造'), auto: t('Pick for me', '幫我選'),
    walkTo: t('Walk to a glowing plot, or tap one', '走到發光的空地，或直接點一下'),
    milestone: t('Milestone', '里程碑'),
    nextChapter: t('Next chapter', '下一章'),
    yourPath: t('Your path', '你的人生'),
    endNote: t('This game is based on my life. I was bullied, I fell into debt, I was laughed at and looked down on. Each time, I chose to get back up. What will your road look like?',
               '這個遊戲根據我的人生改編。我被欺負過、欠過債、被人笑過、被人看不起過。每一次，我都選擇再站起來。你的路，會是怎樣的？'),
    playAgain: t('Play again', '再玩一次'), meet: t('The real story', '認識真實的我'), contact: t('Say hello', '聯絡我'),
    share: t('Share', '分享'), copied: t('Link copied', '已複製連結'),
    freeRoam: t('Free roam: visit any world', '自由探索：隨意前往各地'),
    worlds: { hk: t('Hong Kong', '香港'), ny: t('New York', '紐約'), moon: t('Moon', '月球'), mars: t('Mars', '火星') },
    pick: t('Choose your character', '選擇你的角色'),
    pickNote: t('Walk the streets, step inside, meet people, and fly all the way to Mars.', '走在街上、走進建築、遇見不同的人，一直飛到火星。'),
    keys: t('Move: WASD / arrows · Jump: Space · Look: drag', '移動：WASD／方向鍵 · 跳：空白鍵 · 轉鏡頭：拖動'),
    joy: t('Move: joystick · Look: drag', '移動：搖桿 · 轉鏡頭：拖動畫面'),
    jump: t('Jump', '跳'),
    view: t('Map view', '全景'), follow: t('Follow', '跟隨'),
    travelling: t('Travelling…', '旅程中……'),
    shareText: t('I just played Crossroads, a life adventure from Hong Kong to Mars.', '我剛玩了《交叉點》，一場由香港到火星的人生冒險。')
  };

  return { STATS: STATS, PLACES: PLACES, NOTES: NOTES, CHAPTERS: CHAPTERS, ENDINGS: ENDINGS, LOOKS: LOOKS, UI: UI };
})();
