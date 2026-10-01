"use client";

import React, { useState } from "react";
import { AppData } from "@/lib/types";
import { Send, Bot, Zap, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface Props {
  data: AppData;
}

export default function AICoachView({ data }: Props) {
  const [messages, setMessages] = useState<{role: "user" | "assistant", content: string}[]>([
    { role: "assistant", content: "I am your Time Management AI. I have access to your current challenges, targets, and daily progress. How can I push you to be better today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("google/gemini-1.5-flash");

  const AI_MODELS = [
    { id: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { id: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" }
  ];

  const buildSystemContext = () => {
    // Inject user data into the system prompt
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const activeChallenge = data.challenges?.find(c => c.status === "active");
    const todayData = data.days[todayStr] || { targets: {} };
    
    let context = `You are an elite, highly-demanding time management coach. You are ruthless about consistency and execution.\n\n`;
    context += `User's current state:\n`;
    context += `- Date: ${todayStr}\n`;
    
    if (activeChallenge) {
      context += `- Active Challenge: ${activeChallenge.name} (Duration: ${activeChallenge.durationDays} days)\n`;
      context += `- Challenge Goals: ${activeChallenge.goals.join(", ")}\n`;
    } else {
      context += `- No active challenges currently.\n`;
    }

    if (data.targets && data.targets.length > 0) {
      context += `- Mapped Targets for Today: ${data.targets.join(", ")}\n`;
    }
    
    const hits = Object.entries(todayData.targets || {}).filter(([_, v]) => v).map(([k]) => k);
    context += `- Targets Hit Today: ${hits.length > 0 ? hits.join(", ") : "None yet"}\n\n`;

    context += `Be concise, actionable, and do not use generic platitudes. Use the user's actual data in your responses.`;
    return context;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg,
          systemContext: buildSystemContext(),
          model: selectedModel
        })
      });

      const json = await res.json();
      if (json.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${json.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: json.result }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Failed to connect to AI: ${e.message}` }]);
    }
    setLoading(false);
  };

  const generateDebrief = async () => {
    setMessages(prev => [...prev, { role: "user", content: "Generate my Daily Debrief." }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Analyze my performance for today based on the targets I hit and missed. Give me a brutally honest daily debrief and one specific adjustment I need to make for tomorrow.",
          systemContext: buildSystemContext(),
          model: selectedModel
        })
      });

      const json = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: json.result || "Failed to generate." }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 h-[100vh] flex flex-col fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 primary-text">
            <Bot size={24} className="text-blue-500" />
            AI Coach
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--faint)" }}>
            Data-driven intelligence to optimize your execution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            {AI_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <button 
            onClick={generateDebrief}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}
          >
            <Sparkles size={14} />
            Daily Debrief
          </button>
        </div>
      </div>

      <div className="flex-1 rounded-2xl border overflow-hidden flex flex-col shadow-xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-blue-500" />
                </div>
              )}
              <div 
                className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" 
                    ? "bg-blue-600 text-white rounded-tr-sm" 
                    : "bg-black/5 dark:bg-white/5 rounded-tl-sm"
                }`}
                style={m.role === "assistant" ? { color: "var(--text)" } : {}}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
               <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-blue-500" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 rounded-tl-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span className="text-xs" style={{ color: "var(--faint)" }}>Analyzing data...</span>
                </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="relative">
            <input 
              type="text" 
              className="w-full pl-4 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              placeholder="Ask for advice, adjustments, or analysis..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-500 text-white disabled:opacity-50 transition-all hover:bg-blue-600"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
