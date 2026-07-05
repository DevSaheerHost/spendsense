"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCooldown } from "@/hooks/useCooldown";
import { SpeakButton } from "@/components/recommendations/SpeakButton";
import { recordAiUsage } from "@/lib/firestore/aiUsage";
import { clearChatHistory, loadChatHistory, saveChatHistory } from "@/lib/firestore/chat";
import type { FinancialSnapshot } from "@/lib/recommendations/engine";
import type { ChatMessage } from "@/lib/types";

interface AdviceTransaction {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  flag: "green" | "yellow" | "red";
  date: string;
}

interface ChatPanelProps {
  snapshot: FinancialSnapshot;
  categoryBreakdown: Record<string, number>;
  transactions: AdviceTransaction[];
  speechSupported: boolean;
  speakingId: string | null;
  onToggleSpeak: (id: string, text: string) => void;
}

export function ChatPanel({
  snapshot,
  categoryBreakdown,
  transactions,
  speechSupported,
  speakingId,
  onToggleSpeak,
}: ChatPanelProps) {
  const { user } = useAuth();
  const cooldown = useCooldown(4000);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load the persisted conversation (the AI's memory) once the user is known.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadChatHistory(user.uid)
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending || cooldown.cooling || !user) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setSending(true);
    let ok = false;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ snapshot, categoryBreakdown, transactions, messages: nextMessages }),
      });
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      const withReply: ChatMessage[] = [...nextMessages, { role: "model", text: data.reply }];
      setMessages(withReply);
      ok = true;
      saveChatHistory(user.uid, withReply).catch(() => {});
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch {
      setError("The AI assistant is unavailable right now. Please try again.");
    } finally {
      setSending(false);
      cooldown.start();
      recordAiUsage(user.uid, ok);
    }
  }

  async function handleClear() {
    if (!user) return;
    setMessages([]);
    setError(null);
    await clearChatHistory(user.uid).catch(() => {});
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Ask the AI Advisor</h3>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-slate-400 hover:text-red-600"
          >
            Clear memory
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Ask a follow-up question about your income, spending, or loans. The chat remembers your
        past conversation.
      </p>

      {messages.length > 0 && (
        <div ref={scrollRef} className="mb-3 max-h-80 space-y-2 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.role === "model" && speechSupported && (
                  <div className="mt-1 flex justify-end">
                    <SpeakButton
                      id={`chat-${index}`}
                      text={message.text}
                      speakingId={speakingId}
                      onToggle={onToggleSpeak}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && <p className="text-xs text-slate-400">Thinking...</p>}
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How can I cut my spending?"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || cooldown.cooling || !input.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {cooldown.cooling && !sending ? "Wait…" : "Send"}
        </button>
      </form>
    </div>
  );
}
