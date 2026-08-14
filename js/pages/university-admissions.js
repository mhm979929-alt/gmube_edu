// ── University Admissions Matcher ───────────────────────────────
let admissionsCatalogCache = null;

async function getAdmissionsCatalog() {
  if (admissionsCatalogCache) return admissionsCatalogCache;
  const response = await fetch("data/university-admissions-2025-2026.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("تعذر تحميل دليل القبول");
  admissionsCatalogCache = await response.json();
  return admissionsCatalogCache;
}

function admissionsNormaliseNumber(value) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return String(value || "")
    .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(persianDigits.indexOf(digit)))
    .replace(/[،,\s]/g, "");
}

function admissionsScoreText(score) {
  return new Intl.NumberFormat("ar-SY").format(score);
}

function admissionsResultCard(row) {
  const notes = (row.specialConditions || []).map(note =>
    `<span class="admission-note"><i data-feather="info"></i>${escHtml(note)}</span>`
  ).join("");
  return `
    <article class="admission-result-card">
      <div class="admission-result-main">
        <h3>${escHtml(row.program)}</h3>
        <span class="admission-city"><i data-feather="map-pin"></i>${escHtml(row.city)}</span>
      </div>
      <div class="admission-score">
        <span>الحد الأدنى</span>
        <strong>${admissionsScoreText(row.minScore)}</strong>
      </div>
      ${notes ? `<div class="admission-notes">${notes}</div>` : ""}
    </article>`;
}

async function renderUniversityAdmissions() {
  updateBottomNav("");
  setPageTitle("دليل القبول");
  renderPage(`
    <main class="page admissions-page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()" aria-label="رجوع"><i data-feather="arrow-right"></i></button>
        <i data-feather="compass" style="color:#4CAF50"></i>
        <span class="inner-title">دليل القبول الجامعي</span>
      </div>

      <section class="admissions-hero">
        <div class="admissions-hero-icon"><i data-feather="award"></i></div>
        <div>
          <span class="admissions-kicker">المفاضلة العامة <bdi dir="ltr">2025–2026</bdi></span>
          <h1>اكتشف خيارات قبولك</h1>
          <p>أدخل مجموعك واختر فرعك لتظهر لك التخصصات التي تحقق حدها الأدنى.</p>
        </div>
      </section>

      <form id="admissions-form" class="admissions-form" novalidate>
        <label class="admissions-label" for="admissions-branch">الفرع في الثانوية</label>
        <div class="admissions-branch-grid" role="radiogroup" aria-label="اختر فرع الثانوية">
          <label class="admission-branch-option active">
            <input type="radio" name="branch" value="scientific" checked>
            <i data-feather="activity"></i>
            <span>علمي</span>
          </label>
          <label class="admission-branch-option">
            <input type="radio" name="branch" value="literary">
            <i data-feather="book-open"></i>
            <span>أدبي</span>
          </label>
        </div>

        <label class="admissions-label" for="admissions-score">مجموعك الكلي</label>
        <div class="admissions-score-field">
          <i data-feather="hash"></i>
          <input id="admissions-score" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="مثال: 1850" aria-describedby="admissions-score-help">
        </div>
        <p id="admissions-score-help" class="admissions-help">أدخل مجموعك بالدرجات كما يظهر في كشف الشهادة، وليس كنسبة مئوية.</p>

        <button id="admissions-submit" class="btn-primary full admissions-submit" type="submit">
          <i data-feather="search"></i>
          عرض خيارات القبول
        </button>
      </form>

      <section id="admissions-results" class="admissions-results" aria-live="polite"></section>
      <aside id="admissions-disclaimer" class="admissions-disclaimer" hidden></aside>
    </main>
  `);
  featherRefresh();

  const form = el("admissions-form");
  const resultsEl = el("admissions-results");
  const disclaimerEl = el("admissions-disclaimer");
  let catalog;
  let lastRows = [];
  let selectedBranch = "scientific";

  try {
    catalog = await getAdmissionsCatalog();
    disclaimerEl.hidden = false;
    disclaimerEl.innerHTML = `<i data-feather="alert-circle"></i><span>${escHtml(catalog.disclaimer || "النتائج استرشادية فقط.")}</span>`;
    featherRefresh();
  } catch (error) {
    resultsEl.innerHTML = errorBox("تعذر تحميل دليل القبول", () => renderUniversityAdmissions());
    featherRefresh();
    return;
  }

  form.querySelectorAll('input[name="branch"]').forEach(input => {
    input.addEventListener("change", () => {
      selectedBranch = input.value;
      form.querySelectorAll(".admission-branch-option").forEach(option => {
        option.classList.toggle("active", option.querySelector("input").checked);
      });
      if (lastRows.length) renderAdmissionsResults(lastRows, selectedBranch);
    });
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = Number(admissionsNormaliseNumber(el("admissions-score").value));
    if (!Number.isInteger(value) || value < 0 || value > 3000) {
      toast("أدخل مجموعاً صحيحاً بالدرجات، مثل 1850", "warn");
      el("admissions-score").focus();
      return;
    }
    const records = catalog.branches?.[selectedBranch]?.records || [];
    lastRows = records.filter(row => value >= row.minScore);
    renderAdmissionsResults(lastRows, selectedBranch, value);
  });

  function renderAdmissionsResults(rows, branch, enteredScore) {
    if (!enteredScore) return;
    const branchLabel = catalog.branches?.[branch]?.label || "";
    const cities = [...new Set(rows.map(row => row.city))].sort((a, b) => a.localeCompare(b, "ar"));
    resultsEl.innerHTML = `
      <div class="admissions-result-summary">
        <div>
          <span class="admissions-result-eyebrow">نتيجة الفرع ${escHtml(branchLabel)}</span>
          <h2>مجموعك ${admissionsScoreText(enteredScore)}</h2>
          <p>${rows.length ? `توجد ${admissionsScoreText(rows.length)} خيارات تحقق حدها الأدنى.` : "لا توجد خيارات مطابقة ضمن بيانات المفاضلة العامة."}</p>
        </div>
        <div class="admissions-result-count"><i data-feather="check-circle"></i><strong>${admissionsScoreText(rows.length)}</strong></div>
      </div>
      ${rows.length ? `
        <div class="admissions-filters">
          <label for="admissions-city-filter">المدينة</label>
          <select id="admissions-city-filter"><option value="">كل المدن</option>${cities.map(city => `<option value="${escHtml(city)}">${escHtml(city)}</option>`).join("")}</select>
          <label class="sr-only" for="admissions-search">ابحث عن تخصص</label>
          <div class="admissions-search"><i data-feather="search"></i><input id="admissions-search" type="search" placeholder="ابحث عن تخصص أو مدينة"></div>
        </div>
        <div id="admissions-match-count" class="admissions-match-count"></div>
        <div id="admissions-list" class="admissions-list"></div>` : ""}
    `;
    featherRefresh();
    if (!rows.length) return;

    const listEl = el("admissions-list");
    const countEl = el("admissions-match-count");
    const cityFilter = el("admissions-city-filter");
    const searchInput = el("admissions-search");
    const draw = () => {
      const query = (searchInput.value || "").trim().toLowerCase();
      const city = cityFilter.value;
      const matches = rows.filter(row =>
        (!city || row.city === city) &&
        (!query || `${row.program} ${row.city}`.toLowerCase().includes(query))
      );
      countEl.textContent = `عرض ${admissionsScoreText(matches.length)} من ${admissionsScoreText(rows.length)} خيار`;
      listEl.innerHTML = matches.length
        ? matches.map(admissionsResultCard).join("")
        : `<div class="admissions-empty"><i data-feather="search"></i><strong>لا توجد نتائج بهذه التصفية</strong><span>جرّب مدينة أو كلمة بحث مختلفة.</span></div>`;
      featherRefresh();
    };
    cityFilter.addEventListener("change", draw);
    searchInput.addEventListener("input", draw);
    draw();
  }
}
