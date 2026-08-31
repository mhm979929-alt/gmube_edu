// ── Appwrite Configuration ──────────────────────────────────────
const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6a54cfea00202c1d3e20";
const DATABASE_ID = "gmube_db";

// جسر OAuth عام بلا أسرار؛ مفاتيح Upstash تبقى داخل Vercel فقط.
const OAUTH_BRIDGE_ORIGIN = "https://gmube-oauth-bridge.vercel.app";
const OAUTH_BRIDGE_ENABLED = true;

// لا نضع مفاتيح إدارية أو مفاتيح نماذج الذكاء الاصطناعي في الواجهة العامة.
// Appwrite SDK يعمل عبر جلسة المستخدم، وProject ID/Endpoint ليسا سريين.

// ── خدمة "اسأل كتابك" (Supabase) ─────────────────────────────────
// مفتاح anon عام بطبيعته، ولا يُعد حماية بحد ذاته؛ يجب فرض RLS في Supabase.
const SUPABASE_URL = "https://omcdeuyumsyrwhtkvono.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY2RldXl1bXN5cndodGt2b25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0ODUwOTcsImV4cCI6MjEwMDA2MTA5N30.-HWniBIpRDxvpwugATN8TWsVaaOrxbH-P4KJC77w7Bc";
// لا يمكن استدعاء Groq بأمان من المتصفح؛ ميزة اسأل كتابك ستعرض رسالة تعطيل مؤقتاً بدلاً من كشف مفتاح.
const GROQ_KEY = "";

const COLLECTIONS = {
  TEACHERS: "teachers",
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
