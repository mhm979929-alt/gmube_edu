// ── Appwrite Configuration ──────────────────────────────────────
const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6a54cfea00202c1d3e20";
const DATABASE_ID = "gmube_db";

// ⚠️ ملاحظة أمنية: مفتاح API سرّي مخصص للخوادم فقط.
// متصفح SDK (appwrite@16) لا يدعم إرساله، والتطبيق يعمل عبر جلسات تسجيل الدخول
// (القراءة عامة والكتابة للمستخدمين المسجّلين). احتفظ به هنا كمرجع للاستخدام على خادم وسيط مستقبلاً.
const APPWRITE_API_KEY = "standard_92952f7a83daa4e338333df110bec32bd3846e535d5d613b80a846706155430d757666ca313afa38da72bad9e70759d80ed2eee1f3fba85e0400cc1e0a85cf8e8f076c12ed9a8ad98f4a324103ff82e7db4b3d9dfd5f84f046621a1eca7c931c985538b2688704174ecb5666e7633ae594584a004f303d759be7b100302ad174";

// ── خدمة "اسأل كتابك" (Supabase + Groq) ─────────────────────────
const SUPABASE_URL = "https://omcdeuyumsyrwhtkvono.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY2RldXl1bXN5cndodGt2b25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0ODUwOTcsImV4cCI6MjEwMDA2MTA5N30.-HWniBIpRDxvpwugATN8TWsVaaOrxbH-P4KJC77w7Bc";
const GROQ_KEY = "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";

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
  SUBJECTS: "subjects",
  SHORTS: "shorts"
};

let CATEGORIES = ["الكل"]; 

const GRADES = [
  "الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس",
  "الصف السابع", "الصف الثامن", "الصف التاسع", "الصف العاشر", "الصف الحادي عشر", "البكالوريا"
];

const AD_BANNER_URL = "https://mhm979929-alt.github.io/Ads/";
