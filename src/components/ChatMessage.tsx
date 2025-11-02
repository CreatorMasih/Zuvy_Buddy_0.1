// import React from "react";
// import { useTheme } from "next-themes";

// /** 🧩 Safe getter (for nested keys) */
// function safeGet(obj: any, keys: string[]) {
//   if (!obj) return undefined;
//   for (const k of keys) {
//     if (Object.prototype.hasOwnProperty.call(obj, k)) {
//       const v = obj[k];
//       if (v !== undefined && v !== null && v !== "") return v;
//     }
//   }
//   return undefined;
// }

// export default function ChatMessage({ message, isBot }: any) {
//   const { theme } = useTheme();
//   if (!message) return null;
//     // ✅ Fix mailto links & video-block buttons inside rendered HTML
//   const msgRef = React.useRef<HTMLDivElement>(null);

//   React.useEffect(() => {
//     if (!msgRef.current) return;

//     const elements = msgRef.current.querySelectorAll("a, button");

//     elements.forEach((el) => {
//       const href = el.getAttribute("href") || "";
//       const onclick = el.getAttribute("onclick") || "";

//       // 🟢 Open mail client on mailto link
//       if (href.startsWith("mailto:")) {
//         el.addEventListener("click", (e) => {
//           e.preventDefault();
//           window.location.href = href;
//         });
//       }

//       // 🔵 Open YouTube / external links in new tab
//       if (href.startsWith("http")) {
//         el.setAttribute("target", "_blank");
//         el.setAttribute("rel", "noopener noreferrer");
//       }

//       // 🟡 Handle inline onclick with mailto (used by some HTML responses)
//       if (onclick.includes("mailto:")) {
//         el.addEventListener("click", (e) => {
//           e.preventDefault();
//           const match = onclick.match(/mailto:[^'"]+/);
//           if (match) window.location.href = match[0];
//         });
//       }
//     });
//   }, [message]);


//   const type = message.type ?? "text";
//   const rawTitle = message.title ?? "";
//   const text = message.message ?? message.msg ?? message.text ?? "";

//   // 🧹 Clean & hide unwanted titles
//   let title = rawTitle.replace(
//     /([\u2700-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F)/g,
//     ""
//   );
//   if (title.trim().toLowerCase().includes("not found")) title = "";

//   const clickOption = (value: string) => {
//     if (value?.startsWith?.("mailto:")) {
//       window.location.href = value;
//       return;
//     }
//     window.dispatchEvent(new CustomEvent("sendMessage", { detail: value }));
//   };

//   const wrapper = isBot ? "items-start" : "items-end flex justify-end";
//   const bubbleBase =
//     "inline-block max-w-[95%] p-3 rounded-2xl break-words whitespace-pre-wrap";
//   const botStyle =
//     "bg-card text-card-foreground border border-border";
//   const userStyle = "bg-primary text-primary-foreground";

//   const fallbackHTML = `
//   <div class='text-[15px] leading-relaxed text-foreground'>
//     <div class='font-medium mb-2'>🤖 Hmm... I couldn't find an exact answer to that right now.</div>
//     <div class='mb-3'>No worries — our support team is always happy to help! 💚</div>
//     <a
//   href="mailto:join-zuvy@navgurukul.org"
//   class="inline-block mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring"
// >
//   📩 Contact Support Team
//   join-zuvy@navgurukul.org
// </a>

//   </div>
// `;

//   // 🧩 helper to decide when to show fallback
//   // 🧠 Detect “Not Found” or “Email” type replies
// const isEmptyText =
//   !text?.trim() ||
//   text.toLowerCase().includes("not found") ||
//   text.toLowerCase().includes("could not find") ||
//   text.toLowerCase().includes("please email") ||
//   ["no answer", "sorry", "error", "n/a"].includes(text.trim().toLowerCase());


//   return (
//     <div className={`flex w-full ${wrapper} mb-2 animate-fade-in-up`}>
//       {isBot && (
//         <img
//           src="/robot_transparent_background.png"
//           alt="Zuvy Bot"
//           className="w-8 h-8 mr-2 mt-1 rounded-full border border-gray-200 shadow-sm bg-white"
//         />
//       )}

//       <div className={isBot ? "mr-auto" : "ml-auto"}>
//         {/* Title */}
//         {title && (
//           <div className="text-xs text-muted-foreground dark:text-gray-300 mb-1 font-medium">
//             {title}
//           </div>
//         )}

//         {/* 🧩 Typing Animation */}
//         {type === "typing" && (
//           <div className="flex justify-center py-2">
//             <video
//               src={text}
//               autoPlay
//               loop
//               muted
//               playsInline
//               className="w-20 sm:w-24 h-auto object-contain rounded-lg border-none bg-transparent"
//               style={{
//                 mixBlendMode: theme === "dark" ? "screen" : "multiply",
//                 filter: "brightness(1.1) contrast(1.2)",
//               }}
//             />
//           </div>
//         )}

//         {/* 🗣️ Text or Error */}
//         {(type === "text" || type === "error") && (
//           <div
//             className={`${bubbleBase} ${
//               type === "error"
//                 ? "bg-destructive/10 text-destructive border border-destructive/20"
//                 : isBot
//                 ? botStyle
//                 : userStyle
//             }`}
//             style={{
//               minHeight: "70px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "flex-start",
//             }}
//           >
//            <div
//   ref={msgRef} // 👈 Add this ref here
//   className={`text-sm leading-relaxed ${type === "error" ? "text-destructive" : ""}`}
//   dangerouslySetInnerHTML={{
//     __html: isEmptyText ? fallbackHTML : text,
//   }}
// />

//           </div>
//         )}

//         {/* 🧩 Options */}
//         {type === "options" && (
//           <div className={`${bubbleBase} ${botStyle}`}>
//             <div className="mb-2 text-sm">{text}</div>
//             <div className="flex flex-wrap gap-2">
//               {(message.options ?? []).map((opt: any, i: number) => (
//                 <button
//                   key={i}
//                   onClick={() => clickOption(opt.value)}
//                   className="px-3 py-1 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm hover:opacity-90 shadow-md transition"
//                 >
//                   {opt.label.replace(
//                     /([\u2700-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F)/g,
//                     ""
//                   )}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* 🧾 Attendance / Table (your old code kept) */}
//         {type === "attendance" && (
//           <div className={`${bubbleBase} ${botStyle}`}>
//             <div
//               className="text-[15px] leading-relaxed"
//               style={{ whiteSpace: "pre-line" }}
//               dangerouslySetInnerHTML={{
//                 __html: text
//                   .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
//                   .replace(/✅/g, "✅")
//                   .replace(/❌/g, "❌")
//                   .replace(/📊/g, "📊"),
//               }}
//             ></div>
//             {Array.isArray(message.options) && message.options.length > 0 && (
//               <div className="mt-4 flex flex-wrap gap-2">
//                 {message.options.map((opt: any, i: number) => (
//                   <button
//                     key={i}
//                     onClick={() => clickOption(opt.value)}
//                     className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm hover:opacity-90 shadow-sm transition"
//                   >
//                     {opt.label}
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
import React from "react";
import { useTheme } from "next-themes";

/** 🧩 Safe getter (for nested keys) */
function safeGet(obj: any, keys: string[]) {
  if (!obj) return undefined;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return undefined;
}

export default function ChatMessage({ message, isBot }: any) {
  const { theme } = useTheme();
  if (!message) return null;
    // ✅ Fix mailto links & video-block buttons inside rendered HTML
  const msgRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!msgRef.current) return;

    const elements = msgRef.current.querySelectorAll("a, button");

    elements.forEach((el) => {
      const href = el.getAttribute("href") || "";
      const onclick = el.getAttribute("onclick") || "";

      // 🟢 Open mail client on mailto link
      if (href.startsWith("mailto:")) {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          window.location.href = href;
        });
      }

      // 🔵 Open YouTube / external links in new tab
      if (href.startsWith("http")) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }

      // 🟡 Handle inline onclick with mailto (used by some HTML responses)
      if (onclick.includes("mailto:")) {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const match = onclick.match(/mailto:[^'"]+/);
          if (match) window.location.href = match[0];
        });
      }
    });
  }, [message]);


  const type = message.type ?? "text";
  const rawTitle = message.title ?? "";
  const text = message.message ?? message.msg ?? message.text ?? "";

  // 🧹 Clean & hide unwanted titles
  let title = rawTitle.replace(
    /([\u2700-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F)/g,
    ""
  );
  if (title.trim().toLowerCase().includes("not found")) title = "";

  const clickOption = (value: string) => {
    if (value?.startsWith?.("mailto:")) {
      window.location.href = value;
      return;
    }
    window.dispatchEvent(new CustomEvent("sendMessage", { detail: value }));
  };

  const wrapper = isBot ? "items-start" : "items-end flex justify-end";
  const bubbleBase =
    "inline-block max-w-[95%] p-3 rounded-2xl break-words whitespace-pre-wrap";
  const botStyle =
    "bg-card text-card-foreground border border-border";
  const userStyle = "bg-primary text-primary-foreground";

  const fallbackHTML = `
  <div class='text-[15px] leading-relaxed text-foreground'>
    <div class='font-medium mb-2'>🤖 Hmm... I couldn't find an exact answer to that right now.</div>
    <div class='mb-3'>No worries — our support team is always happy to help! 💚</div>
    <a
  href="mailto:join-zuvy@navgurukul.org"
  class="inline-block mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring"
>
  📩 Contact Support Team
  join-zuvy@navgurukul.org
</a>

  </div>
`;


  

  // 🧩 helper to decide when to show fallback
  // 🧠 Detect “Not Found” or “Email” type replies
const isEmptyText =
  !text?.trim() ||
  text.toLowerCase().includes("not found") ||
  text.toLowerCase().includes("could not find") ||
  text.toLowerCase().includes("please email") ||
  ["no answer", "sorry", "error", "n/a"].includes(text.trim().toLowerCase());


  return (
    <div className={`flex w-full ${wrapper} mb-2 animate-fade-in-up`}>
      {isBot && (
        <img
          src="/robot_transparent_background.png"
          alt="Zuvy Bot"
          className="w-8 h-8 mr-2 mt-1 rounded-full border border-gray-200 shadow-sm bg-white"
        />
      )}

      <div className={isBot ? "mr-auto" : "ml-auto"}>
        {/* Title */}
        {title && (
          <div className="text-xs text-muted-foreground dark:text-gray-300 mb-1 font-medium">
            {title}
          </div>
        )}

        {/* 🧩 Typing Animation */}
        {type === "typing" && (
          <div className="flex justify-center py-2">
            <video
              src={text}
              autoPlay
              loop
              muted
              playsInline
              className="w-20 sm:w-24 h-auto object-contain rounded-lg border-none bg-transparent"
              style={{
                mixBlendMode: theme === "dark" ? "screen" : "multiply",
                filter: "brightness(1.1) contrast(1.2)",
              }}
            />
          </div>
        )}

        {/* 🗣️ Text or Error */}
      {(type === "text" || type === "error" || type === "ai" || type === "faq" || type === "form") && (
          <div
            className={`${bubbleBase} ${
              type === "error"
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : isBot
                ? botStyle
                : userStyle
            }`}
            style={{
              minHeight: "70px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <div
  ref={msgRef}
  className={`text-sm leading-relaxed ${type === "error" ? "text-destructive" : ""}`}
  style={{ marginTop: "-6px" }}   // 👈 Removes extra white gap before button
  dangerouslySetInnerHTML={{
    __html: (isEmptyText ? fallbackHTML : text)
      .replace(
        /<a[^>]*href=["']mailto:([^"']+)["'][^>]*>(.*?)<\/a>/gi,
        (_, email, label) => `
          <div class="flex flex-col items-start justify-start text-left mt-2 mb-1">
            <a 
              href="mailto:${email}" 
              class="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md 
                bg-gradient-to-r from-primary to-accent text-white font-medium text-xs shadow-sm 
                hover:shadow-md hover:scale-[1.02] transition-all duration-200 focus:outline-none 
                focus:ring-1 focus:ring-primary/40 no-underline"
            >
              📩 ${label || "Contact Support"}
            </a>
            <p class="text-[12px] text-muted-foreground mt-1 leading-snug opacity-80">
              Our team is here to help 💚  
              We usually reply within a few hours ⏱️
            </p>
          </div>
        `
      ),
  }}
/>

          </div>
        )}

        {/* 🧩 Options */}
        {type === "options" && (
          <div className={`${bubbleBase} ${botStyle}`}>
            <div
              ref={msgRef}
              className="mb-2 text-sm"
  dangerouslySetInnerHTML={{
  __html: (isEmptyText ? fallbackHTML : text)
    // 🎯 Compact mail button — no extra space
    .replace(
      /<a[^>]*href=["']mailto:([^"']+)["'][^>]*>(.*?)<\/a>/gi,
      (_, email, label) => `
        <div class="flex flex-col items-start justify-start text-left mt-2 mb-1">
          <a 
            href="mailto:${email}" 
            class="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md 
              bg-gradient-to-r from-primary to-accent text-white font-medium text-xs shadow-sm 
              hover:shadow-md hover:scale-[1.02] transition-all duration-200 focus:outline-none 
              focus:ring-1 focus:ring-primary/40 no-underline"
          >
      ${label || "Contact Support"}
</a>
<p class="text-[12px] text-muted-foreground mt-1 leading-snug opacity-80">
Our team is here to help 💚  
We usually reply within a few hours ⏱️
</p>
</div>
      `
    ),
}}




            />
            <div className="flex flex-wrap gap-2">
              {(message.options ?? []).map((opt: any, i: number) => (
                <button
                  key={i}
                  onClick={() => clickOption(opt.value)}
                  className="px-3 py-1 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm hover:opacity-90 shadow-md transition"
                >
                  {opt.label.replace(
                    /([\u2700-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F)/g,
                    ""
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 🧾 Attendance / Table (your old code kept) */}
        {type === "attendance" && (
          <div className={`${bubbleBase} ${botStyle}`}>
            <div
              className="text-[15px] leading-relaxed"
              style={{ whiteSpace: "pre-line" }}
              dangerouslySetInnerHTML={{
                __html: text
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/✅/g, "✅")
                  .replace(/❌/g, "❌")
                  .replace(/📊/g, "📊"),
              }}
            ></div>
            {Array.isArray(message.options) && message.options.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {message.options.map((opt: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => clickOption(opt.value)}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm hover:opacity-90 shadow-sm transition"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
