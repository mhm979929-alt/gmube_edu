// ── Appwrite SDK Init ───────────────────────────────────────────
const { Client, Account, Databases, Query, ID } = Appwrite;

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
async function getCurrentSession() {
  try { return await account.get(); } catch { return null; }
}

async function loginUser(type, name, secret) {
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

async function logoutUser() {
  try { await account.deleteSession("current"); } catch {}
}

// ── Videos ─────────────────────────────────────────────────────
async function getVideos(category) {
  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (category && category !== "الكل") queries.push(Query.equal("category", category));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VIDEOS, queries);
  return result.documents;
}

async function getVideoById(id) {
  try {
    return await databases.getDocument(DATABASE_ID, COLLECTIONS.VIDEOS, id);
  } catch { return null; }
}

async function getVideosByTeacher(userId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VIDEOS, [
    Query.equal("user_id", userId), Query.orderDesc("created_at"), Query.limit(100)
  ]);
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
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEACHERS, [
    Query.orderDesc("created_at"), Query.limit(100)
  ]);
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

// ── Playlists (قديم) ────────────────────────────────────────────
async function getPlaylists(teacherId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PLAYLISTS, [
    Query.equal("teacher_id", teacherId), Query.orderDesc("created_at"), Query.limit(100)
  ]);
  return result.documents;
}

// ── Books ───────────────────────────────────────────────────────
async function getBooks(subject, grade) {
  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKS, queries);
  return result.documents;
}

// ── Tests ───────────────────────────────────────────────────────
async function getTests(subject) {
  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TESTS, queries);
  return result.documents.map(doc => ({
    ...doc,
    questions: typeof doc.questions === "string" ? JSON.parse(doc.questions) : doc.questions,
  }));
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
  return await databases.createDocument(DATABASE_ID, COLLECTIONS.TEST_RESULTS, ID.unique(), {
    user_id: data.user_id, test_id: data.test_id,
    score: data.score, total: data.total,
    answers: JSON.stringify(data.answers), created_at: new Date().toISOString(),
  });
}

async function getTestResults(userId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEST_RESULTS, [
    Query.equal("user_id", userId), Query.orderDesc("created_at"), Query.limit(100)
  ]);
  return result.documents.map(doc => ({
    ...doc,
    answers: typeof doc.answers === "string" ? JSON.parse(doc.answers) : doc.answers,
  }));
}

// ── Summaries ───────────────────────────────────────────────────
async function getSummaries(subject, grade) {
  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SUMMARIES, queries);
  return result.documents;
}

// ── Audios ──────────────────────────────────────────────────────
async function getAudios(subject, grade) {
  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.AUDIOS, queries);
  return result.documents;
}

// ── Photos ──────────────────────────────────────────────────────
async function getPhotos(subject, grade) {
  const queries = [Query.orderDesc("created_at"), Query.limit(100)];
  if (subject && subject !== "الكل") queries.push(Query.equal("subject", subject));
  if (grade) queries.push(Query.equal("grade", grade));
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PHOTOS, queries);
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

// ── Playlists (جديد: دوال عرض القوائم ومحتواها) ──
async function getPlaylistsBySubject(subject) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PLAYLISTS, [
    Query.equal("subject", subject),
    Query.orderDesc("$createdAt"),
    Query.limit(50)
  ]);
  return result.documents;
}

async function getVideosByPlaylist(playlistId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VIDEOS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  return result.documents;
}

async function getBooksByPlaylist(playlistId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  return result.documents;
}

async function getTestsByPlaylist(playlistId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TESTS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  return result.documents;
}

async function getSummariesByPlaylist(playlistId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SUMMARIES, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  return result.documents;
}

async function getAudiosByPlaylist(playlistId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.AUDIOS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  return result.documents;
}

async function getPhotosByPlaylist(playlistId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PHOTOS, [
    Query.equal("playlist_id", playlistId),
    Query.orderDesc("created_at"),
    Query.limit(100)
  ]);
  return result.documents;
}

// ── Format helpers ──────────────────────────────────────────────
function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-DZ", { year: "numeric", month: "short", day: "numeric" });
}
