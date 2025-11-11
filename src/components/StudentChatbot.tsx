import React, { useState, useRef, useEffect } from "react";
import { Mail, User, Mic, Volume2, VolumeX } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
//

function cleanLabel(label: string = "") {
  return label
    .replace(/^faq_query_/i, "")
    .replace(/\|\|\|ctx:.*/i, "")
    .replace(/_/g, " ")
    .trim();
}

type StudentChatbotProps = {
  hideStartOptions?: boolean;
  hideWelcomeHero?: boolean;
  speakingOn?: boolean;
};

export default function StudentChatbot({ hideStartOptions = false, hideWelcomeHero = false, speakingOn = true }: StudentChatbotProps) {
  // 🎯 States
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  // 🌐 Language Selector
const [lang, setLang] = useState(() => localStorage.getItem("zuvy_lang") || "en");
useEffect(() => {
  localStorage.setItem("zuvy_lang", lang);
}, [lang]);

  const [isChatStarted, setIsChatStarted] = useState<
    false | "student" | "learner" | "business" | "partner"
  >(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const [speakingEnabled, setSpeakingEnabled] = useState(speakingOn);

  // Keep speakingEnabled in sync with header (prop)
  // useEffect(() => {
  //   setSpeakingEnabled(speakingOn);
  //   if (!speakingOn) try { window.speechSynthesis.cancel(); } catch(e){}
  // }, [speakingOn]);
  // ✅ Only set default value one time at load
useEffect(() => {
  setSpeakingEnabled(speakingOn);
}, []); // ← dependency empty, so 1-time run only


  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Sync speaker state if toggled anywhere
  useEffect(() => {
    const handleToggleSpeaking = () => {
      setSpeakingEnabled((v) => {
        const next = !v;
        if (!next) {
          try { window.speechSynthesis.cancel(); } catch{}
        }
        return next;
      });
    };
    window.addEventListener("toggle_speaking", handleToggleSpeaking);
    return () => window.removeEventListener("toggle_speaking", handleToggleSpeaking);
  }, []);

  // Reset chat on global reset_chat event
  useEffect(() => {
    const handler = () => {
      setIsChatStarted(false);
      setMessages([]);
      localStorage.removeItem("zuvy_session_started");
    };
    window.addEventListener("reset_chat", handler);
    return () => window.removeEventListener("reset_chat", handler);
  }, []);

  // 🧭 Auto scroll
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const el = scrollAreaRef.current;
    el.scrollTop = el.scrollHeight;
  }, [messages]);
  // 🔊 Load available voices on page load
useEffect(() => {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}, []);


  // 🧠 Text-to-Speech (bot voice)
 // 🧠 Text-to-Speech (Improved voice)
// const speak = (text: string) => {
//   if (!speakingEnabled || !text) return;

//   // 🧹 Remove emojis and non-speech-friendly chars
//   const cleanText = text.replace(
//     /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F)/g,
//     ""
//   );

//   const utter = new SpeechSynthesisUtterance(cleanText.trim());
//   utter.rate = 0.95; // Slightly slower for clarity
//   utter.pitch = 1;
//   utter.lang = "en-IN";

//   // 🎙️ Prefer Indian Male voice if available
//   const voices = window.speechSynthesis.getVoices();
//   const indianMaleVoice =
//     voices.find((v) =>
//       /India/i.test(v.name) && /Male/i.test(v.name)
//     ) ||
//     voices.find((v) =>
//       /Google हिन्दी|Google Indian English/i.test(v.name)
//     ) ||
//     voices.find((v) => /en-IN/i.test(v.lang));

//   if (indianMaleVoice) utter.voice = indianMaleVoice;

//   window.speechSynthesis.cancel();
//   window.speechSynthesis.speak(utter);
// };
// 🔊 Text-to-Speech (HTML → friendly text)
const speak = (raw: string) => {
  if (!speakingEnabled || !raw) return;

  // 1) HTML → plain text (safe)
  let plain = "";
  try {
    const tmp = document.createElement("div");
    tmp.innerHTML = raw;
    plain = (tmp.textContent || tmp.innerText || "").trim();
  } catch {
    // fallback: strip tags
    plain = raw.replace(/<[^>]+>/g, " ");
  }

  // 2) Emails/URLs ko readable banao
  plain = plain
    .replace(/mailto:/gi, "")                              // remove "mailto:"
    .replace(
      /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([A-Za-z]{2,})/g,
      (_m, u, d, tld) => `${u} at ${d} dot ${tld}`         // email → "user at domain dot tld"
    )
    .replace(/https?:\/\/\S+/g, "")                        // URLs skip
    // optional punctuation smoothing
    .replace(/\s+/g, " ")
    .trim();

  // 3) Emojis & misc cleanup
  plain = plain.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F)/g,
    ""
  );

  const utter = new SpeechSynthesisUtterance(plain);
  utter.rate = 0.95;
  utter.pitch = 1;
  utter.lang = "en-IN";

  const voices = window.speechSynthesis.getVoices();
  const indianMaleVoice =
    voices.find(v => /India/i.test(v.name) && /Male/i.test(v.name)) ||
    voices.find(v => /Google हिन्दी|Google Indian English/i.test(v.name)) ||
    voices.find(v => /en-IN/i.test(v.lang));
  if (indianMaleVoice) utter.voice = indianMaleVoice;

  try { window.speechSynthesis.cancel(); } catch {}
  window.speechSynthesis.speak(utter);
};


  // 🎙️ Voice Input (speech → text)
const toggleListening = () => {
  if (listening) {
    recognitionRef.current?.stop();
    setListening(false);
    return;
  }

  // 📢 Play tudung sound when mic starts
  const startSound = new Audio("/tudung.mp3");
  startSound.play().catch(() => {});

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition not supported in this browser.");
    return;
  }

  const rec = new SpeechRecognition();
  rec.lang = "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = (e: any) => {
    const transcript = e.results[0][0].transcript;
    handleSendMessage(transcript);
  };

  rec.onend = () => setListening(false);
  recognitionRef.current = rec;
  rec.start();
  setListening(true);
};

useEffect(() => {
  const handler = (e: any) => {
    const value = e.detail;

    // ✅ Only student needs email check
    if (isChatStarted === "student" && (!studentEmail || !studentEmail.trim())) {
      setMessages((prev) => [
        ...prev,
        {
          id: `missing-${Date.now()}`,
          sender: "bot",
          type: "error",
          title: "Missing Email",
          message: "⚠️ Please start chat with your email first.",
        },
      ]);
      return;
    }

    // 🥇 1️⃣ CONTACT US — top priority
    if (value === "faq_menu_All" || value.toLowerCase().includes("contact")) {
      const contactMsg = {
        id: `contact-${Date.now()}`,
        sender: "bot",
        type: "text",
        title: "Get in Touch 💌",
        message: `
          <div class='flex flex-col items-start gap-4 text-[15px] leading-relaxed text-foreground bg-gradient-to-r from-secondary/20 to-accent/20 border border-border rounded-xl p-4 shadow-sm'>
            <div class='text-base font-semibold flex items-center gap-2'>
              💌 We'd love to hear from you!
            </div>
            <p class='text-[14px] text-muted-foreground'>
              Our support team will respond within a few hours. Click below to reach us directly:
            </p>
            <a
              href="mailto:join-zuvy@navgurukul.org"
              class='inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all focus:outline-none focus:ring-2 focus:ring-ring'
            >
              📩 Email Our Team
              <span class="text-xs opacity-90">join-zuvy@navgurukul.org</span>
            </a>
          </div>
        `,
      };
      setMessages((prev) => [...prev, contactMsg]);
      if (speakingEnabled)
        speak("You can reach our team anytime at join zuvy at nav gurukul dot org.");
      return; // stop here
    }

    // 🥈 2️⃣ LMS ROLE HANDLING
//     if (value && value.startsWith("lms_role_")) {
//       let videoId = "";
//       let roleLabel = "";

//       switch (value) {
//         case "lms_role_student":
//           roleLabel = "Students";
//           videoId = "slc6uL_ESoo";
//           break;
//         case "lms_role_admin":
//           roleLabel = "Admins";
//           videoId = "rqzI4ZFLqXo";
//           break;
//         case "lms_role_instructor":
//           roleLabel = "Instructors";
//           videoId = "brmzOPxnHgE";
//           break;
//         case "lms_role_other":
//           const contactMsg = {
//             id: `contact-${Date.now()}`,
//             sender: "bot",
//             type: "text",
//             title: "💌 Want to Explore Something Else?",
//             message: `
//               <div class='flex flex-col items-start gap-4 text-[15px] leading-relaxed text-foreground bg-gradient-to-r from-secondary/20 to-accent/20 border border-border rounded-xl p-4 shadow-sm'>
//                 <div class='text-base font-semibold'>🪄 We'd love to hear your use case!</div>
//                 <p class='text-sm text-muted-foreground'>
//                   Drop us an email and our team will connect with you 💚
//                 </p>

//                 <a
//                   href="mailto:join-zuvy@navgurukul.org?subject=Exploring%20Other%20LMS%20Solutions"
//                   class='inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all'
//                 >
//                   📩 Email Our Team
//                 </a>
//               </div>
//             `,
//           };
//           setMessages((prev) => [...prev, contactMsg]);
//           if (speakingEnabled)
//             speak("You can email our team at join zuvy at nav gurukul dot org to explore other LMS options.");
//           return;
//       }

//       if (!videoId) return;

//       const embedUrl = `https://www.youtube.com/embed/${videoId}`;
//       const youtubeUrl = `https://youtu.be/${videoId}`;

//       const videoMsg = {
//         id: `video-${Date.now()}`,
//         sender: "bot",
//         type: "text",
//         title: `🎥 LMS Demo for ${roleLabel}`,
//         message: `
//         <div class='flex flex-col items-start gap-4 text-[15px] leading-relaxed text-foreground bg-card/60 backdrop-blur-md border border-border rounded-xl p-4 shadow-sm'>

//           <div class='flex flex-col items-start gap-4 text-[15px] leading-relaxed text-foreground bg-gradient-to-r from-secondary/20 to-accent/20 border border-border rounded-xl p-4 shadow-sm'>
//             <iframe
//               width="100%"
//               height="200"
//               src="${embedUrl}"
//               frameborder="0"
//               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//               allowfullscreen
//               class="rounded-lg shadow-md"
//             ></iframe>
//            <div class='text-center w-full'>
//   <p class='text-[15px] font-medium text-foreground mt-2'>
//     Explore the best features of Zuvy LMS — designed specially for <span class='text-primary font-semibold'>${roleLabel}</span> 🚀
//   </p>
// </div>

// <div class='flex flex-wrap justify-center gap-3 mt-4 w-full'>
//   <a
//     href="${youtubeUrl}"
//     target="_blank"
//     class='flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-accent to-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-300'
//   >
//     <span class="text-base">▶️</span>
//     <span>Watch on YouTube</span>
//   </a>
//   <a
//     href="mailto:join-zuvy@navgurukul.org?subject=Interested%20in%20LMS%20for%20${encodeURIComponent(roleLabel)}"
//     class='flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-300'
//   >
//     <span class="text-base">💌</span>
//     <span>Contact Us</span>
//   </a>
// </div>

  

//           </div>
//         `,
//       };

//       setMessages((prev) => [...prev, videoMsg]);
//       if (speakingEnabled)
//         speak(`Here’s an overview of the LMS for ${roleLabel}.`);
//       return;
//     }
// 🥈 2️⃣ LMS ROLE HANDLING (Updated Clean Version)
if (value && value.startsWith("lms_role_")) {
  let videoId = "";
  let roleLabel = "";

  switch (value) {
    case "lms_role_student":
      roleLabel = "Students";
      videoId = "slc6uL_ESoo";
      break;
    case "lms_role_admin":
      roleLabel = "Admins";
      videoId = "rqzI4ZFLqXo";
      break;
    case "lms_role_instructor":
      roleLabel = "Instructors";
      videoId = "brmzOPxnHgE";
      break;
    case "lms_role_other":
      const contactMsg = {
        id: `contact-${Date.now()}`,
        sender: "bot",
        type: "text",
        title: "💌 Want to Explore Something Else?",
        message: `
          <div class='flex flex-col items-start gap-4 text-[15px] leading-relaxed text-foreground bg-gradient-to-r from-secondary/20 to-accent/20 border border-border rounded-xl p-4 shadow-sm'>
            <div class='text-base font-semibold'>🪄 We'd love to hear your use case!</div>
            <p class='text-sm text-muted-foreground'>
              Drop us an email and our team will connect with you 💚
            </p>
            <a
              href="mailto:join-zuvy@navgurukul.org?subject=Exploring%20Other%20LMS%20Solutions"
              class='inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all'
            >
              📩 Email Our Team
            </a>
          </div>
        `,
      };
      setMessages((prev) => [...prev, contactMsg]);
      if (speakingEnabled)
        speak("You can email our team at join zuvy at nav gurukul dot org to explore other LMS options.");
      return;
  }

  if (!videoId) return;

  // const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`; // ✅ autoplay on load
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&enablejsapi=1`;

  const videoMsg = {
    id: `video-${Date.now()}`,
    sender: "bot",
    type: "text",
    title: `🎥 LMS Demo for ${roleLabel}`,
    message: `
      <div class='flex flex-col items-center gap-4 text-[15px] leading-relaxed text-foreground bg-gradient-to-r from-secondary/20 to-accent/20 border border-border rounded-2xl p-4 shadow-md max-w-[500px] mx-auto'>
        <iframe
        width="100%"
        height="250"
        src="${embedUrl}"
       frameborder="0"
       allow="autoplay; encrypted-media; fullscreen"
       allowfullscreen
       class="rounded-xl shadow-md transition-all duration-300 hover:scale-[1.02]"
       ></iframe>


        <p class='text-[14px] text-muted-foreground text-center'>
          Explore Zuvy LMS designed for <span class='text-primary font-semibold'>${roleLabel}</span> 🚀
        </p>

        <a
          href="mailto:join-zuvy@navgurukul.org?subject=Interested%20in%20LMS%20for%20${encodeURIComponent(roleLabel)}"
          class='inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all'
        >
          💌 Contact Our Team
        </a>
      </div>
    `,
  };

  setMessages((prev) => [...prev, videoMsg]);
  if (speakingEnabled)
    speak(`Here’s an overview of the LMS for ${roleLabel}.`);
  return;
}


    // 🥉 3️⃣ FAQ MENUS (Bootcamps, Partnerships, Learners)
    // 🥉 3️⃣ FAQ MENUS (Bootcamps, Partnerships, Learners)
    if (value.startsWith("faq_menu_")) {
      handleSendMessage(value);
      return;
    }
    // 💬 If user clicks “Anything else?”
if (value === "show_more_faqs") {
  const remaining = (window as any)._remainingFAQs || [];

  if (remaining.length === 0) {
    setMessages((prev) => [
      ...prev,
      {
        id: `no-more-${Date.now()}`,
        sender: "bot",
        type: "text",
        message: "That’s all for now! You can ask another question anytime 💬",
      },
    ]);
    return;
  }

  setMessages((prev) => [
    ...prev,
    {
      id: `more-${Date.now()}`,
      sender: "bot",
      type: "options",
      title: "More FAQs for you ",
      message: "Here are more helpful questions:",
      options: remaining,
    },
  ]);

  // 🧹 Clear memory after showing
  (window as any)._remainingFAQs = [];
  return;
}


    // 🏁 4️⃣ ASK ANYTHING — generic fallback
    if (value === "faq" || value === "faq_query") {
      setMessages((prev) => [
        ...prev,
        {
          id: `faq-${Date.now()}`,
          sender: "bot",
          type: "text",
          title: "💡 Ask a question",
          message:
            "You can ask anything about Bootcamps, LMS or Partnerships. Type below ",
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    // 🚀 DEFAULT fallback
    handleSendMessage(value);
  };

  window.addEventListener("sendMessage", handler);
  return () => window.removeEventListener("sendMessage", handler);
}, [studentEmail, isChatStarted]);

// 🧩 Sidebar triggers: mirror original button behaviors
useEffect(() => {
  const startHandler = (e: any) => {
    const mode = (e?.detail || "").toString();
    if (!mode) return;
    if (mode === "student") {
      setIsChatStarted("student");
      localStorage.setItem("zuvy_session_started", "1");
      setMessages([]);
      return;
    }
    if (mode === "learner") {
      setIsChatStarted("learner");
      setMessages([
        {
          id: "bootcamp",
          sender: "bot",
          type: "options",
          title: "💻 Explore Zuvy Bootcamps",
          message:
            "Hands-on programs in Full-Stack & DSA with placement support ",
          options: [
            { label: "📘 Bootcamp FAQs", value: "faq_menu_Explore Bootcamps" },
            { label: "📧 Contact Us", value: "faq_menu_All" },
          ],
        },
      ]);
      return;
    }
    if (mode === "business") {
      setIsChatStarted("business");
      setMessages([
        {
          id: "business",
          sender: "bot",
          type: "options",
          title: "🏢 LMS Solutions",
          message: "Choose your role to explore LMS ",
          options: [
            { label: "🎓 As a Student", value: "lms_role_student" },
            { label: "🧑‍💼 As an Admin", value: "lms_role_admin" },
            { label: "👨‍🏫 As an Instructor", value: "lms_role_instructor" },
            { label: "🪄 Others / Want to Explore Something Else", value: "lms_role_other" },
          ],
        },
      ]);
      return;
    }
    if (mode === "partner") {
      setIsChatStarted("partner");
      setMessages([
        {
          id: "partner",
          sender: "bot",
          type: "options",
          title: "🤝 Partnerships",
          message: "For CSR Partners, Employers & Impact Collaborations ",
          options: [
            { label: "📘 Partnership FAQs", value: "faq_menu_Partnerships" },
            { label: "📧 Contact Us", value: "faq_menu_All" },
          ],
        },
      ]);
    }
  };
  window.addEventListener("start_chat", startHandler);
  return () => window.removeEventListener("start_chat", startHandler);
}, []);


  // 🎓 Start chat for learner
  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentEmail) {
      alert("Please enter both name and email.");
      return;
    }
    setIsChatStarted("student");
    localStorage.setItem("zuvy_session_started", "1");
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        type: "options",
        title: `Hi ${studentName}!`,
        message: "Welcome back! Choose an option ",
        options: [
          { label: "📚 Attendance", value: "attendance_menu" },
          { label: "🧾 Assessments", value: "assessment_menu" },
          { label: "💡 FAQs", value: "faq_menu_Existing Learner" },
        ],
      },
    ]);
  };

  
const handleSendMessage = async (text: string) => {
  if (!text) return;

  // Show user message + typing animation
  // setMessages((prev) => [
  //   ...prev,
  //   { id: `u-${Date.now()}`, sender: "user", type: "text", message: text },
  //   { id: `t-${Date.now()}`, sender: "bot", type: "typing", message: "/Chat.mp4" },
  // ]);
  setMessages((prev) => [
  ...prev,
  { id: `u-${Date.now()}`, sender: "user", type: "text", message: cleanLabel(text) },
  { id: `t-${Date.now()}`, sender: "bot", type: "typing", message: "/Chat.mp4" },
]);

  try {
    // const res = await fetch("http://localhost:5000/query", {
    const res = await fetch("https://zuvy-buddy-0-1.onrender.com/query", {
    //  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: studentName || "Visitor",
        email: studentEmail || "",
        text,
      }),
    });

    const data = await res.json();

    // remove typing
    setMessages((prev) => prev.filter((m) => !`${m.id}`.startsWith("t-")));

    const botMsg = (data?.message || "").trim().toLowerCase();

    // 🧠 If no data or not found — fallback
    if (!botMsg || botMsg.includes("not found") || botMsg.includes("please email")) {
      const fallbackMsg = {
        id: `fallback-${Date.now()}`,
        sender: "bot",
        type: "text",
        title: "We’re here to help!",
        message: `

          <div class='flex flex-col items-start gap-4 text-[15px] leading-relaxed text-foreground bg-gradient-to-r from-secondary/20 to-accent/20 border border-border rounded-xl p-4 shadow-sm'>
  <div class='text-base font-semibold flex items-center gap-2'>
    Hmm... I couldn't find an exact answer to that right now.
  </div>
  <p class='text-[14px] text-muted-foreground'>
    But no worries — our support team is always happy to help you! 💚  
    Click below to reach us directly:
  </p>
  <a
    href="mailto:join-zuvy@navgurukul.org"
    class='inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all focus:outline-none focus:ring-2 focus:ring-ring'
  >
    📩 Contact Support Team
    <span class="text-xs opacity-90">join-zuvy@navgurukul.org</span>
  </a>
</div>

        `,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (speakingEnabled)
        speak("Hmm, I couldn’t find an exact answer right now. But no worries — our support team is happy to help you!");
      return;
    }

// if (Array.isArray(data.options) && data.options.length > 0) {
//   // 🌟 Show only 3 FAQs first
//   const firstThree = data.options.slice(0, 3);
//   const remaining = data.options.slice(3);
//   // 🧭 Extract category from the title safely
// const category =
//   data.title?.replace(/💻|🎓|📘|🏢|🤝/g, "")
//     ?.replace(/Zuvy Buddy|FAQs|Explore|Category|💬/gi, "")
//     ?.trim() || "General";

//   // 🧩 Add “Anything else?” button if more than 3
//   const limitedOptions =
//     remaining.length > 0
//       ? [...firstThree, { label: "💬 Anything else?", value: `faq_show_more|||ctx:${category}` }
// ]
//       : firstThree;

//   const botResponse = {
//     id: `b-${Date.now()}`,
//     sender: "bot",
//     type: "options",
//     title: data.title || "",
//     message: data.message || "",
//     options: limitedOptions,
//   };

//   setMessages((prev) => [...prev, botResponse]);

//   // 🗣️ Voice output
//   if (speakingEnabled) speak(data.voiceText || data.message);

//   // 💡 Save remaining FAQs for later (optional memory)
//   (window as any)._remainingFAQs = remaining;
// } else {
//   // 🔸 Normal text message
//   const botResponse = {
//     id: `b-${Date.now()}`,
//     sender: "bot",
//     type: data.type || "text",
//     title: data.title || "",
//     message: data.message || "",
//   };
//   setMessages((prev) => [...prev, botResponse]);
//   if (speakingEnabled) speak(data.voiceText || data.message);
// }
const isShowMore = text.startsWith("faq_show_more_");
if (Array.isArray(data.options) && data.options.length > 0) {
  // // 🌟 Show only 3 FAQs first
  // const firstThree = data.options.slice(0, 3);
  // const remaining = data.options.slice(3);
  let firstThree = data.options;
let remaining = [];

if (!isShowMore) {
  // 🌟 Only paginate for first category fetch
  firstThree = data.options.slice(0, 3);
  remaining = data.options.slice(3);
}


  // 🧭 Extract category from title
  const category =
    data.title?.replace(/💻|🎓|📘|🏢|🤝/g, "")
      ?.replace(/Zuvy Buddy|FAQs|Explore|Category|💬/gi, "")
      ?.trim() || "General";

  // 🧩 Add “Anything else?” button if more than 3
  const limitedOptions =
    remaining.length > 0
      ? [
          ...firstThree,
          { label: "💬 Anything else?", value: `faq_show_more_${category}` },
        ]
      : firstThree;

  const botResponse = {
    id: `b-${Date.now()}`,
    sender: "bot",
    type: "options",
    title: data.title || "",
    message: data.message || "",
    options: limitedOptions,
  };

  setMessages((prev) => [...prev, botResponse]);

  // 🗣️ Voice output
  if (speakingEnabled) speak(data.voiceText || data.message);

  // 💡 Save remaining FAQs (optional)
  (window as any)._remainingFAQs = remaining;
} else {
  // 🔸 Normal text message
  const botResponse = {
    id: `b-${Date.now()}`,
    sender: "bot",
    type: data.type || "text",
    title: data.title || "",
    message: data.message || "",
  };
  setMessages((prev) => [...prev, botResponse]);
  if (speakingEnabled) speak(data.voiceText || data.message);
}



    // if (speakingEnabled) speak(data.voiceText || data.message);
  } catch (err) {
    console.error(err);
    setMessages((prev) => prev.filter((m) => !`${m.id}`.startsWith("t-")));
    setMessages((prev) => [
      ...prev,
      {
        id: `err-${Date.now()}`,
        sender: "bot",
        type: "error",
        message:
          "⚠️ Something went wrong. Try again or email join-zuvy@navgurukul.org",
      },
    ]);
    speak("Something went wrong. Please try again later.");
  }
};

  // 🌟 Save lead
  async function saveLeadToServer(name: string, email: string) {
    // const res = await fetch("http://localhost:5000/save-lead", {
       const res = await fetch("https://zuvy-buddy-0-1.onrender.com/save-lead", {
    method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, source: "chatbot" }),
    });
    if (!res.ok) throw new Error("Failed to save lead");
    return res.json();
  }

  // 🌱 Inline lead form
  const lastBot = messages.slice().reverse().find((m) => m.sender === "bot");
  const showLeadInline = lastBot && lastBot.type === "lead_form";

  return (
    <div className="flex flex-col h-full w-full">
      {/* 🚀 Start Screen */}
      {!isChatStarted && !hideWelcomeHero && (
        <div className="flex flex-col items-center flex-1 pt-0 px-10 gap-6 animate-fade-in">
          <div className="relative w-28 h-28 flex items-center justify-center animate-fade-bounce">
  {/* 🌈 Soft glowing background circle (auto adjusts to theme) */}
  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 via-accent/20 to-transparent blur-2xl"></div>

  {/* 🤖 Dancing Robot */}
  <img
    src="/robot_transparent_background-removebg-preview.png"
    alt="Zuvy Buddy"
    className="relative w-24 h-24 object-contain animate-dance robot-glow select-none pointer-events-none"
  />
</div>

          <h2 className="text-2xl font-bold text-center">Welcome to Zuvy Buddy</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            {/* How can I help you today?  */}
             <span className="inline-block animate-[fadeIn_0.3s_ease-in-out_0s_forwards] opacity-0">How</span>{" "}
            <span className="inline-block animate-[fadeIn_0.3s_ease-in-out_0.1s_forwards] opacity-0">can</span>{" "}
            <span className="inline-block animate-[fadeIn_0.3s_ease-in-out_0.2s_forwards] opacity-0">I</span>{" "}
            <span className="inline-block animate-[fadeIn_0.3s_ease-in-out_0.3s_forwards] opacity-0">help</span>{" "}
            <span className="inline-block animate-[fadeIn_0.3s_ease-in-out_0.4s_forwards] opacity-0">you</span>{" "}
            <span className="inline-block animate-[fadeIn_0.3s_ease-in-out_0.5s_forwards] opacity-0">today?</span>{" "}
            <span className="inline-block animate-[fadeIn_0.3s_ease-in-out_0.6s_forwards] opacity-0"></span>
          </p>

      {!hideStartOptions && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl mt-4">
        <button
              onClick={() => setIsChatStarted("student")}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-8 px-6 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 min-h-[180px] sm:min-h-[200px]"
            >
              <img src="/undraw_blogging_38kl.svg" alt="Learner" className="w-20 h-20 object-contain" />
              🎓 I'm an Existing Learner
        </button>

        <button
              onClick={() => {
                setIsChatStarted("learner");
                setMessages([
                  {
                    id: "bootcamp",
                    sender: "bot",
                    type: "options",
                    title: "💻 Explore Zuvy Bootcamps",
                    message:
                      "Hands-on programs in Full-Stack & DSA with placement support ",
                    options: [
                      { label: "📘 Bootcamp FAQs", value: "faq_menu_Explore Bootcamps" },
                      { label: "📧 Contact Us", value: "faq_menu_All" },
                    ],
                  },
                ]);
              }}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-8 px-6 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 min-h-[180px] sm:min-h-[200px]"
            >
               <img src="/undraw_no-signal_nqfa.svg" alt="Bootcamp" className="w-20 h-20 object-contain" />
              💻 I want to Explore Bootcamps
        </button>

        <button
            onClick={() => {
              setIsChatStarted("business");
              setMessages([
               {
                id: "business",
                sender: "bot",
                type: "options",
                title: "🏢 LMS Solutions",
                message: "Choose your role to explore LMS ",
                options: [
                 { label: "🎓 As a Student", value: "lms_role_student" },
                 { label: "🧑‍💼 As an Admin", value: "lms_role_admin" },
                 { label: "👨‍🏫 As an Instructor", value: "lms_role_instructor" },
                 { label: "🪄 Others / Want to Explore Something Else", value: "lms_role_other" },
               ],
               },
             ]);
           }}
           className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-8 px-6 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 min-h-[180px] sm:min-h-[200px]"
            > 
            <img src="/undraw_online-meetings_zutp.svg" alt="LMS" className="w-20 h-20 object-contain" />
            🏢 I'm Exploring LMS Solutions
        </button>   

        <button
              onClick={() => {
                setIsChatStarted("partner");
                setMessages([
                  {
                    id: "partner",
                    sender: "bot",
                    type: "options",
                    title: "🤝 Partnerships",
                    message:
                      "For CSR Partners, Employers & Impact Collaborations ",
                    options: [
                  { label: "📘 Partnership FAQs", value: "faq_menu_Partnerships" },
                  { label: "📧 Contact Us", value: "faq_menu_All" },
                  ]},
                ]);
              }}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-8 px-6 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 min-h-[180px] sm:min-h-[200px]"
            >
              <img src="/undraw_sharing-knowledge_2jx3.svg" alt="Partnership" className="w-20 h-20 object-contain" />
              🤝 I'm Interested in Partnerships
         </button>
      </div>
      )}
    </div>
      )}

      {/* 🧍 Student Login Form */}
      {isChatStarted === "student" && !messages.length && (
        <form
          onSubmit={handleStartChat}
          className="flex flex-col justify-center items-center flex-1 p-8 gap-6"
        >
          <img
            src="/robot_transparent_background-removebg-preview.png"
            alt="Zuvy Logo"
            className="w-10 h-10 object-contain"
          />
          <h2 className="text-2xl font-bold">Welcome Back 👋</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Enter your details to continue.
          </p>

          <div className="w-full max-w-sm flex flex-col gap-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Enter your name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full pl-10 border border-input bg-background text-foreground p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="Enter your email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full pl-10 border border-input bg-background text-foreground p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!studentName || !studentEmail}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-3 rounded-xl hover:shadow-lg transition disabled:opacity-50"
            >
              Start Chat
            </button>
          </div>
        </form>
      )}

      {/* 💬 Chat UI */}
      {isChatStarted && messages.length > 0 && (
        <>
          <div className="flex-1 flex flex-col min-h-0">
            <div
              ref={scrollAreaRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 pb-[86px]" // give padding for input
            >
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isBot={msg.sender === "bot"}
                />
              ))}
              <div id="scroll-anchor" />
            </div>
            {/* Inline Lead Form */}
            {showLeadInline && (
              <div className="p-3 border-t bg-muted/20 rounded-lg mb-2">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const fname = (form.elements.namedItem("visitor_name") as HTMLInputElement)
                      .value;
                    const femail = (form.elements.namedItem("visitor_email") as HTMLInputElement)
                      .value;
                    if (!fname || !femail) {
                      alert("Please enter both name and email.");
                      return;
                    }
                    await saveLeadToServer(fname, femail);
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `lead-saved-${Date.now()}`,
                        sender: "bot",
                        type: "text",
                        message:
                          "🎉 Thanks! Your details are saved. You can reach us at join-zuvy@navgurukul.org",
                      },
                    ]);
                    form.reset();
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      name="visitor_name"
                      placeholder="Your name"
                      className="flex-1 p-2 rounded-md border border-input bg-background text-foreground"
                    />
                    <input
                      name="visitor_email"
                      placeholder="Your email"
                      type="email"
                      className="flex-1 p-2 rounded-md border border-input bg-background text-foreground"
                    />
                    <button className="px-3 py-2 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-md">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          {/* 🎤 Bottom Control Bar with Expandable Menu (absolutely fixed at bottom full-width of chat panel) */}
          <div className="fixed left-0 right-0 md:left-[288px] lg:left-[320px] bottom-0 z-20 p-3 flex items-center gap-2 border-t bg-background" style={{'boxShadow': '0 -2px 20px 0 rgba(0,0,0,0.02)'}}> {/* width matches sidebar (md/desktop sidebar) */}
            {/* Left: Plus/Minus Button with Arc Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  const menu = document.getElementById("input-options-menu");
                  const plusBtn = document.getElementById("plus-btn");
                  if (menu && plusBtn) {
                    const isOpen = menu.style.display === "flex";
                    menu.style.display = isOpen ? "none" : "flex";
                    plusBtn.innerHTML = isOpen
                      ? '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>'
                      : '<line x1="5" y1="12" x2="19" y2="12"></line>';
                  }
                }}
                className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-all duration-300"
              >
                <svg id="plus-btn" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              {/* Arc-style Expandable Options Menu (90° spread) */}
              <div
                id="input-options-menu"
                style={{ display: "none" }}
                className="absolute bottom-full left-0 mb-2 flex gap-3 flex-col items-center"
              >
                {/* Arc-style Floating Plus/Minus, Speaker, Mic vertical menu */}
                <div className="flex flex-col items-center gap-3 pt-2 relative">
                  {/* Speaker (mute/unmute) */}
                  <button
                    tabIndex={0}
                    title={speakingEnabled ? 'Mute' : 'Unmute'}
                    aria-label={speakingEnabled ? 'Mute bot' : 'Unmute bot'}
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 shadow-lg focus:outline-none mb-2 ${speakingEnabled ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}
                    // onClick={() => {
                    //   setSpeakingEnabled(v => {
                    //     const newVal = !v;
                    //     window.dispatchEvent(new CustomEvent('toggle_speaking'));
                    //     if (!newVal) {
                    //       try { window.speechSynthesis.cancel(); } catch(e){}
                    //     }
                    //     return newVal;
                    //   });
                    // }}
                    onClick={() => {
  setSpeakingEnabled(v => {
    const newVal = !v;
    if (!newVal) { try { window.speechSynthesis.cancel(); } catch(e){} }
    return newVal;
  });
}}

                  >
                    {speakingEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                  </button>
                  {/* Mic Button - below speaker */}
                  <button
                    tabIndex={0}
                    onClick={toggleListening}
                    title="Voice Input"
                    aria-label="Voice Input"
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 shadow-lg focus:outline-none ${listening ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-card border border-border hover:bg-muted'}`}
                  >
                    <Mic size={24} />
                  </button>
                </div>
              </div>
            </div>
            {/* Chat Input pinned to bottom full width */}
            <div className="flex-1">
              <ChatInput onSendMessage={handleSendMessage} ref={inputRef} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
