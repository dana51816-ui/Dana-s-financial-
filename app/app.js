/* Dana Deri – financial demo app (v0.3). Data lives in localStorage. */
(function () {
  "use strict";

  const STORAGE_KEY = "dana-deri-finance-v5";

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
    ["העברה-נייד", "משיכה פרטית"], ["הראל פנסיה", "פנסיה וגמל"], ["מסטרקרד", "חיוב כרטיס אשראי"], ["שיק", "שכירות"], ["פייבוקס", "משיכה פרטית"],
    ["איזי ביזי", "תוכנה ותקשורת"], ["apple", "תוכנה ותקשורת"], ["וריפון", "ציוד"], ["דמי כרטיס", "עמלות בנק ואשראי"],
    ["התקשרות מחברים", "עמלות בנק ואשראי"], ["דרמלוסופי", "חומרים לטיפולים"],
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
  const CARD_NAMES = { max: "כרטיס מקס", mc: "כרטיס מסטרקרד" };
  const cardIdOf = (e) => (e.card === true ? "max" : e.card);
  function cardItem(rules, r, cardId = "max") {
    const category = categorizeWith(rules, r.name, r.extCat);
    return { id: uid(), date: r.date, txDate: r.txDate, name: r.name, note: r.note || "", inst: instOf(r.note),
      category, amount: r.amount, vat: CATS[category] === "biz", source: "bank", card: cardId };
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
        ...(window.SEED_CARD || []).map((r) => cardItem(DEFAULT_RULES, r, "max")),
        ...(window.SEED_CARD2 || []).map((r) => cardItem(DEFAULT_RULES, r, "mc")),
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
  function commitments(cardId) {
    const latest = {};
    state.variable.filter((e) => e.inst && e.inst.n < e.inst.t && (!cardId || cardIdOf(e) === cardId)).forEach((e) => {
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

  // ---------- cash-flow forecast ----------
  const pad2 = (n) => String(n).padStart(2, "0");
  const addMonths = (m, k) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
  const daysIn = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
  const dayOf = (iso) => +iso.slice(8, 10);
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
  const atDay = (m, d) => `${m}-${pad2(Math.min(d, daysIn(m)))}`;
  // Credits that move the owner's own money around are not sales.
  const isTransferIn = (desc) => (/העברה/.test(desc) && !/bit/i.test(desc)) || /פייבוקס שלי/.test(desc);

  // Months fully covered by the checking-account data (used as the history window).
  function bankMonths() {
    const ms = new Set([...state.bankCredits.map((c) => monthOf(c.date)),
      ...state.variable.filter((e) => e.source === "bank" && !e.card).map((e) => monthOf(e.date))]);
    return [...ms].sort();
  }
  const lastBankDate = () => [...state.bankCredits.map((c) => c.date), ...state.variable.filter((e) => e.source === "bank" && !e.card).map((e) => e.date)].sort().pop();

  // Recurring checking-account debits (rent cheque, loan, pension, other card companies...).
  function recurringBank() {
    const months = bankMonths(); const full = months.filter((m) => m < monthOf(lastBankDate() || todayISO()));
    const by = {};
    state.variable.filter((e) => e.source === "bank" && !e.card && !["חיוב כרטיס אשראי", "משיכה פרטית"].includes(e.category) && groupOf(e.category) !== "vat")
      .forEach((e) => { const k = e.name + "|" + (dayOf(e.date) <= 12 ? "a" : "b"); (by[k] = by[k] || []).push(e); });
    return Object.entries(by).map(([key, list]) => {
      const name = key.split("|")[0];
      const ms = new Set(list.map((e) => monthOf(e.date)));
      if (ms.size < 2) return null;
      const perMonth = full.map((m) => list.filter((e) => monthOf(e.date) === m).reduce((s, e) => s + e.amount, 0));
      return { name, category: list[0].category, day: median(list.map((e) => dayOf(e.date))), amount: perMonth.reduce((a, b) => a + b, 0) / Math.max(1, full.length) };
    }).filter(Boolean).filter((r) => r.amount > 0);
  }

  // Credit-card bill model: bill day + recurring merchants (installments and VAT are modelled separately).
  function cardModel(cardId = "max") {
    const cards = state.variable.filter((e) => e.card && cardIdOf(e) === cardId);
    const stmts = [...new Set(cards.map((e) => monthOf(e.date)))].sort();
    const billDay = median(cards.map((e) => dayOf(e.date))) || 10;
    const by = {};
    cards.filter((e) => !e.inst && groupOf(e.category) !== "vat").forEach((e) => { (by[e.name] = by[e.name] || []).push(e); });
    const items = Object.entries(by).filter(([, l]) => new Set(l.map((e) => monthOf(e.date))).size >= 2)
      .map(([name, l]) => ({ name, category: l[0].category, amount: l.reduce((s, e) => s + e.amount, 0) / Math.max(1, stmts.length) }));
    // Fixed = standing orders or stable amounts, valued at the median month (a one-off extra charge does not raise the base).
    const fixedItems = Object.entries(by).map(([name, l]) => {
      const months = [...new Set(l.map((e) => monthOf(e.date)))];
      if (months.length < 2) return null;
      const sums = months.map((m) => l.filter((e) => monthOf(e.date) === m).reduce((a, e) => a + e.amount, 0));
      const standing = l.some((e) => /הוראת קבע/.test(e.note || "")) || /קבע|דמי כרטיס|ביטוח לאומי/.test(name);
      const stable = Math.max(...sums) <= 1.3 * Math.min(...sums);
      if (!standing && !stable) return null;
      if (groupOf(l[0].category) === "private" && l[0].category === "קניות אישיות") return null;
      if (l[0].category === "נסיעות ורכב" && !standing) return null;
      return { name, category: l[0].category, amount: median(sums) };
    }).filter(Boolean);
    const fixed = fixedItems.reduce((s, i) => s + i.amount, 0);
    const spendAvg = cards.filter((e) => !e.inst && groupOf(e.category) !== "vat").reduce((s, e) => s + e.amount, 0) / Math.max(1, stmts.length);
    const variableAvg = Math.max(0, spendAvg - fixed);
    return { id: cardId, name: CARD_NAMES[cardId] || "כרטיס אשראי", billDay, items, fixedItems, fixed, variableAvg, recurring: fixed + variableAvg, stmts };
  }

  // Income model from the checking account: monthly average and how it spreads over the month.
  function incomeModel() {
    const last = monthOf(lastBankDate() || todayISO());
    const full = bankMonths().filter((m) => m < last);
    const credits = state.bankCredits.filter((c) => full.includes(monthOf(c.date)) && !isTransferIn(c.desc));
    const total = credits.reduce((s, c) => s + c.amount, 0);
    const avg = full.length ? total / full.length : state.income.reduce((s, i) => s + i.amount, 0) / Math.max(1, new Set(state.income.map((i) => monthOf(i.date))).size);
    const thirds = [0, 0, 0];
    credits.forEach((c) => { thirds[dayOf(c.date) <= 10 ? 0 : dayOf(c.date) <= 20 ? 1 : 2] += c.amount; });
    const frac = total ? thirds.map((t) => t / total) : [1 / 3, 1 / 3, 1 / 3];
    const cardDays = [...new Set(state.bankCredits.filter((c) => /מקס|אמריקן|דיינרס|ישראכרט|כאל/.test(c.desc)).map((c) => dayOf(c.date)))];
    return { avg, frac, full, cardDays: [...new Set(cardDays.map((d) => (d <= 4 ? 2 : d <= 10 ? 8 : d)))].sort((a, b) => a - b).slice(0, 3) };
  }

  // Bimonthly VAT estimate for the period ending in month `end` (paid on the 15th after, billed on the card the month after that).
  function vatEstimate(end, incomeAvg) {
    const r = state.settings.vatRate / 100; if (!state.settings.licensed) return 0;
    const months = [addMonths(end, -1), end];
    const out = months.reduce((s, m) => {
      const bank = state.bankCredits.filter((c) => monthOf(c.date) === m && !isTransferIn(c.desc)).reduce((a, c) => a + c.amount, 0);
      const g = bank || state.income.filter((i) => monthOf(i.date) === m).reduce((a, i) => a + i.amount, 0);
      return s + (g || incomeAvg) * r / (1 + r);
    }, 0);
    const cs = cashSettings();
    const inV = cs.inputVat != null && cs.vatPeriod === end ? cs.inputVat : 0;
    return Math.max(0, out - inV);
  }

  function forecast(salary, salaryDay, horizon = 3) {
    const start = lastBankDate(); if (!start) return null;
    const bal0 = state.balance ? state.balance.amount : 0;
    const cardIds = [...new Set(state.variable.filter((e) => e.card).map(cardIdOf))];
    const cards = cardIds.map((id) => ({ ...cardModel(id), cm: commitments(id) }));
    const card = cards.find((c) => c.id === "max") || cards[0] || cardModel();
    const inc = incomeModel(), rec = recurringBank();
    const startM = monthOf(start), endM = addMonths(startM, horizon);
    const fullStart = addMonths(startM, 1);
    const ev = [];
    for (let m = startM; m <= endM; m = addMonths(m, 1)) {
      [[1, 10, 0], [11, 20, 1], [21, daysIn(m), 2]].forEach(([a, b, i]) => {
        let share = 1, d = Math.round((a + b) / 2);
        if (m === startM) { const sd = dayOf(start); if (sd >= b) return; if (sd >= a) { share = (b - sd) / (b - a + 1); d = Math.max(d, sd + 1); } }
        ev.push({ date: atDay(m, d), name: "הכנסות מטיפולים", amount: inc.avg * inc.frac[i] * share, kind: "in", est: true });
      });
      rec.forEach((r) => ev.push({ date: atDay(m, r.day), name: r.name, amount: -r.amount, kind: r.category === "פנסיה וגמל" ? "self" : "out", category: r.category }));
      const [, mo] = m.split("-").map(Number);
      const vat = mo % 2 === 0 ? vatEstimate(addMonths(m, -2), inc.avg) : 0; // even months: VAT for the period two months back
      cards.forEach((c) => {
        const inst = c.cm.byMonth[m] || 0, v = c.id === card.id ? vat : 0; // VAT is paid on the main card
        ev.push({ date: atDay(m, c.billDay), name: `חיוב ${c.name}`, amount: -(c.recurring + inst + v), kind: "card", est: true,
          parts: { recurring: c.recurring, fixed: c.fixed, variable: c.variableAvg, inst, vat: v, vatPeriod: v ? addMonths(m, -2) : null } });
      });
      if (salary > 0) ev.push({ date: atDay(m, salaryDay), name: "המשכורת שלך", amount: -salary, kind: "salary" });
    }
    const list = ev.filter((e) => e.date > start && e.date <= `${endM}-31`).sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "in" ? -1 : 1));
    let bal = bal0, min = { bal: bal0, date: start };
    list.forEach((e) => { bal += e.amount; e.balance = bal; if (bal < min.bal) min = { bal, date: e.date }; });
    const months = []; for (let m = addMonths(startM, 1); m <= endM; m = addMonths(m, 1)) months.push(m);
    return { start, bal0, list, min, end: bal, inc, card, cards, rec, months };
  }

  // Salary is a target that must pass a liquidity test; it is never approved automatically.
  function cashSettings() {
    return { target: 6500, day: 25, paydown: 1500, cushion: 2000, limit: null, receipts: null, extra: null, inputVat: null, vatPeriod: "2026-10", approved: false, ...(state.settings.cash || {}) };
  }

  // Can the owner draw her salary in the coming 22–25 window and still cover everything due until the 15th after it?
  function liquidityTest() {
    const cs = cashSettings();
    const f = forecast(0, cs.day); if (!f) return null;
    const sd = dayOf(f.start), m0 = monthOf(f.start);
    const drawMonth = sd <= cs.day ? m0 : addMonths(m0, 1);
    const drawDate = atDay(drawMonth, cs.day), periodEnd = atDay(addMonths(drawMonth, 1), 15);
    const inPeriod = f.list.filter((e) => e.date > f.start && e.date <= periodEnd);
    const lines = [];
    const addLine = (label, amount, sure, note = "") => { if (amount > 0.5) lines.push({ label, amount, sure, note }); };
    const sumBy = (fn) => inPeriod.filter(fn).reduce((a, e) => a - e.amount, 0);
    addLine("שכירות הקליניקה (1 לחודש)", sumBy((e) => e.category === "שכירות"), "מאומת");
    f.cards.forEach((c) => {
      const bills = inPeriod.filter((e) => e.kind === "card" && e.name === `חיוב ${c.name}`);
      addLine(`${c.name}: תשלומים לספקים`, bills.reduce((a, e) => a + e.parts.inst, 0), "ידוע");
      addLine(`${c.name}: חיובים קבועים`, bills.reduce((a, e) => a + e.parts.fixed, 0), "אומדן לפי חיובים קודמים");
      addLine(`${c.name}: הוצאות משתנות (דלק, קניות, חומרים)`, bills.reduce((a, e) => a + e.parts.variable, 0), "אומדן לפי ממוצע");
      bills.filter((e) => e.parts.vat).forEach((e) => addLine(`מע"מ ${shortMonth(addMonths(e.parts.vatPeriod, -1))}–${shortMonth(e.parts.vatPeriod)} שיורד בכרטיס`, e.parts.vat,
        cs.inputVat != null ? "לפי רו\"ח" : "משוער, לפני קיזוז תשומות", cs.inputVat != null ? "" : "המע\"מ הגלום בתקבולים בבנק. אחרי קיזוז מע\"מ התשומות מרו\"ח הסכום יירד"));
    });
    addLine("הלוואה (קרן + ריבית)", sumBy((e) => e.category === "הלוואות"), "אומדן לפי נובמבר");
    addLine("פנסיה וגמל", sumBy((e) => e.category === "פנסיה וגמל"), "נצפה כל חודש");
    addLine("עמלות בנק", sumBy((e) => e.category === "עמלות בנק ואשראי"), "אומדן");
    const other = sumBy((e) => e.amount < 0 && e.kind !== "card" && !["שכירות", "הלוואות", "פנסיה וגמל", "עמלות בנק ואשראי"].includes(e.category));
    addLine("חיובים קבועים אחרים", other, "אומדן");
    const obligations = lines.reduce((a, l) => a + l.amount, 0);
    const estReceipts = inPeriod.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
    const receipts = cs.receipts != null ? cs.receipts : estReceipts;
    const extra = cs.extra || 0;
    const projected = f.bal0 + receipts - obligations - extra;
    const paydownFloor = f.bal0 + cs.paydown;
    const limitFloor = cs.limit != null ? -cs.limit + cs.cushion : null;
    const floor = limitFloor != null ? Math.max(paydownFloor, limitFloor) : paydownFloor;
    const available = Math.max(0, Math.floor((projected - floor) / 50) * 50);
    const missing = [];
    if (cs.limit == null) missing.push("מסגרת המינוס המאושרת בבנק");
    if (cs.receipts == null) missing.push(`תקבולים ודאיים עד ${fmtDay(periodEnd)} (מהסליקה ומהיומן, בלי העברות עצמיות)`);
    if (cs.extra == null) missing.push(`הוצאות נוספות עד ${fmtDay(periodEnd)} (ספקים, רכישות חדשות)`);
    if (cs.inputVat == null) missing.push("מע\"מ תשומות לקיזוז, מרו\"ח");
    return { cs, f, drawDate, periodEnd, lines, obligations, receipts, estReceipts, extra, projected, floor, paydownFloor, limitFloor, available, missing,
      covers: available >= cs.target };
  }

  // ---------- render ----------
  const icon = (id) => `<svg class="i"><use href="#i-${id}"/></svg>`;
  const delBtn = (kind, id) => `<button class="del" data-del="${kind}" data-id="${id}" aria-label="מחיקה">${icon("trash")}</button>`;
  const dot = (g) => `<i class="dot${g === "left" ? " light" : ""}" style="background:${GROUP_COLORS[g]}"></i>`;

  function render() {
    renderMonthNav();
    renderFlow();
    renderCash();
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
    const c = calc(currentMonth), g = state.goals[currentMonth];
    const unexplained = !r.hasAccount && r.left > 0;
    const partial = currentMonth === monthOf(todayISO());
    const goalHtml = g && g.goal ? (() => {
      const ratio = c.gross / g.goal, gap = Math.max(0, g.goal - c.gross), daily = g.remaining > 0 && gap ? gap / g.remaining : null;
      return `<div class="hero-goal"><div class="hbar" role="progressbar" aria-valuenow="${Math.round(ratio * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100, ratio * 100)}%"></i></div>
        <div class="hero-goal-t">${Math.round(ratio * 100)}% מהיעד של ${fmt(g.goal)}${gap ? ` · חסרים ${fmt(gap)}` : " · היעד הושג"}${daily ? ` · ${fmt(daily)} ליום עבודה` : ""}</div></div>`;
    })() : `<div class="hero-goal-t">עוד לא נקבע יעד לחודש הזה</div>`;
    $("#monthHero").innerHTML = `
      <div class="hero-k">הכנסות ב${monthName(currentMonth)}</div>
      <div class="hero-num">${fmt(r.gross)}</div>
      ${goalHtml}
      ${r.gross ? `<div class="hero-figs">
        <div><span>יצא</span><b>${fmt(r.out)}</b></div>
        <div><span>${unexplained ? "עוד לא ידוע לאן" : r.left >= 0 ? "נשאר לך" : "יצא יותר ממה שנכנס"}</span><b>${fmt(r.left)}</b></div>
      </div>` : ""}
      ${unexplained ? `<p class="hero-note">כדי לדעת לאן הלך כל השאר, צריך את דף העו"ש של החודש.</p>` : partial && r.gross ? `<p class="hero-note">החודש עוד לא נגמר: חלק מההכנסות עוד לא נכנסו, וחלק מההוצאות כבר ירדו.</p>` : ""}`;
    if (!r.gross) {
      $("#flowBar").innerHTML = ""; $("#flowLegend").innerHTML = "";
      $("#flowList").innerHTML = `<p class="empty">${r.cardTotal ? `בחודש הזה יצאו ${fmt(r.cardTotal)} בכרטיסי האשראי, אבל אין דיווח הכנסות.` : "כשיהיו הכנסות והוצאות, כאן יופיע לאן הלך כל שקל."}</p>`;
      $("#flowInsightsWrap").style.display = "none";
      return;
    }

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
    if (g && g.goal && c.gross >= g.goal) tips.push(`היעד של ${fmt(g.goal)} הושג.`);
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

  const fmtDay = (iso) => `${dayOf(iso)}.${+iso.slice(5, 7)}`;

  function renderCash() {
    const t = liquidityTest();
    if (!t) { $("#salaryCard").innerHTML = `<p class="empty">כדי לבנות תזרים צריך לייבא דף עו"ש מהבנק.</p>`; ["#cashWarn", "#cashChart", "#cashRoutine", "#cashList", "#cashWeeks"].forEach((x) => ($(x).innerHTML = "")); $("#cashWarn").style.display = "none"; return; }
    const cs = t.cs;
    // the simulation below uses the target salary in the 22–25 window
    const f = forecast(cs.target, cs.day);
    const ss = { day: cs.day };
    const salary = cs.target;

    // 1. salary: approved amount for Dana, liquidity test for the advisor
    const window = `${cs.day - 3}–${cs.day} לחודש`;
    if (role === "client") {
      $("#salaryCard").innerHTML = cs.approved
        ? `<h2>המשכורת שלך</h2><div class="salary-amt">${fmt(cs.target)}</div>
           <p class="salary-when">ב-<b>${window}</b>, אחרי ששמרנו בצד את כל מה שיורד עד ה-15 בחודש הבא</p>
           <p class="note">מעבירים את הסכום לחשבון הפרטי, ומשם הוא שלך. בחשבון העסקי לא נוגעים עד המשכורת הבאה.</p>`
        : `<h2>המשכורת שלך</h2><p class="salary-when">המשכורת הקבועה תיקבע אחרי בדיקה משותפת עם היועצת.</p>
           <p class="note">עד אז: לא מושכים מהחשבון העסקי באמצע החודש, ובטח לא ב-15, יום שבו יורדת גם הפנסיה.</p>`;
    } else {
      const statusCls = t.missing.length ? "pending" : t.covers ? "ok" : "short";
      const statusText = t.missing.length ? "עוד אי אפשר לאשר: חסרים נתונים" : t.covers ? `אפשר להעביר את משכורת היעד ב-${fmtDay(t.drawDate)}` : `אפשר להעביר רק עד ${fmt(t.available)}, פחות מהיעד`;
      $("#salaryCard").innerHTML = `
        <h2>בדיקת משכורת לפני ${fmtDay(t.drawDate)}</h2>
        <div class="salary-amt">${fmt(cs.target)}</div>
        <p class="salary-when">משכורת יעד לבדיקה${cs.approved ? ' · <span class="tag">אושרה</span>' : ' · <span class="tag demo">לא מאושרת</span>'}</p>
        <p class="status ${statusCls}">${statusText}</p>
        <table class="liq">
          <tr><td>יתרה בבנק ב-${fmtDay(t.f.start)}</td><td class="num">${fmt(t.f.bal0)}</td><td class="sure">בפועל</td></tr>
          <tr><td>תקבולים עד ${fmtDay(t.periodEnd)}</td><td class="num pos">${fmt(t.receipts)}</td><td class="sure">${cs.receipts != null ? "ודאי, לפי היועצת" : "אומדן לפי ממוצע, לא ודאי"}</td></tr>
          ${t.lines.map((l) => `<tr><td>${esc(l.label)}${l.note ? `<small>${esc(l.note)}</small>` : ""}</td><td class="num">${fmt(-l.amount)}</td><td class="sure">${esc(l.sure)}</td></tr>`).join("")}
          ${cs.extra != null ? `<tr><td>הוצאות נוספות</td><td class="num">${fmt(-t.extra)}</td><td class="sure">לפי היועצת</td></tr>` : ""}
          <tr class="sub"><td>יתרה צפויה ב-${fmtDay(t.periodEnd)} לפני משכורת</td><td class="num">${fmt(t.projected)}</td><td></td></tr>
          <tr class="sub"><td>היתרה שאסור לרדת ממנה${t.limitFloor != null ? ` (מסגרת ${fmt(-cs.limit)} + כרית ${fmt(cs.cushion)})` : ""}, כולל הקטנת מינוס של ${fmt(cs.paydown)}</td><td class="num">${fmt(t.floor)}</td><td></td></tr>
          <tr class="total"><td>אפשר להעביר כמשכורת</td><td class="num">${fmt(t.available)}</td><td class="sure">${t.missing.length ? "לפי נתונים חלקיים" : "בדיקה מלאה"}</td></tr>
        </table>
        ${t.missing.length ? `<div class="missing"><b>כדי לאשר משכורת, חסר:</b><ul>${t.missing.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>` : ""}
        <p class="note">סדר העבודה: קובעים משכורת יעד, שומרים בצד מע"מ ומסים, ממפים את החיובים עד ה-15, ורק אז מאשרים העברה במועד קבוע. זה מבחן נזילות לחודש אחד, לא קביעת גובה שכר.</p>`;
    }

    // 2. warning about the tightest point
    const low = state.balance ? state.balance.low : 0;
    const bill = f.list.filter((e) => e.kind === "card").sort((a, b) => a.amount - b.amount)[0];
    const warn = f.min.bal < low;
    $("#cashWarn").style.display = warn ? "" : "none";
    if (warn) $("#cashWarn").innerHTML = `<h2>נקודה לחוצה ב-${fmtDay(f.min.date)}</h2>
      <p>החשבון צפוי לרדת ל-<b>${fmt(f.min.bal)}</b>, נמוך יותר מכל מה שהיה עד היום (${fmt(low)}).
      ${bill ? `הסיבה: בחיוב האשראי של ${fmtDay(bill.date)} יורדים יחד ${bill.parts.vat ? `מע"מ של חודשיים (כ-${fmt(bill.parts.vat)}), ` : ""}${bill.parts.inst ? `תשלומים לספקים (${fmt(bill.parts.inst)}) ` : ""}וההוצאות הקבועות בכרטיס.` : ""}</p>
      <p class="note">מה אפשר לעשות: לא לפתוח עסקאות חדשות בתשלומים, ולשים בצד בכל שבוע חלק מההכנסות בשביל המע"מ.</p>`;

    // 3. balance chart (step line)
    const pts = [{ date: f.start, bal: f.bal0 }, ...f.list.map((e) => ({ date: e.date, bal: e.balance }))];
    const t0 = new Date(f.start).getTime(), t1 = new Date(pts[pts.length - 1].date).getTime();
    const W = 640, H = 220, L = 8, R = 8, T = 16, B = 26;
    const vals = pts.map((p) => p.bal); const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const x = (d) => W - R - ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - L - R);
    const y = (v) => T + ((hi - v) / Math.max(1, hi - lo)) * (H - T - B);
    let dPath = `M ${x(pts[0].date)} ${y(pts[0].bal)}`;
    for (let i = 1; i < pts.length; i++) dPath += ` H ${x(pts[i].date)} V ${y(pts[i].bal)}`;
    const area = `${dPath} V ${y(0)} H ${x(pts[0].date)} Z`;
    const ticks = f.months.map((m) => `<line x1="${x(m + "-01")}" x2="${x(m + "-01")}" y1="${T}" y2="${H - B}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="${x(m + "-01")}" y="${H - 8}" text-anchor="middle">${shortMonth(m)}</text>`).join("");
    const sal = f.list.filter((e) => e.kind === "salary").map((e) => `<circle cx="${x(e.date)}" cy="${y(e.balance)}" r="3.5" fill="var(--mauve-deep)"><title>משכורת ${fmtDay(e.date)}</title></circle>`).join("");
    $("#cashChart").innerHTML = `
      <div class="legend"><span><i class="dot" style="background:var(--mauve)"></i>יתרה צפויה</span><span><i class="dot" style="background:var(--mauve-deep)"></i>יום משכורת</span><span><i class="dot" style="background:var(--bad)"></i>הנקודה הנמוכה</span></div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="יתרה צפויה">
        <defs><linearGradient id="gBal" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#B28C7F" stop-opacity=".05"/><stop offset="1" stop-color="#B28C7F" stop-opacity=".28"/></linearGradient></defs>
        ${ticks}
        <line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink)" stroke-width=".8"/>
        <text x="${L}" y="${y(0) - 6}" text-anchor="start" style="fill:var(--ink)">0</text>
        <path d="${area}" fill="url(#gBal)"/>
        <path d="${dPath}" fill="none" stroke="var(--mauve)" stroke-width="1.8" stroke-linejoin="round"/>
        ${sal}
        <circle cx="${x(f.min.date)}" cy="${y(f.min.bal)}" r="4.5" fill="var(--bad)"/>
        <text x="${x(f.min.date)}" y="${Math.min(H - B - 4, y(f.min.bal) + 18)}" text-anchor="middle" style="fill:var(--bad)">${Math.round(f.min.bal).toLocaleString("he-IL")}</text>
        <circle cx="${x(f.start)}" cy="${y(f.bal0)}" r="3.5" fill="var(--ink)"/>
      </svg>
      <p class="note">היום (${fmtDay(f.start)}): ${fmt(f.bal0)}. בסוף ${monthName(f.months[f.months.length - 1])}: <b>${fmt(f.end)}</b>.</p>`;

    renderCommitments();

    // 3b. 13-week table (Sunday to Saturday), as in the advisor's 90-day plan
    const weekStart = (iso) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() - d.getDay()); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
    const weeks = []; let wb = f.bal0;
    for (let i = 0; i < 13; i++) {
      const d0 = new Date(weekStart(f.start) + "T00:00:00"); d0.setDate(d0.getDate() + 7 * i);
      const ws = `${d0.getFullYear()}-${pad2(d0.getMonth() + 1)}-${pad2(d0.getDate())}`;
      const ev = f.list.filter((e) => weekStart(e.date) === ws);
      const inn = ev.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0), out = ev.filter((e) => e.amount < 0).reduce((a, e) => a + e.amount, 0);
      wb += inn + out;
      weeks.push({ ws, inn, out, end: wb, sal: ev.some((e) => e.kind === "salary"), big: ev.filter((e) => e.amount < -1500).map((e) => e.name) });
    }
    $("#cashWeeks").innerHTML = `<table class="weeks"><tr><th>שבוע</th><th class="num">נכנס</th><th class="num">יוצא</th><th class="num">יתרה בסוף</th><th class="hide-sm">חיובים גדולים</th></tr>
      ${weeks.map((w) => `<tr class="${w.end <= f.min.bal + 1 ? "low" : ""}"><td>${fmtDay(w.ws)}${w.sal ? ' <span class="tag">משכורת</span>' : ""}</td><td class="num">${w.inn ? fmt(w.inn) : "—"}</td><td class="num">${w.out ? fmt(w.out) : "—"}</td>
      <td class="num ${w.end < 0 ? "neg" : "pos"}">${fmt(w.end)}</td><td class="hide-sm muted-col">${w.big.map(esc).join(", ")}</td></tr>`).join("")}</table>`;

    // 4. monthly routine, as agreed in the advisor's cash calendar
    const fx = (c) => fmt(c);
    const recSum = (cat, pred = () => true) => f.rec.filter((r) => r.category === cat && pred(r)).reduce((a, r) => a + r.amount, 0);
    const maxC = f.cards.find((c) => c.id === "max"), mcC = f.cards.find((c) => c.id === "mc");
    const nextM = f.months[0];
    const routine = [
      ["1", [[`שכירות הקליניקה: ${fx(recSum("שכירות"))}`, "out", "מאומת"]]],
      ["2", [...(mcC ? [[`חיוב הכרטיס השני: כ-${fx(mcC.fixed + (mcC.cm.byMonth[nextM] || 0))}`, "out", "אומדן"]] : []), ["זיכוי מסליקת אשראי", "in", "נצפה, לא מובטח"]]],
      ["3–4", [[`עמלות בנק: כ-${fx(recSum("עמלות בנק ואשראי"))}`, "out", "אומדן"]]],
      ["8", [["זיכוי מסליקת אשראי. בודקים כמה נכנס לפני חיוב מקס", "in", "נצפה, לא מובטח"]]],
      ["9", [["בודקים יתרה ומסגרת פנויה לפני ה-10–11", "action", "פעולה"]]],
      ["10–11", [
        ...(maxC ? [[`מקס: תשלומים לספקים ${fx(maxC.cm.byMonth[nextM] || 0)} + חיובים קבועים כ-${fx(maxC.fixed)}, ועוד הוצאות משתנות`, "out", "ידוע + אומדן"]] : []),
        [`הלוואה: ${fx(recSum("הלוואות"))}`, "out", "אומדן"], [`פנסיה וגמל: ${fx(recSum("פנסיה וגמל", (r) => r.day <= 12))}`, "out", "נצפה"]]],
      ["15", [[`פנסיה וגמל: ${fx(recSum("פנסיה וגמל", (r) => r.day > 12))}. לא מושכים משכורת ביום הזה`, "out", "נצפה"], ["כל חודשיים: תשלום מע\"מ, שיורד בחיוב האשראי של החודש הבא", "note", ""]]],
      [`${cs.day - 3}–${cs.day}`, [[`חלון המשכורת: מעבירים ${cs.approved ? fx(cs.target) : "את הסכום שאושר"} רק אחרי ששמרנו בצד את כל מה שיורד עד ה-15 בחודש הבא`, "salary", "מדיניות"]]],
      ["25–30", [["מכינים את תחילת החודש: סוגרים תזרים עד ה-15 הבא", "action", "פעולה"]]],
    ];
    $("#cashRoutine").innerHTML = `<div class="routine">${routine.map(([d, items]) => `
      <div class="rday"><span class="rnum ${items.some((x) => x[1] === "salary") ? "sal" : ""}">${d}</span>
      <div class="rtext">${items.map(([text, kind, sure]) => `<div class="r-${kind}">${text}${sure ? ` <span class="sure-tag">${sure}</span>` : ""}</div>`).join("")}</div></div>`).join("")}</div>
      <p class="note">מועדי הסליקה נצפו בספטמבר עד נובמבר, ואין התחייבות שהם קבועים. ${Math.round(f.inc.frac[0] * 100)}% מהתקבולים נכנסו בעשרת הימים הראשונים של החודש.</p>`;

    // 5. upcoming events, next ~45 days
    const until = new Date(new Date(f.start).getTime() + 46 * 864e5).toISOString().slice(0, 10);
    const up = f.list.filter((e) => e.date <= until);
    let lastM = "";
    $("#cashList").innerHTML = `<div class="list">${up.map((e) => {
      const head = monthOf(e.date) !== lastM ? `<div class="list-month">${monthName(lastM = monthOf(e.date))}</div>` : "";
      const meta = e.parts ? `קבועות ${fmt(e.parts.recurring)}${e.parts.inst ? ` · תשלומים ${fmt(e.parts.inst)}` : ""}${e.parts.vat ? ` · מע"מ ${fmt(e.parts.vat)}` : ""}` : e.kind === "in" ? "ממוצע לפי החודשים הקודמים" : "";
      return `${head}<div class="item ev-${e.kind}"><span class="t"><span class="dchip">${fmtDay(e.date)}</span>${esc(e.name)}${e.est ? ' <span class="tag">צפי</span>' : ""}</span>
        <span class="meta">${meta}${meta ? " · " : ""}יתרה אחרי: ${fmt(e.balance)}</span><span class="amt ${e.amount > 0 ? "pos" : ""}">${fmt(e.amount)}</span><span></span></div>`;
    }).join("")}</div>`;

    const sf = $("#salaryForm");
    ["target", "day", "paydown", "cushion", "limit", "receipts", "extra", "inputVat"].forEach((k) => { sf[k].value = cs[k] ?? ""; });
    sf.approved.checked = !!cs.approved;
    $("#cashModelNote").innerHTML = `הגרף והטבלה הם סימולציה עם משכורת היעד ב-${cs.day} לחודש, ולא תחזית מאומתת. הצפי מחושב לפי: הכנסה ממוצעת של ${fmt(f.inc.avg)} בחודש (${f.inc.full.map(shortMonth).join(" ו")}, לפי הבנק, בלי העברות פנימיות), ${f.rec.length} חיובים קבועים מהעו"ש, חיובים קבועים וממוצעים בכרטיסי האשראי (${f.cards.map((c) => `${c.name} ${fmt(c.recurring)}`).join(", ")}), תשלומים שכבר נקבעו ומע"מ דו-חודשי משוער.`;
  }

  function stat(label, value, sub) {
    return `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
  }

  function renderDashboard() {
    const c = calc(currentMonth);
    $("#kpis").innerHTML = [
      stat("הכנסה בלי מע\"מ", fmt(c.netIncome), state.settings.licensed ? `מתוך ${fmt(c.gross)} כולל מע"מ` : "&nbsp;"),
      stat("הוצאות העסק", fmt(c.expenses), c.fixedNet ? `קבועות ${fmt(c.fixedNet)}` : "בלי מע\"מ, מסים ומשיכות"),
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

    $("#salaryForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const sf = e.target, num = (k) => (sf[k].value === "" ? null : +sf[k].value);
      state.settings.cash = { ...cashSettings(), target: num("target") ?? 6500, day: Math.min(28, Math.max(4, num("day") ?? 25)), paydown: num("paydown") ?? 0,
        cushion: num("cushion") ?? 0, limit: num("limit"), receipts: num("receipts"), extra: num("extra"), inputVat: num("inputVat"), approved: sf.approved.checked };
      toast("ההגדרה נשמרה"); commit();
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
