/* Dana Deri – financial demo app (v0.2). Data lives in localStorage. */
(function () {
  "use strict";

  const STORAGE_KEY = "dana-deri-finance-v2";

  // Category -> group. Groups drive the "where did the money go" view.
  const CATS = {
    "שכירות": "biz", "חומרים לטיפולים": "biz", "מוצרים למכירה": "biz", "הנהלת חשבונות": "biz",
    "ביטוח ורישוי": "biz", "שיווק": "biz", "תוכנה ותקשורת": "biz", "נסיעות ורכב": "biz",
    "השתלמויות": "biz", "עמלות בנק ואשראי": "biz", "אחר": "biz",
    "הלוואות": "loan",
    "תשלום מע\"מ": "vat", "מקדמות מס וביטוח לאומי": "tax",
    "משיכה פרטית": "private",
    "לא מסווג": "unknown",
  };
  const GROUP_COLORS = {
    vat: "var(--c-vat)", tax: "var(--c-tax)", biz: "var(--c-biz)", loan: "var(--c-loan)",
    private: "var(--c-private)", unknown: "var(--c-unknown)", left: "var(--c-left)",
  };
  const DEFAULT_RULES = [
    ["מע\"מ", "תשלום מע\"מ"], ["מעמ", "תשלום מע\"מ"],
    ["ביטוח לאומי", "מקדמות מס וביטוח לאומי"], ["מס הכנסה", "מקדמות מס וביטוח לאומי"],
    ["שכר דירה", "שכירות"], ["שכירות", "שכירות"], ["רו\"ח", "הנהלת חשבונות"], ["חשבון פרטי", "משיכה פרטית"],
    ["כספומט", "משיכה פרטית"], ["משיכת מזומן", "משיכה פרטית"],
    ["הלוואה", "הלוואות"], ["עמלה", "עמלות בנק ואשראי"], ["עמלת", "עמלות בנק ואשראי"],
    ["דלק", "נסיעות ורכב"], ["פז ", "נסיעות ורכב"], ["סונול", "נסיעות ורכב"], ["דור אלון", "נסיעות ורכב"],
    ["facebook", "שיווק"], ["meta", "שיווק"], ["easy", "תוכנה ותקשורת"],
    ["בזק", "תוכנה ותקשורת"], ["פרטנר", "תוכנה ותקשורת"], ["סלקום", "תוכנה ותקשורת"],
  ].map(([keyword, category]) => ({ keyword, category }));

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
        { id: uid(), date: "2026-10-31", kind: "month", city: "", amount: 24080, note: "סיכום אוקטובר שדנה דרעי דיווחה ב-29–30.10" },
        { id: uid(), date: "2026-11-14", kind: "month", city: "", amount: 10800, note: "סך הכל עד 14.11 (כולל 1,400 ₪ ב-10.11)" },
        { id: uid(), date: "2026-11-15", kind: "day", city: "", amount: 2040, note: "11 גבות ושפם, 5 עיצובי גבות (דווח 16.11)" },
      ],
      fixed: [
        { id: uid(), name: "שכירות חדר – ראשון לציון", category: "שכירות", amount: 2500, vat: false, start: "2026-08", demo: true },
        { id: uid(), name: "שכירות חדר – מודיעין", category: "שכירות", amount: 3000, vat: false, start: "2026-08", demo: true },
        { id: uid(), name: "הנהלת חשבונות", category: "הנהלת חשבונות", amount: 700, vat: true, start: "2026-08", demo: true },
        { id: uid(), name: "ביטוח אחריות מקצועית", category: "ביטוח ורישוי", amount: 350, vat: false, start: "2026-08", demo: true },
        { id: uid(), name: "יומן תורים ו-Easy Bizy", category: "תוכנה ותקשורת", amount: 150, vat: true, start: "2026-08", demo: true },
        { id: uid(), name: "טלפון ואינטרנט", category: "תוכנה ותקשורת", amount: 200, vat: true, start: "2026-08", demo: true },
        { id: uid(), name: "שיווק ופרסום", category: "שיווק", amount: 800, vat: true, start: "2026-08", demo: true },
        { id: uid(), name: "נסיעות בין הערים", category: "נסיעות ורכב", amount: 1500, vat: false, start: "2026-08", demo: true },
        { id: uid(), name: "החזר הלוואה", category: "הלוואות", amount: 1300, vat: false, start: "2026-08", demo: true },
      ],
      variable: [
        { id: uid(), date: "2026-11-05", name: "הזמנת חומרים", category: "חומרים לטיפולים", amount: 900, vat: true, demo: true },
        { id: uid(), date: "2026-11-08", name: "רכש תכשירים למכירה", category: "מוצרים למכירה", amount: 1200, vat: true, demo: true },
        { id: uid(), date: "2026-10-12", name: "הזמנת חומרים", category: "חומרים לטיפולים", amount: 1100, vat: true, demo: true },
        { id: uid(), date: "2026-10-20", name: "משיכות למזומן ולחשבון הפרטי", category: "משיכה פרטית", amount: 4000, vat: false, demo: true },
        { id: uid(), date: "2026-08-20", name: "הזמנת חומרים", category: "חומרים לטיפולים", amount: 950, vat: true, demo: true },
      ],
      bankCredits: [],
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
  const fmt = (n) => (n < 0 ? "−" : "") + Math.round(Math.abs(n)).toLocaleString("he-IL") + " ₪";
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
    const priv = sumGroup("private"); if (priv) steps.push({ label: "משיכות פרטיות", amount: priv, group: "private" });
    const unk = sumGroup("unknown"); if (unk) steps.push({ label: "לא מסווג – צריך לברר", amount: unk, group: "unknown" });

    const out = steps.reduce((s, x) => s + x.amount, 0);
    const left = gross - out;
    return { gross, steps, out, left, hasDemo: all.some((e) => e.demo), unknownCount: all.filter((e) => groupOf(e.category) === "unknown").length };
  }

  // ---------- render ----------
  function render() {
    renderMonthSelect();
    $$(".monthLabel").forEach((el) => (el.textContent = monthName(currentMonth)));
    renderFlow();
    renderDashboard();
    renderIncome();
    renderExpenses();
    renderBank();
    renderSettings();
  }

  function renderMonthSelect() {
    $("#monthSelect").innerHTML = allMonths().map((m) => `<option value="${m}" ${m === currentMonth ? "selected" : ""}>${monthName(m)}</option>`).join("");
  }

  function renderFlow() {
    const r = moneyFlow(currentMonth);
    if (!r.gross) {
      $("#flowHeadline").innerHTML = `<p class="empty">אין הכנסות ב${monthName(currentMonth)}. מזינים הכנסות או מייבאים תנועות מהבנק.</p>`;
      $("#flowBar").innerHTML = ""; $("#flowList").innerHTML = ""; $("#flowInsights").innerHTML = ""; return;
    }
    const per100 = (v) => Math.round((v / r.gross) * 100);
    $("#flowHeadline").innerHTML = r.left >= 0
      ? `ב${monthName(currentMonth)} נכנסו <b>${fmt(r.gross)}</b>. אחרי כל מה שיצא נשארו <b class="pos">${fmt(r.left)}</b>, כלומר <b>${per100(r.left)} ₪ מכל 100 ₪</b>.`
      : `ב${monthName(currentMonth)} נכנסו <b>${fmt(r.gross)}</b>, ויצאו <b class="neg">${fmt(-r.left)}</b> יותר ממה שנכנס.`;

    const segs = [...r.steps, ...(r.left > 0 ? [{ label: "נשאר", amount: r.left, group: "left" }] : [])];
    const total = Math.max(r.gross, r.out);
    $("#flowBar").innerHTML = `<div class="stack">${segs.map((s) =>
      `<div style="width:${(s.amount / total) * 100}%;background:${GROUP_COLORS[s.group]}" title="${esc(s.label)}: ${fmt(s.amount)}"></div>`).join("")}</div>`;

    let running = r.gross;
    $("#flowList").innerHTML = `<table class="flow">
      <tr><th>לאן</th><th class="num">סכום</th><th class="num">מכל 100 ₪</th><th class="num">נשאר אחרי</th></tr>
      <tr class="start"><td><i class="dot" style="background:var(--c-in)"></i>נכנס לעסק (כולל מע"מ)</td><td class="num">${fmt(r.gross)}</td><td class="num">100</td><td class="num">${fmt(r.gross)}</td></tr>
      ${r.steps.map((s) => { running -= s.amount; return `<tr>
        <td><i class="dot" style="background:${GROUP_COLORS[s.group]}"></i>${esc(s.label)}${s.estimate ? '<span class="tag">הערכה</span>' : ""}</td>
        <td class="num">${fmt(-s.amount)}</td><td class="num">${per100(s.amount)}</td>
        <td class="num ${running < 0 ? "neg" : ""}">${fmt(running)}</td></tr>`; }).join("")}
      <tr class="total"><td>נשאר לדנה דרעי</td><td class="num ${r.left >= 0 ? "pos" : "neg"}">${fmt(r.left)}</td><td class="num">${per100(r.left)}</td><td></td></tr>
    </table>`;

    const notMine = r.steps.filter((s) => s.group === "vat" || s.group === "tax").reduce((a, s) => a + s.amount, 0);
    const bizTop = r.steps.filter((s) => s.group === "biz")[0];
    const tips = [];
    if (notMine) tips.push(`<b>${fmt(notMine)}</b> (${per100(notMine)} ₪ מכל 100 ₪) הם מע"מ ומסים. הכסף הזה נכנס לחשבון אבל הוא לא שלה. מומלץ להעביר אותו לחשבון נפרד ביום שהוא נכנס.`);
    if (bizTop) tips.push(`ההוצאה העסקית הגדולה ביותר: <b>${esc(bizTop.label)}</b>, ${fmt(bizTop.amount)} (${per100(bizTop.amount)} ₪ מכל 100 ₪).`);
    const priv = r.steps.find((s) => s.group === "private");
    if (priv) tips.push(`משיכות פרטיות: <b>${fmt(priv.amount)}</b>. כדאי לקבוע משכורת קבועה לעצמה במקום משיכות לפי הצורך.`);
    if (r.unknownCount) tips.push(`<b>${r.unknownCount}</b> תנועות לא מסווגות. מסווגים אותן במסך "ייבוא מהבנק".`);
    if (r.hasDemo) tips.push(`<span class="tag demo">דמו</span> חלק מההוצאות בחודש הזה הן נתוני דמה.`);
    $("#flowInsights").innerHTML = tips.length ? `<ul class="tips">${tips.map((t) => `<li>${t}</li>`).join("")}</ul>` : "";
  }

  function renderDashboard() {
    const c = calc(currentMonth);
    $("#kpis").innerHTML = [
      kpi("מחזור (כולל מע\"מ)", fmt(c.gross), state.settings.licensed ? `ללא מע"מ: ${fmt(c.netIncome)}` : ""),
      kpi("הוצאות עסק", fmt(c.expenses), `קבועות ${fmt(c.fixedNet)} · משתנות ${fmt(c.varNet)}`),
      kpi("רווח לפני מס", `<span class="${c.profit >= 0 ? "pos" : "neg"}">${fmt(c.profit)}</span>`, `רווחיות ${pct(c.margin)}`),
      kpi("נקודת איזון", fmt(c.breakEvenGross), "מחזור שנדרש לכיסוי ההוצאות הקבועות"),
    ].join("");

    const g = state.goals[currentMonth];
    if (g && g.goal) {
      const ratio = c.gross / g.goal, gap = Math.max(0, g.goal - c.gross);
      const daily = g.remaining > 0 ? gap / g.remaining : null;
      $("#goalCard").innerHTML = `
        <h3>יעד ${monthName(currentMonth)}</h3>
        <div class="progress"><div style="width:${Math.min(100, ratio * 100)}%"></div></div>
        <div class="goal-row">
          <span>בפועל <b>${fmt(c.gross)}</b> מתוך <b>${fmt(g.goal)}</b> (${pct(ratio)})</span>
          <span>חסר ליעד <b>${fmt(gap)}</b></span>
          <span>ימי עבודה שנותרו <b>${g.remaining ?? "—"}</b></span>
          <span>יעד יומי נדרש <b>${daily != null ? fmt(daily) : "—"}</b></span>
        </div>`;
    } else {
      $("#goalCard").innerHTML = `<h3>יעד ${monthName(currentMonth)}</h3><p class="empty">עוד לא הוגדר יעד לחודש הזה.</p>`;
    }

    renderTrend();
    const rows = Object.entries(c.byCat).sort((a, b) => b[1] - a[1]);
    const max = rows.length ? rows[0][1] : 1;
    $("#expenseBreakdown").innerHTML = rows.length ? `<div class="bars">${rows.map(([cat, v]) =>
      `<div class="bar-row"><span>${esc(cat)}</span><div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div><span class="amt">${fmt(v)}</span></div>`).join("")}</div>`
      : `<p class="empty">אין הוצאות בחודש הזה.</p>`;

    $("#plMonth").textContent = monthName(currentMonth);
    const vatLine = state.settings.licensed
      ? `<tr class="sub"><td>פחות מע"מ (${state.settings.vatRate}%)</td><td class="num">${fmt(c.netIncome - c.gross)}</td></tr>` : "";
    $("#plTable").innerHTML = `
      <tr><td>מחזור כולל מע"מ</td><td class="num">${fmt(c.gross)}</td></tr>
      ${vatLine}
      <tr><td><b>הכנסה</b></td><td class="num"><b>${fmt(c.netIncome)}</b></td></tr>
      <tr class="sub"><td>הוצאות קבועות</td><td class="num">${fmt(-c.fixedNet)}</td></tr>
      <tr class="sub"><td>הוצאות משתנות</td><td class="num">${fmt(-c.varNet)}</td></tr>
      <tr class="total"><td>רווח לפני מס, ביטוח לאומי ומשיכות</td><td class="num ${c.profit >= 0 ? "pos" : "neg"}">${fmt(c.profit)}</td></tr>`;
    $("#plNote").innerHTML = `לא כולל החזרי קרן הלוואה, תשלומי מסים ומשיכות פרטיות. אותם רואים במסך "לאן הכסף הולך".` +
      (c.hasDemo ? ` <span class="tag demo">דמו</span> חלק מההוצאות הן נתוני דמה.` : "");
  }

  function kpi(label, value, sub) {
    return `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
  }

  function renderTrend() {
    const months = allMonths().filter((m) => state.income.some((i) => monthOf(i.date) === m) || m === currentMonth);
    const data = months.map((m) => ({ m, ...calc(m) }));
    const max = Math.max(1, ...data.map((d) => Math.max(d.netIncome, d.expenses)));
    const min = Math.min(0, ...data.map((d) => d.profit));
    const W = 480, H = 220, pad = 28, groupW = (W - pad * 2) / Math.max(1, data.length);
    const y = (v) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    const bw = Math.min(22, groupW / 4);
    let bars = "";
    data.forEach((d, i) => {
      const x0 = W - pad - (i + 1) * groupW + groupW / 2;
      const rect = (x, v, col) => `<rect x="${x}" y="${Math.min(y(v), y(0))}" width="${bw}" height="${Math.abs(y(v) - y(0))}" rx="3" fill="${col}"><title>${fmt(v)}</title></rect>`;
      bars += rect(x0 + bw * 0.6, d.netIncome, "var(--income)");
      bars += rect(x0 - bw * 0.5, d.expenses, "var(--expense)");
      bars += rect(x0 - bw * 1.6, d.profit, "var(--profit)");
      bars += `<text x="${x0}" y="${H - 8}" text-anchor="middle">${shortMonth(d.m)}</text>`;
    });
    $("#trendChart").innerHTML = `
      <div class="legend"><span><i style="background:var(--income)"></i>הכנסה (ללא מע"מ)</span><span><i style="background:var(--expense)"></i>הוצאות עסק</span><span><i style="background:var(--profit)"></i>רווח</span></div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="גרף חודשי"><line x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>${bars}</svg>`;
  }

  function renderIncome() {
    const rows = state.income.filter((i) => monthOf(i.date) === currentMonth).sort((a, b) => a.date.localeCompare(b.date));
    if (!rows.length) { $("#incomeList").innerHTML = `<p class="empty">אין הכנסות בחודש הזה.</p>`; return; }
    const total = rows.reduce((s, r) => s + r.amount, 0);
    $("#incomeList").innerHTML = `<div class="list-scroll"><table>
      <tr><th>תאריך</th><th>סוג</th><th>עיר</th><th>הערה</th><th class="num">סכום</th><th></th></tr>
      ${rows.map((r) => `<tr>
        <td>${fmtDate(r.date)}</td>
        <td>${r.kind === "month" ? '<span class="tag">סיכום</span>' : "יום עבודה"}</td>
        <td>${esc(r.city) || "—"}</td><td>${esc(r.note)}</td>
        <td class="num">${fmt(r.amount)}</td>
        <td><button class="del" data-del="income" data-id="${r.id}" title="מחיקה">✕</button></td></tr>`).join("")}
      <tr><td colspan="4"><b>סה"כ</b></td><td class="num"><b>${fmt(total)}</b></td><td></td></tr>
    </table></div>`;
  }

  function catSelect(id, selected) {
    return `<select class="cat-pick" data-id="${id}">${Object.keys(CATS).map((c) => `<option ${c === selected ? "selected" : ""}>${c}</option>`).join("")}</select>`;
  }

  function renderExpenses() {
    const f = state.fixed;
    $("#fixedList").innerHTML = f.length ? `<div class="list-scroll"><table>
      <tr><th>תיאור</th><th>קטגוריה</th><th>מחודש</th><th>מע"מ</th><th class="num">סכום</th><th></th></tr>
      ${f.map((e) => `<tr>
        <td>${esc(e.name)}${e.demo ? '<span class="tag demo">דמו</span>' : ""}</td>
        <td>${esc(e.category)}</td><td>${e.start ? shortMonth(e.start) : "—"}</td><td>${e.vat ? "כן" : "לא"}</td>
        <td class="num">${fmt(e.amount)}</td>
        <td><button class="del" data-del="fixed" data-id="${e.id}" title="מחיקה">✕</button></td></tr>`).join("")}
      <tr><td colspan="4"><b>סה"כ לחודש</b></td><td class="num"><b>${fmt(f.reduce((s, e) => s + e.amount, 0))}</b></td><td></td></tr>
    </table></div>` : `<p class="empty">אין הוצאות קבועות.</p>`;

    const v = state.variable.filter((e) => monthOf(e.date) === currentMonth).sort((a, b) => a.date.localeCompare(b.date));
    $("#variableList").innerHTML = v.length ? `<div class="list-scroll"><table>
      <tr><th>תאריך</th><th>תיאור</th><th>קטגוריה</th><th>מע"מ</th><th class="num">סכום</th><th></th></tr>
      ${v.map((e) => `<tr>
        <td>${fmtDate(e.date)}</td>
        <td>${esc(e.name)}${e.demo ? '<span class="tag demo">דמו</span>' : ""}${e.source === "bank" ? '<span class="tag">בנק</span>' : ""}</td>
        <td>${catSelect(e.id, e.category)}</td><td>${e.vat ? "כן" : "לא"}</td>
        <td class="num">${fmt(e.amount)}</td>
        <td><button class="del" data-del="variable" data-id="${e.id}" title="מחיקה">✕</button></td></tr>`).join("")}
      <tr><td colspan="4"><b>סה"כ</b></td><td class="num"><b>${fmt(v.reduce((s, e) => s + e.amount, 0))}</b></td><td></td></tr>
    </table></div>` : `<p class="empty">אין הוצאות משתנות בחודש הזה.</p>`;
  }

  function renderBank() {
    const bankRows = state.variable.filter((e) => e.source === "bank" && monthOf(e.date) === currentMonth).sort((a, b) => a.date.localeCompare(b.date));
    const unknown = bankRows.filter((e) => e.category === "לא מסווג");
    const credits = state.bankCredits.filter((c) => monthOf(c.date) === currentMonth).reduce((s, c) => s + c.amount, 0);
    const reported = state.income.filter((i) => monthOf(i.date) === currentMonth).reduce((s, i) => s + i.amount, 0);

    $("#bankCompare").innerHTML = (credits || bankRows.length) ? `
      <div class="kpis">
        ${kpi("נכנס לבנק החודש", fmt(credits), "זיכויים בחשבון העסקי")}
        ${kpi("הכנסות שדווחו", fmt(reported), "לפי הדיווח של דנה דרעי")}
        ${kpi("פער", fmt(reported - credits), reported > credits ? "דווח ולא הגיע לבנק: מזומן? תשלומים באשראי שעוד לא זוכו?" : "הגיע לבנק יותר ממה שדווח")}
        ${kpi("לסיווג", String(unknown.length), "תנועות שעוד לא סווגו")}
      </div>` : `<p class="empty">עוד לא יובאו תנועות ל${monthName(currentMonth)}.</p>`;

    $("#bankList").innerHTML = bankRows.length ? `<div class="list-scroll"><table>
      <tr><th>תאריך</th><th>תיאור בבנק</th><th>קטגוריה</th><th class="num">סכום</th><th></th></tr>
      ${bankRows.map((e) => `<tr class="${e.category === "לא מסווג" ? "todo" : ""}">
        <td>${fmtDate(e.date)}</td><td>${esc(e.name)}</td><td>${catSelect(e.id, e.category)}</td>
        <td class="num">${fmt(e.amount)}</td>
        <td><button class="del" data-del="variable" data-id="${e.id}" title="מחיקה">✕</button></td></tr>`).join("")}
    </table></div>` : "";

    $("#rulesList").innerHTML = state.rules.length ? `<div class="chips">${state.rules.map((r, i) =>
      `<span class="chip">"${esc(r.keyword)}" ← ${esc(r.category)} <button class="del" data-del="rule" data-id="${i}" title="מחיקה">✕</button></span>`).join("")}</div>` : "";
  }

  function renderSettings() {
    const entries = Object.entries(state.goals).sort();
    $("#goalList").innerHTML = entries.length ? `<table style="margin-top:12px">
      <tr><th>חודש</th><th class="num">יעד</th><th class="num">ימי עבודה שנותרו</th><th></th></tr>
      ${entries.map(([m, g]) => `<tr><td>${monthName(m)}</td><td class="num">${fmt(g.goal)}</td><td class="num">${g.remaining ?? "—"}</td>
        <td><button class="del" data-del="goal" data-id="${m}" title="מחיקה">✕</button></td></tr>`).join("")}
    </table>` : "";
    const vf = $("#vatForm");
    vf.licensed.checked = state.settings.licensed;
    vf.rate.value = state.settings.vatRate;
    vf.tax.value = state.settings.taxReservePct ?? 0;
  }

  // ---------- bank import ----------
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    const firstLine = text.split(/\r?\n/)[0];
    const delim = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"' && cell === "") q = true; // quotes only open at cell start (Hebrew uses " inside words, e.g. מע"מ)
      else if (ch === delim) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }
  function parseDate(s) {
    s = s.trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
    return null;
  }
  const parseNum = (s) => { const n = parseFloat(String(s || "").replace(/[₪,\s]/g, "")); return isFinite(n) ? n : 0; };

  function categorize(desc) {
    const d = desc.toLowerCase();
    const r = state.rules.find((x) => d.includes(x.keyword.toLowerCase()));
    return r ? r.category : "לא מסווג";
  }

  function importBank(text) {
    const rows = parseCSV(text);
    const hi = rows.findIndex((r) => r.some((c) => c.includes("תאריך")));
    if (hi < 0) throw new Error("לא נמצאה שורת כותרות עם עמודת 'תאריך'");
    const h = rows[hi].map((c) => c.trim());
    const col = (...keys) => h.findIndex((c) => keys.some((k) => c.includes(k)));
    const iDate = col("תאריך"), iDesc = col("תיאור", "פרטים", "פעולה", "אסמכתא"),
      iDebit = col("חובה"), iCredit = col("זכות"), iAmount = col("סכום");
    if (iDesc < 0 || (iDebit < 0 && iAmount < 0)) throw new Error("לא זוהו עמודות תיאור וסכום");
    const key = (d, desc, a) => `${d}|${desc}|${a}`;
    const seen = new Set([...state.variable.filter((e) => e.source === "bank").map((e) => key(e.date, e.name, e.amount)),
      ...state.bankCredits.map((c) => key(c.date, c.desc, c.amount))]);
    let added = 0, credits = 0, skipped = 0;
    rows.slice(hi + 1).forEach((r) => {
      const date = parseDate(r[iDate] || ""); if (!date) return;
      const desc = (r[iDesc] || "").trim();
      let debit = iDebit >= 0 ? parseNum(r[iDebit]) : 0, credit = iCredit >= 0 ? parseNum(r[iCredit]) : 0;
      if (iDebit < 0 && iAmount >= 0) { const a = parseNum(r[iAmount]); if (a < 0) debit = -a; else credit = a; }
      if (debit > 0) {
        if (seen.has(key(date, desc, debit))) { skipped++; return; }
        const category = categorize(desc);
        state.variable.push({ id: uid(), date, name: desc, category, amount: debit, vat: groupOf(category) === "biz", source: "bank" });
        seen.add(key(date, desc, debit)); added++;
      } else if (credit > 0) {
        if (seen.has(key(date, desc, credit))) { skipped++; return; }
        state.bankCredits.push({ id: uid(), date, desc, amount: credit });
        seen.add(key(date, desc, credit)); credits++;
      }
    });
    const months = [...state.variable.filter((e) => e.source === "bank").map((e) => monthOf(e.date))].sort();
    if (months.length) currentMonth = months[months.length - 1];
    return { added, credits, skipped };
  }

  // ---------- events ----------
  function initForms() {
    $("#categorySelect").innerHTML = Object.keys(CATS).filter((c) => c !== "לא מסווג").map((c) => `<option>${c}</option>`).join("");
    const inc = $("#incomeForm"); inc.date.value = todayISO();
    const exp = $("#expenseForm"); exp.date.value = todayISO();
    $("#goalForm").month.value = currentMonth;

    const toggleDate = () => { $(".date-field", exp).style.display = exp.type.value === "fixed" ? "none" : ""; };
    exp.type.addEventListener("change", toggleDate); toggleDate();
    exp.category.addEventListener("change", () => { exp.vat.checked = groupOf(exp.category.value) === "biz"; });

    inc.addEventListener("submit", (e) => {
      e.preventDefault();
      state.income.push({ id: uid(), date: inc.date.value, kind: inc.kind.value, city: inc.city.value, amount: +inc.amount.value, note: inc.note.value.trim() });
      currentMonth = monthOf(inc.date.value);
      inc.amount.value = ""; inc.note.value = "";
      commit();
    });

    exp.addEventListener("submit", (e) => {
      e.preventDefault();
      const base = { id: uid(), name: exp.name.value.trim(), category: exp.category.value, amount: +exp.amount.value, vat: exp.vat.checked };
      if (exp.type.value === "fixed") state.fixed.push({ ...base, start: currentMonth });
      else { const d = exp.date.value || todayISO(); state.variable.push({ ...base, date: d }); currentMonth = monthOf(d); }
      exp.name.value = ""; exp.amount.value = "";
      commit();
    });

    const gf = $("#goalForm");
    gf.addEventListener("submit", (e) => {
      e.preventDefault();
      state.goals[gf.month.value] = { goal: +gf.goal.value, remaining: gf.workdays.value === "" ? null : +gf.workdays.value };
      commit();
    });

    $("#vatForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const vf = e.target;
      state.settings = { licensed: vf.licensed.checked, vatRate: +vf.rate.value || 0, taxReservePct: +vf.tax.value || 0 };
      commit();
    });

    // Re-categorize a transaction; bank rows also teach a rule for the same description.
    document.addEventListener("change", (e) => {
      const sel = e.target.closest(".cat-pick"); if (!sel) return;
      const item = state.variable.find((x) => x.id === sel.dataset.id); if (!item) return;
      item.category = sel.value; item.vat = groupOf(sel.value) === "biz";
      if (item.source === "bank" && item.name && !state.rules.some((r) => r.keyword === item.name)) {
        state.rules.push({ keyword: item.name, category: sel.value });
        state.variable.filter((x) => x.source === "bank" && x.category === "לא מסווג" && x.name === item.name)
          .forEach((x) => { x.category = sel.value; x.vat = item.vat; });
      }
      commit();
    });

    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-del]"); if (!b) return;
      const { del, id } = b.dataset;
      if (!confirm("למחוק את השורה?")) return;
      if (del === "goal") delete state.goals[id];
      else if (del === "rule") state.rules.splice(+id, 1);
      else state[del] = state[del].filter((x) => x.id !== id);
      commit();
    });

    $$(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
    $("#monthSelect").addEventListener("change", (e) => { currentMonth = e.target.value; $("#goalForm").month.value = currentMonth; render(); });
    $("#roleSelect").addEventListener("change", (e) => { role = e.target.value; applyRole(); });

    const runImport = (text) => {
      try {
        const r = importBank(text);
        $("#importResult").textContent = `יובאו ${r.added} הוצאות ו-${r.credits} זיכויים${r.skipped ? `, ${r.skipped} כפולים דולגו` : ""}.`;
        commit();
      } catch (err) { $("#importResult").textContent = "שגיאה בקובץ: " + err.message; }
    };
    $("#bankFile").addEventListener("change", async (e) => {
      const file = e.target.files[0]; if (file) runImport(await file.text()); e.target.value = "";
    });
    $("#sampleBtn").addEventListener("click", () => runImport(SAMPLE_CSV));

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
        state = { bankCredits: [], rules: DEFAULT_RULES.slice(), ...data }; commit();
      } catch (err) { alert("הקובץ לא תקין"); }
      e.target.value = "";
    });
    $("#resetBtn").addEventListener("click", () => {
      if (confirm("לאפס את כל הנתונים לנתוני הדמו?")) { state = seed(); commit(); }
    });
  }

  function showTab(name) {
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  }

  function applyRole() {
    $$('[data-role="advisor"]').forEach((el) => el.classList.toggle("hidden", role !== "advisor"));
    if (role === "client" && $(".tab.active").dataset.role === "advisor") showTab("flow");
  }

  function commit() { save(); render(); }

  // Allow ?month=YYYY-MM&tab=name in the URL (handy for sharing a specific view).
  const params = new URLSearchParams(location.search);
  if (/^\d{4}-\d{2}$/.test(params.get("month") || "")) currentMonth = params.get("month");

  initForms();
  render();
  if (params.get("tab")) showTab(params.get("tab"));
})();
