"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What emails did I get from my boss last month?",
  "Summarize any unresolved threads about contracts",
  "Who emails me most frequently?",
  "Find emails where someone asked me for a deadline",
  "What projects was I working on in Q1?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(query?: string) {
    const text = query || input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Check your API keys and Supabase connection.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-mono">

      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm text-zinc-400 tracking-widest uppercase">Email RAG</span>
        <span className="ml-auto text-xs text-zinc-600">powered by Claude + pgvector</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto mt-16 space-y-8">
            <div>
              <h1 className="text-2xl font-light text-zinc-200 mb-1">
                Your email history, searchable.
              </h1>
              <p className="text-zinc-500 text-sm">
                Ask anything about your Gmail archive — people, topics, projects, timelines.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-600 uppercase tracking-widest">Try asking</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full text-left px-4 py-3 rounded border border-zinc-800 text-zinc-400 text-sm hover:border-zinc-600 hover:text-zinc-200 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-2xl mx-auto ${msg.role === "user" ? "flex justify-end" : ""}`}
          >
            {msg.role === "user" ? (
              <div className="bg-zinc-800 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-zinc-200 max-w-lg">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Claude</div>
                <div className="text-sm text-zinc-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content || (loading ? "▋" : "")}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            placeholder="Ask about your email history..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
