// ── Appwrite Configuration ──────────────────────────────────────
const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6a54cfea00202c1d3e20";
const DATABASE_ID = "gmube_db";

const COLLECTIONS = {
  TEACHERS: "teachers",
  STUDENTS: "students",
  VIDEOS: "videos",
  PLAYLISTS: "playlists",
  COMMENTS: "comments",
  FOLLOWS: "follows",
  NOTIFICATIONS: "notifications",
  BOOKS: "books",
  TESTS: "tests",
  TEST_RESULTS: "test_results",
  SUMMARIES: "summaries",
  AUDIOS: "audios",
  PHOTOS: "photos",
  SUBJECTS: "subjects" // تم إضافة هذا ليدعم المواد الجديدة
};

// تم تحويل هذه القائمة إلى متغير ديناميكي يتم تعبئته من قاعدة البيانات
let CATEGORIES = ["الكل"]; 

const GRADES = [
  "الأولى متوسط","الثانية متوسط","الثالثة متوسط","الرابعة متوسط",
  "الأولى ثانوي","الثانية ثانوي","الثالثة ثانوي",
];

const AD_BANNER_URL = "https://mhm979929-alt.github.io/Ads/";
