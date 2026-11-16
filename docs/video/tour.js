// Records a guided tour of the app on a phone viewport, with Hebrew captions and a visible "finger".
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = 'file:///home/user/Dana-s-financial-/app/index.html?role=client&month=2026-11';
const UPLOADS = '/root/.claude/uploads/07bce9d0-7197-5903-863b-da0f1788dea8';
const OUT = path.join(__dirname, 'tour');

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    locale: 'he-IL',
  });
  const p = await ctx.newPage();
  fs.mkdirSync(OUT, { recursive: true });
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(OUT, `f${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (_) {}
  });
  p.on('dialog', (d) => d.accept());
  p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await p.goto(APP);
  await p.evaluate(() => document.fonts.ready);

  await p.addStyleTag({ content: `
    #tourCap { position: fixed; z-index: 9999; left: 14px; right: 14px; top: 70px; pointer-events: none;
      background: rgba(51,36,31,.93); color: #fff; border-radius: 20px; padding: 16px 20px 17px;
      font: 400 19px/1.5 Assistant, sans-serif; text-align: right; direction: rtl;
      box-shadow: 0 18px 40px -16px rgba(0,0,0,.5); transition: opacity .35s, transform .35s; }
    #tourCap.bottom { top: auto; bottom: 150px; }
    #tourCap[popover] { margin: 0; bottom: auto; width: auto; height: auto; border: none; overflow: visible; }
    #tourCap.bottom[popover] { top: auto; bottom: 150px; }
    #finger[popover] { padding: 0; right: auto; bottom: auto; overflow: visible; }
    #tourCap.hide { opacity: 0; transform: translateY(-8px); }
    #tourCap b { color: #F1D9CF; font-weight: 600; }
    #tourCap small { display: block; font-size: 15px; opacity: .8; margin-top: 4px; }
    #tourStep { display: inline-block; font: 500 13px Jost, sans-serif; color: #F1D9CF; margin-bottom: 4px; letter-spacing: .04em; }
    #finger { position: fixed; z-index: 10000; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
      background: rgba(178,140,127,.35); border: 2px solid rgba(255,255,255,.95); box-shadow: 0 4px 14px rgba(0,0,0,.25);
      pointer-events: none; opacity: 0; transition: left .7s cubic-bezier(.16,1,.3,1), top .7s cubic-bezier(.16,1,.3,1), opacity .3s, transform .15s; }
    #finger.tap { transform: scale(.75); background: rgba(138,101,87,.6); }
    #card { position: fixed; inset: 0; z-index: 10001; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 26px; padding: 40px; text-align: center; direction: rtl; color: #fff;
      background: linear-gradient(160deg, #B9958A 0%, #B28C7F 45%, #A07C70 100%); transition: opacity .6s; }
    #card img { width: 250px; filter: brightness(0) invert(1); }
    #card h1 { font: 300 30px/1.35 Assistant, sans-serif; margin: 0; }
    #card p { font: 400 19px/1.6 Assistant, sans-serif; margin: 0; opacity: .92; }
    #card ol { font: 400 18px/1.7 Assistant, sans-serif; text-align: right; margin: 0; padding-right: 22px; }
  `});
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await p.evaluate(() => {
    const c = document.createElement('div'); c.id = 'tourCap'; c.className = 'hide'; c.popover = 'manual'; document.body.appendChild(c);
    const f = document.createElement('div'); f.id = 'finger'; f.style.left = '195px'; f.style.top = '600px'; f.popover = 'manual'; document.body.appendChild(f);
    c.showPopover(); f.showPopover();
  });

  const wait = (ms) => p.waitForTimeout(ms);
  let step = 0;
  // Re-enter the top layer so captions and the finger stay above an open <dialog>.
  const raise = () => p.evaluate(() => ['tourCap', 'finger'].forEach((id) => { const el = document.getElementById(id); el.hidePopover(); el.showPopover(); }));
  async function cap(html, ms = 3500, opts = {}) {
    step++; await raise();
    await p.evaluate(({ html, bottom, label }) => {
      const c = document.getElementById('tourCap');
      c.classList.add('hide');
      setTimeout(() => { c.innerHTML = (label ? `<span id="tourStep">${label}</span><br>` : '') + html; c.classList.toggle('bottom', !!bottom); c.classList.remove('hide'); }, 250);
    }, { html, bottom: opts.bottom, label: opts.label });
    await wait(ms + 250);
  }
  const hideCap = () => p.evaluate(() => document.getElementById('tourCap').classList.add('hide'));
  async function card(inner, ms) {
    await p.evaluate((inner) => {
      let k = document.getElementById('card');
      if (!k) { k = document.createElement('div'); k.id = 'card'; document.body.appendChild(k); }
      k.innerHTML = inner; k.style.opacity = 1; k.style.display = 'flex';
    }, inner);
    await wait(ms);
    await p.evaluate(() => { const k = document.getElementById('card'); k.style.opacity = 0; setTimeout(() => (k.style.display = 'none'), 600); });
    await wait(700);
  }
  async function tap(sel, { click = true } = {}) {
    const el = p.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox(); await raise();
    await p.evaluate(({ x, y }) => { const f = document.getElementById('finger'); f.style.opacity = 1; f.style.left = x + 'px'; f.style.top = y + 'px'; }, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
    await wait(800);
    await p.evaluate(() => document.getElementById('finger').classList.add('tap'));
    await wait(160);
    if (click) await el.click();
    await p.evaluate(() => document.getElementById('finger').classList.remove('tap'));
    await wait(450);
  }
  const fingerOff = () => p.evaluate(() => (document.getElementById('finger').style.opacity = 0));
  async function scrollTo(sel, offset = 120) {
    await p.evaluate(({ sel, offset }) => { const el = document.querySelector(sel); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' }); }, { sel, offset });
    await wait(1100);
  }
  const scrollTop = async () => { await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await wait(900); };
  async function typeSlow(sel, text) { await p.locator(sel).first().click(); await p.keyboard.type(text, { delay: 110 }); }

  // ---------- 0. intro ----------
  await card(`<img src="assets/logo-full.png" alt=""><h1>המערכת הפיננסית שלך</h1><p>מדריך קצר: איך רואים לאן הכסף הולך,<br>ואיך מזינים נתונים בכמה שניות.</p>`, 4200);

  // ---------- 1. main screen ----------
  await cap('זה המסך הראשי, <b>"הכסף שלי"</b>.<small>הוא עונה על שאלה אחת: לאן הלך הכסף החודש?</small>', 4200, { label: '1 · המסך הראשי', bottom: true });
  await cap('בראש המסך: כמה נכנס החודש, ומה ידוע על מה שיצא.<small>המספר הגדול הוא הסכום שעוד אין עליו פירוט. ברגע שנכניס את דף העו"ש מהבנק, הוא יתחלף ב"נשאר לך".</small>', 6200, { bottom: true });
  await cap('הפס הצבעוני מחלק את ההכנסה:<small>מע"מ ומסים, הוצאות העסק, הוצאות אישיות, ומה שעוד לא ידוע.</small>', 4800, { bottom: true });
  await hideCap();
  await scrollTo('.ledger-wrap', 90);
  await cap('<b>מה נכנס ומה יצא</b>: כל הוצאה בשורה משלה, מהגדולה לקטנה.<small>הנתונים כאן הם החיובים האמיתיים מכרטיס מקס העסקי.</small>', 5200, { bottom: true });
  await hideCap();
  await scrollTo('#commitWrap', 90);
  await cap('<b>כבר התחייבת</b>: עסקאות בתשלומים שעוד לא ירדו מהכרטיס.<small>בדצמבר ובינואר ייצאו 3,135 ₪ בכל חודש, עוד לפני שנכנס שקל. כדאי להכיר את המספר הזה לפני שפותחים עסקה חדשה בתשלומים.</small>', 7000, { bottom: true });
  await hideCap();
  await scrollTo('#flowInsightsWrap', 90);
  await cap('<b>כדאי לשים לב</b>: המערכת מסכמת במשפט אחד מה חשוב החודש.', 4200, { bottom: true });
  await scrollTop();

  // ---------- 2. months ----------
  await cap('בחיצים למעלה עוברים בין חודשים.', 2600, { label: '2 · מעבר בין חודשים', bottom: true });
  await tap('#monthPrev');
  await wait(1400);
  await cap('זה אוקטובר: נכנסו 24,080 ₪, ובכרטיס רואים לאן הלכו 9,718 ₪.', 3600, { bottom: true });
  await tap('#monthNext');
  await fingerOff();

  // ---------- 3. quick add ----------
  await cap('הכי חשוב: <b>להזין הכנסה בסוף כל יום עבודה</b>.<small>לוחצים על הכפתור העגול עם הפלוס.</small>', 4200, { label: '3 · הוספת הכנסה', bottom: true });
  await hideCap();
  await tap('#fab');
  await wait(600);
  await cap('מקלידים כמה נכנס היום.', 2200);
  await typeSlow('#quickForm input[name=amount]', '1850');
  await wait(600);
  await cap('בוחרים עיר, ומוסיפים הערה אם רוצים.<small>למשל כמה טיפולים היו.</small>', 2600);
  await tap('#quickForm select[name=city]', { click: false });
  await p.selectOption('#quickForm select[name=city]', 'מודיעין');
  await wait(500);
  await tap('#quickForm input[name=note]');
  await p.keyboard.type('3 פנים, 4 גבות ושפם', { delay: 70 });
  await wait(500);
  await tap('#quickForm button[type=submit]');
  await fingerOff();
  await cap('נשמר. זהו, פחות מעשר שניות.', 3200, { bottom: true });

  // ---------- 4. expense ----------
  await cap('הוצאה מוסיפים באותה דרך: פלוס, ואז <b>"הוצאה"</b>.<small>למשל הזמנת חומרים ששולמה במזומן או בהעברה.</small>', 4200, { label: '4 · הוספת הוצאה', bottom: true });
  await hideCap();
  await tap('#fab');
  await tap('#quickForm .seg label:nth-child(2)');
  await typeSlow('#quickForm input[name=amount]', '640');
  await p.selectOption('#quickForm select[name=category]', 'חומרים לטיפולים');
  await tap('#quickForm input[name=note]');
  await p.keyboard.type('הזמנת חומרים', { delay: 70 });
  await wait(400);
  await cap('הוצאה קבועה, כמו שכירות, מסמנים <b>"חוזרת כל חודש"</b>, ואז לא צריך להזין אותה שוב.', 4200);
  await tap('#quickForm button[type=submit]');
  await fingerOff();
  await wait(800);

  // ---------- 5. WhatsApp ----------
  await tap('.nav-item[data-tab="income"]');
  await fingerOff();
  await cap('רגילה לדווח בוואטסאפ? אפשר להמשיך.', 3000, { label: '5 · הדבקה מוואטסאפ', bottom: true });
  await hideCap();
  await scrollTo('#waText', 200);
  await cap('מעתיקים את ההודעות מהקבוצה ומדביקים כאן.', 2800);
  await p.fill('#waText', '17/11/2026, 21:02 - דנה דרעי: 2,350₪ 4 פנים 6 גבות\n18/11/2026, 20:15 - דנה דרעי: היום 1800 ש"ח איפור קבוע');
  await wait(900);
  await tap('#waParse');
  await scrollTo('#waPreview', 220);
  await cap('המערכת מוצאת את התאריך והסכום בכל הודעה.<small>אם ההודעה נשלחה למחרת, מתקנים את התאריך, ואז לוחצים "הוספה".</small>', 5200);
  await tap('#waSave');
  await fingerOff();
  await wait(900);

  // ---------- 6. import ----------
  await tap('.nav-item[data-tab="bank"]');
  await fingerOff();
  await cap('<b>ייבוא</b>: פעם בחודש מורידים מאתר מקס ומאתר הבנק את פירוט התנועות לאקסל, ומעלים אותו כאן.', 5200, { label: '6 · ייבוא מהבנק ומהאשראי', bottom: true });
  await tap('#dropZone', { click: false });
  await p.setInputFiles('#bankFile', fs.readdirSync(UPLOADS).filter((f) => f.endsWith('.xlsx')).map((f) => path.join(UPLOADS, f)));
  await fingerOff();
  await wait(1200);
  await cap('המערכת מזהה תנועות שכבר נמצאות בה ולא מכפילה אותן.<small>כאן העלינו שוב את אותם קבצים, ולא נוסף כלום.</small>', 4600, { bottom: true });
  await hideCap();
  await scrollTo('#bankList', 120);
  await cap('כל תנועה מקבלת קטגוריה לבד.<small>תנועה שלא זוהתה מסומנת בצהוב. בוחרים לה קטגוריה פעם אחת, ומאותו רגע המערכת זוכרת.</small>', 5600, { bottom: true });
  await scrollTop();

  // ---------- 7. goal ----------
  await tap('.nav-item[data-tab="dashboard"]');
  await fingerOff();
  await cap('<b>יעד ורווח</b>: כמה הכנסת מתוך היעד, וכמה צריך להכניס בכל יום עבודה שנשאר כדי להגיע אליו.', 5200, { label: '7 · יעד ורווח', bottom: true });
  await hideCap();
  await scrollTo('#trendChart', 120);
  await cap('גרף החודשים ודוח רווח והפסד, לראות את התמונה לאורך זמן.', 4000, { bottom: true });
  await hideCap();
  await scrollTop();
  await tap('.nav-item[data-tab="flow"]');
  await fingerOff();
  await wait(800);

  // ---------- outro ----------
  await card(`<img src="assets/logo-full.png" alt=""><h1>מה אני צריכה ממך</h1>
    <ol><li>להזין הכנסה בסוף כל יום עבודה</li><li>להעביר לי דף עו"ש מהבנק לספטמבר עד נובמבר</li><li>לכתוב לי מה לא ברור, מה חסר ומה היית משנה</li></ol>`, 8000);

  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  await browser.close();
  // ffmpeg concat list with each frame held until the next one arrived
  let list = '';
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : f.t + 0.5;
    list += `file '${f.file}'\nduration ${Math.max(0.01, next - f.t).toFixed(3)}\n`;
  });
  list += `file '${frames[frames.length - 1].file}'\n`;
  fs.writeFileSync(path.join(OUT, 'list.txt'), list);
  console.log(frames.length, 'frames', (frames[frames.length - 1].t - frames[0].t).toFixed(1), 's');
})();
