import { useState, useRef, useEffect } from "react";

const MODES = {
  deep: {
    label: "Deep Research", icon: "🔬",
    system: `You are ResearchMind AI, an expert research assistant. When answering:
1. Start with a bold title for the topic.
2. Provide 5–10 clear numbered points explaining it simply. If asked for more, keep previous and add more.
3. Key Insights section with 3–5 bullet points.
4. Share 2–3 Interesting Facts that are surprising.
5. End with Future Impact — what this means going forward.
Use **bold** for key terms. Keep language accessible but authoritative.`
  },
  market: {
    label: "Market Analysis", icon: "📈",
    system: `You are ResearchMind AI for market analysis. For any topic:
1. Market overview in 5–8 clear points.
2. Key market drivers and trends.
3. Risk factors and opportunities.
4. Interesting market statistics.
5. Future outlook for investors.
Be data-informed and practical. Bold key numbers.`
  },
  summary: {
    label: "Summarize & Simplify", icon: "📋",
    system: `You are ResearchMind AI. Make complex topics simple:
1. Plain-language explanation in 5–8 simple points (like explaining to a curious teenager).
2. Use everyday analogies.
3. Key takeaways in bullets.
4. One surprising fact.
5. Why it matters in real life.
Avoid jargon. Be warm, clear, and engaging.`
  },
  compare: {
    label: "Compare & Contrast", icon: "⚖️",
    system: `You are ResearchMind AI for comparisons:
1. Brief intro to both subjects.
2. Side-by-side across 5–8 key dimensions.
3. Strengths and weaknesses of each.
4. Which is better for what context.
5. Interesting fact about the comparison.
6. Clear verdict and recommendation.`
  },
  facts: {
    label: "Facts & Insights", icon: "💡",
    system: `You are ResearchMind AI for fascinating insights:
1. Start with the most surprising insight.
2. Give 8–10 fascinating well-researched facts.
3. Explain why each matters.
4. Reveal a common misconception.
5. Most important implication for the future.
Make it engaging and memorable.`
  },
  invest: {
    label: "Investment Research", icon: "💰",
    system: `You are ResearchMind AI for investment research:
1. Investment overview in 5–8 points.
2. Key financial metrics to watch.
3. Risk assessment (Low/Medium/High with explanation).
4. Historical performance context.
5. Interesting market fact.
6. Outlook for 1-year, 3-year, 5-year horizon.
Note this is research, not financial advice.`
  }
};

const CHIPS = [
  "Analyze AI's impact on healthcare in 2025",
  "Compare stocks: NVIDIA vs AMD",
  "Explain blockchain in simple terms",
  "Key investment trends for next 5 years",
  "Interesting facts about the stock market",
  "What causes inflation and how to protect wealth"
];

function formatContent(text) {
  const lines = text.split("\n");
  const elements = [];
  let key = 0;
  let ulBuffer = [];

  const flushUl = () => {
    if (ulBuffer.length) {
      elements.push(
        <ul key={key++} style={{ paddingLeft: "1.25rem", color: "#9CA3AF", margin: "0.5rem 0" }}>
          {ulBuffer.map((li, i) => <li key={i} style={{ marginBottom: "0.3rem", lineHeight: 1.65 }}>{li}</li>)}
        </ul>
      );
      ulBuffer = [];
    }
  };

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flushUl(); elements.push(<br key={key++} />); continue; }

    if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      flushUl();
      const txt = trimmed.replace(/^#{2,3} /, "");
      elements.push(<h3 key={key++} style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", color: "#D4A853", margin: "1rem 0 0.4rem", fontWeight: 600 }}>{txt}</h3>);
    } else if (/^[\-\*\•] /.test(trimmed)) {
      const content = trimmed.replace(/^[\-\*\•] /, "");
      ulBuffer.push(boldify(content));
    } else if (/^\d+\. /.test(trimmed)) {
      flushUl();
      const content = trimmed.replace(/^\d+\. /, "");
      const num = trimmed.match(/^(\d+)/)[1];
      elements.push(
        <div key={key++} style={{ display: "flex", gap: "10px", margin: "0.4rem 0" }}>
          <span style={{ minWidth: "22px", height: "22px", borderRadius: "50%", background: "rgba(212,168,83,0.15)", color: "#D4A853", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>{num}</span>
          <span style={{ fontSize: "14px", color: "#D1D5DB", lineHeight: 1.65 }}>{boldify(content)}</span>
        </div>
      );
    } else {
      flushUl();
      elements.push(<p key={key++} style={{ fontSize: "14px", color: "#9CA3AF", lineHeight: 1.7, margin: "0.3rem 0" }}>{boldify(trimmed)}</p>);
    }
  }
  flushUl();
  return elements;
}

function boldify(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: "#E5E7EB", fontWeight: 500 }}>{p}</strong> : p);
}

export default function ResearchMindAI() {
  const [mode, setMode] = useState("deep");
  const [messages, setMessages] = useState([]);
  const [history, setConvHistory] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async (query) => {
    const q = (query || input).trim();
    if (!q || loading) return;
    setInput("");
    setError("");

    const userMsg = { role: "user", content: q };
    const newHistory = [...history, userMsg];
    setConvHistory(newHistory);
    setMessages(prev => [...prev, { role: "user", text: q }]);
    if (!queryHistory.includes(q)) setQueryHistory(prev => [q, ...prev].slice(0, 6));
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: MODES[mode].system,
          messages: newHistory
        })
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error?.message || "API error " + res.status);
      }
      const data = await res.json();
      const reply = data.content.map(b => b.text || "").join("");
      setConvHistory(prev => [...prev, { role: "assistant", content: reply }]);
      setMessages(prev => [...prev, { role: "ai", text: reply, mode }]);
    } catch (err) {
      setError("⚠ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([]); setConvHistory([]); setError("");
  };

  const s = {
    wrap: { fontFamily: "'DM Sans', sans-serif", background: "#0A0E1A", color: "#F0EDE8", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
    header: { background: "rgba(10,14,26,0.92)", backdropFilter: "blur(16px)", borderBottom: "0.5px solid rgba(255,255,255,0.08)", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px", flexShrink: 0, position: "sticky", top: 0, zIndex: 10 },
    logo: { display: "flex", alignItems: "center", gap: "9px" },
    logoMark: { width: "30px", height: "30px", borderRadius: "7px", background: "linear-gradient(135deg, #D4A853, #B8860B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" },
    logoText: { fontFamily: "'Playfair Display', serif", fontSize: "17px", fontWeight: 600 },
    modeBadge: { fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: "rgba(212,168,83,0.15)", border: "0.5px solid rgba(212,168,83,0.3)", color: "#D4A853", fontWeight: 500 },
    clearBtn: { fontSize: "12px", padding: "5px 12px", borderRadius: "6px", background: "transparent", border: "0.5px solid rgba(255,255,255,0.14)", color: "#9CA3AF", cursor: "pointer", fontFamily: "inherit" },
    body: { display: "flex", flex: 1, overflow: "hidden" },
    sidebar: { width: "240px", background: "#111827", borderRight: "0.5px solid rgba(255,255,255,0.08)", padding: "1.25rem 0.875rem", display: "flex", flexDirection: "column", gap: "1.25rem", flexShrink: 0, overflowY: "auto" },
    sideLabel: { fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", fontWeight: 500, marginBottom: "0.4rem", padding: "0 0.4rem" },
    modeBtn: (active) => ({ display: "flex", alignItems: "center", gap: "9px", padding: "7px 9px", borderRadius: "7px", cursor: "pointer", border: active ? "0.5px solid rgba(212,168,83,0.25)" : "0.5px solid transparent", background: active ? "rgba(212,168,83,0.12)" : "transparent", color: active ? "#D4A853" : "#9CA3AF", fontSize: "13px", fontFamily: "inherit", width: "100%", textAlign: "left", transition: "all 0.15s" }),
    modeIcon: { width: "26px", height: "26px", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", background: "rgba(255,255,255,0.05)", flexShrink: 0 },
    histItem: { padding: "6px 9px", borderRadius: "5px", fontSize: "11px", color: "#6B7280", cursor: "pointer", background: "transparent", border: "none", textAlign: "left", fontFamily: "inherit", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    statusBar: { marginTop: "auto", padding: "9px 10px", borderRadius: "7px", background: "#1a2234", border: "0.5px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "7px" },
    dot: { width: "7px", height: "7px", borderRadius: "50%", background: loading ? "#FBBF24" : error ? "#F87171" : "#34D399", flexShrink: 0 },
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    hero: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" },
    heroOrb: { width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(212,168,83,0.25), rgba(45,212,191,0.15))", border: "0.5px solid rgba(212,168,83,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", marginBottom: "1.25rem" },
    heroH1: { fontFamily: "'Playfair Display', serif", fontSize: "30px", fontWeight: 600, lineHeight: 1.2, marginBottom: "0.6rem" },
    heroP: { fontSize: "14px", color: "#9CA3AF", maxWidth: "440px", lineHeight: 1.7, marginBottom: "1.75rem" },
    chips: { display: "flex", flexWrap: "wrap", gap: "7px", justifyContent: "center", maxWidth: "580px" },
    chip: { padding: "7px 14px", borderRadius: "20px", fontSize: "12px", background: "#111827", border: "0.5px solid rgba(255,255,255,0.14)", color: "#9CA3AF", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" },
    chatArea: { flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" },
    msgRow: (role) => ({ display: "flex", gap: "10px", alignItems: "flex-start", flexDirection: role === "user" ? "row-reverse" : "row" }),
    avatar: (role) => ({ width: "30px", height: "30px", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0, marginTop: "2px", background: role === "ai" ? "linear-gradient(135deg, #D4A853, #B8860B)" : "#1a2234", border: role === "user" ? "0.5px solid rgba(255,255,255,0.14)" : "none" }),
    bubble: (role) => ({ maxWidth: "72%", padding: "0.875rem 1.1rem", borderRadius: "11px", fontSize: "14px", lineHeight: 1.75, background: role === "ai" ? "#111827" : "rgba(212,168,83,0.1)", border: `0.5px solid ${role === "ai" ? "rgba(255,255,255,0.1)" : "rgba(212,168,83,0.22)"}`, borderTopLeftRadius: role === "ai" ? "3px" : "11px", borderTopRightRadius: role === "user" ? "3px" : "11px" }),
    modeTag: { display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#6B7280", marginBottom: "0.5rem", padding: "2px 7px", background: "#1a2234", borderRadius: "4px" },
    typingDot: (delay) => ({ width: "6px", height: "6px", borderRadius: "50%", background: "#D4A853", animation: `bounce 1.2s ${delay}s infinite`, display: "inline-block" }),
    inputArea: { padding: "0.875rem 1.5rem 1.25rem", background: "#0A0E1A", borderTop: "0.5px solid rgba(255,255,255,0.08)", flexShrink: 0 },
    inputWrap: { display: "flex", gap: "9px", alignItems: "flex-end", background: "#111827", border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: "11px", padding: "9px 11px" },
    textarea: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#F0EDE8", fontFamily: "inherit", fontSize: "14px", lineHeight: 1.5, resize: "none", maxHeight: "110px", minHeight: "22px", overflow: "auto" },
    sendBtn: { width: "34px", height: "34px", borderRadius: "7px", background: loading ? "rgba(212,168,83,0.4)" : "linear-gradient(135deg, #D4A853, #B8860B)", border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0, color: "#0A0E1A", fontWeight: 700 },
    inputMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", padding: "0 2px" },
    errorBox: { marginTop: "7px", padding: "8px 12px", borderRadius: "7px", background: "rgba(248,113,113,0.08)", border: "0.5px solid rgba(248,113,113,0.2)", fontSize: "13px", color: "#F87171" }
  };

  const showHero = messages.length === 0 && !loading;

  return (
    <div style={s.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        button:hover { opacity: 0.85; }
      `}</style>

      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoMark}>🔬</div>
          <span style={s.logoText}>Research<span style={{ color: "#D4A853" }}>Mind</span> AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={s.modeBadge}>{MODES[mode].icon} {MODES[mode].label}</span>
          <button style={s.clearBtn} onClick={clearChat}>Clear chat</button>
        </div>
      </header>

      <div style={s.body}>
        <aside style={s.sidebar}>
          <div>
            <div style={s.sideLabel}>Research Modes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {Object.entries(MODES).map(([k, v]) => (
                <button key={k} style={s.modeBtn(mode === k)} onClick={() => setMode(k)}>
                  <span style={s.modeIcon}>{v.icon}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {queryHistory.length > 0 && (
            <div>
              <div style={s.sideLabel}>Recent</div>
              {queryHistory.map((q, i) => (
                <button key={i} style={s.histItem} onClick={() => sendMessage(q)} title={q}>
                  {q.length > 30 ? q.slice(0, 30) + "…" : q}
                </button>
              ))}
            </div>
          )}

          <div style={s.statusBar}>
            <div style={s.dot} />
            <span style={{ fontSize: "11px", color: "#6B7280" }}>
              {loading ? "Researching…" : error ? "Error occurred" : "AI engine ready"}
            </span>
          </div>
        </aside>

        <div style={s.main}>
          {showHero ? (
            <div style={s.hero}>
              <div style={s.heroOrb}>🔬</div>
              <h1 style={s.heroH1}>Your <em style={{ color: "#D4A853", fontStyle: "italic" }}>intelligent</em><br />research companion</h1>
              <p style={s.heroP}>Ask anything — market trends, deep dives, investment analysis, comparisons, or plain-language summaries. Powered by Claude AI.</p>
              <div style={s.chips}>
                {CHIPS.map((c, i) => (
                  <button key={i} style={s.chip} onClick={() => sendMessage(c)}>{c}</button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={chatRef} style={s.chatArea}>
              {messages.map((msg, i) => (
                <div key={i} style={s.msgRow(msg.role)}>
                  <div style={s.avatar(msg.role)}>{msg.role === "ai" ? "🔬" : "👤"}</div>
                  <div style={s.bubble(msg.role)}>
                    {msg.role === "ai" && (
                      <div style={s.modeTag}>{MODES[msg.mode]?.icon} {MODES[msg.mode]?.label}</div>
                    )}
                    {msg.role === "ai" ? formatContent(msg.text) : <span style={{ color: "#E5E7EB" }}>{msg.text}</span>}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={s.msgRow("ai")}>
                  <div style={s.avatar("ai")}>🔬</div>
                  <div style={{ ...s.bubble("ai"), padding: "0.875rem 1.1rem" }}>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <div style={s.typingDot(0)} />
                      <div style={s.typingDot(0.2)} />
                      <div style={s.typingDot(0.4)} />
                      <span style={{ fontSize: "12px", color: "#6B7280", marginLeft: "6px" }}>Researching…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={s.inputArea}>
            <div style={s.inputWrap}>
              <textarea
                ref={inputRef}
                style={s.textarea}
                placeholder="Ask me anything to research..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
              <button style={s.sendBtn} onClick={() => sendMessage()} disabled={loading}>➤</button>
            </div>
            <div style={s.inputMeta}>
              <span style={{ fontSize: "11px", color: "#6B7280" }}>Enter to send · Shift+Enter for new line</span>
              <span style={{ fontSize: "11px", color: "#D4A853", background: "rgba(212,168,83,0.1)", padding: "2px 8px", borderRadius: "10px", border: "0.5px solid rgba(212,168,83,0.2)" }}>
                {MODES[mode].icon} {MODES[mode].label}
              </span>
            </div>
            {error && <div style={s.errorBox}>{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
