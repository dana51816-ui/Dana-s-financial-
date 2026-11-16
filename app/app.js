/* Dana Deri – financial demo app (v0.3). Data lives in localStorage. */
(function () {
  "use strict";

  const STORAGE_KEY = "dana-deri-finance-v4";

  // Category -> group. Groups drive the "where did the money go" view.
  const CATS = {
    "שכירות": "biz", "חומרים לטיפולים": "biz", "מוצרים למכירה": "biz", "הנהלת חשבונות": "biz",
    "ביטוח ורישוי": "biz", "שיווק": "biz", "תוכנה ותקשורת": "biz", "נסיעות ורכב": "biz",
    "השתלמויות": "biz", "עמלות בנק ואשראי": "biz", "אחר": "biz",
    "הלוואות": "loan",
    "תשלום מע\"מ": "vat", "מקדמות מס וביטוח לאומי": "tax",
    "ציוד": "biz",
    "משיכה פרטית": "private", "קניות אישיות": "private", "ביטוח אישי": "private", "פנסיה וגמל": "private",
    "כרטיס אשראי בלי פירוט": "unknown",
    "חיוב כרטיס אשראי": "skip",
    "לא מסווג": "unknown",
  };
  const GROUP_COLORS = {
    vat: "var(--c-vat)", tax: "var(--c-tax)", biz: "var(--c-biz)", loan: "var(--c-loan)",
    private: "var(--c-private)", unknown: "var(--c-unknown)", left: "var(--c-left)", skip: "var(--c-unknown)",
  };
  const DEFAULT_RULES = [
    ["מע\"מ", "תשלום מע\"מ"], ["מעמ", "תשלום מע\"מ"],
    ["ביטוח לאומי", "מקדמות מס וביטוח לאומי"], ["מס הכנסה", "מקדמות מס וביטוח לאומי"],
    ["שכר דירה", "שכירות"], ["שכירות", "שכירות"], ["רו\"ח", "הנהלת חשבונות"], ["חשבון פרטי", "משיכה פרטית"],
    ["כספומט", "משיכה פרטית"], ["משיכת מזומן", "משיכה פרטית"],
    ["ישראכרט", "חיוב כרטיס אשראי"], ["כאל", "חיוב כרטיס אשראי"], ["מקס איט", "חיוב כרטיס אשראי"],
    ["max it", "חיוב כרטיס אשראי"], ["לאומי קארד", "חיוב כרטיס אשראי"], ["אמריקן אקספרס", "חיוב כרטיס אשראי"], ["דיינרס", "חיוב כרטיס אשראי"],
    ["העברה-נייד", "משיכה פרטית"], ["הראל פנסיה", "פנסיה וגמל"], ["מסטרקרד", "כרטיס אשראי בלי פירוט"],
    ["הלוא", "הלוואות"], ["הלו'", "הלוואות"], ["רבית", "עמלות בנק ואשראי"], ["מסלול", "עמלות בנק ואשראי"], ["ontime", "עמלות בנק ואשראי"],
    ["רואה חשבון", "הנהלת חשבונות"], ["קוסמטיק", "חומרים לטיפולים"], ["זינגבוים", "חומרים לטיפולים"],
    ["אלקטרו", "ציוד"], ["פנגו", "נסיעות ורכב"], ["ביטוח חיים", "ביטוח אישי"],
    ["הלוואה", "הלוואות"], ["עמלה", "עמלות בנק ואשראי"], ["עמלת", "עמלות בנק ואשראי"],
    ["דלק", "נסיעות ורכב"], ["פז ", "נסיעות ורכב"], ["סונול", "נסיעות ורכב"], ["דור אלון", "נסיעות ורכב"],
    ["facebook", "שיווק"], ["meta", "שיווק"], ["easy", "תוכנה ותקשורת"],
    ["בזק", "תוכנה ותקשורת"], ["פרטנר", "תוכנה ותקשורת"], ["סלקום", "תוכנה ותקשורת"],
  ].map(([keyword, category]) => ({ keyword, category }));

  // Card-company category -> ours (used only when no rule matches).
  const EXT_CATS = {
    "קוסמטיקה וטיפוח": "חומרים לטיפולים", "דלק, חשמל וגז": "נסיעות ורכב", "תחבורה ורכבים": "נסיעות ורכב",
    "שירותי תקשורת": "תוכנה ותקשורת", "ביטוח": "ביטוח ורישוי", "מסעדות, קפה וברים": "קניות אישיות",
    "מזון וצריכה": "קניות אישיות", "אופנה": "קניות אישיות", "פנאי, בידור וספורט": "קניות אישיות",
  };
  function categorizeWith(rules, desc, extCat) {
    const d = String(desc).toLowerCase();
    const r = rules.find((x) => d.includes(x.keyword.toLowerCase()));
    return r ? r.category : (EXT_CATS[extCat] || "לא מסווג");
  }
  const instOf = (note) => { const m = String(note || "").match(/תשלום (\d+) מתוך (\d+)/); return m ? { n: +m[1], t: +m[2] } : null; };
  function cardItem(rules, r) {
    const category = categorizeWith(rules, r.name, r.extCat);
    return { id: uid(), date: r.date, txDate: r.txDate, name: r.name, note: r.note || "", inst: instOf(r.note),
      category, amount: r.amount, vat: CATS[category] === "biz", source: "bank", card: true };
  }

  // Fake bank export used by the "load sample" button. Not real transactions.
  const SAMPLE_CSV = `תאריך,תיאור,חובה,זכות
01/10/2026,העברה מחברת אשראי,,6200
02/10/2026,שכר דירה חדר ראשון,2500,
03/10/2026,כספומט סניף 612,1000,
05/10/2026,קוסמטיקה פרו בע"מ,1100,
08/10/2026,דלק פז מודיעין,320,
09/10/2026,FACEBOOK ADS,450,
10/10/2026,העברה מחברת אשראי,,5900
11/10/2026,העברה לחשבון פרטי,2500,
12/10/2026,שכירות חדר מודיעין,3000,
14/10/2026,ביטוח לאומי מקדמה,620,
15/10/2026,מס הכנסה מקדמות,900,
15/10/2026,מע"מ תשלום דו-חודשי,3400,
16/10/2026,הפקדת מזומן,,3100
18/10/2026,סופר שופרסל,640,
19/10/2026,החזר הלוואה,1300,
20/10/2026,עמלת ניהול חשבון,45,
22/10/2026,כספומט סניף 612,800,
24/10/2026,העברה מחברת אשראי,,6400
27/10/2026,BIT העברה,350,
28/10/2026,דלק סונול,290,
30/10/2026,רו"ח משרד,700,`;

  function seed() {
    return {
      settings: { licensed: true, vatRate: 18, taxReservePct: 10 },
      goals: {
        "2026-10": { goal: 27000, remaining: 0 },
        "2026-11": { goal: 30000, remaining: 3 },
      },
      income: [
        { id: uid(), date: "2026-08-31", kind: "month", city: "", amount: 21330, note: "סיכום חודשי שדנה דרעי דיווחה בוואטסאפ ב-13.10" },
        { id: uid(), date: "2026-09-30", kind: "month", city: "", amount: 21583, note: "לפי הזיכויים בעו\"ש (לא היה דיווח לספטמבר)" },
        { id: uid(), date: "2026-10-31", kind: "month", city: "", amount: 24080, note: "סיכום אוקטובר שדנה דרעי דיווחה ב-29–30.10" },
        { id: uid(), date: "2026-11-14", kind: "month", city: "", amount: 10800, note: "סך הכל עד 14.11 (כולל 1,400 ₪ ב-10.11)" },
        { id: uid(), date: "2026-11-15", kind: "day", city: "", amount: 2040, note: "11 גבות ושפם, 5 עיצובי גבות (דווח 16.11)" },
      ],
      fixed: [],
      variable: [
        ...(window.SEED_CARD || []).map((r) => cardItem(DEFAULT_RULES, r)),
        ...(window.SEED_BANK || []).filter((r) => r.debit > 0).map((r) => {
          const category = categorizeWith(DEFAULT_RULES, r.desc, "");
          return { id: uid(), date: r.date, name: r.desc, note: "", category, amount: r.debit, vat: CATS[category] === "biz", source: "bank" };
        }),
      ],
      bankCredits: (window.SEED_BANK || []).filter((r) => r.credit > 0).map((r) => ({ id: uid(), date: r.date, desc: r.desc, amount: r.credit })),
      balance: window.SEED_BALANCE || null,
      rules: DEFAULT_RULES.slice(),
    };
  }

  function uid() { return Math.random().toString(36).slice(2, 10); }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable */ }
    return seed();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  // Wrapped in a left-to-right isolate so "−1,586 ₪" never flips to "1,586−" inside Hebrew text.
  const fmt = (n) => "\u2066" + (n < 0 ? "−" : "") + Math.round(Math.abs(n)).toLocaleString("he-IL") + "\u00A0₪\u2069";
  const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1) + "%" : "—");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const monthOf = (d) => d.slice(0, 7);
  const HEB_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const monthName = (m) => { const [y, mo] = m.split("-"); return HEB_MONTHS[+mo - 1] + " " + y; };
  const shortMonth = (m) => HEB_MONTHS[+m.split("-")[1] - 1];
  const fmtDate = (d) => { const [y, m, dd] = d.split("-"); return `${dd}.${m}.${y.slice(2)}`; };
  function todayISO() { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); }
  const groupOf = (cat) => CATS[cat] || "biz";

  let state = load();
  let currentMonth = monthOf(todayISO());
  let role = "advisor";

  const vatFactor = () => (state.settings.licensed ? 1 + state.settings.vatRate / 100 : 1);

  function allMonths() {
    const set = new Set([currentMonth, monthOf(todayISO())]);
    state.income.forEach((i) => set.add(monthOf(i.date)));
    state.variable.forEach((v) => set.add(monthOf(v.date)));
    Object.keys(state.goals).forEach((m) => set.add(m));
    return Array.from(set).sort();
  }

  function monthExpenses(m) {
    const fixed = state.fixed.filter((e) => !e.start || e.start <= m);
    const variable = state.variable.filter((e) => monthOf(e.date) === m);
    return { fixed, variable, all: [...fixed, ...variable] };
  }

  // ---------- accrual P&L ----------
  function calc(m) {
    const f = vatFactor();
    const gross = state.income.filter((i) => monthOf(i.date) === m).reduce((s, i) => s + i.amount, 0);
    const netIncome = gross / f;
    const net = (e) => (e.vat && state.settings.licensed ? e.amount / f : e.amount);
    const { fixed, variable, all } = monthExpenses(m);
    // P&L only counts business costs (not VAT/tax payments, loan principal or private withdrawals)
    const bizOnly = (arr) => arr.filter((e) => groupOf(e.category) === "biz");
    const fixedNet = bizOnly(fixed).reduce((s, e) => s + net(e), 0);
    const varNet = bizOnly(variable).reduce((s, e) => s + net(e), 0);
    const byCat = {};
    bizOnly(all).forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + net(e); });
    const expenses = fixedNet + varNet;
    const profit = netIncome - expenses;
    return { gross, netIncome, fixedNet, varNet, expenses, profit, margin: netIncome ? profit / netIncome : NaN, byCat, breakEvenGross: fixedNet * f, hasDemo: all.some((e) => e.demo) };
  }

  // ---------- cash flow: where did the money go ----------
  function moneyFlow(m) {
    const f = vatFactor();
    const gross = state.income.filter((i) => monthOf(i.date) === m).reduce((s, i) => s + i.amount, 0);
    const { all } = monthExpenses(m);
    const sumGroup = (g) => all.filter((e) => groupOf(e.category) === g).reduce((s, e) => s + e.amount, 0);
    const steps = [];

    // VAT: money collected for the tax authority, not Dana's.
    const vatPaid = sumGroup("vat");
    if (state.settings.licensed) {
      const outVat = gross - gross / f;
      const inVat = all.filter((e) => groupOf(e.category) === "biz" && e.vat).reduce((s, e) => s + (e.amount - e.amount / f), 0);
      const owed = Math.max(0, outVat - inVat);
      steps.push(vatPaid > 0
        ? { label: "מע\"מ ששולם", amount: vatPaid, group: "vat" }
        : { label: "מע\"מ – כסף של רשות המסים", amount: owed, group: "vat", estimate: true });
    }
    // Income tax + national insurance advances
    const taxPaid = sumGroup("tax");
    const taxEst = (gross / f) * (state.settings.taxReservePct || 0) / 100;
    if (taxPaid > 0) steps.push({ label: "מקדמות מס וביטוח לאומי", amount: taxPaid, group: "tax" });
    else if (taxEst > 0) steps.push({ label: "הפרשה למס הכנסה וביטוח לאומי", amount: taxEst, group: "tax", estimate: true });

    // Business costs by category
    const biz = {};
    all.filter((e) => groupOf(e.category) === "biz").forEach((e) => { biz[e.category] = (biz[e.category] || 0) + e.amount; });
    Object.entries(biz).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => steps.push({ label: cat, amount: amt, group: "biz" }));

    const loans = sumGroup("loan"); if (loans) steps.push({ label: "החזרי הלוואות", amount: loans, group: "loan" });
    const priv = sumGroup("private"); if (priv) steps.push({ label: "אישי ומשיכות", amount: priv, group: "private" });
    // Unknown money is listed item by item, so it is clear what to ask about.
    const unkMap = {};
    all.filter((e) => groupOf(e.category) === "unknown").forEach((e) => {
      const label = e.category === "לא מסווג" ? `${e.name} – צריך לברר` : e.category;
      unkMap[label] = (unkMap[label] || 0) + e.amount;
    });
    Object.entries(unkMap).sort((a, b) => b[1] - a[1]).forEach(([label, amt]) => steps.push({ label, amount: amt, group: "unknown" }));

    const skipped = sumGroup("skip");
    const out = steps.reduce((s, x) => s + x.amount, 0);
    const left = gross - out;
    return { gross, steps, out, left, hasDemo: all.some((e) => e.demo), unknownCount: all.filter((e) => groupOf(e.category) === "unknown").length, skipped,
      // Without a checking-account (עו"ש) statement we only see card spending; the rest is not "left", it is unexplained.
      hasAccount: state.bankCredits.some((c) => monthOf(c.date) === m) || all.some((e) => e.source === "bank" && !e.card),
      cardTotal: all.filter((e) => e.card).reduce((s, e) => s + e.amount, 0) };
  }

  // Future installments already committed on the card (latest statement per purchase).
  function commitments() {
    const latest = {};
    state.variable.filter((e) => e.inst && e.inst.n < e.inst.t).forEach((e) => {
      const k = e.name + "|" + (e.txDate || "") + "|" + e.inst.t;
      if (!latest[k] || latest[k].inst.n < e.inst.n) latest[k] = e;
    });
    // drop purchases whose later installment already appears as fully paid
    const items = Object.values(latest).filter((e) => !state.variable.some((x) => x.inst && x.name === e.name && x.txDate === e.txDate && x.inst.n === x.inst.t));
    const byMonth = {};
    items.forEach((e) => {
      const [y, mo] = e.date.split("-").map(Number);
      for (let k = 1; k <= e.inst.t - e.inst.n; k++) {
        const d = new Date(y, mo - 1 + k, 1);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth[m] = (byMonth[m] || 0) + e.amount;
      }
    });
    const total = items.reduce((s, e) => s + e.amount * (e.inst.t - e.inst.n), 0);
    return { items, byMonth, total };
  }

  // ---------- render ----------
  const icon = (id) => `<svg class="i"><use href="#i-${id}"/></svg>`;
  const delBtn = (kind, id) => `<button class="del" data-del="${kind}" data-id="${id}" aria-label="מחיקה">${icon("trash")}</button>`;
  const dot = (g) => `<i class="dot${g === "left" ? " light" : ""}" style="background:${GROUP_COLORS[g]}"></i>`;

  function render() {
    renderMonthNav();
    renderFlow();
    renderDashboard();
    renderIncome();
    renderExpenses();
    renderBank();
    renderSettings();
  }

  function renderMonthNav() {
    const months = allMonths();
    const i = months.indexOf(currentMonth);
    $("#monthTitle").textContent = monthName(currentMonth);
    $("#monthPrev").disabled = i <= 0;
    $("#monthNext").disabled = i >= months.length - 1;
  }

  function renderFlow() {
    const r = moneyFlow(currentMonth);
    const per100 = (v) => (r.gross ? Math.round((v / r.gross) * 100) : 0);
    if (!r.gross) {
      $("#flowHeadline").innerHTML = r.cardTotal
        ? `ב${monthName(currentMonth)} יצאו בכרטיס האשראי<span class="left-big">${fmt(r.cardTotal)}</span><small>אין דיווח הכנסות לחודש הזה, ולכן אי אפשר לחשב כמה נשאר.</small>`
        : `עוד אין הכנסות ב${monthName(currentMonth)}.<span class="left-big">מוסיפים הכנסה או מייבאים מהבנק</span>`;
      $("#flowBar").innerHTML = ""; $("#flowLegend").innerHTML = "";
      $("#flowList").innerHTML = `<p class="empty">כשיהיו הכנסות והוצאות, כאן יופיע לאן הלך כל שקל.</p>`;
      renderCommitments();
      $("#flowInsightsWrap").style.display = "none";
      return;
    }
    const unexplained = !r.hasAccount && r.left > 0;
    $("#flowHeadline").innerHTML = unexplained
      ? `ב${monthName(currentMonth)} נכנסו <b>${fmt(r.gross)}</b>, ומתוכם אנחנו יודעים לאן הלכו <b>${fmt(r.out)}</b>. על השאר עוד אין פירוט<span class="left-big">${fmt(r.left)}</span><small>כדי לדעת לאן הלך הסכום הזה, צריך את דף העו"ש של החודש.</small>`
      : r.left >= 0
      ? `ב${monthName(currentMonth)} נכנסו <b>${fmt(r.gross)}</b>. אחרי כל מה שיצא נשארו לך<span class="left-big">${fmt(r.left)}</span>`
      : `ב${monthName(currentMonth)} נכנסו <b>${fmt(r.gross)}</b>, ויצא יותר ממה שנכנס<span class="left-big">${fmt(r.left)}</span>${currentMonth === monthOf(todayISO()) ? "<small>החודש עוד לא נגמר: ההכנסות של שאר החודש עוד לא נכנסו, וחלק מההוצאות כבר ירדו.</small>" : ""}`;

    const groups = {};
    r.steps.forEach((s) => { groups[s.group] = (groups[s.group] || 0) + s.amount; });
    if (r.left > 0) groups.left = r.left;
    const NAMES = { vat: "מע\"מ", tax: "מס וביטוח לאומי", biz: "הוצאות העסק", loan: "הלוואות", private: "אישי ומשיכות", unknown: "לא מסווג", left: unexplained ? "עוד לא ידוע" : "נשאר לך" };
    const order = ["vat", "tax", "biz", "loan", "private", "unknown", "left"].filter((g) => groups[g] > 0);
    const total = Math.max(r.gross, r.out);
    $("#flowBar").innerHTML = `<div class="stack" role="img" aria-label="חלוקת ההכנסה">${order.map((g) =>
      `<div style="flex-basis:${(groups[g] / total) * 100}%;background:${GROUP_COLORS[g]}" title="${NAMES[g]}: ${fmt(groups[g])}"></div>`).join("")}</div>`;
    $("#flowLegend").innerHTML = order.map((g) => `<span>${dot(g)}${NAMES[g]} ${per100(groups[g]) ? per100(groups[g]) + "%" : ""}</span>`).join("");

    const share = (v) => Math.min(100, (v / Math.max(r.gross, r.out)) * 100);
    const lrow = (cls, g, label, amt, tag = "") => `<div class="lrow ${cls}">
        <span class="lname">${g ? dot(g) : ""}<span>${label}${tag}</span></span>
        <span class="lamt">${fmt(amt)}</span>
        ${g ? `<span class="lbar"><i style="width:${share(Math.abs(amt))}%;background:${GROUP_COLORS[g]}"></i></span>` : ""}
      </div>`;
    $("#flowList").innerHTML = `<div class="ledger">
      ${lrow("start", null, "נכנס לעסק", r.gross)}
      ${r.steps.map((s) => lrow("", s.group, esc(s.label), -s.amount, s.estimate ? ' <span class="tag">הערכה</span>' : "")).join("")}
      ${lrow("end", null, unexplained ? "עוד לא ידוע לאן" : r.left >= 0 ? "נשאר לך" : "חסר", r.left)}
    </div>`;
    renderCommitments();

    const notMine = (groups.vat || 0) + (groups.tax || 0);
    const bizTop = r.steps.filter((s) => s.group === "biz")[0];
    const tips = [];
    if (notMine) tips.push(`<b>${fmt(notMine)}</b> (${per100(notMine)} ₪ מכל 100 ₪) הם מע"מ ומסים. הכסף הזה נכנס לחשבון אבל הוא לא שלך. מעבירים אותו לחשבון נפרד ביום שהוא נכנס, וכך מה שנשאר בעו"ש הוא באמת שלך.`);
    if (bizTop) tips.push(`ההוצאה העסקית הגדולה ביותר היא <b>${esc(bizTop.label)}</b>: ${fmt(bizTop.amount)}, כלומר ${per100(bizTop.amount)} ₪ מכל 100 ₪.`);
    const { all: monthAll } = monthExpenses(currentMonth);
    const sumCat = (c) => monthAll.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0);
    const toPrivate = sumCat("משיכה פרטית"), pension = sumCat("פנסיה וגמל"), smalls = sumCat("קניות אישיות");
    if (toPrivate) tips.push(`העברת לעצמך <b>${fmt(toPrivate)}</b>${pension ? `, ועוד <b>${fmt(pension)}</b> לפנסיה ולגמל` : ""}. זה הכסף שלך. הסכום משתנה מחודש לחודש, ולכן קשה להרגיש אותו. משכורת קבועה באותו יום בכל חודש תעשה סדר.`);
    else if (groups.private) tips.push(`הוצאות אישיות: <b>${fmt(groups.private)}</b>.`);
    if (smalls) tips.push(`קפה, אוכל וקניות קטנות בכרטיס העסקי: <b>${fmt(smalls)}</b>. כרטיס פרטי נפרד ישאיר את העסק נקי.`);
    if (state.balance && state.balance.amount < 0) tips.push(`החשבון העסקי היה במינוס כמעט כל התקופה, עד <b>${fmt(state.balance.low)}</b>. ב-15.11 היתרה הייתה <b>${fmt(state.balance.amount)}</b>, ועל המינוס משלמים ריבית.`);
    const cm = commitments(); const nextM = Object.keys(cm.byMonth).sort()[0];
    if (cm.total) tips.push(`ב${monthName(nextM)} ייצאו <b>${fmt(cm.byMonth[nextM])}</b> על תשלומים ישנים, עוד לפני שנכנס שקל אחד. כדאי לא לפתוח עסקאות חדשות בתשלומים עד שהרשימה תתקצר.`);
    if (r.unknownCount) tips.push(`<b>${r.unknownCount}</b> תנועות עוד לא מסווגות. מסווגים אותן במסך הייבוא.`);
    if (r.skipped && !r.cardTotal) tips.push(`חיובי כרטיס אשראי בסך <b>${fmt(r.skipped)}</b> לא נספרו כאן, כדי לא לספור אותם פעמיים. כדי לראות לאן הם הלכו, מייבאים את פירוט הכרטיס.`);
    if (r.hasDemo) tips.push(`<span class="tag demo">דמו</span> חלק מההוצאות בחודש הזה הן נתוני דמה, עד שיגיעו הנתונים האמיתיים.`);
    $("#flowInsightsWrap").style.display = tips.length ? "" : "none";
    $("#flowInsights").innerHTML = `<ul class="tips">${tips.map((t) => `<li>${t}</li>`).join("")}</ul>`;
  }

  function renderCommitments() {
    const cm = commitments();
    $("#commitWrap").style.display = cm.total ? "" : "none";
    if (!cm.total) return;
    const months = Object.keys(cm.byMonth).sort().slice(0, 8);
    const max = Math.max(...months.map((m) => cm.byMonth[m]));
    $("#commitments").innerHTML = `
      <p class="commit-lead">תשלומים בכרטיס שעוד לא ירדו<span class="commit-total">${fmt(cm.total)}</span></p>
      <div class="mbars" role="img" aria-label="תשלומים עתידיים לפי חודש">${months.map((m) => `
        <div class="mbar"><span class="mv">${Math.round(cm.byMonth[m]).toLocaleString("he-IL")}</span>
          <span class="mcol"><i style="height:${(cm.byMonth[m] / max) * 100}%"></i></span><span class="ml">${shortMonth(m)}</span></div>`).join("")}</div>
      <div class="clist">${cm.items.sort((a, b) => b.amount * (b.inst.t - b.inst.n) - a.amount * (a.inst.t - a.inst.n)).map((e) => `
        <div class="citem"><span><b>${esc(e.name)}</b><small>${fmt(e.amount)} לחודש · נשארו ${e.inst.t - e.inst.n} מתוך ${e.inst.t}</small></span>
        <span class="lamt">${fmt(e.amount * (e.inst.t - e.inst.n))}</span></div>`).join("")}</div>`;
  }

  function stat(label, value, sub) {
    return `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
  }

  function renderDashboard() {
    const c = calc(currentMonth);
    const g = state.goals[currentMonth];
    if (g && g.goal) {
      const ratio = c.gross / g.goal, gap = Math.max(0, g.goal - c.gross);
      const daily = g.remaining > 0 ? gap / g.remaining : null;
      $("#goalCard").innerHTML = `
        <h2>היעד של ${monthName(currentMonth)}</h2>
        <div class="goal-figures"><span class="big">${fmt(c.gross)}</span><span class="of">מתוך ${fmt(g.goal)} · ${pct(ratio)}</span></div>
        <div class="progress" role="progressbar" aria-valuenow="${Math.round(ratio * 100)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${Math.min(100, ratio * 100)}%"></div></div>
        <div class="goal-row">
          <div>חסר ליעד<b>${fmt(gap)}</b></div>
          <div>ימי עבודה שנותרו<b>${g.remaining ?? "—"}</b></div>
          <div>צריך ביום<b>${daily != null ? fmt(daily) : "—"}</b></div>
        </div>`;
    } else {
      $("#goalCard").innerHTML = `<h2>היעד של ${monthName(currentMonth)}</h2><p class="empty">עוד לא נקבע יעד לחודש הזה. קובעים אותו בהגדרות.</p>`;
    }

    $("#kpis").innerHTML = [
      stat("מחזור", fmt(c.gross), state.settings.licensed ? `${fmt(c.netIncome)} בלי מע"מ` : "&nbsp;"),
      stat("הוצאות העסק", fmt(c.expenses), `קבועות ${fmt(c.fixedNet)}`),
      stat("רווח לפני מס", `<span class="${c.profit >= 0 ? "pos" : "neg"}">${fmt(c.profit)}</span>`, moneyFlow(currentMonth).hasAccount ? `רווחיות ${pct(c.margin)}` : "לפי הכרטיס בלבד, בלי שכירות ועו\"ש"),
      stat("נקודת איזון", c.fixedNet ? fmt(c.breakEvenGross) : "—", c.fixedNet ? "מחזור שמכסה את הקבועות" : "עוד לא הוגדרו הוצאות קבועות"),
    ].join("");

    renderTrend();
    const rows = Object.entries(c.byCat).sort((a, b) => b[1] - a[1]);
    const max = rows.length ? rows[0][1] : 1;
    $("#expenseBreakdown").innerHTML = rows.length ? `<div class="bars">${rows.map(([cat, v]) =>
      `<div class="bar-row"><span>${esc(cat)}</span><div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div><span>${fmt(v)}</span></div>`).join("")}</div>`
      : `<p class="empty">אין הוצאות בחודש הזה.</p>`;

    const vatLine = state.settings.licensed
      ? `<tr class="sub"><td>פחות מע"מ (${state.settings.vatRate}%)</td><td class="num">${fmt(c.netIncome - c.gross)}</td></tr>` : "";
    $("#plTable").innerHTML = `
      <tr><td>מחזור כולל מע"מ</td><td class="num">${fmt(c.gross)}</td></tr>
      ${vatLine}
      <tr><td><b>הכנסה</b></td><td class="num"><b>${fmt(c.netIncome)}</b></td></tr>
      <tr class="sub"><td>הוצאות קבועות</td><td class="num">${fmt(-c.fixedNet)}</td></tr>
      <tr class="sub"><td>הוצאות משתנות</td><td class="num">${fmt(-c.varNet)}</td></tr>
      <tr class="total"><td>רווח לפני מס</td><td class="num ${c.profit >= 0 ? "pos" : "neg"}">${fmt(c.profit)}</td></tr>`;
    $("#plNote").innerHTML = `לא כולל קרן הלוואות, תשלומי מסים ומשיכות פרטיות. את כולם רואים במסך "לאן הכסף הולך".` +
      (c.hasDemo ? ` <span class="tag demo">דמו</span>` : "");
  }

  function renderTrend() {
    const months = allMonths().filter((m) => state.income.some((i) => monthOf(i.date) === m) || m === currentMonth);
    const data = months.map((m) => ({ m, ...calc(m) }));
    const max = Math.max(1, ...data.map((d) => Math.max(d.netIncome, d.expenses)));
    const min = Math.min(0, ...data.map((d) => d.profit));
    const W = 480, H = 220, pad = 24, groupW = (W - pad * 2) / Math.max(1, data.length);
    const y = (v) => H - 30 - ((v - min) / (max - min)) * (H - 50);
    const bw = Math.min(20, groupW / 4.5);
    let bars = "";
    data.forEach((d, i) => {
      const x0 = W - pad - (i + 1) * groupW + groupW / 2;
      const rect = (x, v, col) => `<rect x="${x}" y="${Math.min(y(v), y(0))}" width="${bw}" height="${Math.max(1, Math.abs(y(v) - y(0)))}" rx="4" fill="${col}" opacity="${d.m === currentMonth ? 1 : .55}"><title>${fmt(v)}</title></rect>`;
      bars += rect(x0 + bw * 0.6, d.netIncome, "var(--income)");
      bars += rect(x0 - bw * 0.5, d.expenses, "var(--expense)");
      bars += rect(x0 - bw * 1.6, d.profit, "var(--profit)");
      bars += `<text x="${x0}" y="${H - 8}" text-anchor="middle" ${d.m === currentMonth ? 'style="fill:var(--ink);font-weight:600"' : ""}>${shortMonth(d.m)}</text>`;
    });
    $("#trendChart").innerHTML = `
      <div class="legend"><span><i class="dot" style="background:var(--income)"></i>הכנסה בלי מע"מ</span><span><i class="dot" style="background:var(--expense)"></i>הוצאות העסק</span><span><i class="dot" style="background:var(--profit)"></i>רווח</span></div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="גרף חודשי"><line x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>${bars}</svg>`;
  }

  function renderIncome() {
    const rows = state.income.filter((i) => monthOf(i.date) === currentMonth).sort((a, b) => b.date.localeCompare(a.date));
    if (!rows.length) { $("#incomeList").innerHTML = `<p class="empty">אין הכנסות ב${monthName(currentMonth)}. מוסיפים עם הכפתור, או מדביקים הודעות מוואטסאפ למטה.</p>`; return; }
    const total = rows.reduce((s, r) => s + r.amount, 0);
    $("#incomeList").innerHTML = `<div class="list">${rows.map((r) => `
      <div class="item">
        <span class="t">${esc(r.note) || (r.kind === "month" ? "סיכום חודשי" : "יום עבודה")}</span>
        <span class="meta">${fmtDate(r.date)}${r.city ? ` · ${esc(r.city)}` : ""}${r.kind === "month" ? ' <span class="tag">סיכום</span>' : ""}</span>
        <span class="amt">${fmt(r.amount)}</span>${delBtn("income", r.id)}
      </div>`).join("")}</div>
      <div class="list-total"><span>סה"כ</span><span>${fmt(total)}</span></div>`;
  }

  function catSelect(id, selected) {
    return `<select class="cat-pick" data-id="${id}" aria-label="קטגוריה">${Object.keys(CATS).map((c) => `<option ${c === selected ? "selected" : ""}>${c}</option>`).join("")}</select>`;
  }

  function expenseItem(e, kind) {
    const tags = (e.demo ? ' <span class="tag demo">דמו</span>' : "") + (e.source === "bank" ? ' <span class="tag">יובא</span>' : "");
    const when = kind === "fixed" ? `מ${shortMonth(e.start || currentMonth)}` : fmtDate(e.date);
    return `<div class="item ${e.category === "לא מסווג" ? "todo" : ""}">
      <span class="t">${esc(e.name)}${tags}</span>
      <span class="meta">${when} · ${kind === "fixed" ? esc(e.category) : catSelect(e.id, e.category)}</span>
      <span class="amt">${fmt(e.amount)}</span>${delBtn(kind, e.id)}
    </div>`;
  }

  function renderExpenses() {
    const v = state.variable.filter((e) => monthOf(e.date) === currentMonth).sort((a, b) => b.date.localeCompare(a.date));
    $("#variableList").innerHTML = v.length
      ? `<div class="list">${v.map((e) => expenseItem(e, "variable")).join("")}</div><div class="list-total"><span>סה"כ</span><span>${fmt(v.reduce((s, e) => s + e.amount, 0))}</span></div>`
      : `<p class="empty">אין הוצאות משתנות ב${monthName(currentMonth)}.</p>`;
    const f = state.fixed;
    $("#fixedList").innerHTML = f.length
      ? `<div class="list">${f.map((e) => expenseItem(e, "fixed")).join("")}</div><div class="list-total"><span>סה"כ בחודש</span><span>${fmt(f.reduce((s, e) => s + e.amount, 0))}</span></div>`
      : `<p class="empty">אין הוצאות קבועות. מוסיפים הוצאה ומסמנים "חוזרת כל חודש".</p>`;
  }

  function renderBank() {
    const rows = state.variable.filter((e) => e.source === "bank" && monthOf(e.date) === currentMonth).sort((a, b) => b.date.localeCompare(a.date));
    const unknown = rows.filter((e) => e.category === "לא מסווג").length;
    const credits = state.bankCredits.filter((c) => monthOf(c.date) === currentMonth).reduce((s, c) => s + c.amount, 0);
    const reported = state.income.filter((i) => monthOf(i.date) === currentMonth).reduce((s, i) => s + i.amount, 0);
    const cell = (l, v, sub) => `<div><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${sub}</div></div>`;
    $("#bankCompare").innerHTML = (credits || rows.length) ? `<div class="compare">
        ${cell("נכנס לבנק", fmt(credits), "זיכויים בחשבון העסקי")}
        ${cell("דווח כהכנסה", fmt(reported), "לפי הדיווחים שלך")}
        ${cell("פער", fmt(reported - credits), reported > credits ? "דווח ולא נכנס לבנק" : "נכנס לבנק יותר ממה שדווח")}
        ${cell("לסיווג", String(unknown), unknown ? "תנועות מסומנות בצהוב" : "הכל מסווג")}
      </div>` : `<p class="empty">עוד לא יובאו תנועות ל${monthName(currentMonth)}.</p>`;
    $("#bankList").innerHTML = rows.length
      ? `<div class="list">${rows.map((e) => expenseItem(e, "variable")).join("")}</div>`
      : `<p class="empty">התנועות המיובאות יופיעו כאן.</p>`;
    const open = $("#rulesList details")?.open ? " open" : "";
    $("#rulesList").innerHTML = `<details${open}><summary>${state.rules.length} כללים פעילים</summary><div class="chips">${state.rules.map((r, i) =>
      `<span class="chip">${esc(r.keyword)} ← ${esc(r.category)}<button class="del" data-del="rule" data-id="${i}" aria-label="מחיקת כלל">${icon("x")}</button></span>`).join("")}</div></details>`;
  }

  function renderSettings() {
    const entries = Object.entries(state.goals).sort();
    $("#goalList").innerHTML = entries.length ? `<div class="list" style="margin-top:12px">${entries.map(([m, g]) => `
      <div class="item"><span class="t">${monthName(m)}</span><span class="meta">${g.remaining != null ? `${g.remaining} ימי עבודה נותרו` : "&nbsp;"}</span>
      <span class="amt">${fmt(g.goal)}</span>${delBtn("goal", m)}</div>`).join("")}</div>` : "";
    const vf = $("#vatForm");
    vf.licensed.checked = state.settings.licensed;
    vf.rate.value = state.settings.vatRate;
    vf.tax.value = state.settings.taxReservePct ?? 0;
    $("#roleSelect").value = role;
  }

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ---------- file import (bank / credit card) ----------
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    const firstLine = text.split(/\r?\n/)[0];
    const delim = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"' && cell === "") q = true; // quotes open only at cell start (Hebrew uses " inside words, e.g. מע"מ)
      else if (ch === delim) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim()));
  }
  function parseDate(v) {
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
    const s = String(v || "").trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
    return null;
  }
  const parseNum = (v) => { if (typeof v === "number") return v; const n = parseFloat(String(v || "").replace(/[₪,\s]/g, "")); return isFinite(n) ? n : 0; };

  const categorize = (desc, extCat) => categorizeWith(state.rules, desc, extCat);

  // rows: array of arrays (from CSV or Excel). Works for bank statements and credit-card statements.
  function importRows(rows, src) {
    const hi = rows.findIndex((r) => r.some((c) => String(c).includes("תאריך")) && r.some((c) => /סכום|חובה|זכות/.test(String(c))));
    if (hi < 0) throw new Error(`ב-${src} לא נמצאה שורת כותרות עם תאריך וסכום`);
    const h = rows[hi].map((c) => String(c).trim());
    const col = (...keys) => h.findIndex((c) => keys.some((k) => c.includes(k)));
    const iDate = col("תאריך"), iDesc = col("תיאור", "פרטים", "בית עסק", "בית העסק", "שם העסק", "פעולה");
    const iDebit = col("חובה", "סכום חיוב", "סכום החיוב");
    const iCredit = col("זכות");
    const iAmount = h.findIndex((c, i) => c.includes("סכום") && i !== iDebit);
    const isCard = iCredit < 0 && h.some((c) => /חיוב|בית עסק|בית העסק/.test(c));
    const iBill = h.findIndex((c) => c.includes("תאריך חיוב")), iNote = col("הערות"), iCat = col("קטגוריה");
    if (iDesc < 0 || (iDebit < 0 && iAmount < 0)) throw new Error(`ב-${src} לא זוהו עמודות תיאור וסכום`);
    const key = (d, desc, a, n = "") => `${d}|${desc}|${a}|${n}`;
    // Multiset: identical rows inside one file are real (two coffees on the same day); only rows already stored count as duplicates.
    const existing = {};
    [...state.variable.filter((e) => e.source === "bank").map((e) => key(e.date, e.name, e.amount, e.note)),
      ...state.bankCredits.map((c) => key(c.date, c.desc, c.amount))].forEach((k) => { existing[k] = (existing[k] || 0) + 1; });
    const inFile = {};
    const seen = { has: (k) => (inFile[k] = (inFile[k] || 0) + 1) <= (existing[k] || 0), add: () => {} };
    let added = 0, credits = 0, skipped = 0, last = null;
    rows.slice(hi + 1).forEach((r) => {
      // Card rows are dated by billing date: that is when the money actually leaves the account.
      const date = (isCard && iBill >= 0 && parseDate(r[iBill])) || parseDate(r[iDate]); if (!date) return;
      const desc = String(r[iDesc] || "").trim().split(/\s+/).join(" ");
      const note = iNote >= 0 ? String(r[iNote] || "").trim() : "";
      let debit = iDebit >= 0 ? parseNum(r[iDebit]) : 0, credit = iCredit >= 0 ? parseNum(r[iCredit]) : 0;
      if (iDebit < 0 && iAmount >= 0) { const a = parseNum(r[iAmount]); if (isCard) debit = a; else if (a < 0) debit = -a; else credit = a; }
      if (isCard && debit < 0) { credit = -debit; debit = 0; } // refund on a card is not income
      if (debit > 0) {
        if (seen.has(key(date, desc, debit, note))) { skipped++; return; }
        if (isCard) state.variable.push(cardItem(state.rules, { date, txDate: parseDate(r[iDate]), name: desc, amount: debit, extCat: iCat >= 0 ? r[iCat] : "", note }));
        else { const category = categorize(desc); state.variable.push({ id: uid(), date, name: desc, note, category, amount: debit, vat: groupOf(category) === "biz", source: "bank" }); }
        seen.add(key(date, desc, debit, note)); added++; last = date;
      } else if (credit > 0 && !isCard) {
        if (seen.has(key(date, desc, credit))) { skipped++; return; }
        state.bankCredits.push({ id: uid(), date, desc, amount: credit });
        seen.add(key(date, desc, credit)); credits++; last = date;
      }
    });
    return { added, credits, skipped, last, isCard };
  }

  async function importFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv") || file.type === "text/csv") return [importRows(parseCSV(await file.text()), file.name)];
    if (!window.XLSX) throw new Error("רכיב קריאת Excel לא נטען. בודקים את חיבור האינטרנט, או שומרים את הקובץ כ-CSV");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const results = [];
    wb.SheetNames.forEach((sn) => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: "" });
      try { results.push(importRows(rows, `${file.name} / ${sn}`)); } catch (e) { /* sheet without transactions */ }
    });
    if (!results.length) throw new Error(`ב-${file.name} לא נמצאו תנועות`);
    return results;
  }

  async function runImport(files) {
    let added = 0, credits = 0, skipped = 0, last = null; const errors = [];
    for (const f of files) {
      try {
        (await importFile(f)).forEach((r) => { added += r.added; credits += r.credits; skipped += r.skipped; if (r.last && (!last || r.last > last)) last = r.last; });
      } catch (e) { errors.push(e.message); }
    }
    if (last) currentMonth = monthOf(last);
    $("#importResult").textContent = [
      added || credits ? `יובאו ${added} הוצאות ו-${credits} זיכויים${skipped ? `, ${skipped} כפולים דולגו` : ""}.`
        : skipped ? `כל ${skipped} התנועות בקובץ כבר קיימות במערכת.` : "",
      ...errors,
    ].filter(Boolean).join(" ");
    if (added || credits) toast(`יובאו ${added + credits} תנועות`);
    commit();
  }

  // ---------- WhatsApp paste ----------
  function parseWhatsApp(text) {
    const out = [];
    text.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\[?(\d{1,2})[./](\d{1,2})[./](\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\]?\s*(?:-\s*)?([^:]{1,40}):\s*(.*)$/);
      let date = null, msg = line;
      if (m) { date = parseDate(`${m[1]}/${m[2]}/${m[3]}`); msg = m[5]; }
      const a = msg.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:₪|ש"ח|שח|שקל)|₪\s*(\d[\d,]*)/);
      if (!a) return;
      const amount = parseNum(a[1] || a[2]);
      if (amount < 50) return;
      out.push({ date: date || todayISO(), amount, note: msg.replace(a[0], "").trim().slice(0, 80) });
    });
    return out;
  }
  let waRows = [];
  function renderWaPreview() {
    if (!waRows.length) { $("#waPreview").innerHTML = ""; return; }
    $("#waPreview").innerHTML = `<div class="list" style="margin-top:12px">${waRows.map((r, i) => `
      <label class="wa-item">
        <input type="checkbox" data-wa="${i}" data-f="on" ${r.on ? "checked" : ""} aria-label="להוסיף">
        <span class="amt">${fmt(r.amount)}</span>
        <input type="date" value="${r.date}" data-wa="${i}" data-f="date" aria-label="תאריך">
        <span class="meta">${esc(r.note) || "&nbsp;"}${r.dup ? ' <span class="tag demo">כבר קיים</span>' : ""}</span>
      </label>`).join("")}</div>
      <div class="row"><button class="btn primary" id="waSave">הוספת ${waRows.filter((r) => r.on).length} הכנסות</button></div>
      <p class="note">אם ההודעה נשלחה למחרת יום העבודה, מתקנים את התאריך לפני ההוספה.</p>`;
  }

  // ---------- events ----------
  function openQuick(kind) {
    const f = $("#quickForm");
    f.reset();
    f.kind.value = kind; f.dataset.kind = kind;
    const today = todayISO();
    f.date.value = monthOf(today) === currentMonth ? today : `${currentMonth}-01`;
    $("#quick").showModal();
    setTimeout(() => f.amount.focus(), 50);
  }

  function initForms() {
    $("#categorySelect").innerHTML = Object.keys(CATS).filter((c) => c !== "לא מסווג" && c !== "חיוב כרטיס אשראי").map((c) => `<option>${c}</option>`).join("");
    $("#goalForm").month.value = currentMonth;

    const qf = $("#quickForm");
    $("#fab").addEventListener("click", () => openQuick($(".panel.active").id === "tab-expenses" ? "expense" : "income"));
    $$("[data-quick]").forEach((b) => b.addEventListener("click", () => openQuick(b.dataset.quick)));
    $("#quickClose").addEventListener("click", () => $("#quick").close());
    $("#quick").addEventListener("click", (e) => { if (e.target.id === "quick") $("#quick").close(); });
    qf.addEventListener("change", (e) => {
      if (e.target.name === "kind") qf.dataset.kind = qf.kind.value;
      if (e.target.name === "category") qf.vat.checked = groupOf(qf.category.value) === "biz";
    });
    qf.addEventListener("submit", (e) => {
      e.preventDefault();
      const amount = +qf.amount.value; if (!amount) return;
      const date = qf.date.value || todayISO(), note = qf.note.value.trim();
      if (qf.kind.value === "income") {
        state.income.push({ id: uid(), date, kind: qf.incomeKind.value, city: qf.city.value, amount, note });
        toast(`נוספה הכנסה של ${fmt(amount)}`);
      } else {
        const base = { id: uid(), name: note || qf.category.value, category: qf.category.value, amount, vat: qf.vat.checked };
        if (qf.fixed.checked) state.fixed.push({ ...base, start: monthOf(date) });
        else state.variable.push({ ...base, date });
        toast(`נוספה הוצאה של ${fmt(amount)}`);
      }
      currentMonth = monthOf(date);
      $("#quick").close();
      commit();
    });

    const gf = $("#goalForm");
    gf.addEventListener("submit", (e) => {
      e.preventDefault();
      state.goals[gf.month.value] = { goal: +gf.goal.value, remaining: gf.workdays.value === "" ? null : +gf.workdays.value };
      toast("היעד נשמר"); commit();
    });
    $("#vatForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const vf = e.target;
      state.settings = { licensed: vf.licensed.checked, vatRate: +vf.rate.value || 0, taxReservePct: +vf.tax.value || 0 };
      toast("נשמר"); commit();
    });

    document.addEventListener("change", (e) => {
      const sel = e.target.closest(".cat-pick");
      if (sel) {
        const item = state.variable.find((x) => x.id === sel.dataset.id); if (!item) return;
        item.category = sel.value; item.vat = groupOf(sel.value) === "biz";
        if (item.source === "bank" && item.name && !state.rules.some((r) => r.keyword === item.name)) {
          state.rules.push({ keyword: item.name, category: sel.value });
          const same = state.variable.filter((x) => x.source === "bank" && x.category === "לא מסווג" && x.name === item.name);
          same.forEach((x) => { x.category = sel.value; x.vat = item.vat; });
          toast(same.length ? `סווגו עוד ${same.length} תנועות דומות` : "המערכת תזכור את הסיווג הזה");
        }
        commit(); return;
      }
      const wa = e.target.closest("[data-wa]");
      if (wa) { const r = waRows[+wa.dataset.wa]; if (wa.dataset.f === "on") r.on = wa.checked; else r.date = wa.value; renderWaPreview(); }
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest("#waSave")) {
        const add = waRows.filter((r) => r.on);
        add.forEach((r) => state.income.push({ id: uid(), date: r.date, kind: "day", city: "", amount: r.amount, note: r.note }));
        if (add.length) currentMonth = monthOf(add[add.length - 1].date);
        waRows = []; $("#waText").value = ""; renderWaPreview();
        toast(`נוספו ${add.length} הכנסות`); commit(); return;
      }
      const b = e.target.closest("[data-del]"); if (!b) return;
      const { del, id } = b.dataset;
      if (!confirm("למחוק?")) return;
      if (del === "goal") delete state.goals[id];
      else if (del === "rule") state.rules.splice(+id, 1);
      else state[del] = state[del].filter((x) => x.id !== id);
      commit();
    });

    $("#waParse").addEventListener("click", () => {
      waRows = parseWhatsApp($("#waText").value).map((r) => {
        const dup = state.income.some((i) => i.date === r.date && i.amount === r.amount);
        return { ...r, dup, on: !dup };
      });
      if (!waRows.length) toast("לא נמצאו סכומים בהודעות");
      renderWaPreview();
    });

    $$("[data-tab]").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
    const step = (d) => { const ms = allMonths(); const i = ms.indexOf(currentMonth) + d; if (ms[i]) { currentMonth = ms[i]; $("#goalForm").month.value = currentMonth; render(); } };
    $("#monthPrev").addEventListener("click", () => step(-1));
    $("#monthNext").addEventListener("click", () => step(1));
    $("#roleSelect").addEventListener("change", (e) => { role = e.target.value; try { localStorage.setItem(STORAGE_KEY + "-role", role); } catch (_) {} applyRole(); });

    const dz = $("#dropZone");
    $("#bankFile").addEventListener("change", (e) => { runImport(Array.from(e.target.files)); e.target.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", (e) => runImport(Array.from(e.dataTransfer.files)));
    $("#sampleBtn").addEventListener("click", () => runImport([new File([SAMPLE_CSV], "דוגמה.csv", { type: "text/csv" })]));

    $("#exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `dana-deri-finance-${todayISO()}.json`; a.click();
      URL.revokeObjectURL(a.href);
    });
    $("#importInput").addEventListener("change", async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data.income || !data.fixed || !data.variable) throw new Error("bad file");
        state = { bankCredits: [], rules: DEFAULT_RULES.slice(), ...data }; toast("הנתונים נטענו"); commit();
      } catch (err) { toast("הקובץ לא תקין"); }
      e.target.value = "";
    });
    $("#resetBtn").addEventListener("click", () => {
      if (confirm("לאפס את כל הנתונים לנתוני הדמו?")) { state = seed(); commit(); }
    });
  }

  function showTab(name) {
    $$(".nav-item").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    $(".settings-btn").classList.toggle("active", name === "settings");
    $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
    window.scrollTo({ top: 0 });
  }

  function applyRole() {
    $$('[data-role="advisor"]').forEach((el) => el.classList.toggle("hidden", role !== "advisor"));
    if (role === "client" && $("#tab-settings").classList.contains("active")) showTab("flow");
  }

  function commit() { save(); render(); }

  try { role = localStorage.getItem(STORAGE_KEY + "-role") || role; } catch (_) {}
  const params = new URLSearchParams(location.search);
  if (/^\d{4}-\d{2}$/.test(params.get("month") || "")) currentMonth = params.get("month");
  if (["advisor", "client"].includes(params.get("role"))) role = params.get("role");

  initForms();
  render();
  applyRole();
  if (params.get("tab")) showTab(params.get("tab"));
})();
