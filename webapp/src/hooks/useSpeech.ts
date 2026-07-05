"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SPEECH_LANG = "ml-IN"; // Malayalam; matches the AI output language.

/**
 * Thin wrapper over the browser SpeechSynthesis API for reading AI text aloud.
 * Tracks which item is currently speaking (by caller-supplied id) so a single
 * hook instance can drive multiple 🔊 buttons, and prefers a Malayalam voice
 * when the device provides one.
 */
export function useSpeech() {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback(
    (id: string, text: string) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANG;
      const malayalamVoice = voicesRef.current.find((v) =>
        v.lang?.toLowerCase().startsWith("ml")
      );
      if (malayalamVoice) utterance.voice = malayalamVoice;
      utterance.onend = () => setSpeakingId((current) => (current === id ? null : current));
      utterance.onerror = () => setSpeakingId((current) => (current === id ? null : current));
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  const toggle = useCallback(
    (id: string, text: string) => {
      if (speakingId === id) stop();
      else speak(id, text);
    },
    [speakingId, speak, stop]
  );

  return { supported, speakingId, speak, stop, toggle };
}
