"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in lib.dom for all TS setups).
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  0: RecognitionAlternative;
  isFinal: boolean;
}
interface RecognitionResultList {
  length: number;
  [index: number]: RecognitionResult;
}
interface RecognitionEvent {
  results: RecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Wraps the browser SpeechRecognition API for one-shot dictation. `start`
 * takes the recognition language and a callback fired with the final
 * transcript when recognition ends (manual stop or a natural pause).
 */
export function useSpeechRecognition() {
  const supported = getRecognitionCtor() !== null;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback((lang: string, onFinal: (text: string) => void) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalText = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (text) onFinal(text);
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setListening(true);
    recognition.start();
  }, []);

  return { supported, listening, transcript, start, stop };
}
