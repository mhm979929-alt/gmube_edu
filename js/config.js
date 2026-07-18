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
  SUBJECTS: "subjects"
};

let CATEGORIES = ["الكل"]; 

const GRADES = [
  "الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس",
  "الصف السابع", "الصف الثامن", "الصف التاسع", "الصف العاشر", "الصف الحادي عشر", "البكالوريا"
];

const AD_BANNER_URL = "https://mhm979929-alt.github.io/Ads/";