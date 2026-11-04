// ── Appwrite Configuration ──────────────────────────────────────
const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6a54cfea00202c1d3e20";
const DATABASE_ID = "gmube_db";

// جسر OAuth عام بلا أسرار؛ مفاتيح Upstash تبقى داخل Vercel فقط.
const OAUTH_BRIDGE_ORIGIN = "https://gmube-oauth-bridge.vercel.app";
const OAUTH_BRIDGE_ENABLED = true;

// معرّف دالة تسجيل الدخول بالاسم (Appwrite Function).
// مفعّل: تحويل الاسم إلى بريد الحساب يحدث على الخادم بمفتاح إداري،
// فلا يحتاج المتصفح إلى قراءة students/teachers إطلاقاً.
const LOGIN_FUNCTION_ID = "login-by-name";

// معرّف دالة تصحيح الاختبارات. الأجوبة الصحيحة لم تعد في مستند الاختبار
// العام؛ تُقرأ على الخادم فقط وتُرجع النتيجة ومؤشرات الصح.
const TEST_GRADE_FUNCTION_ID = "test-grade";

// لا نضع مفاتيح إدارية أو مفاتيح نماذج الذكاء الاصطناعي في الواجهة العامة.
// Appwrite SDK يعمل عبر جلسة المستخدم، وProject ID/Endpoint ليسا سريين.

// ── خدمة "اسأل كتابك" (Supabase + Groq) ─────────────────────────
// لا يُخزَّن أي مفتاح في مستودع عام. المفتاح السابق كان تالفاً (ليس JWT صالحاً)
// ومكشوفاً للعامة، وقد أُزيل. عند التفعيل: مرّر القيم من متغيّرات بيئة النشر
// أو من js/config.local.js (مستثنى من git) قبل تحميل هذا الملف.
const ASK_BOOK_ENABLED = false;
const SUPABASE_URL = "";
const SUPABASE_KEY = "";
const GROQ_KEY = "";


const COLLECTIONS = {
  TEACHERS: "teachers",
  TEACHER_STATUSES: "teacher_statuses",
  STUDENTS: "students",
  VIDEOS: "videos",
  PLAYLISTS: "playlists",
  COMMENTS: "comments",
  FOLLOWS: "follows",
  NOTIFICATIONS: "notifications",
  BOOKS: "books",
  MINISTRY_BOOKS: "ministry_books",
  TESTS: "tests",
  TEST_RESULTS: "test_results",
  SUMMARIES: "summaries",
  AUDIOS: "audios",
  PHOTOS: "photos",
  SUBJECTS: "subjects",
  SHORTS: "shorts",
  LEARNING_JOURNEYS: "learning_journeys",
  LEARNING_JOURNEY_STAGES: "learning_journey_stages",
  LEARNING_JOURNEY_PROGRESS: "learning_journey_progress",
  LEARNING_JOURNEY_ATTEMPTS: "learning_journey_attempts"
};

let CATEGORIES = ["الكل"]; 

const GRADES = [
  "الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس",
  "الصف السابع", "الصف الثامن", "الصف التاسع", "الصف العاشر", "الصف الحادي عشر", "البكالوريا"
];

const AD_BANNER_URL = "https://mhm979929-alt.github.io/Ads/";
