// ── Take Test Page ──────────────────────────────────────────────
async function renderTakeTest(testId) {
  setPageTitle("الاختبار");
  const session = Auth.get();

  if (!session) {
    renderPage(`
      <div class="page">
        <div class="inner-header">
          <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
          <span class="inner-title">الاختبار</span>
        </div>
        <div class="guest-wrap">
          <div class="guest-card">
            <i data-feather="lock" class="guest-icon"></i>
            <p class="guest-title">يرجى تسجيل الدخول لأداء الاختبار</p>
            <button class="btn-primary" onclick="navigateTo('/login')">تسجيل الدخول</button>
          </div>
        </div>
      </div>
    `);
    featherRefresh();
    return;
  }

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <span class="inner-title" id="test-page-title">الاختبار</span>
      </div>
      <div id="test-body">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let test = null;
  try { test = await getTestById(testId); } catch {}

  if (!test) {
    el("test-body").innerHTML = emptyBox("الاختبار غير موجود");
    featherRefresh();
    return;
  }

  setPageTitle(test.title);
  if (el("test-page-title")) el("test-page-title").textContent = test.title;

  const questions = test.questions || [];
  const answers = {};
  let submitted = false;

  function renderQuestions() {
    const body = el("test-body");
    if (!body) return;
    body.innerHTML = `
      <div class="test-questions" style="padding-bottom:100px">
        ${questions.map((q, qi) => `
          <div class="question-card" id="q-${qi}">
            <span class="q-number">سؤال ${qi + 1} من ${questions.length}</span>
            <p class="q-text">${escHtml(q.question)}</p>
            <div class="options-list" data-qi="${qi}">
              ${(q.options || []).map((opt, oi) => `
                <button class="option-btn" data-qi="${qi}" data-oi="${oi}">
                  <div class="radio-circle" id="radio-${qi}-${oi}"></div>
                  <span class="option-text">${escHtml(opt)}</span>
                </button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
      <div class="test-bottom-bar">
        <span class="progress-text" id="progress-text">أُجيب عن: 0 / ${questions.length}</span>
        <button class="btn-primary" id="submit-test-btn" style="min-width:120px">إرسال الإجابات</button>
      </div>
    `;

    body.querySelectorAll(".option-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (submitted) return;
        const qi = parseInt(btn.dataset.qi);
        const oi = parseInt(btn.dataset.oi);
        answers[qi] = oi;

        // Update radio UI
        body.querySelectorAll(`.option-btn[data-qi="${qi}"]`).forEach(b => {
          b.classList.remove("selected");
          body.querySelector(`#radio-${qi}-${parseInt(b.dataset.oi)}`).classList.remove("selected");
        });
        btn.classList.add("selected");
        body.querySelector(`#radio-${qi}-${oi}`).classList.add("selected");

        // Update progress
        const answered = Object.keys(answers).length;
        const pt = el("progress-text");
        if (pt) pt.textContent = `أُجيب عن: ${answered} / ${questions.length}`;
      });
    });

    el("submit-test-btn").addEventListener("click", handleSubmit);
  }

  async function handleSubmit() {
    if (submitted) return;
    if (Object.keys(answers).length < questions.length) {
      toast("يرجى الإجابة على جميع الأسئلة", "warn");
      return;
    }
    submitted = true;
    const btn = el("submit-test-btn");
    if (btn) { btn.disabled = true; btn.textContent = "جاري الإرسال..."; }

    let score = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) score++; });
    const total = questions.length;
    const answerArray = questions.map((_, i) => answers[i] ?? -1);

    try {
      await submitTestResult({ user_id: session.user_id, test_id: testId, score, total, answers: answerArray });
      renderResult(score, total, answerArray);
    } catch {
      toast("فشل إرسال النتيجة، جرّب مرة أخرى", "error");
      submitted = false;
      if (btn) { btn.disabled = false; btn.textContent = "إرسال الإجابات"; }
    }
  }

  function renderResult(score, total, answerArray) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const pass = pct >= 70;
    const body = el("test-body");
    if (!body) return;
    body.innerHTML = `
      <div class="result-wrap">
        <div class="result-circle ${pass ? "pass" : "fail"}">
          <span class="result-score">${score}/${total}</span>
          <span class="result-pct">${pct}%</span>
        </div>
        <p class="result-label">${pass ? "🎉 أحسنت! نتيجة ممتازة" : "📚 حاول مرة أخرى، واجتهد"}</p>
        <div class="review-list">
          ${questions.map((q, i) => {
            const isCorrect = answerArray[i] === q.correct;
            return `<div class="review-card ${isCorrect ? "correct" : "wrong"}">
              <div class="review-header">
                <i data-feather="${isCorrect ? "check-circle" : "x-circle"}" style="color:${isCorrect ? "#4CAF50" : "#ef4444"};flex-shrink:0"></i>
                <p class="review-q">${escHtml(q.question)}</p>
              </div>
              <p class="review-answer">إجابتك: ${escHtml((q.options || [])[answerArray[i]] || "لم تُجب")}</p>
              ${!isCorrect ? `<p class="review-correct">الصحيحة: ${escHtml((q.options || [])[q.correct] || "")}</p>` : ""}
            </div>`;
          }).join("")}
        </div>
        <button class="btn-primary" style="margin-top:20px;width:100%" onclick="goBack()">
          <i data-feather="arrow-right"></i> العودة
        </button>
      </div>
    `;
    featherRefresh();
  }

  renderQuestions();
}
