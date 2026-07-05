"use client";

interface SpeakButtonProps {
  id: string;
  text: string;
  speakingId: string | null;
  onToggle: (id: string, text: string) => void;
}

// Small inline 🔊 control that reads a piece of AI text aloud, toggling to a
// stop state while it is the one speaking.
export function SpeakButton({ id, text, speakingId, onToggle }: SpeakButtonProps) {
  const isSpeaking = speakingId === id;
  return (
    <button
      type="button"
      onClick={() => onToggle(id, text)}
      aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
      title={isSpeaking ? "Stop" : "Read aloud"}
      className={`shrink-0 rounded-full px-2 py-1 text-sm leading-none transition-colors ${
        isSpeaking ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      }`}
    >
      {isSpeaking ? "⏹" : "\u{1F50A}"}
    </button>
  );
}
