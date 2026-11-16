/* Dana Deri – financial demo app (v0.1). Data lives in localStorage. */
(function () {
  "use strict";

  const STORAGE_KEY = "dana-deri-finance-v1";
  const CATEGORIES = [
    "שכירות", "חומרים לטיפולים", "מוצרים למכירה", "הנהלת חשבונות", "ביטוח ורישוי",
    "שיווק", "תוכנה ותקשורת", "נסיעות ורכב", "הלוואות", "השתלמויות", "אחר",
  ];

  // Seed: real income/goal figures from the tracking sheet; expenses are DEMO placeholders.
  function seed() {
    return {
      settings: { licensed: true, vatRate: 18 },
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
        { id: uid(), date: "2026-08-20", name: "הזמנת חומרים", category: "חומרים לטיפולים", amount: 950, vat: true, demo: true },
      ],
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
  function defaultMonth() { return monthOf(todayISO()); }
  const vatFactor = () => (state.settings.licensed ? 1 + state.settings.vatRate / 100 : 1);

  function allMonths() {
    const set = new Set([currentMonth, defaultMonth()]);
    state.income.forEach((i) => set.add(monthOf(i.date)));
    state.variable.forEach((v) => set.add(monthOf(v.date)));
    Object.keys(state.goals).forEach((m) => set.add(m));
    return Array.from(set).sort();
  }

  let state = load();
  let currentMonth = defaultMonth();
  let role = "advisor";

  // ---------- calculations ----------
  function calc(m) {
    const f = vatFactor();
    const gross = state.income.filter((i) => monthOf(i.date) === m).reduce((s, i) => s + i.amount, 0);
    const netIncome = gross / f;
    const net = (e) => (e.vat && state.settings.licensed ? e.amount / f : e.amount);
    const fixed = state.fixed.filter((e) => !e.start || e.start <= m);
    const variable = state.variable.filter((e) => monthOf(e.date) === m);
    const fixedNet = fixed.reduce((s, e) => s + net(e), 0);
    const varNet = variable.reduce((s, e) => s + net(e), 0);
    const byCat = {};
    [...fixed, ...variable].forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + net(e); });
    const expenses = fixedNet + varNet;
    const profit = netIncome - expenses;
    const breakEvenGross = fixedNet * f; // gross revenue needed just to cover fixed costs
    return { gross, netIncome, fixedNet, varNet, expenses, profit, margin: netIncome ? profit / netIncome : NaN, byCat, breakEvenGross, hasDemo: [...fixed, ...variable].some((e) => e.demo) };
  }

  // ---------- render ----------
  function render() {
    renderMonthSelect();
    $$(".monthLabel").forEach((el) => (el.textContent = monthName(currentMonth)));
    renderDashboard();
    renderIncome();
    renderExpenses();
    renderSettings();
  }

  function renderMonthSelect() {
    const sel = $("#monthSelect");
    sel.innerHTML = allMonths().map((m) => `<option value="${m}" ${m === currentMonth ? "selected" : ""}>${monthName(m)}</option>`).join("");
  }

  function renderDashboard() {
    const c = calc(currentMonth);
    $("#kpis").innerHTML = [
      kpi("מחזור (כולל מע\"מ)", fmt(c.gross), state.settings.licensed ? `ללא מע"מ: ${fmt(c.netIncome)}` : ""),
      kpi("הוצאות", fmt(c.expenses), `קבועות ${fmt(c.fixedNet)} · משתנות ${fmt(c.varNet)}`),
      kpi("רווח לפני מס", `<span class="${c.profit >= 0 ? "pos" : "neg"}">${fmt(c.profit)}</span>`, `רווחיות ${pct(c.margin)}`),
      kpi("נקודת איזון", fmt(c.breakEvenGross), "מחזור שנדרש לכיסוי ההוצאות הקבועות"),
    ].join("");

    const g = state.goals[currentMonth];
    if (g && g.goal) {
      const ratio = c.gross / g.goal;
      const gap = Math.max(0, g.goal - c.gross);
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
    renderBreakdown(c);

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
    $("#plNote").innerHTML = c.hasDemo
      ? `<span class="tag demo">דמו</span> חלק מההוצאות בחודש הזה הן נתוני דמה. מחליפים אותן בפירוט האמיתי של דנה דרעי.` : "";
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
      const x0 = W - pad - (i + 1) * groupW + groupW / 2; // RTL: first month on the right
      const rect = (x, v, col) => `<rect x="${x}" y="${Math.min(y(v), y(0))}" width="${bw}" height="${Math.abs(y(v) - y(0))}" rx="3" fill="${col}"><title>${fmt(v)}</title></rect>`;
      bars += rect(x0 + bw * 0.6, d.netIncome, "var(--income)");
      bars += rect(x0 - bw * 0.5, d.expenses, "var(--expense)");
      bars += rect(x0 - bw * 1.6, d.profit, "var(--profit)");
      bars += `<text x="${x0}" y="${H - 8}" text-anchor="middle">${shortMonth(d.m)}</text>`;
    });
    const zero = `<line x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>`;
    $("#trendChart").innerHTML = `
      <div class="legend"><span><i style="background:var(--income)"></i>הכנסה (ללא מע"מ)</span><span><i style="background:var(--expense)"></i>הוצאות</span><span><i style="background:var(--profit)"></i>רווח</span></div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="גרף חודשי">${zero}${bars}</svg>`;
  }

  function renderBreakdown(c) {
    const rows = Object.entries(c.byCat).sort((a, b) => b[1] - a[1]);
    if (!rows.length) { $("#expenseBreakdown").innerHTML = `<p class="empty">אין הוצאות בחודש הזה.</p>`; return; }
    const max = rows[0][1];
    $("#expenseBreakdown").innerHTML = `<div class="bars">${rows.map(([cat, v]) =>
      `<div class="bar-row"><span>${esc(cat)}</span><div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div><span class="amt">${fmt(v)}</span></div>`).join("")}</div>`;
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
        <td>${esc(r.city) || "—"}</td>
        <td>${esc(r.note)}</td>
        <td class="num">${fmt(r.amount)}</td>
        <td><button class="del" data-del="income" data-id="${r.id}" title="מחיקה">✕</button></td></tr>`).join("")}
      <tr><td colspan="4"><b>סה"כ</b></td><td class="num"><b>${fmt(total)}</b></td><td></td></tr>
    </table></div>`;
  }

  function renderExpenses() {
    const f = state.fixed;
    $("#fixedList").innerHTML = f.length ? `<div class="list-scroll"><table>
      <tr><th>תיאור</th><th>קטגוריה</th><th>מחודש</th><th>מע"מ</th><th class="num">סכום</th><th></th></tr>
      ${f.map((e) => `<tr>
        <td>${esc(e.name)}${e.demo ? '<span class="tag demo">דמו</span>' : ""}</td>
        <td>${esc(e.category)}</td><td>${e.start ? shortMonth(e.start) : "—"}</td>
        <td>${e.vat ? "כן" : "לא"}</td>
        <td class="num">${fmt(e.amount)}</td>
        <td><button class="del" data-del="fixed" data-id="${e.id}" title="מחיקה">✕</button></td></tr>`).join("")}
      <tr><td colspan="4"><b>סה"כ לחודש</b></td><td class="num"><b>${fmt(f.reduce((s, e) => s + e.amount, 0))}</b></td><td></td></tr>
    </table></div>` : `<p class="empty">אין הוצאות קבועות.</p>`;

    const v = state.variable.filter((e) => monthOf(e.date) === currentMonth).sort((a, b) => a.date.localeCompare(b.date));
    $("#variableList").innerHTML = v.length ? `<div class="list-scroll"><table>
      <tr><th>תאריך</th><th>תיאור</th><th>קטגוריה</th><th>מע"מ</th><th class="num">סכום</th><th></th></tr>
      ${v.map((e) => `<tr>
        <td>${fmtDate(e.date)}</td>
        <td>${esc(e.name)}${e.demo ? '<span class="tag demo">דמו</span>' : ""}</td>
        <td>${esc(e.category)}</td><td>${e.vat ? "כן" : "לא"}</td>
        <td class="num">${fmt(e.amount)}</td>
        <td><button class="del" data-del="variable" data-id="${e.id}" title="מחיקה">✕</button></td></tr>`).join("")}
      <tr><td colspan="4"><b>סה"כ</b></td><td class="num"><b>${fmt(v.reduce((s, e) => s + e.amount, 0))}</b></td><td></td></tr>
    </table></div>` : `<p class="empty">אין הוצאות משתנות בחודש הזה.</p>`;
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
  }

  // ---------- events ----------
  function initForms() {
    $("#categorySelect").innerHTML = CATEGORIES.map((c) => `<option>${c}</option>`).join("");
    const inc = $("#incomeForm"); inc.date.value = todayISO();
    const exp = $("#expenseForm"); exp.date.value = todayISO();
    $("#goalForm").month.value = currentMonth;

    const toggleDate = () => { $(".date-field", exp).style.display = exp.type.value === "fixed" ? "none" : ""; };
    exp.type.addEventListener("change", toggleDate); toggleDate();

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
      else { state.variable.push({ ...base, date: exp.date.value || todayISO() }); currentMonth = monthOf(exp.date.value || todayISO()); }
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
      state.settings = { licensed: vf.licensed.checked, vatRate: +vf.rate.value || 0 };
      commit();
    });

    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-del]");
      if (!b) return;
      const { del, id } = b.dataset;
      if (!confirm("למחוק את השורה?")) return;
      if (del === "goal") delete state.goals[id];
      else state[del] = state[del].filter((x) => x.id !== id);
      commit();
    });

    $$(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
    $("#monthSelect").addEventListener("change", (e) => { currentMonth = e.target.value; $("#goalForm").month.value = currentMonth; render(); });
    $("#roleSelect").addEventListener("change", (e) => { role = e.target.value; applyRole(); });

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
        state = data; commit();
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
    if (role === "client") showTab("income");
  }

  function commit() { save(); render(); }

  initForms();
  render();
})();
