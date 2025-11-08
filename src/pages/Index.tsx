import StudentChatbot from "@/components/StudentChatbot";
import { useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const navigate = useNavigate();
  const [hasStarted, setHasStarted] = useState(false);
  const [speakingOn, setSpeakingOn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const prompts = [
    "🎓 I'm an Existing Learner",
    "💻 I want to Explore Bootcamps",
    "🏢 I'm Exploring LMS Solutions",
    "🤝 I'm Interested in Partnerships",
  ];

  // Cycle helper line under the hint while welcome section is visible
  useEffect(() => {
    if (hasStarted) return;
    const interval = setInterval(() => {
      setCurrentPromptIndex((i) => (i + 1) % prompts.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [hasStarted]);

  const handleStart = useCallback((detail: string) => {
    setHasStarted(true);
    window.dispatchEvent(new CustomEvent("start_chat", { detail }));
    const anchor = document.getElementById("zuvy-main");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      {/* Shell: Sidebar + Main */}
      <div className="flex min-h-screen">
        {/* Sidebar: overlay for mobile, sticky on desktop */}
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
            <aside className="relative w-64 bg-background/95 border-r border-border flex flex-col gap-4 p-4 z-50 animate-slide-in-left shadow-lg">
              <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 p-2 text-2xl rounded-full hover:bg-accent/40" aria-label="Close sidebar">
                ×
              </button>
              {/* Sidebar content rendered below so code is not duplicated */}
              <div className="flex items-center gap-3">
                <img src="/robot_transparent_background-removebg-preview.png" alt="Zuvy Logo" className="w-20 h-20 object-contain" />
                <div>
                  <h1 className="text-lg font-bold">Zuvy Buddy</h1>
                  <p className="text-sm text-muted-foreground">Your AI Assistant</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pt-2">
                <div className="flex flex-col gap-4">
                  {/* Sidebar buttons rendered here... */}
                  <button
                    onClick={() => { setSidebarOpen(false); handleStart("student"); }}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-6 px-5 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                  >
                    <img src="/undraw_blogging_38kl.svg" alt="Learner" className="w-10 h-10 object-contain" />
                    <span>🎓 I'm an Existing Learner</span>
                  </button>
                  <button
                    onClick={() => { setSidebarOpen(false); handleStart("learner"); }}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-6 px-5 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                  >
                    <img src="/undraw_no-signal_nqfa.svg" alt="Bootcamps" className="w-10 h-10 object-contain" />
                    <span>💻 I want to Explore Bootcamps</span>
                  </button>
                  <button
                    onClick={() => { setSidebarOpen(false); handleStart("business"); }}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-6 px-5 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                  >
                    <img src="/undraw_online-meetings_zutp.svg" alt="LMS" className="w-10 h-10 object-contain" />
                    <span>🏢 I'm Exploring LMS Solutions</span>
                  </button>
                  <button
                    onClick={() => { setSidebarOpen(false); handleStart("partner"); }}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-6 px-5 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                  >
                    <img src="/undraw_sharing-knowledge_2jx3.svg" alt="Partnerships" className="w-10 h-10 object-contain" />
                    <span>🤝 I'm Interested in Partnerships</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
        {/* Desktop sidebar (sticky, always visible) */}
        <aside className="hidden md:flex md:flex-col md:w-72 lg:w-80 shrink-0 border-r border-border bg-background/60 backdrop-blur-md p-4 gap-4 sticky top-0 h-screen">
          {/* <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 border border-border shadow-sm">
            <img src="/robot_transparent_background.png" alt="Zuvy" className="w-20 h-20 object-contain" />
            <span className="text-sm font-semibold">Zuvy Buddy</span>
            <p className="text-xs text-muted-foreground">Your AI Assistant</p>
          </div> */}
          <div className="flex items-center gap-3">
              <img
                src="/robot_transparent_background-removebg-preview.png"
                alt="Zuvy Logo"
                className="w-20 h-20 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold">Zuvy Buddy</h1>
                <p className="text-sm text-muted-foreground">Your AI Assistant</p>
              </div>
            </div>

          <div className="flex-1 overflow-y-auto pt-2">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleStart("student")}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-6 px-5 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
              >
                <img src="/undraw_blogging_38kl.svg" alt="Learner" className="w-10 h-10 object-contain" />
                <span>🎓 I'm an Existing Learner</span>
              </button>

              <button
                onClick={() => handleStart("learner")}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-6 px-5 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
              >
                <img src="/undraw_no-signal_nqfa.svg" alt="Bootcamps" className="w-10 h-10 object-contain" />
                <span>💻 I want to Explore Bootcamps</span>
              </button>

              <button
                onClick={() => handleStart("business")}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-6 px-5 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
              >
                <img src="/undraw_online-meetings_zutp.svg" alt="LMS" className="w-10 h-10 object-contain" />
                <span>🏢 I'm Exploring LMS Solutions</span>
              </button>

              <button
                onClick={() => handleStart("partner")}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-6 px-5 rounded-2xl font-medium text-base shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
              >
                <img src="/undraw_sharing-knowledge_2jx3.svg" alt="Partnerships" className="w-10 h-10 object-contain" />
                <span>🤝 I'm Interested in Partnerships</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Column */}
        <div className="relative flex-1 min-w-0 flex flex-col h-screen"> {/* flex column and full height */}
          {/* Header (starts next to sidebar) */}
          <header className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-md relative">
            <div className="flex items-center gap-2">
              {/* Hamburger for mobile */}
              <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 mr-2 rounded hover:bg-muted focus:outline-none" aria-label="Open sidebar">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </button>
              <button
                onClick={() => {
                  // If we're still on the inline "Welcome to Zuvy Buddy" view,
                  // send the user to the dedicated Welcome page
                  if (!hasStarted) {
                    navigate("/", { replace: true });
                    return;
                  }
                  setHasStarted(false);
                  window.dispatchEvent(new CustomEvent("reset_chat"));
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-foreground hover:bg-muted transition-all duration-200 shadow-sm"
              >
                <ArrowLeft size={16} />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <img src="/robot_transparent_background-removebg-preview.png" alt="Zuvy Logo" className="w-10 h-10 object-contain" />
              <ThemeToggle />
              {hasStarted && (
                <button
                  onClick={() => {
                    setSpeakingOn((v) => {
                      // If muting, cancel any ongoing speech
                      if (v) try { window.speechSynthesis.cancel(); } catch(e){}
                      window.dispatchEvent(new CustomEvent("toggle_speaking"));
                      return !v;
                    });
                  }}
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-all duration-200"
                  aria-label={speakingOn ? "Mute bot voice" : "Unmute bot voice"}
                  title={speakingOn ? "Mute bot voice" : "Unmute bot voice"}
                >
                  {speakingOn
                    ? <Volume2 size={22} />
                    : <VolumeX size={22} className="text-destructive dark:text-red-400" />}
                </button>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main id="zuvy-main" className="flex-1 flex flex-col px-0 md:px-0 justify-between min-h-0"> {/* flex-1 and no max width, min-h-0 for overflow */}
            {!hasStarted && (
              <div className="flex flex-col items-center text-center gap-3 mb-6 pt-10">
                <h2 className="text-3xl font-bold">Welcome to Zuvy Buddy</h2>
                <p className="text-muted-foreground text-center max-w-sm">
                  <span className="inline-block animate-[fadeIn_0.4s_ease-in-out_0s_forwards] opacity-0">How</span>{" "}
                  <span className="inline-block animate-[fadeIn_0.4s_ease-in-out_0.1s_forwards] opacity-0">can</span>{" "}
                  <span className="inline-block animate-[fadeIn_0.4s_ease-in-out_0.2s_forwards] opacity-0">I</span>{" "}
                  <span className="inline-block animate-[fadeIn_0.4s_ease-in-out_0.3s_forwards] opacity-0">help</span>{" "}
                  <span className="inline-block animate-[fadeIn_0.4s_ease-in-out_0.4s_forwards] opacity-0">you</span>{" "}
                  <span className="inline-block animate-[fadeIn_0.4s_ease-in-out_0.5s_forwards] opacity-0">today?</span>{" "}
                  <span className="inline-block animate-[fadeIn_0.4s_ease-in-out_0.6s_forwards] opacity-0">👇</span>
                </p>
                <img src="/undraw_search-engines_k649.svg" alt="Zuvy" className="w-50 h-40 object-contain" />
              </div>
            )}
            {/* Chatbot fills remaining area and input is pinned at bottom */}
            <div className="flex-1 flex flex-col min-h-0">
              <StudentChatbot hideStartOptions hideWelcomeHero speakingOn={speakingOn} />
            </div>
          </main>

          {/* Bottom Hint Input: responsive sizing, visible only if sidebar is closed */}
          {!hasStarted && !sidebarOpen && (
            <div className="fixed bottom-3 left-0 right-0 flex justify-center z-40 md:left-72 md:right-6 lg:left-80 md:bottom-6">
              <div className="pointer-events-none w-full max-w-xs sm:max-w-md md:max-w-2xl bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-md border border-border rounded-2xl shadow-lg px-4 py-3 mx-auto"
                style={{boxSizing:'border-box'}}>
                <input
                  readOnly
                  tabIndex={-1}
                  placeholder="Click one of the four options on the left to continue."
                  className="w-full max-w-full bg-transparent outline-none text-foreground placeholder:text-foreground text-sm sm:text-base break-words whitespace-normal"
                  style={{whiteSpace: 'normal'}}
                />
                <div className="mt-2 text-xs sm:text-sm text-muted-foreground min-h-[1.5em]">
                  <div key={currentPromptIndex} className="opacity-0 animate-[fadeIn_0.25s_ease-in-out_forwards] whitespace-normal break-words">
                    {prompts[currentPromptIndex]}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
