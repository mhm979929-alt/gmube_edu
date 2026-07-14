// ── Tests Page ──────────────────────────────────────────────────
async function renderTests() {
  updateBottomNav("tests");
  setPageTitle("الاختبارات");
  const session = Auth.get();

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <i data-feather="check-square" style="color:#4CAF50"></i>
        <span class="inner-title">الاختبارات</span>
      </div>
      <div id="tests-cat-bar"></div>
      <div id="tests-list" class="tests-list">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let currentSubject = "الكل";
  let myResults = [];

  if (session) {
    try { myResults = await getTestResults(session.user_id); } catch {}
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
        loadTests();
      });
    });
  }

  async function loadTests() {
    const list = el("tests-list");
    if (!list) return;
    list.innerHTML = spinner();
    try {
      const tests = await getTests(currentSubject === "الكل" ? undefined : currentSubject);
      if (!tests.length) {
        list.innerHTML = emptyBox("لا توجد اختبارات", "جرّب تصفية مختلفة");
        featherRefresh();
        return;
      }
      list.innerHTML = tests.map(t => {
        const done = myResults.find(r => r.test_id === t.$id);
        const pct = done ? Math.round((done.score / done.total) * 100) : null;
        return `<div class="test-item" data-id="${escHtml(t.$id)}">
          <div class="test-icon${done ? " done" : ""}"><i data-feather="${done ? "check-circle" : "clipboard"}"></i></div>
          <div class="test-info">
            <span class="test-title">${escHtml(t.title)}</span>
            <span class="test-subject">${escHtml(t.subject)}</span>
            <span class="test-meta">${t.questions ? t.questions.length : 0} سؤال${t.description ? ` · ${t.description}` : ""}</span>
            ${done ? `<span class="result-badge"><i data-feather="award"></i> ${done.score}/${done.total} (${pct}%)</span>` : ""}
          </div>
          <div class="chevron-wrap"><i data-feather="chevron-left"></i></div>
        </div>`;
      }).join("");
      featherRefresh();
      list.querySelectorAll(".test-item").forEach(item => {
        item.addEventListener("click", () => {
          if (!session) { toast("يرجى تسجيل الدخول لأداء الاختبار", "warn"); navigateTo("/login"); return; }
          navigateTo(`/take-test/${item.dataset.id}`);
        });
      });
    } catch {
      list.innerHTML = errorBox("فشل تحميل الاختبارات", loadTests);
      featherRefresh();
    }
  }

  renderCatBar();
  await loadTests();
}
