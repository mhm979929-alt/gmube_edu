// ── Tests Page ──────────────────────────────────────────────────
const TEST_SUBJECT_ALIAS_GROUPS = [
  ["عربي", "لغةالعربية"],
  ["انكليزي", "انجليزي", "لغةالانكليزية", "لغةالانجليزية"],
  ["فرنسي", "لغةالفرنسية"],
  ["علوم", "علم"],
  ["فيزياء"],
  ["كيمياء"],
  ["رياضيات"],
  ["روسي"],
  ["تركي"],
  ["اسلامية", "تربيةاسلامية"],
  ["مسيحية", "تربيةمسيحية"],
  ["تاريخ"],
  ["جغرافيا"],
  ["فلسفة"]
];

function normalizeTestSubject(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, "")
    .replace(/^ال/, "");
}

function testSubjectMatches(value, selected) {
  const left = normalizeTestSubject(value);
  const right = normalizeTestSubject(selected);
  if (!left || !right || left === right) return left === right;
  return TEST_SUBJECT_ALIAS_GROUPS.some(group => group.includes(left) && group.includes(right));
}

async function renderTests() {
  updateBottomNav("tests");
  setPageTitle("الاختبارات");
  const session = Auth.get();

  renderPage(`
    <div class="page tests-page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()" aria-label="رجوع"><i data-feather="arrow-right"></i></button>
        <i data-feather="check-square" style="color:#4CAF50"></i>
        <span class="inner-title">الاختبارات</span>
      </div>

      <section class="tests-hero" aria-labelledby="tests-hero-title">
        <div class="tests-hero-copy">
          <span class="tests-kicker">تقييم نفسك</span>
          <h1 id="tests-hero-title">اختبر فهمك</h1>
          <p>اختر اختباراً مناسباً وتابع تقدّمك ونتائجك من مكان واحد.</p>
        </div>
        <div class="tests-hero-stats" aria-label="ملخص الاختبارات">
          <div class="tests-stat"><strong id="tests-total-count">—</strong><span>اختبار</span></div>
          <div class="tests-stat"><strong id="tests-done-count">—</strong><span>منجز</span></div>
        </div>
      </section>

      <div class="tests-search" role="search">
        <i data-feather="search" aria-hidden="true"></i>
        <input id="tests-search-input" type="search" placeholder="ابحث عن اختبار أو مادة…" autocomplete="off" aria-label="البحث في الاختبارات">
      </div>

      <div class="tests-tabs" role="tablist" aria-label="نطاق الاختبارات">
        <button class="tests-tab active" data-scope="all" role="tab" aria-selected="true">كل الاختبارات</button>
        <button class="tests-tab" data-scope="mine" role="tab" aria-selected="false" ${session ? "" : "disabled title=\"سجّل الدخول لرؤية نتائجك\""}>
          <i data-feather="award" aria-hidden="true"></i> اختباراتي
        </button>
      </div>

      <div class="tests-filter-row">
        <div class="tests-list-heading">
          <strong id="tests-list-title">كل الاختبارات</strong>
          <small id="tests-list-subtitle">الأحدث أولاً</small>
        </div>
        <button class="tests-filter-toggle" id="tests-filter-toggle" type="button" aria-expanded="false">
          <i data-feather="sliders" aria-hidden="true"></i><span>تصفية</span><b id="tests-filter-count" hidden>0</b>
        </button>
      </div>

      <div class="tests-filter-panel" id="tests-filter-panel" hidden>
        <div class="tests-filter-panel-head"><strong>اختر المادة</strong><button type="button" id="tests-clear-filter">مسح</button></div>
        <div id="tests-cat-bar"></div>
      </div>

      <div id="tests-list" class="tests-list" aria-live="polite">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let currentSubject = "الكل";
  let currentScope = "all";
  let currentQuery = "";
  let myResults = [];
  let resultMap = new Map();

  if (session) {
    try { myResults = await getTestResults(session.user_id); } catch {}
  }

  function buildResultMap() {
    resultMap = new Map();
    myResults.forEach(result => {
      const total = Number(result.total) || 0;
      const score = Number(result.score) || 0;
      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      const previous = resultMap.get(result.test_id);
      const isBetter = !previous || pct > previous.pct || (pct === previous.pct && String(result.created_at || "") > String(previous.created_at || ""));
      if (isBetter) resultMap.set(result.test_id, { ...result, pct });
    });
  }

  function updateSummary(total = 0) {
    const totalEl = el("tests-total-count");
    const doneEl = el("tests-done-count");
    if (totalEl) totalEl.textContent = total;
    if (doneEl) doneEl.textContent = session ? resultMap.size : "—";
  }

  function renderCatBar() {
    const wrap = el("tests-cat-bar");
    if (!wrap) return;
    wrap.innerHTML = categoryBarHtml(currentSubject);
    featherRefresh();
    wrap.querySelectorAll(".cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentSubject = btn.dataset.cat;
        renderCatBar();
        updateFilterUi();
        renderVisibleTests();
      });
    });
  }

  function updateFilterUi() {
    const toggle = el("tests-filter-toggle");
    const count = el("tests-filter-count");
    const clear = el("tests-clear-filter");
    const label = toggle?.querySelector("span");
    const active = currentSubject !== "الكل";
    if (label) label.textContent = active ? currentSubject : "تصفية";
    if (count) {
      count.hidden = !active;
      count.textContent = active ? "1" : "0";
    }
    if (clear) clear.hidden = !active;
  }

  function testStatus(test) {
    const result = resultMap.get(test.$id);
    if (!session) return { label: "متاح للجميع", className: "available", icon: "clipboard", action: "ابدأ" };
    if (!result) return { label: "لم يبدأ", className: "new", icon: "play-circle", action: "ابدأ الاختبار" };
    if (result.pct >= 70) return { label: `أفضل نتيجة ${result.pct}%`, className: "passed", icon: "check-circle", action: "إعادة الاختبار" };
    return { label: `أفضل نتيجة ${result.pct}%`, className: "retry", icon: "rotate-ccw", action: "حاول مرة أخرى" };
  }

  function sortTests(tests) {
    return [...tests].sort((a, b) => {
      const aDone = resultMap.has(a.$id) ? 1 : 0;
      const bDone = resultMap.has(b.$id) ? 1 : 0;
      if (currentScope === "all" && aDone !== bDone) return aDone - bDone;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
  }

  function renderTestCard(test) {
    const status = testStatus(test);
    const result = resultMap.get(test.$id);
    const questionsCount = Array.isArray(test.questions) ? test.questions.length : 0;
    const description = String(test.description || "").trim();
    return `<article class="test-item test-card-${status.className}" data-id="${escHtml(test.$id)}" tabindex="0" role="button" aria-label="${escHtml(status.action)}: ${escHtml(test.title)}">
      <div class="test-icon ${status.className}"><i data-feather="${status.icon}"></i></div>
      <div class="test-info">
        <div class="test-title-row">
          <span class="test-title">${escHtml(test.title || "اختبار بدون عنوان")}</span>
          <span class="test-status ${status.className}">${escHtml(status.label)}</span>
        </div>
        <span class="test-subject">${escHtml(test.subject || "عام")}</span>
        <div class="test-meta-row">
          <span><i data-feather="list"></i>${questionsCount} سؤال</span>
          ${result ? `<span><i data-feather="award"></i>${result.score}/${result.total}</span>` : `<span><i data-feather="play-circle"></i>متاح الآن</span>`}
        </div>
        ${description ? `<span class="test-description">${escHtml(description)}</span>` : ""}
      </div>
      <div class="test-action"><span>${escHtml(status.action)}</span><i data-feather="chevron-left"></i></div>
    </article>`;
  }

  function updateListHeading(total) {
    const title = el("tests-list-title");
    const subtitle = el("tests-list-subtitle");
    if (title) title.textContent = currentScope === "mine" ? "اختباراتي" : (currentSubject === "الكل" ? "كل الاختبارات" : currentSubject);
    if (subtitle) {
      if (currentScope === "mine") subtitle.textContent = `${total} اختبار منجز`;
      else if (currentQuery) subtitle.textContent = `${total} نتيجة بحث`;
      else subtitle.textContent = currentSubject === "الكل" ? "غير المنجزة تظهر أولاً" : "مرتبة حسب الأحدث";
    }
  }

  function renderVisibleTests() {
    const list = el("tests-list");
    if (!list) return;
    const source = window.__gmubeTests || [];
    let tests = currentScope === "mine" ? source.filter(test => resultMap.has(test.$id)) : source;
    if (currentSubject !== "الكل") tests = tests.filter(test => testSubjectMatches(test.subject, currentSubject));
    if (currentQuery) {
      const query = currentQuery.toLowerCase();
      tests = tests.filter(test => `${test.title || ""} ${test.subject || ""} ${test.description || ""}`.toLowerCase().includes(query));
    }
    tests = sortTests(tests);
    updateListHeading(tests.length);

    if (!tests.length) {
      if (currentScope === "mine" && session) {
        list.innerHTML = emptyBox("لم تُنجز أي اختبار بعد", "ابدأ بأحد الاختبارات المتاحة وستظهر نتائجه هنا");
      } else if (currentQuery) {
        list.innerHTML = emptyBox("لا توجد نتائج مطابقة", "جرّب كلمة بحث أخرى أو امسح البحث");
      } else {
        list.innerHTML = emptyBox("لا توجد اختبارات", "جرّب مادة أخرى أو امسح التصفية");
      }
      featherRefresh();
      return;
    }

    list.innerHTML = tests.map(renderTestCard).join("");
    featherRefresh();
    list.querySelectorAll(".test-item").forEach(item => {
      const openTest = () => {
        if (!session) { toast("يرجى تسجيل الدخول لأداء الاختبار", "warn"); navigateTo("/login"); return; }
        navigateTo(`/take-test/${item.dataset.id}`);
      };
      item.addEventListener("click", openTest);
      item.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTest(); }
      });
    });
  }

  async function loadTests() {
    const list = el("tests-list");
    if (!list) return;
    list.innerHTML = spinner();
    try {
      const tests = await getTests();
      window.__gmubeTests = tests;
      updateSummary(tests.length);
      renderVisibleTests();
    } catch {
      list.innerHTML = errorBox("فشل تحميل الاختبارات", loadTests);
      featherRefresh();
    }
  }

  buildResultMap();
  renderCatBar();
  updateFilterUi();

  const searchInput = el("tests-search-input");
  if (searchInput) searchInput.addEventListener("input", () => {
    currentQuery = searchInput.value.trim();
    renderVisibleTests();
  });

  const filterToggle = el("tests-filter-toggle");
  const filterPanel = el("tests-filter-panel");
  if (filterToggle && filterPanel) filterToggle.addEventListener("click", () => {
    const willOpen = filterPanel.hidden;
    filterPanel.hidden = !willOpen;
    filterToggle.setAttribute("aria-expanded", String(willOpen));
  });

  el("tests-clear-filter")?.addEventListener("click", () => {
    currentSubject = "الكل";
    renderCatBar();
    updateFilterUi();
    renderVisibleTests();
  });

  document.querySelectorAll(".tests-tab").forEach(tab => tab.addEventListener("click", () => {
    if (tab.disabled) { toast("سجّل الدخول لرؤية اختباراتك ونتائجك", "warn"); return; }
    currentScope = tab.dataset.scope;
    document.querySelectorAll(".tests-tab").forEach(button => {
      const active = button === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    renderVisibleTests();
  }));

  await loadTests();
}
