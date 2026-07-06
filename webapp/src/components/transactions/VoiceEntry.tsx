"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCooldown } from "@/hooks/useCooldown";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { recordAiUsage } from "@/lib/firestore/aiUsage";
import type { ParsedTransaction } from "@/lib/types";

const LANGUAGES = [
  { code: "ml-IN", label: "മലയാളം" },
  { code: "en-IN", label: "English" },
];

export function VoiceEntry({ onParsed }: { onParsed: (parsed: ParsedTransaction) => void }) {
  const { user } = useAuth();
  const cooldown = useCooldown(3000);
  const { supported, listening, transcript, start, stop } = useSpeechRecognition();
  const [lang, setLang] = useState("ml-IN");
  const [parsing, setParsing] = useState(false);

  // Hide entirely on browsers without speech recognition (e.g. Firefox).
  if (!supported) return null;

  async function parseTranscript(text: string) {
    if (!user || !text.trim()) return;
    setParsing(true);
    let ok = false;
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/parse-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ transcript: text }),
      });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      if (data.transaction) {
        onParsed(data.transaction as ParsedTransaction);
        ok = true;
        toast.success("Filled from voice — review and tap Add");
      } else {
        toast.error("Couldn't understand that. Please try again.");
      }
    } catch {
      toast.error("Couldn't understand that. Please try again.");
    } finally {
      setParsing(false);
      cooldown.start();
      recordAiUsage(user.uid, ok);
    }
  }

  function handleMicClick() {
    if (parsing || cooldown.cooling) return;
    if (listening) stop();
    else start(lang, parseTranscript);
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleMicClick}
          disabled={parsing || cooldown.cooling}
          aria-label={listening ? "Stop recording" : "Speak to add a transaction"}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-white transition-colors disabled:opacity-50 ${
            listening ? "animate-pulse bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {listening ? "⏹" : "\u{1F3A4}"}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {parsing
              ? "Understanding…"
              : listening
                ? "Listening… tap to stop"
                : "Speak to add a transaction"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {transcript || 'e.g. "Biryani-ക്ക് 140 രൂപ" or "spent 500 on groceries"'}
          </p>
        </div>

        <div className="flex shrink-0 overflow-hidden rounded-lg border border-indigo-200">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              disabled={listening || parsing}
              className={`px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                lang === l.code ? "bg-indigo-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
