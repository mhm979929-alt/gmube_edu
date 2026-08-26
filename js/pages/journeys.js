// ── الرحلة التعليمية ────────────────────────────────────────────

function journeyRoute(journeyId) {
  return `/journey/${encodeURIComponent(journeyId)}`;
}

function journeyStageRoute(journeyId, stageId) {
  return `/journey/${encodeURIComponent(journeyId)}/stage/${encodeURIComponent(stageId)}`;
}

function journeyTestRoute(testId, journeyId, stageId) {
  const params = new URLSearchParams({ journey: journeyId, stage: stageId });
  return `/take-test/${encodeURIComponent(testId)}?${params.toString()}`;
}

function journeyStateLabel(state) {
  return ({ completed: 'مكتملة', available: 'متاحة الآن', retry: 'تحتاج إعادة', locked: 'مقفلة' })[state] || 'متاحة';
}

function journeyStateIcon(state) {
  return ({ completed: 'check-circle', available: 'play-circle', retry: 'rotate-ccw', locked: 'lock' })[state] || 'circle';
}

function journeyStageLessonLabel(type) {
  return ({ video: 'فيديو', book: 'كتاب', summary: 'ملخص', audio: 'صوتية', photo: 'صورة', playlist: 'قائمة محتوى', link: 'محتوى خارجي' })[type] || 'درس';
}

function getJourneyStageState(stages, stage, progress, attempts) {
  const completed = new Set((progress?.completed_stage_orders || []).map(Number));
  const order = Number(stage.stage_order);
  if (completed.has(order)) return 'completed';
  const index = stages.findIndex(item => item.$id === stage.$id);
  const previous = index > 0 ? stages[index - 1] : null;
  const previousCompleted = !previous || completed.has(Number(previous.stage_order));
  if (!previousCompleted) return 'locked';
  const latest = (attempts || []).find(item => item.stage_id === stage.$id);
  return latest && latest.passed === false ? 'retry' : 'available';
}

function journeyCardHtml(journey, progress = null) {
  const percent = Math.max(0, Math.min(100, Number(progress?.progress_percent || 0)));
  const statusText = progress?.status === 'completed' ? 'مكتملة' : progress ? `تقدم ${percent}%` : 'لم تبدأ بعد';
  return `
    <button class="journey-card" data-journey-id="${escHtml(journey.$id)}" type="button">
      <span class="journey-card-icon"><i data-feather="map"></i></span>
      <span class="journey-card-copy">
        <strong>${escHtml(journey.title)}</strong>
        <small>${escHtml([journey.subject, journey.grade].filter(Boolean).join(' · '))}</small>
        <em>${escHtml(statusText)} · نسبة النجاح ${Number(journey.passing_score || 70)}%</em>
        <span class="journey-card-progress"><span style="width:${percent}%"></span></span>
      </span>
      <i data-feather="chevron-left" class="journey-card-chevron"></i>
    </button>`;
}

async function renderJourneys(subjectEncoded = '') {
  updateBottomNav('home');
  setPageTitle('الرحلة التعليمية');
  const requestedSubject = subjectEncoded ? decodeURIComponent(subjectEncoded) : '';
  renderPage(`
    <div class="page journeys-page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()" aria-label="رجوع"><i data-feather="arrow-right"></i></button>
        <span class="inner-title">الرحلة التعليمية</span>
      </div>
      <section class="journey-hero">
        <div class="journey-hero-icon"><i data-feather="map"></i></div>
        <div>
          <span class="journey-kicker">تعلّم بخطوات واضحة</span>
          <h1>اختر رحلتك وابدأ التقدم</h1>
          <p>درس، ثم اختبار، ثم تفتح لك الخطوة التالية بعد تحقيق نسبة النجاح.</p>
        </div>
      </section>
      <div id="journey-subject-filter" class="journey-subject-filter"></div>
      <div id="journeys-list" class="journeys-list">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  const list = el('journeys-list');
  try {
    const journeys = await getLearningJourneys({ subject: requestedSubject, activeOnly: true });
    if (!journeys.length) {
      list.innerHTML = emptyBox('لا توجد رحلات مفعلة حالياً', 'ستظهر الرحلات هنا عند تفعيلها من لوحة التحكم.');
      featherRefresh();
      return;
    }

    const subjects = [...new Set(journeys.map(j => String(j.subject || '').trim()).filter(Boolean))];
    const filter = el('journey-subject-filter');
    if (filter && subjects.length > 1) {
      filter.innerHTML = `<button class="journey-filter-btn${requestedSubject ? '' : ' active'}" data-subject="">كل المواد</button>${subjects.map(subject => `<button class="journey-filter-btn${subject === requestedSubject ? ' active' : ''}" data-subject="${escHtml(subject)}">${escHtml(subject)}</button>`).join('')}`;
      filter.querySelectorAll('.journey-filter-btn').forEach(button => {
        button.addEventListener('click', () => {
          const value = button.dataset.subject || '';
          navigateTo(value ? `/journeys/${encodeURIComponent(value)}` : '/journeys');
        });
      });
    }

    const progressEntries = await Promise.all(journeys.map(journey => getLearningJourneyProgress(journey.$id).catch(() => null)));
    list.innerHTML = journeys.map((journey, index) => journeyCardHtml(journey, progressEntries[index])).join('');
    list.querySelectorAll('.journey-card').forEach(card => card.addEventListener('click', () => navigateTo(journeyRoute(card.dataset.journeyId))));
    featherRefresh();
  } catch (error) {
    list.innerHTML = errorBox('تعذر تحميل الرحلات التعليمية', () => renderJourneys(subjectEncoded));
    featherRefresh();
  }
}

async function renderJourney(journeyId) {
  updateBottomNav('home');
  setPageTitle('الرحلة التعليمية');
  renderPage(`
    <div class="page journey-map-page">
      <div class="inner-header">
        <button class="back-btn" onclick="navigateTo('/journeys')" aria-label="العودة إلى الرحلات"><i data-feather="arrow-right"></i></button>
        <span class="inner-title">خريطة الرحلة</span>
      </div>
      <div id="journey-map-body">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  const body = el('journey-map-body');
  const [journey, stages] = await Promise.all([getLearningJourneyById(journeyId), getLearningJourneyStages(journeyId).catch(() => [])]);
  if (!journey || journey.is_active === false) {
    body.innerHTML = emptyBox('هذه الرحلة غير متاحة حالياً', 'يمكنك العودة لاختيار رحلة أخرى.');
    featherRefresh();
    return;
  }
  const session = Auth.get();
  const progress = session ? await getLearningJourneyProgress(journeyId).catch(() => null) : null;
  const attempts = session ? await getLearningJourneyAttempts(journeyId).catch(() => []) : [];
  const completed = new Set((progress?.completed_stage_orders || []).map(Number));
  const percent = Math.min(100, Math.max(0, Number(progress?.progress_percent || 0)));
  const completedCount = stages.filter(stage => completed.has(Number(stage.stage_order))).length;

  if (!stages.length) {
    body.innerHTML = `<section class="journey-empty-admin"><i data-feather="layers"></i><strong>${escHtml(journey.title)}</strong><p>لم تتم إضافة مراحل لهذه الرحلة بعد.</p></section>`;
    featherRefresh();
    return;
  }

  body.innerHTML = `
    <section class="journey-map-head">
      <div class="journey-map-title-row">
        <div class="journey-map-icon"><i data-feather="map"></i></div>
        <div>
          <span class="journey-kicker">${escHtml([journey.subject, journey.grade].filter(Boolean).join(' · '))}</span>
          <h1>${escHtml(journey.title)}</h1>
          <p>${escHtml(journey.description || 'رحلة منظمة تساعدك على التقدم مرحلة بعد مرحلة.')}</p>
        </div>
      </div>
      <div class="journey-progress-box">
        <div><strong>تقدمك في الرحلة</strong><b>${percent}%</b></div>
        <div class="journey-progress-track"><span style="width:${percent}%"></span></div>
        <small>${completedCount} من ${stages.length} مراحل مكتملة</small>
      </div>
    </section>
    <section class="journey-stage-list" aria-label="مراحل الرحلة">
      ${stages.map((stage, index) => {
        const state = getJourneyStageState(stages, stage, progress, attempts);
        const latest = attempts.find(item => item.stage_id === stage.$id);
        const scoreText = latest ? `${Number(latest.percentage || 0)}% في آخر محاولة` : `نسبة النجاح ${Number(stage.passing_score ?? journey.passing_score ?? 70)}%`;
        const action = state === 'locked' ? 'المرحلة السابقة مطلوبة' : state === 'completed' ? 'مراجعة المرحلة' : state === 'retry' ? 'راجع الدرس وأعد الاختبار' : 'ابدأ المرحلة';
        return `
          <div class="journey-stage-row ${state}" data-stage-id="${escHtml(stage.$id)}">
            <div class="journey-stage-line"><span class="journey-stage-dot"><i data-feather="${journeyStateIcon(state)}"></i></span>${index < stages.length - 1 ? '<span class="journey-stage-connector"></span>' : ''}</div>
            <div class="journey-stage-card">
              <div class="journey-stage-top"><span>المرحلة ${index + 1}</span><b>${journeyStateLabel(state)}</b></div>
              <h2>${escHtml(stage.title)}</h2>
              <p>${escHtml(stage.description || `درس ${journeyStageLessonLabel(stage.lesson_type)} ثم اختبار قصير.`)}</p>
              <div class="journey-stage-meta"><span><i data-feather="book-open"></i>${escHtml(journeyStageLessonLabel(stage.lesson_type))}</span><span><i data-feather="check-square"></i>${escHtml(scoreText)}</span></div>
              <button class="journey-stage-action" type="button" ${state === 'locked' ? 'disabled' : ''} data-route="${escHtml(journeyStageRoute(journeyId, stage.$id))}">${escHtml(action)}<i data-feather="chevron-left"></i></button>
            </div>
          </div>`;
      }).join('')}
    </section>
    <div class="journey-map-note"><i data-feather="shield"></i><span>تُفتح كل مرحلة بعد اجتياز الاختبار السابق. عند الرسوب، راجع الدرس ثم أعد المحاولة.</span></div>
  `;
  body.querySelectorAll('.journey-stage-action:not(:disabled)').forEach(button => button.addEventListener('click', () => navigateTo(button.dataset.route)));
  featherRefresh();
}

async function getJourneyLesson(stage) {
  const type = String(stage.lesson_type || '').toLowerCase();
  if (!stage.lesson_id) return null;
  if (type === 'video') return await getVideoById(stage.lesson_id);
  if (type === 'book') {
    try { return (await getBooks('', '')).find(book => book.$id === stage.lesson_id) || null; } catch { return null; }
  }
  if (type === 'summary') {
    try { return (await getSummaries('', '')).find(summary => summary.$id === stage.lesson_id) || null; } catch { return null; }
  }
  if (type === 'audio') {
    try { return (await getAudios('', '')).find(audio => audio.$id === stage.lesson_id) || null; } catch { return null; }
  }
  return null;
}

function journeyLessonLink(stage, lesson) {
  const type = String(stage.lesson_type || '').toLowerCase();
  if (stage.lesson_url) return { href: stage.lesson_url, external: true };
  if (!stage.lesson_id) return null;
  const routes = { video: `/watch/${encodeURIComponent(stage.lesson_id)}`, playlist: `/playlist/${encodeURIComponent(stage.lesson_id)}`, book: '/books' };
  if (routes[type]) return { href: routes[type], external: false };
  if (lesson?.url) return { href: lesson.url, external: true };
  return null;
}

async function renderJourneyStage(journeyId, stageId) {
  updateBottomNav('home');
  setPageTitle('مرحلة الرحلة');
  renderPage(`
    <div class="page journey-stage-page">
      <div class="inner-header">
        <button class="back-btn" onclick="navigateTo('${journeyRoute(journeyId)}')" aria-label="العودة إلى الخريطة"><i data-feather="arrow-right"></i></button>
        <span class="inner-title">مرحلة الرحلة</span>
      </div>
      <div id="journey-stage-body">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  const body = el('journey-stage-body');
  const [journey, stages] = await Promise.all([getLearningJourneyById(journeyId), getLearningJourneyStages(journeyId).catch(() => [])]);
  const stage = stages.find(item => item.$id === stageId);
  if (!journey || !stage) {
    body.innerHTML = emptyBox('المرحلة غير موجودة', 'ارجع إلى خريطة الرحلة وحاول مرة أخرى.');
    featherRefresh();
    return;
  }
  const session = Auth.get();
  if (!session) {
    body.innerHTML = `<div class="guest-wrap"><div class="guest-card"><i data-feather="lock" class="guest-icon"></i><p class="guest-title">سجّل الدخول لحفظ تقدمك في الرحلة</p><button class="btn-primary" onclick="navigateTo('/login')">تسجيل الدخول</button></div></div>`;
    featherRefresh();
    return;
  }
  const [progress, attempts, lesson, test] = await Promise.all([
    getLearningJourneyProgress(journeyId).catch(() => null),
    getLearningJourneyAttempts(journeyId).catch(() => []),
    getJourneyLesson(stage),
    getTestById(stage.test_id),
  ]);
  const state = getJourneyStageState(stages, stage, progress, attempts);
  if (state === 'locked') {
    body.innerHTML = `<section class="journey-locked-stage"><i data-feather="lock"></i><h1>هذه المرحلة مقفلة</h1><p>اجتز المرحلة السابقة أولاً لتتمكن من المتابعة.</p><button class="btn-primary" onclick="navigateTo('${journeyRoute(journeyId)}')">العودة إلى الخريطة</button></section>`;
    featherRefresh();
    return;
  }
  const link = journeyLessonLink(stage, lesson);
  const latest = attempts.find(item => item.stage_id === stage.$id);
  const testCount = test?.questions?.length || 0;
  const testButton = stage.test_id && test ? `<button class="btn-primary journey-test-btn" type="button" id="journey-open-test"><i data-feather="check-square"></i>${state === 'retry' ? 'إعادة اختبار المرحلة' : state === 'completed' ? 'مراجعة الاختبار' : 'ابدأ اختبار المرحلة'}</button>` : `<div class="journey-missing-test"><i data-feather="alert-triangle"></i>لم يتم ربط اختبار بهذه المرحلة بعد.</div>`;
  body.innerHTML = `
    <section class="journey-lesson-head">
      <span class="journey-kicker">${escHtml(journey.title)}</span>
      <h1>${escHtml(stage.title)}</h1>
      <p>${escHtml(stage.description || 'ابدأ بمراجعة الدرس، ثم أجب عن اختبار المرحلة.')}</p>
    </section>
    <section class="journey-lesson-card">
      <div class="journey-lesson-icon"><i data-feather="${stage.lesson_type === 'video' ? 'play-circle' : 'book-open'}"></i></div>
      <div class="journey-lesson-copy">
        <span>الدرس الأساسي · ${escHtml(journeyStageLessonLabel(stage.lesson_type))}</span>
        <h2>${escHtml(lesson?.title || lesson?.name || stage.lesson_id || 'المحتوى التعليمي')}</h2>
        <p>${escHtml(lesson?.description || 'راجع محتوى هذه المرحلة قبل أداء الاختبار.')}</p>
      </div>
      ${link ? `<a class="journey-lesson-link" href="${escHtml(link.href)}" ${link.external ? 'target="_blank" rel="noopener"' : ''}>فتح الدرس <i data-feather="external-link"></i></a>` : ''}
    </section>
    <section class="journey-test-card">
      <div class="journey-test-card-head"><div><span class="journey-kicker">اختبار المرحلة</span><h2>${escHtml(test?.title || 'اختبار المرحلة')}</h2></div><span class="journey-test-count">${testCount} سؤال</span></div>
      <p>نسبة النجاح المطلوبة: <strong>${Number(stage.passing_score ?? journey.passing_score ?? 70)}%</strong>${latest ? ` · آخر نتيجة: <strong>${Number(latest.percentage || 0)}%</strong>` : ''}</p>
      ${testButton}
    </section>
    <div class="journey-stage-tip"><i data-feather="info"></i><span>لن تُفتح المرحلة التالية إلا بعد تحقيق نسبة النجاح المطلوبة. يمكنك إعادة الاختبار عند الحاجة.</span></div>
  `;
  el('journey-open-test')?.addEventListener('click', () => navigateTo(journeyTestRoute(stage.test_id, journeyId, stage.$id)));
  featherRefresh();
}
