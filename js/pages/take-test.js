// ── Take Test Page ──────────────────────────────────────────────
function renderMathText(value) {
  // نهرب HTML أولاً، ثم نترك رموز LaTeX مثل $ و\\ كما هي لـ MathJax.
  return escHtml(String(value ?? ''));
}

function typesetTestMath(container) {
  if (!container || !window.MathJax?.typesetPromise) return;
  try { window.MathJax.typesetClear?.([container]); } catch (_) {}
  window.MathJax.typesetPromise([container]).catch(() => {});
}

async function renderTakeTest(testId) {
  setPageTitle("الاختبار");
  const session = Auth.get();
  const journeyParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const journeyId = journeyParams.get('journey');
  const journeyStageId = journeyParams.get('stage');
  let journeyContext = null;

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
  if (journeyId && journeyStageId) {
    try {
      const [journey, stages] = await Promise.all([getLearningJourneyById(journeyId), getLearningJourneyStages(journeyId)]);
      const stage = stages.find(item => item.$id === journeyStageId && item.test_id === testId);
      if (journey && stage) journeyContext = { journey, stage, totalStages: stages.length };
    } catch (error) {
      console.warn('journey_context_load', error);
    }
  }

  if (!test) {
    el("test-body").innerHTML = emptyBox("الاختبار غير موجود");
    featherRefresh();
    return;
  }

  setPageTitle(test.title);
  if (el("test-page-title")) el("test-page-title").textContent = test.title;
  saveLearningActivity({
    type: "test",
    id: test.$id || testId,
    title: test.title,
    meta: [test.subject, `${(test.questions || []).length} سؤال`].filter(Boolean).join(" · "),
  });

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
            <p class="q-text math-content">${renderMathText(q.question)}</p>
            <div class="options-list" data-qi="${qi}">
              ${(q.options || []).map((opt, oi) => `
                <button class="option-btn" data-qi="${qi}" data-oi="${oi}">
                  <div class="radio-circle" id="radio-${qi}-${oi}"></div>
                  <span class="option-text math-content">${renderMathText(opt)}</span>
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

    typesetTestMath(body);

    body.querySelectorAll(".option-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (submitted) return;
        const qi = parseInt(btn.dataset.qi);
        const oi = parseInt(btn.dataset.oi);
        answers[qi] = oi;

        body.querySelectorAll(`.option-btn[data-qi="${qi}"]`).forEach(b => {
          b.classList.remove("selected");
          body.querySelector(`#radio-${qi}-${parseInt(b.dataset.oi)}`).classList.remove("selected");
        });
        btn.classList.add("selected");
        body.querySelector(`#radio-${qi}-${oi}`).classList.add("selected");

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
      let journeyResult = null;
      if (journeyContext) {
        journeyResult = await recordLearningJourneyAttempt({
          userId: session.user_id,
          journeyId: journeyContext.journey.$id,
          stageId: journeyContext.stage.$id,
          stageOrder: journeyContext.stage.stage_order,
          testId,
          score,
          total,
          passingScore: journeyContext.stage.passing_score ?? journeyContext.journey.passing_score,
          totalStages: journeyContext.totalStages,
        });
      }
      renderResult(score, total, answerArray, journeyResult);
    } catch {
      toast("فشل إرسال النتيجة، جرّب مرة أخرى", "error");
      submitted = false;
      if (btn) { btn.disabled = false; btn.textContent = "إرسال الإجابات"; }
    }
  }

  function renderResult(score, total, answerArray, journeyResult = null) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const threshold = journeyContext ? Number(journeyContext.stage.passing_score ?? journeyContext.journey.passing_score ?? 70) : 70;
    const pass = journeyContext ? Boolean(journeyResult?.passed ?? (pct >= threshold)) : pct >= 70;
    const journeyDone = Boolean(journeyContext && journeyResult?.progress?.progress_percent >= 100);
    const journeyCta = journeyContext
      ? `<button class="btn-primary" style="margin-top:20px;width:100%" onclick="navigateTo('${journeyDone ? '/journeys' : `/journey/${encodeURIComponent(journeyContext.journey.$id)}`}')"><i data-feather="arrow-right"></i>${journeyDone ? 'إنهاء الرحلة' : pass ? 'العودة إلى خريطة الرحلة' : 'مراجعة الدرس وإعادة الاختبار'}</button>`
      : `<button class="btn-primary" style="margin-top:20px;width:100%" onclick="goBack()"><i data-feather="arrow-right"></i>العودة</button>`;
    const body = el("test-body");
    if (!body) return;
    body.innerHTML = `
      <div class="result-wrap">
        <div class="result-circle ${pass ? "pass" : "fail"}">
          <span class="result-score">${score}/${total}</span>
          <span class="result-pct">${pct}%</span>
        </div>
        <p class="result-label">${journeyContext ? (pass ? (journeyDone ? "🎉 أتممت الرحلة التعليمية" : "🎉 نجحت في المرحلة وفتحت المرحلة التالية") : "📚 راجع الدرس ثم أعد اختبار المرحلة") : (pass ? "🎉 أحسنت! نتيجة ممتازة" : "📚 حاول مرة أخرى، واجتهد")}</p>
        ${journeyContext ? `<div class="journey-result-note"><span>نسبة النجاح المطلوبة: ${threshold}%</span><span>${pass ? `تقدم الرحلة: ${Number(journeyResult?.progress?.progress_percent || 0)}%` : 'المرحلة التالية ما زالت مقفلة حتى تنجح'}</span></div>` : ''}
        <div class="review-list">
          ${questions.map((q, i) => {
            const isCorrect = answerArray[i] === q.correct;
            return `<div class="review-card ${isCorrect ? "correct" : "wrong"}">
              <div class="review-header">
                <i data-feather="${isCorrect ? "check-circle" : "x-circle"}" style="color:${isCorrect ? "#4CAF50" : "#ef4444"};flex-shrink:0"></i>
                <p class="review-q math-content">${renderMathText(q.question)}</p>
              </div>
              <p class="review-answer math-content">إجابتك: ${renderMathText((q.options || [])[answerArray[i]] || "لم تُجب")}</p>
              ${!isCorrect ? `<p class="review-correct math-content">الصحيحة: ${renderMathText((q.options || [])[q.correct] || "")}</p>` : ""}
            </div>`;
          }).join("")}
        </div>
        ${journeyCta}
      </div>
    `;
    typesetTestMath(body);
    featherRefresh();
  }

  renderQuestions();
}