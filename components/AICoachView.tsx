"use client";

import React, { useState } from "react";
import { AppData } from "@/lib/types";
import { Send, Bot, Zap, Loader2, Sparkles, ShieldCheck, Target, Lock, Brain } from "lucide-react";
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
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");

  const AI_MODELS = [
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano" },
  ];

  const buildSystemContext = () => {
    // Inject user data into the system prompt
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const activeChallenge = data.challenges?.find(c => c.status === "active");
    const todayData = data.days[todayStr] || { targets: {} };
    
    let context = `You are an elite, highly-demanding time management coach. You are ruthless about consistency and execution.\n\n`;
    context += `CRITICAL INSTRUCTIONS:\n`;
    context += `1. DO NOT hallucinate or make up any data. Base your answers strictly and exclusively on the user data provided below.\n`;
    context += `2. Guide the user in the right direction based on their actual performance.\n`;
    context += `3. Privacy is paramount. You are a private local coach. Be concise, actionable, and do not use generic platitudes.\n\n`;
    
    context += `USER'S CURRENT CONTEXT:\n`;
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
          prompt: "Analyze my performance for today based on the targets I hit and missed. Give me a brutally honest daily debrief and one specific adjustment I need to make for tomorrow. Do not hallucinate any targets that are not in my context.",
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
    <div className="max-w-[1400px] mx-auto px-4 py-6 pb-24 h-[100vh] flex flex-col fade-in">
      <div className="flex items-center justify-between mb-8">
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
            className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Features */}
        <div className="hidden lg:flex flex-col gap-6 col-span-3 overflow-y-auto">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>What You Get</h3>
          
          <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Zap size={18} className="text-yellow-500 mb-3" />
            <h4 className="font-bold text-sm mb-2">Brutal Honesty</h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--faint)" }}>
              The AI will not sugarcoat your performance. If you miss your targets, expect to be held accountable.
            </p>
          </div>

          <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Target size={18} className="text-blue-500 mb-3" />
            <h4 className="font-bold text-sm mb-2">Actionable Adjustments</h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--faint)" }}>
              Get specific, actionable advice on how to tweak your routine for tomorrow based on what failed today.
            </p>
          </div>

          <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Brain size={18} className="text-purple-500 mb-3" />
            <h4 className="font-bold text-sm mb-2">No Hallucinations</h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--faint)" }}>
              Strictly grounded in your actual data. The AI knows exactly what your challenges and goals are, and nothing else.
            </p>
          </div>
        </div>

        {/* MIDDLE COLUMN: Chat */}
        <div className="col-span-1 lg:col-span-6 flex flex-col rounded-2xl border shadow-xl overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
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

        {/* RIGHT COLUMN: Privacy & Context */}
        <div className="hidden lg:flex flex-col gap-6 col-span-3 overflow-y-auto">
          <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--muted)" }}>
            <ShieldCheck size={14} className="text-emerald-500" />
            Privacy & Context
          </h3>
          
          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <h4 className="font-bold text-sm mb-2 text-emerald-500 flex items-center gap-2">
              <Lock size={14} /> 100% Private
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--faint)" }}>
              Your data never leaves your browser until you hit send. The AI only sees the specific context provided below for this single session.
            </p>
          </div>

          <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h4 className="font-bold text-sm mb-4">Current Context Loaded</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Date</p>
                <p className="text-xs font-mono">{format(new Date(), "yyyy-MM-dd")}</p>
              </div>
              
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Active Challenge</p>
                <p className="text-xs">
                  {data.challenges?.find(c => c.status === "active")?.name || "None"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Mapped Targets</p>
                <p className="text-xs">
                  {data.targets && data.targets.length > 0 ? `${data.targets.length} targets loaded` : "None"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Targets Hit Today</p>
                <p className="text-xs">
                  {Object.entries(data.days[format(new Date(), "yyyy-MM-dd")]?.targets || {}).filter(([_, v]) => v).length} completed
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
