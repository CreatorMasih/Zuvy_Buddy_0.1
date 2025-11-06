import React from "react";
import { useNavigate } from "react-router-dom";

const Welcome = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
  // 🧠 Chat session mark as started before navigation
  localStorage.setItem("zuvy_session_started", "1");

  // ✅ Now navigate to chat page
  navigate("/chat");
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex flex-col items-center justify-center p-4">
      {/* Header - Hidden on desktop, visible on mobile */}
      <div className="text-center mb-8 lg:hidden">
        <h1 className="text-foreground text-2xl font-bold mb-2">Personal AI Buddy</h1>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row items-center justify-center flex-1 max-w-5xl mx-auto w-full gap-8 lg:gap-20">
        {/* Left Side - Robot Image Only (Desktop) */}
        <div className="flex flex-col items-center justify-center lg:w-2/5">
          {/* Robot Image */}
          <div className="mb-8 lg:mb-0">
            {/* <img
              src="/bot-logo.jpeg"
              alt="Buddy Robot"
              className="w-32 h-32 lg:w-[40rem] lg:h-[40rem] mx-auto object-contain"
            /> */}
            {/* <img
              src="\robot_transparent_background.png"
              alt="Zuvy Logo"
              className="w-32 h-32 lg:w-[40rem] lg:h-[40rem] mx-auto object-contain animate-bounce-slow"
            /> */}
{/* 🤖 Dancing 3D Zuvy Buddy */}
<div className="relative flex items-center justify-center w-full h-[24rem]">
  {/* 🌈 Background Glow */}
  <div className="absolute w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-emerald-400/30 via-primary/20 to-transparent blur-3xl animate-bg-shift"></div>

  {/* 🤖 Robot Head with smooth rotation + float */}
  <img
    src="/robot_transparent_background-removebg-preview.png"
    alt="Zuvy Buddy"
    className="relative w-72 h-72 lg:w-[30rem] lg:h-[30rem] object-contain animate-float-rotate select-none pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.25)]"
  />
</div>




          </div>

          {/* Title - Only visible on mobile */}
          <h2 className="text-foreground text-3xl font-bold mb-4 lg:hidden">Zuvy Buddy</h2>
          
          {/* Subtitle - Only visible on mobile */}
          <h3 className="text-foreground text-xl font-semibold mb-6 lg:hidden">Your Own AI Assistant</h3>
        </div>

        {/* Right Side - All Text Content (Desktop) */}
        <div className="flex flex-col items-center lg:items-start justify-center lg:w-3/5 text-center lg:text-left">
          {/* Header - Visible on desktop only */}
          {/* <h1 className="hidden lg:block text-foreground text-3xl lg:text-4xl font-bold mb-4 lg:mb-6">Personal AI Buddy</h1> */}
          
          {/* Meet Buddy - Visible on desktop only */}
          <h2 className="hidden lg:block text-foreground text-3xl lg:text-4xl font-bold mb-3 lg:mb-4">Zuvy Buddy</h2>
          
          {/* Subtitle - Visible on desktop only */}
          <h3 className="hidden lg:block text-foreground text-xl lg:text-2xl font-semibold mb-6">Your Own AI Assistant</h3>
          
          {/* Description */}
          <p className="text-muted-foreground text-base lg:text-lg leading-relaxed mb-8 max-w-md lg:max-w-lg">
            Designed to support your learning and work.
          </p>

          {/* Get Started Button */}
          <button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
          >
            <span className="text-xl">»</span>
            Get started
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;