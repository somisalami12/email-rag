"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Who emails me most frequently?",
  "Find emails about contracts or deadlines",
  "What projects was I working on this year?",
  "Summarize unresolved threads needing follow-up",
  "Any emails I haven't replied to from important people?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0A0A0F", color: "#E8E8F0", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Header */}
      <header style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1A1A2E" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: "15px", letterSpacing: "-0.3px" }}>Inbox Intelligence</span>
        </div>
        {!isEmpty && (
          <button
            onClick={() => setMessages([])}
            style={{ fontSize: "13px", color: "#555570", background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: "6px", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#8888AA")}
            onMouseLeave={e => (e.currentTarget.style.color = "#555570")}
          >
            New search
          </button>
        )}
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
        {isEmpty ? (
          <div style={{ maxWidth: "640px", margin: "0 auto", paddingTop: "80px", paddingBottom: "40px" }}>
            {/* Hero */}
            <div style={{ marginBottom: "48px" }}>
              <div style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6366F1", marginBottom: "16px", padding: "4px 10px", background: "#6366F120", borderRadius: "4px" }}>
                AI-Powered
              </div>
              <h1 style={{ fontSize: "36px", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-1px", marginBottom: "12px", color: "#F0F0F8" }}>
                Your entire email history,<br />
                <span style={{ color: "#6366F1" }}>instantly searchable.</span>
              </h1>
              <p style={{ fontSize: "15px", color: "#888899", lineHeight: 1.6 }}>
                Ask anything — find people, projects, threads, and decisions buried in years of email.
              </p>
            </div>

            {/* Suggestions */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#444455", marginBottom: "12px" }}>
                Try asking
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: "left", padding: "14px 16px", background: "#111118", border: "1px solid #1E1E2E",
                      borderRadius: "10px", color: "#9999BB", fontSize: "14px", cursor: "pointer", transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.color = "#E0E0F0"; e.currentTarget.style.background = "#14141E"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E2E"; e.currentTarget.style.color = "#9999BB"; e.currentTarget.style.background = "#111118"; }}
                  >
                    <span>{s}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0, marginLeft: "12px" }}>
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: "700px", margin: "0 auto", paddingTop: "32px", paddingBottom: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: "12px", alignItems: "flex-start" }}>
                {/* Avatar */}
                <div style={{
                  width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600,
                  background: msg.role === "user" ? "#6366F1" : "#1E1E2E",
                  color: msg.role === "user" ? "white" : "#6366F1",
                  border: msg.role === "assistant" ? "1px solid #2A2A3E" : "none"
                }}>
                  {msg.role === "user" ? "S" : "✦"}
                </div>
                {/* Bubble */}
                <div style={{
                  maxWidth: "calc(100% - 50px)",
                  padding: msg.role === "user" ? "10px 16px" : "0",
                  background: msg.role === "user" ? "#6366F1" : "transparent",
                  borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "0",
                  fontSize: "14px",
                  lineHeight: 1.65,
                  color: msg.role === "user" ? "white" : "#C8C8E0",
                }}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm" style={{ maxWidth: "none" }}>
                      <ReactMarkdown>{msg.content || (loading && i === messages.length - 1 ? "▋" : "")}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "16px 24px 24px", borderTop: "1px solid #1A1A2E" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              disabled={loading}
              placeholder="Ask about your emails..."
              style={{
                width: "100%", padding: "14px 18px", background: "#111118", border: "1px solid #1E1E2E",
                borderRadius: "12px", fontSize: "14px", color: "#E0E0F0", outline: "none",
                transition: "border-color 0.15s", boxSizing: "border-box"
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#6366F1")}
              onBlur={e => (e.currentTarget.style.borderColor = "#1E1E2E")}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              padding: "14px 20px", background: loading || !input.trim() ? "#1E1E2E" : "#6366F1",
              border: "none", borderRadius: "12px", color: loading || !input.trim() ? "#444455" : "white",
              fontSize: "14px", fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              transition: "all 0.15s", whiteSpace: "nowrap"
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor", animation: "pulse 1s infinite" }} />
                Searching
              </span>
            ) : "Search →"}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: "11px", color: "#333344", marginTop: "10px" }}>
          Searching across your Gmail archive · Powered by Claude
        </p>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A2A3E; border-radius: 2px; }
        .prose p { margin-bottom: 10px; }
        .prose ul { margin: 8px 0 8px 20px; }
        .prose li { margin-bottom: 4px; }
        .prose strong { color: #E0E0F0; }
        .prose code { background: #1E1E2E; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
 
