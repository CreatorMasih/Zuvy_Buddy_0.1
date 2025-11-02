
// ChatInput.tsx
import React, { forwardRef, useRef, useImperativeHandle, useState } from "react";

type Props = {
  onSendMessage: (text: string) => void;
};

// Forward the native HTMLInputElement ref to parent
const ChatInput = forwardRef<HTMLInputElement, Props>(({ onSendMessage }, ref) => {
  const [value, setValue] = useState("");
  const internalRef = useRef<HTMLInputElement | null>(null);

  // expose the internal input element to the parent via forwarded ref
  useImperativeHandle(ref, () => internalRef.current as HTMLInputElement | null, [internalRef.current]);

  const send = () => {
    const t = value.trim();
    if (!t) return;
    onSendMessage(t);
    setValue("");
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        ref={internalRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Type your message and press Enter..."
        className="flex-1 border border-input rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        aria-label="Chat input"
      />
      <button 
        onClick={send} 
        className="p-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-105"
        aria-label="Send message"
      >
        {/* Paper Plane / Send Arrow Icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  );
});

ChatInput.displayName = "ChatInput";
export default ChatInput;
