"use client";

import { useState } from "react";

interface Commitment {
  who: string;
  what: string;
  status: string;
}

interface MeetingSuggestion {
  format: string;
  timing: string;
  agenda: string;
  suggestedSlots: string[];
  rationale: string;
}

interface RelationshipBrief {
  contactName: string;
  relationshipSummary: string;
  keyTopics: string[];
  commitments: Commitment[];
  followUps: string[];
  recommendedNextAction: string;
  draftResponse: string;
  relationshipHealth: string;
  lastContactEstimate: string;
  meetingSuggestion: MeetingSuggestion;
}

const healthColors: Record<string, { bg: string; text: string; label: string }> = {
  strong: { bg: "#0D2B1F", text: "#34D399", label: "Strong" },
  good: { bg: "#0D1F2B", text: "#60A5FA", label: "Good" },
  "needs-attention": { bg: "#2B1F0D", text: "#FBBF24", label: "Needs Attention" },
  "at-risk": { bg: "#2B0D0D", text: "#F87171", label: "At Risk" },
};

export default function Home() {
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<RelationshipBrief | null>(null);
  const [error, setError] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [copied, setCopied] = useState(false);

  async function analyze(name?: string) {
    const query = name || contact.trim();
    if (!query || loading) return;
    setContact(query);
    setLoading(true);
    setBrief(null);
    setError("");
    setShowDraft(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: query }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value);
      }
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setBrief(parsed);
    } catch (err) {
      setError("Could not analyze this contact. Make sure emails are loaded and try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyDraft() {
    if (brief?.draftResponse) {
      navigator.clipboard.writeText(brief.draftResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const health = brief ? healthColors[brief.relationshipHealth] || healthColors.good : null;

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#E0E0F0", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid #151525", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "16px" }}>⚡</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.3px" }}>Relationship Agent</div>
          <div style={{ fontSize: "11px", color: "#555570" }}>Powered by your email history</div>
        </div>
        {brief && (
          <button onClick={() => { setBrief(null); setContact(""); }} style={{ marginLeft: "auto", fontSize: "12px", color: "#555570", background: "none", border: "1px solid #1E1E2E", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>
            ← New Contact
          </button>
        )}
      </header>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
        {!brief && !loading && (
          <>
            <div style={{ marginBottom: "40px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6366F1", marginBottom: "12px" }}>Relationship Intelligence</div>
              <h1 style={{ fontSize: "32px", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-1px", marginBottom: "12px" }}>
                Who do you need to<br /><span style={{ color: "#6366F1" }}>catch up with?</span>
              </h1>
              <p style={{ fontSize: "14px", color: "#888899", lineHeight: 1.6 }}>
                Enter a contact name and the agent will analyze your full communication history — surfacing key topics, commitments, follow-ups, a ready-to-send response, and suggested meeting times.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "32px" }}>
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                onKeyDown={e => e.key === "Enter" && analyze()}
                placeholder="Enter a contact name (e.g. John Smith)"
                style={{ flex: 1, padding: "14px 18px", background: "#0F0F1A", border: "1px solid #1E1E2E", borderRadius: "12px", fontSize: "14px", color: "#E0E0F0", outline: "none" }}
                onFocus={e => e.currentTarget.style.borderColor = "#6366F1"}
                onBlur={e => e.currentTarget.style.borderColor = "#1E1E2E"}
                autoFocus
              />
              <button onClick={() => analyze()} disabled={!contact.trim()} style={{ padding: "14px 24px", background: contact.trim() ? "#6366F1" : "#1E1E2E", border: "none", borderRadius: "12px", color: contact.trim() ? "white" : "#444455", fontSize: "14px", fontWeight: 600, cursor: contact.trim() ? "pointer" : "not-allowed" }}>
                Analyze →
              </button>
            </div>
            <div style={{ marginBottom: "32px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#444455", marginBottom: "14px" }}>What the agent delivers</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { icon: "📋", title: "Relationship Summary", desc: "Full context of your history with this person" },
                  { icon: "✅", title: "Commitments & Follow-ups", desc: "What was promised, by whom, and status" },
                  { icon: "🎯", title: "Recommended Next Action", desc: "One clear thing to do right now" },
                  { icon: "✉️", title: "Draft Response", desc: "Ready-to-send email addressing open items" },
                  { icon: "📅", title: "Meeting Suggestion", desc: "Proposed times and agenda based on context" },
                  { icon: "❤️", title: "Relationship Health", desc: "At-a-glance status of the relationship" },
                ].map(item => (
                  <div key={item.title} style={{ padding: "16px", background: "#0F0F1A", border: "1px solid #151525", borderRadius: "10px" }}>
                    <div style={{ fontSize: "20px", marginBottom: "8px" }}>{item.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#C0C0E0", marginBottom: "4px" }}>{item.title}</div>
                    <div style={{ fontSize: "12px", color: "#666677" }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>⚡</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#C0C0E0", marginBottom: "8px" }}>Analyzing relationship with {contact}...</div>
            <div style={{ fontSize: "13px", color: "#555570" }}>Searching email history, identifying patterns, generating brief</div>
          </div>
        )}

        {error && (
          <div style={{ padding: "16px", background: "#2B0D0D", border: "1px solid #4B1A1A", borderRadius: "10px", color: "#F87171", fontSize: "14px" }}>{error}</div>
        )}

        {brief && health && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "24px", background: "#0F0F1A", border: "1px solid #1E1E2E", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#555570", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Relationship Brief</div>
                <div style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>{brief.contactName}</div>
                <div style={{ fontSize: "12px", color: "#666677", marginTop: "4px" }}>Last contact: {brief.lastContactEstimate}</div>
              </div>
              <div style={{ padding: "8px 16px", background: health.bg, borderRadius: "20px", border: `1px solid ${health.text}30` }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: health.text }}>● {health.label}</div>
              </div>
            </div>

            <div style={{ padding: "20px", background: "#0F0F1A", border: "1px solid #1E1E2E", borderRadius: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6366F1", marginBottom: "10px" }}>Relationship Summary</div>
              <div style={{ fontSize: "14px", color: "#C0C0E0", lineHeight: 1.7 }}>{brief.relationshipSummary}</div>
              {brief.keyTopics.length > 0 && (
                <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {brief.keyTopics.map(topic => (
                    <span key={topic} style={{ padding: "4px 10px", background: "#1A1A2E", border: "1px solid #2A2A3E", borderRadius: "20px", fontSize: "12px", color: "#9999BB" }}>{topic}</span>
                  ))}
                </div>
              )}
            </div>

            {brief.commitments.length > 0 && (
              <div style={{ padding: "20px", background: "#0F0F1A", border: "1px solid #1E1E2E", borderRadius: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6366F1", marginBottom: "12px" }}>Commitments</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {brief.commitments.map((c, i) => {
                    const statusColor = c.status === "done" ? "#34D399" : c.status === "pending" ? "#FBBF24" : "#9999BB";
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 12px", background: "#0A0A14", borderRadius: "8px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", background: `${statusColor}20`, color: statusColor, borderRadius: "10px", whiteSpace: "nowrap", marginTop: "1px" }}>{c.status}</span>
                        <span style={{ fontSize: "13px", color: "#C0C0E0" }}><strong style={{ color: "#E0E0F0" }}>{c.who}:</strong> {c.what}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {brief.followUps.length > 0 && (
              <div style={{ padding: "20px", background: "#0F0F1A", border: "1px solid #1E1E2E", borderRadius: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6366F1", marginBottom: "12px" }}>Follow-ups Needed</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {brief.followUps.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ color: "#6366F1", fontSize: "14px", marginTop: "1px" }}>→</span>
                      <span style={{ fontSize: "13px", color: "#C0C0E0", lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: "20px", background: "#0D0D2B", border: "1px solid #6366F130", borderRadius: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6366F1", marginBottom: "10px" }}>🎯 Recommended Next Action</div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#E0E0F0", lineHeight: 1.5 }}>{brief.recommendedNextAction}</div>
            </div>

            {brief.meetingSuggestion && (
              <div style={{ padding: "20px", background: "#0A1A0A", border: "1px solid #1A3A1A", borderRadius: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#34D399", marginBottom: "14px" }}>📅 Suggested Meeting</div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                  <span style={{ padding: "5px 12px", background: "#0D2B1F", border: "1px solid #34D39930", borderRadius: "20px", fontSize: "12px", color: "#34D399" }}>{brief.meetingSuggestion.format}</span>
                  <span style={{ padding: "5px 12px", background: "#0D2B1F", border: "1px solid #34D39930", borderRadius: "20px", fontSize: "12px", color: "#34D399" }}>{brief.meetingSuggestion.timing}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#888899", marginBottom: "12px", fontStyle: "italic" }}>{brief.meetingSuggestion.rationale}</div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#555570", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Agenda</div>
                <div style={{ fontSize: "13px", color: "#C0C0E0", marginBottom: "14px", lineHeight: 1.6 }}>{brief.meetingSuggestion.agenda}</div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#555570", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Available Slots</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {brief.meetingSuggestion.suggestedSlots.map((slot, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: "#0A0A14", borderRadius: "8px", fontSize: "13px", color: "#C0C0E0", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#34D399" }}>◆</span> {slot}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: "20px", background: "#0F0F1A", border: "1px solid #1E1E2E", borderRadius: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6366F1" }}>✉️ Draft Response</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setShowDraft(!showDraft)} style={{ fontSize: "12px", padding: "5px 12px", background: "#1A1A2E", border: "1px solid #2A2A3E", borderRadius: "6px", color: "#9999BB", cursor: "pointer" }}>
                    {showDraft ? "Hide" : "Show draft"}
                  </button>
                  {showDraft && (
                    <button onClick={copyDraft} style={{ fontSize: "12px", padding: "5px 12px", background: copied ? "#0D2B1F" : "#6366F1", border: "none", borderRadius: "6px", color: copied ? "#34D399" : "white", cursor: "pointer" }}>
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
              {showDraft && (
                <div style={{ padding: "16px", background: "#0A0A14", borderRadius: "8px", fontSize: "13px", color: "#C0C0E0", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                  {brief.draftResponse}
                </div>
              )}
              {!showDraft && (
                <div style={{ fontSize: "13px", color: "#555570" }}>A ready-to-send email has been drafted addressing the most important outstanding item.</div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setBrief(null); setContact(""); }} style={{ flex: 1, padding: "13px", background: "#0F0F1A", border: "1px solid #1E1E2E", borderRadius: "10px", color: "#9999BB", fontSize: "14px", cursor: "pointer" }}>
                ← Analyze Another Contact
              </button>
              <button onClick={copyDraft} style={{ flex: 1, padding: "13px", background: "#6366F1", border: "none", borderRadius: "10px", color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                {copied ? "✓ Draft Copied!" : "Copy Draft Response"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #2A2A3E; border-radius: 2px; }`}</style>
    </div>
  );
}