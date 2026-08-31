// ── Appwrite SDK Init ───────────────────────────────────────────
// ملاحظة: لا نستخدم مفتاح API هنا لأن متصفح SDK لا يدعم setKey.
// القراءة تعمل للجميع، والكتابة تتم عبر جلسة المستخدم المسجّل (permissions: users).
const { Client, Account, Databases, Query, ID, OAuthProvider } = Appwrite;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

// ── Session State ───────────────────────────────────────────────
let _userId = null;
let _userName = null;
let _userRole = null;

function setSessionData(userId, userName, userRole) {
  _userId = userId;
  _userName = userName ?? null;
  _userRole = userRole ?? null;
}
function getCurrentUserId() { return _userId; }
function getCurrentUserRole() { return _userRole; }

// ── YouTube Helpers ─────────────────────────────────────────────
function isYouTubeUrl(url) {
  if (!url) return false;
  return /youtube\.com|youtu\.be/.test(url);
}
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
function getYouTubeThumbnail(url) {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// ── Auth ────────────────────────────────────────────────────────
function withTimeout(promise, milliseconds = 7000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("انتهت مهلة الاتصال")), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function getCurrentSession() {
  try { return await withTimeout(account.get(), 7000); } catch { return null; }
}

function accountCandidates(appUser) {
  const candidates = [appUser?.$id].filter(Boolean);
  const email = String(appUser?.email || "").toLowerCase();
  if (email.endsWith("@gmube.app")) candidates.push(email.slice(0, -"@gmube.app".length));
  return [...new Set(candidates)];
}

async function findProfileForAccountUser(appUser) {
  for (const candidate of accountCandidates(appUser)) {
    try {
      const teachers = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEACHERS, [
        Query.equal("user_id", candidate), Query.limit(1)
      ]);
      if (teachers.documents.length) {
        return { ...teachers.documents[0], type: "teacher", role: "teacher" };
      }
    } catch {}
    try {
      const students = await databases.listDocuments(DATABASE_ID, COLLECTIONS.STUDENTS, [
        Query.equal("user_id", candidate), Query.limit(1)
      ]);
      if (students.documents.length) {
        return { ...students.documents[0], type: "student", role: "student" };
      }
    } catch {}
  }
  // الحسابات الحديثة لا تحتاج وثيقة عامة؛ أي حساب غير مرتبط بمعلم هو طالب افتراضياً.
  return {
    $id: appUser.$id,
    id: appUser.$id,
    user_id: appUser.$id,
    name: appUser.name || appUser.email,
    type: "student",
    role: "student",
  };
}

async function loginUser(type, name, secret) {
  // الحسابات الحديثة للطلاب تدخل بالبريد مباشرة.
  if (type === "student" && String(name).includes("@")) {
    try {
      await account.createEmailPasswordSession(name.trim(), secret);
      return await findProfileForAccountUser(await account.get());
    } catch {}
  }

  // توافق الحسابات القديمة: الاسم ← وثيقة users ← بريد اصطناعي داخل Appwrite.
  const collectionId = type === "teacher" ? COLLECTIONS.TEACHERS : COLLECTIONS.STUDENTS;
  const result = await databases.listDocuments(DATABASE_ID, collectionId, [Query.equal("name", name)]);
  if (!result.documents || result.documents.length === 0)
    throw new Error("بيانات الدخول غير صحيحة");
  const user = result.documents[0];
  const email = `${user.user_id}@gmube.app`;
  try {
    await account.createEmailPasswordSession(email, secret);
    return user;
  } catch {
    throw new Error("بيانات الدخول غير صحيحة");
  }
}

async function registerStudentAccount(name, email, password) {
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (cleanName.length < 2) throw new Error("اكتب الاسم الكامل");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("أدخل بريداً إلكترونياً صحيحاً");
  if (String(password || "").length < 8) throw new Error("كلمة السر يجب أن تكون 8 محارف على الأقل");

  const created = await account.create(ID.unique(), cleanEmail, password, cleanName);
  await account.createEmailPasswordSession(cleanEmail, password);
  try { await account.updatePrefs({ gmube_role: "student" }); } catch {}
  return {
    $id: created.$id,
    id: created.$id,
    user_id: created.$id,
    name: created.name || cleanName,
    type: "student",
    role: "student",
  };
}

function startGoogleStudentLogin() {
  const base = `${window.location.origin}${window.location.pathname}`;
  const success = `${base}#/login?oauth=success`;
  const failure = `${base}#/login?oauth=failed`;
  return account.createOAuth2Session(OAuthProvider.Google, success, failure, ["openid", "email", "profile"]);
}

async function logoutUser() {
  try { await account.deleteSession("current"); } catch {}
}

// ── Videos ─────────────────────────────────────────────────────
async function getVideos(category) {
  const key = `videos_${category || 'all'}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (category && category !== "الكل") queries.push(Query.equal("category", category));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VIDEOS, queries);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

async function getVideoById(id) {
  try {
    return await databases.getDocument(DATABASE_ID, COLLECTIONS.VIDEOS, id);
  } catch { return null; }
}

// ── فيديوهات الأستاذ: حقل user_id في جدول videos يحمل معرّف وثيقة الأستاذ ──
async function getVideosByTeacher(teacherDocId) {
  const key = `videos_teacher_${teacherDocId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VIDEOS, [
    Query.equal("user_id", teacherDocId),
    Query.orderDesc("created_at"),
    Query.limit(50)
  ]);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

async function updateVideoViews(id, views) {
  try { await databases.updateDocument(DATABASE_ID, COLLECTIONS.VIDEOS, id, { views }); } catch {}
}

async function updateVideoLikes(id, likes) {
  try { await databases.updateDocument(DATABASE_ID, COLLECTIONS.VIDEOS, id, { likes }); } catch {}
}

async function updateVideoRating(id, avgRating, ratingCount) {
  try { await databases.updateDocument(DATABASE_ID, COLLECTIONS.VIDEOS, id, { avg_rating: avgRating, rating_count: ratingCount }); } catch {}
}

// ── Teachers ────────────────────────────────────────────────────
async function getTeachers() {
  const key = 'teachers_all';
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEACHERS, [
    Query.orderDesc("created_at"), Query.limit(100)
  ]);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

async function getTeacherByUserId(userId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEACHERS, [
    Query.equal("user_id", userId)
  ]);
  return result.documents[0] ?? null;
}

// ── Comments ────────────────────────────────────────────────────
async function getComments(videoId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMMENTS, [
    Query.equal("video_id", videoId), Query.orderDesc("created_at"), Query.limit(100)
  ]);
  return result.documents;
}

async function addComment(videoId, userId, userName, text, rating, parentId) {
  return await databases.createDocument(DATABASE_ID, COLLECTIONS.COMMENTS, ID.unique(), {
    video_id: videoId, user_id: userId, user_name: userName, text,
    rating: rating || 0, parent_id: parentId ?? null, created_at: new Date().toISOString(),
  });
}

// ── Playlists (جديد: دوال عرض القوائم ومحتواها) ──
async function getPlaylistsBySubject(subject) {
  const key = `playlists_subject_${subject}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PLAYLISTS, [
    Query.equal("subject", subject),
    Query.orderDesc("$createdAt"),
    Query.limit(50)
  ]);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

async function getVideosByPlaylist(playlistId) {
  const key = `videos_playlist_${playlistId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VIDEOS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

async function getBooksByPlaylist(playlistId) {
  const key = `books_playlist_${playlistId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

async function getTestsByPlaylist(playlistId) {
  const key = `tests_playlist_${playlistId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  // جدول tests يحتوي حقل `playlist` (وليس playlist_id) ويربط بالاسم غالباً
  let queries = [Query.equal("playlist", playlistId), Query.orderDesc("created_at"), Query.limit(100)];
  let result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TESTS, queries);

  if (result.documents.length === 0) {
    try {
      const playlist = await databases.getDocument(DATABASE_ID, COLLECTIONS.PLAYLISTS, playlistId);
      queries = [Query.equal("playlist", playlist.name), Query.orderDesc("created_at"), Query.limit(100)];
      result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TESTS, queries);
    } catch {}
  }

  const docs = result.documents.map(doc => ({
    ...doc,
    questions: typeof doc.questions === "string" ? JSON.parse(doc.questions) : doc.questions,
  }));
  sessionStorage.setItem(key, JSON.stringify(docs));
  return docs;
}

async function getSummariesByPlaylist(playlistId) {
  const key = `summaries_playlist_${playlistId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SUMMARIES, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

async function getAudiosByPlaylist(playlistId) {
  const key = `audios_playlist_${playlistId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.AUDIOS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

async function getPhotosByPlaylist(playlistId) {
  const key = `photos_playlist_${playlistId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PHOTOS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

// ── Books ───────────────────────────────────────────────────────
async function getBooks(subject, grade) {
  const key = `books_${subject || 'all'}_${grade || 'all'}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKS, queries);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

// ── Ministry Books ──────────────────────────────────────────────
async function getMinistryBooks(subject, grade) {
  const key = `ministry_books_${subject || 'all'}_${grade || 'all'}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.MINISTRY_BOOKS, queries);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

// ── Tests ───────────────────────────────────────────────────────
async function getTests(subject) {
  const key = `tests_${subject || 'all'}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TESTS, queries);
  const docs = result.documents.map(doc => ({
    ...doc,
    questions: typeof doc.questions === "string" ? JSON.parse(doc.questions) : doc.questions,
  }));
  sessionStorage.setItem(key, JSON.stringify(docs));
  return docs;
}

async function getTestById(id) {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.TESTS, id);
    return {
      ...doc,
      questions: typeof doc.questions === "string" ? JSON.parse(doc.questions) : doc.questions,
    };
  } catch { return null; }
}

async function submitTestResult(data) {
  // مسح الكاش عند تقديم نتيجة جديدة
  sessionStorage.removeItem(`results_${data.user_id}`);
  return await databases.createDocument(DATABASE_ID, COLLECTIONS.TEST_RESULTS, ID.unique(), {
    user_id: data.user_id, test_id: data.test_id,
    score: data.score, total: data.total,
    answers: JSON.stringify(data.answers), created_at: new Date().toISOString(),
  });
}

async function getTestResults(userId) {
  const key = `results_${userId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEST_RESULTS, [
    Query.equal("user_id", userId), Query.orderDesc("created_at"), Query.limit(100)
  ]);
  const docs = result.documents.map(doc => ({
    ...doc,
    answers: typeof doc.answers === "string" ? JSON.parse(doc.answers) : doc.answers,
  }));
  sessionStorage.setItem(key, JSON.stringify(docs));
  return docs;
}

// ── Summaries ───────────────────────────────────────────────────
async function getSummaries(subject, grade) {
  const key = `summaries_${subject || 'all'}_${grade || 'all'}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SUMMARIES, queries);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

// ── Audios ──────────────────────────────────────────────────────
async function getAudios(subject, grade) {
  const key = `audios_${subject || 'all'}_${grade || 'all'}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.AUDIOS, queries);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

// ── Photos ──────────────────────────────────────────────────────
async function getPhotos(subject, grade) {
  const key = `photos_${subject || 'all'}_${grade || 'all'}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PHOTOS, queries);
  sessionStorage.setItem(key, JSON.stringify(result.documents));
  return result.documents;
}

// ── Follows ─────────────────────────────────────────────────────
async function isFollowing(studentId, teacherId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FOLLOWS, [
    Query.equal("student_user_id", studentId), Query.equal("teacher_user_id", teacherId)
  ]);
  return result.total > 0;
}

async function followTeacher(studentId, teacherId) {
  await databases.createDocument(DATABASE_ID, COLLECTIONS.FOLLOWS, ID.unique(), {
    student_user_id: studentId, teacher_user_id: teacherId, created_at: new Date().toISOString(),
  });
}

async function unfollowTeacher(studentId, teacherId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FOLLOWS, [
    Query.equal("student_user_id", studentId), Query.equal("teacher_user_id", teacherId)
  ]);
  if (result.documents.length > 0)
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FOLLOWS, result.documents[0].$id);
}

// ── Notifications ───────────────────────────────────────────────
async function getNotifications(userId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, [
    Query.equal("user_id", userId), Query.orderDesc("created_at"), Query.limit(50)
  ]);
  return result.documents;
}

async function markNotificationAsRead(id) {
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, id, { is_read: true });
}

// ── Learning Journeys ────────────────────────────────────────────
function parseJourneyJson(value, fallback = []) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '');
    return Array.isArray(parsed) ? parsed : fallback;
  } catch { return fallback; }
}

function journeyUserPermission(action, userId) {
  return `${action}("user:${String(userId)}")`;
}

async function getLearningJourneys(options = {}) {
  const { subject = '', grade = '', activeOnly = true } = options || {};
  const queries = [Query.orderAsc('sort_order'), Query.limit(100)];
  if (activeOnly) queries.push(Query.equal('is_active', true));
  if (subject && subject !== 'الكل') queries.push(Query.equal('subject', subject));
  if (grade) queries.push(Query.equal('grade', grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LEARNING_JOURNEYS, queries);
  return (result.documents || []).map(journey => ({
    ...journey,
    passing_score: Number(journey.passing_score ?? 70),
    sort_order: Number(journey.sort_order ?? 0),
    is_active: journey.is_active !== false,
    version: Number(journey.version ?? 1),
  }));
}

async function getLearningJourneyById(journeyId) {
  try {
    const journey = await databases.getDocument(DATABASE_ID, COLLECTIONS.LEARNING_JOURNEYS, journeyId);
    return {
      ...journey,
      passing_score: Number(journey.passing_score ?? 70),
      sort_order: Number(journey.sort_order ?? 0),
      is_active: journey.is_active !== false,
      version: Number(journey.version ?? 1),
    };
  } catch { return null; }
}

async function getLearningJourneyStages(journeyId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LEARNING_JOURNEY_STAGES, [
    Query.equal('journey_id', journeyId),
    Query.orderAsc('stage_order'),
    Query.limit(100),
  ]);
  return (result.documents || [])
    .filter(stage => stage.is_active !== false)
    .map(stage => ({
      ...stage,
      stage_order: Number(stage.stage_order ?? 0),
      passing_score: stage.passing_score === null || stage.passing_score === undefined || stage.passing_score === '' ? null : Number(stage.passing_score),
      estimated_minutes: Number(stage.estimated_minutes ?? 0),
    }));
}

async function getLearningJourneyProgress(journeyId, userId = _userId) {
  if (!journeyId || !userId) return null;
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LEARNING_JOURNEY_PROGRESS, [
      Query.equal('journey_id', journeyId), Query.equal('user_id', userId), Query.limit(1),
    ]);
    const doc = result.documents?.[0];
    if (!doc) return null;
    return {
      ...doc,
      completed_stage_orders: parseJourneyJson(doc.completed_stage_orders),
      progress_percent: Number(doc.progress_percent ?? 0),
      current_stage_order: Number(doc.current_stage_order ?? 1),
      last_score: doc.last_score === null || doc.last_score === undefined ? null : Number(doc.last_score),
    };
  } catch { return null; }
}

async function getLearningJourneyAttempts(journeyId, userId = _userId) {
  if (!journeyId || !userId) return [];
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LEARNING_JOURNEY_ATTEMPTS, [
      Query.equal('journey_id', journeyId), Query.equal('user_id', userId),
      Query.orderDesc('attempted_at'), Query.limit(200),
    ]);
    return result.documents || [];
  } catch { return []; }
}

async function recordLearningJourneyAttempt({ userId = _userId, journeyId, stageId, stageOrder, testId, score, total, passingScore, totalStages }) {
  if (!userId || !journeyId || !stageId || !testId) throw new Error('بيانات المرحلة غير مكتملة');
  const numericScore = Number(score) || 0;
  const numericTotal = Number(total) || 0;
  const percentage = numericTotal > 0 ? Math.round((numericScore / numericTotal) * 100) : 0;
  const threshold = Math.max(0, Math.min(100, Number(passingScore ?? 70)));
  const passed = percentage >= threshold;
  const existingAttempts = await getLearningJourneyAttempts(journeyId, userId);
  const attemptNo = existingAttempts.filter(a => a.stage_id === stageId).length + 1;
  const permissions = [journeyUserPermission('read', userId), journeyUserPermission('update', userId)];
  const attempt = await databases.createDocument(DATABASE_ID, COLLECTIONS.LEARNING_JOURNEY_ATTEMPTS, ID.unique(), {
    user_id: userId, journey_id: journeyId, stage_id: stageId, test_id: testId,
    score: numericScore, total: numericTotal, percentage, passed, attempt_no: attemptNo,
    attempted_at: new Date().toISOString(),
  }, permissions);

  const previous = await getLearningJourneyProgress(journeyId, userId);
  const completed = new Set((previous?.completed_stage_orders || []).map(Number));
  if (passed) completed.add(Number(stageOrder));
  const completedOrders = [...completed].sort((a, b) => a - b);
  const stageCount = Math.max(1, Number(totalStages) || completedOrders.length || 1);
  const progressPercent = Math.min(100, Math.round((completedOrders.length / stageCount) * 100));
  const currentStageOrder = passed ? Math.max(Number(stageOrder) + 1, Number(previous?.current_stage_order || 1)) : Math.max(Number(stageOrder), Number(previous?.current_stage_order || 1));
  const status = progressPercent >= 100 ? 'completed' : (completedOrders.length ? 'in_progress' : 'not_started');
  const data = {
    user_id: userId, journey_id: journeyId, current_stage_order: currentStageOrder,
    completed_stage_orders: JSON.stringify(completedOrders), progress_percent: progressPercent,
    status, last_score: percentage, updated_at: new Date().toISOString(),
  };
  let progress;
  if (previous?.$id) {
    progress = await databases.updateDocument(DATABASE_ID, COLLECTIONS.LEARNING_JOURNEY_PROGRESS, previous.$id, data);
  } else {
    progress = await databases.createDocument(DATABASE_ID, COLLECTIONS.LEARNING_JOURNEY_PROGRESS, ID.unique(), {
      ...data, created_at: new Date().toISOString(),
    }, permissions);
  }
  return { attempt, progress: { ...progress, completed_stage_orders: completedOrders, progress_percent: progressPercent, status }, percentage, threshold, passed };
}

// ── Format helpers ──────────────────────────────────────────────
function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
}