import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import Fuse from "fuse.js";
import fs from "fs";

// Website Context (Loaded once)
let zuvyEN = "";
let zuvyTR = "";
let navEN = "";
let navTR = "";

try {
  zuvyEN = fs.readFileSync("./data/zuvy_en.txt", "utf8");
  zuvyTR = fs.readFileSync("./data/zuvy_tr.txt", "utf8");
  navEN = fs.readFileSync("./data/navgurukul_en.txt", "utf8");
  navTR = fs.readFileSync("./data/navgurukul_tr.txt", "utf8");
  console.log("✅ Website context loaded.");
} catch (err) {
  console.log("⚠️ Website context files missing. Will continue without them.");
}

// import fetch from "node-fetch"; // Uncomment if Node < 18

const app = express();
const PORT = process.env.PORT || 5000;

function cleanMessage(msg = "") {
  return msg
    .replace(/<[^>]+>/g, " ")        // remove HTML tags
    // .replace(/mailto:/gi, "")        // remove mailto:
    .replace(/@/g, " @ ")            // readable email
    .replace(/\.\./g, ".")           // remove double dots
    .replace(/">/g, "")              // remove stray ">
    .replace(/\n{2,}/g, "\n")        // collapse extra newlines
    .trim();
}


/* ---------------- Google Apps Script URLs ---------------- */
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfPh0XkA1rcZslA0-i_tuF6Rv6vy5tCGlWTvX5vh1qpLfztlDuqRFhKt0wrb_5WETB0Q/exec";
const ATTENDANCE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyrpSXko924OWmzSFx9gOef4mZgVEgKmZ6RuoZq4rPUplLWeCOjp2Uxg_PJf71Ejms8Bw/exec";
const ASSESSMENT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw3T84K5jPFc38Gs6RE8nYFXmAK93iWSLF5wfAmxjQikgTZYjsgmXmcoDrIpUOF229aig/exec";
const MASTER_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxZ1LGE85wi6SOKqlO-I2UspSx1R39J9Jj6bdlAmpepdx3PF8TH5rCmdXsyo1IAtTYxxg/exec";

  let lastCategoryContext = ""; // 🧠 Remember last used category
  // per-session category context to avoid global leakage between users
  const sessionContexts = new Map();

// let lastUserIntent = ""; // 🧠 Store last user intent text

/* ---------------- AI (OpenRouter) ---------------- */
const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  "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"; // move to .env later

const SUPPORTED_LANGS = new Set(["en",]); // English, Hindi, Marathi, Bengali, Tamil, Telugu
const langDescriptor = (lang) => {
  switch (lang) {
    case "hi":
      // return "Hindi (India)";
    case "mr":
      return "Marathi";
    case "bn":
      return "Bengali";
    case "ta":
      return "Tamil";
    case "te":
      return "Telugu";
    default:
      return "English (India)";
  }
};

async function callOpenRouter(messages) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct",
      messages,
    }),
  });
  const data = await res.json();
  console.log("🧠 AI raw:", JSON.stringify(data, null, 2));
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

const fallbackText = (lang) =>
  lang === "hi"
    ? "मुझे अभी सटीक उत्तर नहीं मिला। कृपया हमें ईमेल करें — join-zuvy@navgurukul.org 💚"
    : lang === "mr"
    ? "आत्ता अचूक उत्तर सापडले नाही. कृपया आम्हाला ईमेल करा — join-zuvy@navgurukul.org 💚"
    : lang === "bn"
    ? "আমি এখন সঠিক উত্তর খুঁজে পাচ্ছি না। অনুগ্রহ করে আমাদের ইমেল করুন — join-zuvy@navgurukul.org 💚"
    : lang === "ta"
    ? "உடனடியாக சரியான பதில் கிடைக்கவில்லை. எங்களுக்கு மின்னஞ்சல் செய்யவும் — join-zuvy@navgurukul.org 💚"
    : lang === "te"
    ? "ఇప్పుడే ఖచ్చితమైన సమాధానం దొరకలేదు. దయచేసి మాకు ఈమెయిల్ చేయండి — join-zuvy@navgurukul.org 💚"
    : "I couldn’t find an exact answer now. Please email us — join-zuvy@navgurukul.org 💚";

// async function getAIResponse({ userQuestion, faqContext = "", lang = "en" }) {
//   const system = {
//     role: "system",
//     content: `You are "Zuvy Buddy" 💚 — the friendly AI guide of NavGurukul & Zuvy Bootcamps.
// - Speak like a supportive mentor for students in India.
// - Keep answers short (2–4 lines), clear, and encouraging.
// - Primarily talk about NavGurukul, Zuvy Bootcamps, LMS, attendance, assessments, or partnerships.
// - If the question is about NavGurukul or Zuvy team, founders, or purpose — answer confidently.
// - If it's clearly outside these topics (like politics or entertainment), politely say you can’t help.
// - Language: ${langDescriptor(lang)}. If the FAQ context is English, paraphrase naturally in ${langDescriptor(
//       lang
//     )}.`,
//   };
//   const user = {
//     role: "user",
//     content:
//       `QUESTION: ${userQuestion}\n` +
//       `KNOWN CONTEXT (from FAQ; may be empty): ${faqContext || "None"}`,
//   };
//   try {
//     const out = await callOpenRouter([system, user]);
//     return out || fallbackText(lang);
//   } catch (e) {
//     console.error("❌ OpenRouter error:", e);
//     return fallbackText(lang);
//   }
// }
// async function getAIResponse({ userQuestion, faqContext = "", lang = "en" }) {
//   const system = {
//     role: "system",
//     content: `You are "Zuvy Buddy" 💚 — the friendly AI guide of NavGurukul & Zuvy Bootcamps.
// - Speak like a supportive mentor for students in India.
// - Keep answers short (2–4 lines), clear, and encouraging.
// - Primarily talk about NavGurukul, Zuvy Bootcamps, LMS, attendance, assessments, or partnerships.
// - If the question is about NavGurukul or Zuvy team, founders, or purpose — answer confidently.
// - If it's clearly outside these topics (like politics or entertainment), politely say you can’t help.
// - Language: ${langDescriptor(lang)}. If the FAQ context is English, paraphrase naturally in ${langDescriptor(lang)}.`,
//   };

//   /* 🧠 BONUS FACT BASE (add this part) */
//   const globalFacts = `
// NavGurukul is a non-profit organization founded by Abhishek Gupta and Rishabh Verma.
// As of 2024, Nidhi Anarkat is the CEO of NavGurukul.
// Zuvy is an initiative by NavGurukul led by Co-Founder & CEO Sandhya Dittakavi.
// Both focus on inclusive, job-oriented education and digital learning for youth in India.
// `;

//   /* Existing user prompt */
//   const user = {
//     role: "user",
//     content:
//       `${globalFacts}\n\nQUESTION: ${userQuestion}\n` +
//       `KNOWN CONTEXT (from FAQ; may be empty): ${faqContext || "None"}`,
//   };

//   try {
//     const out = await callOpenRouter([system, user]);
//     return out || fallbackText(lang);
//   } catch (e) {
//     console.error("❌ OpenRouter error:", e);
//     return fallbackText(lang);
//   }
// }
// async function getAIResponse({ userQuestion, faqContext = "", lang = "en" }) {
//   const system = {
//     role: "system",
//     content: `You are "Zuvy Buddy" — a friendly and professional support assistant for NavGurukul & Zuvy Bootcamps.
// - Maintain a warm and polite tone.
// - Do not use emojis.
// - Keep answers short (2–4 lines).
// - Always respond in clear English only.
// - Stay focused on topics related to NavGurukul, Zuvy Bootcamps, LMS, attendance, assessments, and partnerships.
// - Speak like a supportive mentor for students in India.
// - Always respond entirely in English, even if the user greets in Hindi or mixes languages.
// - Do not use words like "Namaste", "Aapka", "Dhanyavaad", or any Hindi greetings or text.
// - Keep answers short (2–4 lines), clear, and encouraging.
// - Primarily talk about NavGurukul, Zuvy Bootcamps, LMS, attendance, assessments, or partnerships.
// - If the question is about NavGurukul or Zuvy team, founders, or purpose — answer confidently.
// - If the question is not about NavGurukul, Zuvy Bootcamps, LMS, attendance, assessments, or partnerships, reply gently and briefly.
// - Politely say that you’re focused on helping with NavGurukul and Zuvy-related topics, without sounding dismissive or rude.
// - Example: “That’s an interesting question! I usually help with NavGurukul and Zuvy Bootcamp queries. Would you like to know something about that?”
// - Language: English (India). All responses should be in English only.
// - Never try to explain or define unrelated general topics (like weather, science, movies, or general knowledge).
// - If the user asks about something unrelated, do not define or explain it. Just respond softly and redirect to NavGurukul or Zuvy Bootcamps.
// - Example: “That’s an interesting question! I usually help with NavGurukul and Zuvy Bootcamp queries 💚 Would you like to know more about that?”
// `,
//   };

//   const globalFacts = `
// NavGurukul is a non-profit organization founded by Abhishek Gupta and Rishabh Verma.
// As of 2024, Nidhi Anarkat is the CEO of NavGurukul.
// Zuvy is an initiative by NavGurukul led by Co-Founder & CEO Sandhya Dittakavi.
// Both focus on inclusive, job-oriented education and digital learning for youth in India.
// `;

//   const user = {
//     role: "user",
//     content:
//       `${globalFacts}\n\nQUESTION: ${userQuestion}\n` +
//       `KNOWN CONTEXT (from FAQ; may be empty): ${faqContext || "None"}`,
//   };

//   try {
//     const out = await callOpenRouter([system, user]);
//     return out || fallbackText(lang);
//   } catch (e) {
//     console.error("❌ OpenRouter error:", e);
//     return fallbackText(lang);
//   }
// }
async function getAIResponse({ userQuestion, faqContext = "", lang = "en" }) {
  const system = {
  role: "system",
  content: `
You are "Zuvy Buddy" — the official support assistant for NavGurukul & Zuvy Bootcamps.

🎯 Your purpose:
To explain programs, processes, expectations, roles, and support details clearly and confidently.

🧭 Tone:
- Professional and supportive
- Simple and friendly language
- No emojis
- No slang
- No unnecessary appreciation phrases like “That’s correct”, “Exactly”, “Right!”, etc.

📏 Response Length:
- 2 to 4 short sentences.
- No long paragraphs.
- No bullet lists unless necessary for clarity.

🔍 Knowledge Priority:
1) If FAQ context exists → Use it directly and rephrase clearly.
2) If FAQ context is weak → Use website knowledge below.
3) If still unclear → Say you are not fully certain and suggest email support (no guessing).

🛑 Never Do:
- Never invent missing information.
- Never guess numbers, dates, rules, or internal reasons.
- Never confirm or validate user statements.
- Never explain unrelated topics.

🌐 Always respond in:
English (India) only.

### Website Knowledge:
Zuvy (summary):
${zuvyTR}

NavGurukul (summary):
${navTR}

If deeper detail is needed:
${zuvyEN}
${navEN}
`
};

  try {
    const out = await callOpenRouter([system, user]);
    return out || "I couldn't find a complete answer. You may contact join-zuvy@navgurukul.org";
  } catch (e) {
    console.error("❌ AI error:", e);
    return "I couldn't fetch a response right now. Please email join-zuvy@navgurukul.org";
  }
}



/* ---------------- Middleware ---------------- */
// ✅ Full CORS fix for Render + Vercel
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://zuvy-buddy-0-1.vercel.app",
    "http://localhost:5173",
    "http://localhost:8080"
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle preflight (OPTIONS) request instantly
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.json());

/* ---------------- Load FAQ (sheet) ---------------- */
let faqData = [];
// let lastCategoryContext = ""; // 🧠 Remember last used category
async function loadFAQ() {
  try {
    const res = await fetch(MASTER_SCRIPT_URL);
    const data = await res.json();
    const all =
      data.items || data.data || data.faqs || data.sheetData || data || [];
    faqData = (all || []).filter((f) =>
      ["yes", "true", "y"].includes(String(f.Visible || "").toLowerCase())
    );
    console.log(`✅ FAQ loaded: ${faqData.length}`);
  } catch (e) {
    console.error("❌ Failed to load FAQ:", e);
    faqData = [];
  }
}
await loadFAQ();

/* ---------------- Helpers ---------------- */
function getFAQsByCategory(category, limit = 3) {
  if (!category) return [];
  const norm = category.toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
  return faqData
    .filter((f) => {
      const cat = (f.Category || "").toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
      return (
        ["yes", "true"].includes(String(f.Visible || "").toLowerCase()) &&
        (cat === norm || cat.includes(norm) || norm.includes(cat))
      );
    })
    .slice(0, limit);
}

const mapCategory = (raw) => {
  const r = (raw || "").toLowerCase();
  if (r.includes("existing")) return "Existing Learner";
  if (r.includes("bootcamp")) return "Explore Bootcamps";
  if (r.includes("lms")) return "LMS Solutions";
  if (r.includes("partner")) return "Partnerships";
  return "General";
};

const categoryHeader = (cat) =>
  ({
    "Existing Learner": "🎓 Existing Learner",
    "Explore Bootcamps": "💻 Explore Zuvy Bootcamps",
    "LMS Solutions": "🏢 LMS Solutions",
    Partnerships: "🤝 Partnerships",
  }[cat] || `📘 ${cat} FAQs`);

const homeMenu = () => ({
  type: "options",
  title: "Zuvy Buddy",
  message: "Choose a category",
  options: [
    { label: "🎓 Existing Learner", value: "faq_menu_Existing Learner" },
    { label: "💻 Explore Bootcamps", value: "faq_menu_Explore Bootcamps" },
    { label: "🏢 LMS Solutions", value: "faq_menu_LMS Solutions" },
    { label: "🤝 Partnerships", value: "faq_menu_Partnerships" },
  ],
});

const normalizeForSearch = (str = "") =>
  str
    .toLowerCase()
    .replace(
      /what's|what is|tell me|who is|explain|details of|about|related to|can you|please|plz|info on/g,
      ""
    )
    .replace(/\b(nav gurukul|nav-gurukul)\b/g, "navgurukul")
    .replace(/\bcourse|program|training\b/g, "bootcamp")
    .replace(/\blms\s*portal|student\s*dashboard\b/g, "lms")
    .replace(/\s+/g, " ")
    .trim();

const fuseOptions = {
  keys: [
    { name: "Question", weight: 0.55 },
    { name: "ShortAnswer", weight: 0.2 },
    { name: "LongAnswer", weight: 0.15 },
    { name: "Answer", weight: 0.15 },
    { name: "Category", weight: 0.08 },
    { name: "Tags", weight: 0.07 },
  ],
  includeScore: true,
  threshold: 0.42,
  ignoreLocation: true,
  distance: 200,
  minMatchCharLength: 2,
};

function pickRelatedSameCategory(pool, current, limit = 3) {
  const cat = String(current.Category || "").toLowerCase();
  const tags = String(current.Tags || "")
    .toLowerCase()
    .split(/[,\|]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const sameCat = pool.filter(
    (f) =>
      f.Question !== current.Question &&
      String(f.Category || "").toLowerCase() === cat
  );

  const scored = sameCat.map((f) => {
    const fTags = String(f.Tags || "")
      .toLowerCase()
      .split(/[,\|]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const overlap = fTags.filter((t) => tags.includes(t)).length;
    const shared =
      String(f.Question || "")
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
        .filter((w) =>
          String(current.Question || "")
            .toLowerCase()
            .includes(w)
        ).length || 0;
    const priority = parseInt(f.Priority) || 999;
    return { f, score: overlap * 3 + shared * 1 - priority * 0.01 };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.f);
}

/* ---------------- Lead endpoint (same) ---------------- */
async function saveLead({ name, email, source, text }) {
  try {
    if (!email || !source) return;
    await fetch(MASTER_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_lead",
        name,
        email,
        source,
        query: text,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("❌ saveLead error:", e);
  }
}
app.post("/save-lead", async (req, res) => {
  try {
    const { name, email, source = "chatbot" } = req.body || {};
    await saveLead({ name, email, source, text: "inline lead" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

/* ---------------- Attendance / Assessment helpers ---------------- */
async function fetchAttendance(email) {
  try {
    const res = await fetch(
      `${ATTENDANCE_SCRIPT_URL}?email=${encodeURIComponent(email)}`
    );
    const json = await res.json();
    return json?.status === "success" ? json.data : null;
  } catch (e) {
    console.error("❌ attendance error:", e);
    return null;
  }
}
async function fetchAssessment(email, assessmentNo = 1) {
  try {
    const res = await fetch(
      `${ASSESSMENT_SCRIPT_URL}?email=${encodeURIComponent(
        email
      )}&assessmentNo=${assessmentNo}`
    );
    const json = await res.json();
    return json?.status === "success" ? json.data : null;
  } catch (e) {
    console.error("❌ assessment error:", e);
    return null;
  }
}
async function getAvailableAssessments(email, limit = 30) {
  const reqs = [];
  for (let i = 1; i <= limit; i++) reqs.push(fetchAssessment(email, i));
  const results = await Promise.allSettled(reqs);
  const out = [];
  results.forEach((r, i) => r.status === "fulfilled" && r.value && out.push(i + 1));
  return out;
}
function normalizeAssessmentData(raw) {
  const get = (keys) => {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) {
        const v = raw[k];
        if (v !== undefined && v !== null && v !== "") return v;
      }
    }
    return null;
  };
  const kval = String(get(["Qualified", "Result", "Status"]) || "").toLowerCase();
  let qualified = "❌ Not Attempted";
  if (/(yes|qualified|pass)/.test(kval)) qualified = "✅ Qualified";
  else if (/(no|fail)/.test(kval)) qualified = "❌ Not Qualified";

  return {
    name: get(["Name", "Student Name", "Full Name", "name"]) || "Unknown Student",
    qualified,
    percentage: get(["Percentage", "Percentage (%)", "Attendance (%)"]) || "N/A",
    codingScore: get(["Coding Score", "Coding", "Code Score"]) || "N/A",
    mcqScore: get(["MCQ Score", "MCQ", "Quiz Score"]) || "N/A",
    tabChanged: get(["Tab Changed", "TabChanged"]) ?? 0,
    copyPasted: get(["Copy Pasted", "CopyPasted"]) ?? 0,
    assessmentNo: get(["Assessment No", "Assessment", "AssessmentNo"]) || "N/A",
  };
}

/* ---------------- Routing ---------------- */
function detectCommand(text = "") {
  const q = (text || "").toLowerCase().trim();
  if (
    q.startsWith("attendance_") ||
    q.startsWith("assessment_") ||
    q.startsWith("mailto:") ||
    q.startsWith("faq_show_more_") ||   // 🟢 ADD THIS LINE
    q.startsWith("faq_menu_") ||
    q.startsWith("faq_category_") ||
    q.startsWith("faq_query_") ||
    q === "home_menu"
  )
    return q;

  if (/\battendance\b/.test(q) && !/\bpercent|present|absent|\d+\b/.test(q))
    return "attendance_menu";
  if (/\bpercent|percentage|attendance %\b/.test(q))
    return "attendance_percentage";
  if (/\bassessment\b/.test(q) && !/\b\d+\b/.test(q)) return "assessment_menu";

  const m = q.match(/\bassessment\s*(no\.?|number|\s)?\s*(\d{1,2})\b/);
  if (m?.[2]) return `assessment_${Number(m[2])}`;

  return "faq_query";
}
app.get("/", (req, res) => {
  res.send("✅ Zuvy Buddy API running successfully!");
});
app.post("/query", async (req, res) => {
  let { name = "Visitor", email = "", text = "", lang = "en" } = req.body || {};
// const sessionKey = req.body.sessionId || email || name || (req.ip ? `ip:${req.ip}` : "anon");
// Prefer explicit sessionId/header, then email, then ip, then name — deterministic
const rawSession =
  req.body.sessionId ||
  req.headers["x-session-id"] ||
  email ||
  (req.ip ? `ip:${req.ip}` : "") ||
  name ||
  "anon";
const sessionKey = String(rawSession).trim();
console.log("🧾 sessionKey resolved as:", sessionKey);

  console.log(`\n📩 Incoming - ${name} (${email || "no-email"}):`, text);
  // 🧠 Context lock setup
let ctx = "";
if (typeof text === "string" && text.includes("|||ctx:")) {
  ctx = text.split("|||ctx:")[1]?.split("|||")[0]?.trim() || "";
} else if (req.body.context) {
  ctx = req.body.context;
}

if (ctx) {
  sessionContexts.set(sessionKey, ctx);
  console.log("🧠 Context set from incoming ctx:", ctx, "session:", sessionKey);
}


  // Embedded lang support: "...|||lang:hi"
  if (typeof text === "string" && text.includes("|||lang:")) {
    const [base, rest] = text.split("|||lang:");
    text = base;
    const l = (rest || "").trim().toLowerCase();
    if (SUPPORTED_LANGS.has(l)) lang = l;
  }
  if (!SUPPORTED_LANGS.has(lang)) lang = "en";

  // if user typed email as message
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email && text && emailRe.test(String(text).trim())) {
    email = String(text).trim();
    text = "__email_provided__";
  }

  const cmd = detectCommand(text || "");
  console.log("🔎 Detected command:", cmd);
  // Track category context memory
// if (cmd.startsWith("faq_menu_")) {
//   lastCategoryContext = mapCategory(text.replace("faq_menu_", ""));
//   console.log("🧠 Context set from menu:", lastCategoryContext);
// }
// if (cmd.startsWith("faq_query_") && text.includes("|||ctx:")) {
//   const ctxPart = text.split("|||ctx:")[1]?.split("|||")[0]?.trim();
//   if (ctxPart) {
//     lastCategoryContext = ctxPart;
//     console.log("🧠 Context set from FAQ query:", lastCategoryContext);
//   }
// }
if (cmd.startsWith("faq_menu_")) {
  const cat = mapCategory(text.replace("faq_menu_", ""));
  sessionContexts.set(sessionKey, cat);
  console.log("🧠 Context set from menu:", cat, "session:", sessionKey);
}
if (cmd.startsWith("faq_query_") && text.includes("|||ctx:")) {
  const ctxPart = text.split("|||ctx:")[1]?.split("|||")[0]?.trim();
  if (ctxPart) {
    sessionContexts.set(sessionKey, ctxPart);
    console.log("🧠 Context set from FAQ query:", ctxPart, "session:", sessionKey);
  }
}



  /* ------------- Home Menu ------------- */
  // 🏠 HOME SHORTCUT — always show main menu
/* ------------- Home Menu (Improved) ------------- */
if (cmd === "home_menu") {
  return res.json({
    type: "options",
    title: "🏠 Welcome to Zuvy Buddy",
    message: "How can I help you today? ",
    options: [
      { label: "🎓 Existing Learner", value: "faq_menu_Existing Learner" },
      { label: "💻 Explore Bootcamps", value: "faq_menu_Explore Bootcamps" },
      { label: "🏢 LMS Solutions", value: "faq_menu_LMS Solutions" },
      { label: "🤝 Partnerships", value: "faq_menu_Partnerships" },
    ],
  });
}

// /* ------------- HANDLE "Anything else" -> Show all FAQs of same category (v2) ------------- */
// if (cmd.startsWith("faq_show_more_")) {
//   // const category = text.replace("faq_show_more_", "").trim();
// const rawCat = text.replace("faq_show_more_", "").trim().toLowerCase();
// const category = mapCategory(rawCat);

//   console.log("🟢 Show more for category:", category);

//   if (!faqData.length) await loadFAQ();

//   const list = faqData
//     .filter(
//       (f) =>
//         String(f.Visible || "").toLowerCase() === "yes" &&
//         String(f.Category || "").toLowerCase() === category.toLowerCase()
//     )
//     .sort(
//       (a, b) => (parseInt(a.Priority) || 999) - (parseInt(b.Priority) || 999)
//     );

//   if (!list.length) {
//     return res.json({
//       type: "text",
//       title: `💬 ${category} FAQs`,
//       message:
//         "I couldn't find more questions in this section. You can reach our team — join-zuvy@navgurukul.org 💚",
//       options: [{ label: "🏠 Home", value: "home_menu" }],
//     });
//   }

//   const options = list.map((f) => ({
//     label: f.Question,
//     value: `faq_query_${f.Question}|||ctx:${category}`,
//   }));

//   return res.json({
//     type: "options",
//     title: `💬 More ${category} FAQs`,
//     message: "Here are more helpful questions 👇",
//     options: [
//       ...options,
//       { label: "🏠 Home", value: "home_menu" },
//     ],
//   });
// }
/* ------------- HANDLE "Anything else" -> Show all FAQs of same category (Final) ------------- */
// if (cmd.startsWith("faq_show_more_")) {
//   const rawCat = text.replace("faq_show_more_", "").trim().toLowerCase();
//   const category = mapCategory(rawCat);
//   console.log("🟢 Show more for category:", category);
// if (cmd.startsWith("faq_show_more_")) {
//   let category = text.replace("faq_show_more_", "").trim();
//   console.log("🟢 Show more for category:", category);
  
//     // ✅ Safe normalization for all categories
//   const normalized = category.toLowerCase();
//   if (normalized.includes("partner")) category = "Partnerships";
//   else if (normalized.includes("bootcamp")) category = "Explore Bootcamps";
//   else if (normalized.includes("learner")) category = "Existing Learner";
//   else if (normalized.includes("lms")) category = "LMS Solutions";
//   console.log("✅ Normalized category:", category);


//   // 🔧 Normalize naming — fixes "Partnership" vs "Partnerships" etc.
//   // if (category.toLowerCase().endsWith("ship")) category = "Partnerships";
//   if (category.toLowerCase().startsWith("partner")) category = "Partnership";
//   if (category.toLowerCase().includes("bootcamp")) category = "Explore Bootcamps";
//   if (category.toLowerCase().includes("learner")) category = "Existing Learner";
//   if (category.toLowerCase().includes("lms")) category = "LMS Solutions";


//   if (!faqData.length) await loadFAQ();

//   const list = faqData
//     .filter(
//       (f) =>
//         String(f.Visible || "").toLowerCase() === "yes" &&
//         String(f.Category || "").toLowerCase() === category.toLowerCase()
//     )
//     .sort(
//       (a, b) => (parseInt(a.Priority) || 999) - (parseInt(b.Priority) || 999)
//     );
// // 🧹 Deduplicate FAQs (avoid repeats)
// const unique = new Map();
// for (const f of list) {
//   if (!unique.has(f.Question?.trim().toLowerCase())) {
//     unique.set(f.Question?.trim().toLowerCase(), f);
//   }
// }
// const cleanList = Array.from(unique.values());

//   if (!list.length) {
//     return res.json({
//       type: "text",
//       title: `💬 ${category} FAQs`,
//       message:
//         "I couldn't find more questions in this section. You can reach our team — join-zuvy@navgurukul.org 💚",
//       options: [{ label: "🏠 Home", value: "home_menu" }],
//     });
//   }

// const options = cleanList.map((f) => ({

//     label: f.Question,
//     value: `faq_query_${f.Question}|||ctx:${category}`,
//   }));

//   return res.json({
//     type: "options",
//     title: `💬 More ${category} FAQs`,
//     message: "Here are more helpful questions 👇",
//     options: [...options, { label: "🏠 Home", value: "home_menu" }],
//   });
// }
/* ------------- HANDLE "Anything else" -> Show all FAQs of same category (FINAL FIXED) ------------- */
if (cmd.startsWith("faq_show_more_")) {
  console.log("🟢 Show more triggered!");
  let category = "";

  // ✅ Try extracting category context first
  if (text.includes("|||ctx:")) {
    category = text.split("|||ctx:")[1].split("|||")[0].trim();
  } 
   // ✅ Else use the remembered category from session (avoid global leakage)
  else if (sessionContexts.has(sessionKey)) {
    category = sessionContexts.get(sessionKey);
    console.log("🧠 Using session-stored category for show_more:", category, "session:", sessionKey);
  }

  // ✅ Last fallback — try to infer from keywords
  else {
    const raw = text.toLowerCase();
    if (raw.includes("partner")) category = "Partnerships";
    else if (raw.includes("bootcamp")) category = "Explore Bootcamps";
    else if (raw.includes("learner")) category = "Existing Learner";
    else if (raw.includes("lms")) category = "LMS Solutions";
    else category = "General";
  }

  console.log("🧠 Using category context:", category);

  if (!faqData.length) await loadFAQ();

  // ✅ Match smartly (ignores plural/singular & spaces)
  const list = faqData.filter((f) => {
    const c1 = (f.Category || "").toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
    const c2 = (category || "").toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
    return (
      ["yes", "true"].includes(String(f.Visible || "").toLowerCase()) &&
      (c1 === c2 || c1.includes(c2) || c2.includes(c1))
    );
  });

  console.log(`📊 Found ${list.length} FAQs for Anything Else in "${category}"`);

  if (!list.length) {
    return res.json({
      type: "text",
      title: `💬 ${category} FAQs`,
      message:
        "I couldn't find more questions in this section. You can reach our team — join-zuvy@navgurukul.org 💚",
      // options: [{ label: "🏠 Home", value: "home_menu" }],
    });
  }

  // Remove duplicates
  const unique = new Map();
  for (const f of list) {
    const q = f.Question?.trim().toLowerCase();
    if (!unique.has(q)) unique.set(q, f);
  }
  const cleanList = Array.from(unique.values());

  const options = cleanList.map((f) => ({
    label: f.Question,
    value: `faq_query_${f.Question}|||ctx:${category}`,
  }));

  return res.json({
    type: "options",
    title: `💬 More ${category} FAQs`,
    message: "Here are more helpful questions ",
    // options: [...options, { label: "🏠 Home", value: "home_menu" }],
    options,
  });
}


  /* ------------- CATEGORY LANDING -> DIRECT FAQ LIST ------------- */
  if (cmd.startsWith("faq_menu_")) {
    const category = mapCategory(text.replace("faq_menu_", ""));
    if (!faqData.length) await loadFAQ();
  console.log("📘 Category from command:", category);
  const categoriesInSheet = [...new Set(faqData.map(f => (f.Category || "").trim()))];
  console.log("🧾 Categories present in sheet:", categoriesInSheet);

    const list = faqData
      // .filter(
      //   (f) =>
      //     String(f.Visible || "").toLowerCase() === "yes" &&
      //     String(f.Category || "").toLowerCase() === category.toLowerCase()
      // )
      .filter((f) => {
  const c1 = (f.Category || "").toLowerCase().trim().replace(/\s+/g, " ");
  const c2 = (category || "").toLowerCase().trim().replace(/\s+/g, " ");
  return (
    ["yes", "true"].includes(String(f.Visible || "").toLowerCase()) &&
    (c1 === c2 || c1.includes(c2) || c2.includes(c1))
  );
})

      .sort(
        (a, b) => (parseInt(a.Priority) || 999) - (parseInt(b.Priority) || 999)
      );

    if (!list.length) {
      return res.json({
        type: "text",
        title: categoryHeader(category),
        message:
          "I couldn’t find FAQs here right now. You can email us — join-zuvy@navgurukul.org 💚",
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }

    const options = list.map((f) => ({
      label: f.Question,
      value: `faq_query_${f.Question}|||ctx:${category}`,
    }));

    return res.json({
      type: "options",
      title: categoryHeader(category),
      message: "Choose a question ",
      // options: [...options, { label: "🏠 Home", value: "home_menu" }],
      options,
    });
  }

  /* ------------- CATEGORY (fallback support) -> DIRECT FAQ LIST ------------- */
  if (cmd.startsWith("faq_category_")) {
    const category = text.replace("faq_category_", "").trim();
    if (!faqData.length) await loadFAQ();

    const list = faqData
      // .filter(
      //   (f) =>
      //     String(f.Visible || "").toLowerCase() === "yes" &&
      //     String(f.Category || "").toLowerCase() === category.toLowerCase()
      // )
      .filter((f) => {
  const c1 = (f.Category || "").toLowerCase().trim().replace(/\s+/g, " ");
  const c2 = (category || "").toLowerCase().trim().replace(/\s+/g, " ");
  return (
    ["yes", "true"].includes(String(f.Visible || "").toLowerCase()) &&
    (c1 === c2 || c1.includes(c2) || c2.includes(c1))
  );
})

      .sort(
        (a, b) => (parseInt(a.Priority) || 999) - (parseInt(b.Priority) || 999)
      );

    if (!list.length) {
      return res.json({
        type: "text",
        title: categoryHeader(category),
        message:
          "I couldn’t find FAQs here right now. You can email us — join-zuvy@navgurukul.org 💚",
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }

    const options = list.map((f) => ({
      label: f.Question,
      value: `faq_query_${f.Question}|||ctx:${category}`,
    }));

    return res.json({
      type: "options",
      title: categoryHeader(category),
      message: "Choose a question ",
      // options: [...options, { label: "🏠 Home", value: "home_menu" }],
      options,
    });
  }

  /* ------------- ATTENDANCE MENU ------------- */
  if (cmd === "attendance_menu") {
    if (!email) {
      return res.json({
        type: "form",
        title: "📧 Please share your email",
        message:
          "To check attendance, please provide your registered email address:",
        fields: [{ label: "Email", type: "email", name: "email", required: true }],
        submitLabel: "Submit",
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }
    return res.json({
      type: "options",
      title: "📅 Attendance",
      message: "Choose what you want to check:",
      options: [
        { label: "📈 What is my attendance?", value: "attendance_percentage" },
        { label: "❌ Show absent dates", value: "attendance_absent_dates" },
        { label: "📉 Why is my attendance low?", value: "attendance_reason" },
        // { label: "🏠 Home", value: "home_menu" },
      ],
    });
  }

  /* ------------- ATTENDANCE OPS ------------- */
  if (cmd.startsWith("attendance_")) {
    if (!email) {
      return res.json({
        type: "text",
        title: "📋 Attendance",
        message:
          "Please send your registered email address so I can fetch your attendance.",
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }
    const attendance = await fetchAttendance(email);
    if (!attendance) {
      return res.json({
        type: "text",
        title: "📅 Attendance",
        message: `Sorry ${name}, I couldn't find your attendance data right now.`,
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }
    const total = attendance.totalClasses ?? attendance.total ?? 0;
    const present =
      attendance.attendanceCount ??
      attendance.presentCount ??
      (Array.isArray(attendance.presentDates)
        ? attendance.presentDates.length
        : 0);
    let percent =
      attendance.computedPercentage ?? attendance.percentage ?? "N/A";
    if (typeof percent === "string") {
      const num = parseFloat(percent.replace("%", "").trim());
      if (!Number.isNaN(num)) percent = num;
    }
    if (typeof percent === "number" && percent <= 1)
      percent = (percent * 100).toFixed(2);
    if (typeof percent === "number") percent = Number(percent).toFixed(2);

    const absent = total && present ? Math.max(0, total - present) : 0;

    if (cmd === "attendance_percentage") {
      return res.json({
        type: "attendance",
        title: "📈 Attendance Overview",
        message: `Your attendance is ${percent}% (${present}/${total} classes attended).`,
        options: [
          { label: "📉 Why is my attendance low?", value: "attendance_reason" },
          { label: "❌ Show absent dates", value: "attendance_absent_dates" },
          // { label: "🏠 Home", value: "home_menu" },
        ],
      });
    }
    if (cmd === "attendance_reason") {
      let msg = `Your attendance is ${percent}% (${present}/${total} classes).`;
      const p = parseFloat(String(percent).replace("%", ""));
      if (!Number.isNaN(p)) {
        if (p >= 75) msg += `\n\n🎉 Great! You're above 75%. Keep it up!`;
        else if (p >= 50) msg += `\n\n⚠️ Below 75%. Try to attend more consistently.`;
        else msg += `\n\n🚨 Quite low. You missed ${absent} days out of ${total}.`;
      }
      return res.json({
        type: "attendance",
        title: "📉 Attendance Analysis",
        message: msg,
        options: [
          { label: "📈 What is my attendance?", value: "attendance_percentage" },
          { label: "❌ Show absent dates", value: "attendance_absent_dates" },
          // { label: "🏠 Home", value: "home_menu" },
        ],
      });
    }
    if (cmd === "attendance_absent_dates") {
      const absentDates =
        attendance.absentDates ||
        attendance.absents ||
        attendance["Absent Dates"] ||
        [];
      const fmt = (d) => {
        try {
          const x = new Date(d);
          return x.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            weekday: "short",
          });
        } catch {
          return d;
        }
      };
      const list = Array.isArray(absentDates)
        ? absentDates.map(fmt).map((d, i) => `${i + 1}. ${d}`).join("\n")
        : "";
      return res.json({
        type: "attendance",
        title: "❌ Absent Dates",
        message: list || "No absent dates found.",
        options: [
          { label: "📈 What is my attendance?", value: "attendance_percentage" },
          { label: "📉 Why is my attendance low?", value: "attendance_reason" },
          // { label: "🏠 Home", value: "home_menu" },
        ],
      });
    }
    return res.json({ ...homeMenu() });
  }

  /* ------------- ASSESSMENT MENU ------------- */
  if (cmd === "assessment_menu") {
    if (!email) {
      return res.json({
        type: "form",
        title: "📧 Please share your email",
        message:
          "To check assessments, please provide your registered email address:",
        fields: [{ label: "Email", type: "email", name: "email", required: true }],
        submitLabel: "Submit",
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }
    const available = await getAvailableAssessments(email, 30);
    if (!available?.length) {
      return res.json({
        type: "text",
        title: "🧾 Assessments",
        message: "I couldn’t find assessments for your account yet.",
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }
    return res.json({
      type: "options",
      title: "🧾 Assessments",
      message: "Which assessment do you want to check?",
      options: [
        ...available.map((n) => ({ label: `Assessment ${n}`, value: `assessment_${n}` })),
        // { label: "🏠 Home", value: "home_menu" },
      ],
    });
  }

  /* ------------- ASSESSMENT DETAIL ------------- */
  if (cmd.startsWith("assessment_")) {
    const num = parseInt(cmd.split("_")[1], 10);
    if (Number.isNaN(num)) {
      return res.json({
        type: "text",
        title: "🧾 Assessment",
        message: "Please select a valid assessment number.",
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }
    if (!email) {
      return res.json({
        type: "form",
        title: "📧 Please share your email",
        message:
          "To fetch an assessment report, please provide your registered email address:",
        fields: [{ label: "Email", type: "email", name: "email", required: true }],
        submitLabel: "Submit",
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }
    const raw = await fetchAssessment(email, num);
    if (!raw) {
      return res.json({
        type: "table",
        title: `🧾 Assessment ${num} Report`,
        message: "❌ Not Attempted",
        fields: [],
        // options: [{ label: "🏠 Home", value: "home_menu" }],
      });
    }
    const norm = normalizeAssessmentData(raw);
    let pct = norm.percentage || "N/A";
    if (pct !== "N/A" && !Number.isNaN(parseFloat(pct))) {
      const n = parseFloat(pct);
      pct = n <= 1 ? `${(n * 100).toFixed(0)}%` : `${n.toFixed(0)}%`;
    }
    return res.json({
      type: "table",
      title: `🧾 Assessment ${num} Report`,
      message: `${norm.name} - ${norm.qualified}`,
      fields: [
        { name: "💻 Coding Score", value: norm.codingScore || "N/A" },
        { name: "🧠 MCQ Score", value: norm.mcqScore || "N/A" },
        { name: "📊 Percentage", value: pct },
        { name: "📋 Tab Changed", value: norm.tabChanged ?? 0 },
        { name: "📎 Copy Pasted", value: norm.copyPasted ?? 0 },
      ],
      // options: [{ label: "🏠 Home", value: "home_menu" }],
    });
  }

  /* ------------- MAIN FAQ / FREE TEXT ------------- */

  // Home shorthands
  if (text === "faq_menu" || cmd === "faq_menu" || text === "faq_menu_All") {
    return res.json(homeMenu());
  }

  // Domain guardrail (blocks off-topic free text before AI)
  // const allowedTopics = [
  //   "zuvy",
  //   "navgurukul",
  //   "bootcamp",
  //   "lms",
  //   "attendance",
  //   "assessment",
  //   "partnership",
  //   "learner",
  //   "student",
  //   "course",
  //   "class",
  // ];
  // const lowerQ = (text || "").toLowerCase();
  // const isRelevant = allowedTopics.some((kw) => lowerQ.includes(kw));
  // if (!cmd.startsWith("faq_query_") && !isRelevant) {
  //   return res.json({
  //     type: "text",
  //     title: "💚 Zuvy Buddy",
  //     message: `
  //       <div class='text-[15px] leading-relaxed'>
  //         <p>I’m here to help with <b>NavGurukul</b> and <b>Zuvy Bootcamps</b> queries.</p>
  //         <p class='mt-2'>Your question seems outside my scope. You can still reach our team 👇</p>
  //         <a href="mailto:join-zuvy@navgurukul.org"
  //            class="inline-block mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm shadow-md">📧 Email Support</a>
  //       </div>`,
  //     // options: [{ label: "🏠 Home", value: "home_menu" }],
  //   });
  // }
  // Domain guardrail (blocks off-topic free text before AI)
const allowedTopics = [
  "zuvy",
  "navgurukul",
  "bootcamp",
  "lms",
  "attendance",
  "assessment",
  "partnership",
  "learner",
  "student",
  "course",
  "class",
];
const lowerQ = (text || "").toLowerCase();
const isRelevant = allowedTopics.some((kw) => lowerQ.includes(kw));

// ✅ FIXED: allow both faq_query and faq_query_ commands to pass
if (
  !cmd.startsWith("faq_query") && // <--- remove underscore condition
  !isRelevant
) {
  return res.json({
    type: "text",
    title: "💚 Zuvy Buddy",
    message: `
      <div class='text-[15px] leading-relaxed'>
        <p>I’m here to help with <b>NavGurukul</b> and <b>Zuvy Bootcamps</b> queries.</p>
        <p class='mt-2'>Your question seems outside my scope. You can still reach our team </p>
        <a href="mailto:join-zuvy@navgurukul.org"
           class="inline-block mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm shadow-md">📧 Email Support</a>
      </div>`,
  });
}


  // FAQ QUERY — hybrid answer + related (strict same-category), Back->Home
  if (cmd.startsWith("faq_query")) {
    // value like "faq_query_<Q>|||ctx:<Category>|||lang:xx"
    let rawText = String(text || "").trim();
    let categoryContext = "";
    if (rawText.includes("|||ctx:")) {
      const [qPart, ctxPart] = rawText.split("|||ctx:");
      rawText = qPart;
      categoryContext = (ctxPart || "").split("|||")[0].trim();
    }
    rawText = rawText.replace(/^faq_query_?/i, "").trim();

    if (!faqData.length) await loadFAQ();

    // Filter pool strictly by category if provided
    let pool = faqData;
   if (categoryContext) {
  const normCtx = categoryContext.toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
  pool = faqData.filter((f) => {
    const c = (f.Category || "").toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
    return (
      ["yes", "true"].includes(String(f.Visible || "").toLowerCase()) &&
      (c === normCtx || c.includes(normCtx) || normCtx.includes(c))
    );
  });

      if (!pool.length) {
        // If empty, still avoid cross-category leakage — show polite fallback
        const polite =
          lang === "hi"
            ? `
        <div class='text-[15px] leading-relaxed'>
          <p>मुझे अभी सटीक उत्तर नहीं मिला।</p>
          <p class='mt-2'>कृपया हमें ईमेल करें — हम जल्दी जवाब देंगे 💚</p>
          <a href="mailto:join-zuvy@navgurukul.org"
             class="inline-block mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm shadow-md">📧 Email Support</a>
        </div>`
            : `<div class='text-[15px] leading-relaxed'>
          <p>I couldn’t find an exact answer right now.</p>
          <p class='mt-2'>Please email us — we’ll help quickly 💚</p>
          <a href="mailto:join-zuvy@navgurukul.org"
             class="inline-block mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm shadow-md">📧 Email Support</a>
        </div>`;
        return res.json({
          type: "text",
          title: lang === "hi" ? "🌸 मैं मदद के लिए यहां हूं" : "🌸 I’m here to help",
          message: polite,
          // options: [{ label: "🏠 Home", value: "home_menu" }],
        });
      }
    }

    const fuse = new Fuse(pool, fuseOptions);
    const cleaned = normalizeForSearch(rawText);
    let results = fuse.search(cleaned);
    if (!results.length) results = fuse.search(rawText);

    const best = results?.[0]?.item;
    if (best) {
      const baseAnswer =
        (best.LongAnswer || "").trim() ||
        (best.ShortAnswer || "").trim() ||
        (best.Answer || "").trim() ||
        "";

      // AI-polished short answer (in selected lang)
      const aiText = await getAIResponse({
        userQuestion: rawText,
        faqContext: baseAnswer,
        lang,
      });

      // Related — strictly SAME CATEGORY
      const related = pickRelatedSameCategory(pool, best, 3);
      const cat = categoryContext || String(best.Category || "").trim() || "";

      // Toggle (English <-> Hindi by default); you can extend to more later via UI
      const toggleLabel =
        lang === "hi"
          ? "🌐 English"
          : lang === "mr"
          ? "🌐 Marathi"
          : lang === "bn"
          ? "🌐 Bengali"
          : lang === "ta"
          ? "🌐 Tamil"
          : lang === "te"
          ? "🌐 Telugu"
          : "🌐 Hindi";

      const toggleTarget = lang === "en" ? "hi" : "en";

      return res.json({
        type: "faq",
        title: `💡 ${best.Question}`,
        // message: `
        //   <div class='text-[15px] leading-relaxed'>
        //     <p>${aiText}</p>
        //     <div class='mt-3 text-sm text-muted-foreground'>
        //       Need more help? <a href="mailto:join-zuvy@navgurukul.org">📧 join-zuvy@navgurukul.org</a>
        //     </div>
        //   </div>`,
        // message: `${aiText}\n\nIf you need further help, you can email: join-zuvy@navgurukul.org`,
        message: (`${aiText}

<a href="mailto:join-zuvy@navgurukul.org" class="zuvy-email-btn">📧 Contact Support</a>`),

        // message: `${aiText}\n\nIf you need further help, email at: mailto:join-zuvy@navgurukul.org`,
        options: [
          ...related.map((f) => ({
            label: f.Question,
            value: `faq_query_${f.Question}|||ctx:${cat}`,
          })),
          {
            label: toggleLabel,
            value: `faq_query_${best.Question}|||ctx:${cat}|||lang:${toggleTarget}`,
          },
          // { label: "🏠 Home", value: "home_menu" },
        ],
      });
//    } else {
//   // 🚀 FIXED: Direct AI fallback but respect current category
//   console.log("⚠️ AI fallback triggered under category:", categoryContext);

//   // Keep context limited to current category only
//   const currentCategory = categoryContext || lastCategoryContext || "";

//   // AI response
//   const aiText = await getAIResponse({
//     userQuestion: rawText,
//     faqContext: "",
//     lang,
//   });

//   // ✅ Related FAQs should come ONLY from same category
//   let related = [];
//   if (currentCategory) {
//     const normCtx = currentCategory.toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
//     const sameCatFaqs = faqData.filter((f) => {
//       const cat = (f.Category || "").toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
//       return (
//         ["yes", "true"].includes(String(f.Visible || "").toLowerCase()) &&
//         (cat === normCtx || cat.includes(normCtx) || normCtx.includes(cat))
//       );
//     });
//     related = sameCatFaqs.slice(0, 3); // top 3 of same category only
//   }

//   // Language toggle
//   const toggleLabel = lang === "en" ? "🌐 Hindi" : "🌐 English";
//   const toggleTarget = lang === "en" ? "hi" : "en";

//   return res.json({
//     type: "faq",
//     title: `💡 ${currentCategory || "Zuvy Buddy"}`,
//     message: `
//       <div class='text-[15px] leading-relaxed'>
//         <p>${aiText}</p>
//         <div class='mt-3 text-sm text-muted-foreground'>
//           Need more help? <a href="mailto:join-zuvy@navgurukul.org">📧 join-zuvy@navgurukul.org</a>
//         </div>
//       </div>`,
//     options: [
//       ...related.map((f) => ({
//         label: f.Question,
//         value: `faq_query_${f.Question}|||ctx:${currentCategory}`,
//       })),
//       { label: toggleLabel, value: `faq_query_${rawText}|||ctx:${currentCategory}|||lang:${toggleTarget}` },
//     ],
//   });
// }
} else {
  console.log("⚠️ AI fallback triggered. rawText:", rawText, "session:", sessionKey, "ctx:", categoryContext);

  // Step A: resolve category — prefer explicit ctx, then session, then try keyword auto-detect
  let currentCategory = categoryContext || sessionContexts.get(sessionKey) || "";

  // Auto-detect from user's raw text if still empty
  if (!currentCategory) {
    const probe = (rawText || text || "").toLowerCase();
    if (probe.includes("bootcamp") || probe.includes("zuvy") || probe.includes("program") || probe.includes("course")) {
      currentCategory = "Explore Bootcamps";
    } else if (probe.includes("attendance") || probe.includes("absent") || probe.includes("present") || probe.includes("percent")) {
      currentCategory = "Existing Learner";
    } else if (probe.includes("lms") || probe.includes("dashboard") || probe.includes("portal")) {
      currentCategory = "LMS Solutions";
    } else if (probe.includes("partner") || probe.includes("partnership") || probe.includes("collab")) {
      currentCategory = "Partnerships";
    } else {
      // fallback safe default — prefer last session or "General"
      currentCategory = sessionContexts.get(sessionKey) || "General";
    }
  }

  // store resolved category back to session (so next free-text uses this)
  sessionContexts.set(sessionKey, currentCategory);
  console.log("🧭 Resolved fallback category:", currentCategory, "for session:", sessionKey);

  // Step B: AI answer (we still let AI answer but avoid cross-category related links)
  const aiText = await getAIResponse({
    userQuestion: rawText,
    faqContext: "",
    lang,
  });

  // Step C: pick related FAQs only from the same resolved category
  const related = getFAQsByCategory(currentCategory, 3);

  const toggleLabel = lang === "en" ? "🌐 Hindi" : "🌐 English";
  const toggleTarget = lang === "en" ? "hi" : "en";

  return res.json({
    type: "faq",
    title: `💡 ${currentCategory}`,
    // message: `
    //   <div class='text-[15px] leading-relaxed'>
    //     <p>${aiText}</p>
    //     <div class='mt-3 text-sm text-muted-foreground'>
    //       Need more help? <a href="mailto:join-zuvy@navgurukul.org">📧 join-zuvy@navgurukul.org</a>
    //     </div>
    //   </div>`,
    // message: "I couldn’t find an exact answer right now. Please email: join-zuvy@navgurukul.org",
       message: cleanMessage("I couldn’t find an exact answer right now. Please email: join-zuvy@navgurukul.org"),
    options: [
      ...related.map((f) => ({
        label: f.Question,
        value: `faq_query_${f.Question}|||ctx:${currentCategory}`,
      })),
      { label: toggleLabel, value: `faq_query_${rawText}|||ctx:${currentCategory}|||lang:${toggleTarget}` },
    ],
  });
}




    // No match -> polite fallback (same category only; still go Home)
    const polite =
      lang === "hi"
        ? `
      <div class='text-[15px] leading-relaxed'>
        <p>मुझे अभी सटीक उत्तर नहीं मिला।</p>
        <p class='mt-2'>कृपया हमें ईमेल करें — हम जल्दी जवाब देंगे 💚</p>
        <a href="mailto:join-zuvy@navgurukul.org"
           class="inline-block mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm shadow-md">📧 Email Support</a>
      </div>`
        : `<div class='text-[15px] leading-relaxed'>
        <p>I couldn’t find an exact answer right now.</p>
        <p class='mt-2'>Please email us — we’ll help quickly 💚</p>
        <a href="mailto:join-zuvy@navgurukul.org"
           class="inline-block mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm shadow-md">📧 Email Support</a>
      </div>`;

    return res.json({
      type: "text",
      title: lang === "hi" ? "🌸 मैं मदद के लिए यहां हूं" : "🌸 I’m here to help",
      message: polite,
      // options: [{ label: "🏠 Home", value: "home_menu" }],
    });
  }

  /* ------------- DEFAULT LANDING ------------- */
  return res.json({
    type: "ai",
    title: "🤖 Zuvy Buddy",
    message:
      "I’m Zuvy Buddy 💚 — ask me about Bootcamps, LMS, attendance, assessments or partnerships. How can I help?",
    options: [
      { label: "🎓 Existing Learner", value: "faq_menu_Existing Learner" },
      { label: "💻 Explore Bootcamps", value: "faq_menu_Explore Bootcamps" },
      { label: "🏢 LMS Solutions", value: "faq_menu_LMS Solutions" },
      { label: "🤝 Partnerships", value: "faq_menu_Partnerships" },
      // { label: "🏠 Home", value: "home_menu" },
    ],
  });
});

process.on("unhandledRejection", (err) => console.error("❌ Unhandled:", err));

/* ---------------- Start server ---------------- */
// app.listen(PORT, () => {
//   console.log(`✅ Chatbot API running at http://localhost:${PORT}`);
// });
app.listen(PORT, () => {
  console.log(`✅ Chatbot API live on port ${PORT}`);
});
