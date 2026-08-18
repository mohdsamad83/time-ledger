"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Settings, X, GripHorizontal, Maximize2, Minimize2 } from "lucide-react";

type Phase = "stopped" | "working" | "break" | "alarm-break" | "alarm-work";

interface ReminderSettings {
  workDuration: string;
  breakDuration: string;
  alarmDuration: string;
}

export default function BreakReminder({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ReminderSettings>({
    workDuration: "25",
    breakDuration: "5",
    alarmDuration: "15",
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState<Phase>("stopped");
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const alarmRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem("break-reminder-settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem("break-reminder-settings", JSON.stringify(settings));
  }, [settings]);

  // Audio helper
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playBeep = useCallback((freq: number, durationMs: number) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    
    osc.type = "sine";
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime); // keep volume reasonable
    
    osc.start(audioCtxRef.current.currentTime);
    osc.stop(audioCtxRef.current.currentTime + durationMs / 1000);
  }, []);

  const clearAlarms = useCallback(() => {
    if (alarmRef.current) {
      clearInterval(alarmRef.current);
      alarmRef.current = null;
    }
  }, []);

  const triggerAlarm = useCallback((isBreak: boolean) => {
    clearAlarms();
    const alarmSecs = parseInt(settings.alarmDuration) || 15;
    const endTime = Date.now() + alarmSecs * 1000;
    
    setPhase(isBreak ? "alarm-break" : "alarm-work");
    
    const intervalMs = isBreak ? 1000 : 500; // 500ms tone + 500ms pause vs 300ms + 200ms
    
    const tickAlarm = () => {
      if (Date.now() > endTime) {
        clearAlarms();
        // Move to next phase
        if (isBreak) {
          setPhase("break");
          setTimeLeft((parseFloat(settings.breakDuration) || 5) * 60);
        } else {
          setPhase("working");
          setTimeLeft((parseFloat(settings.workDuration) || 25) * 60);
        }
        return;
      }
      
      if (isBreak) {
        playBeep(1000, 500);
      } else {
        playBeep(1500, 300);
      }
    };
    
    tickAlarm();
    alarmRef.current = setInterval(tickAlarm, intervalMs);
  }, [settings, clearAlarms, playBeep]);

  // Main timer loop
  useEffect(() => {
    if (phase === "stopped" || phase.startsWith("alarm")) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (phase === "working") {
            triggerAlarm(true); // transition to break
          } else if (phase === "break") {
            triggerAlarm(false); // transition to work
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, triggerAlarm]);

  // Clean up alarms on unmount
  useEffect(() => {
    return clearAlarms;
  }, [clearAlarms]);

  const toggleTimer = () => {
    initAudio();
    if (phase !== "stopped") {
      setPhase("stopped");
      clearAlarms();
      setTimeLeft(0);
    } else {
      setPhase("working");
      setTimeLeft((parseFloat(settings.workDuration) || 25) * 60);
    }
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initX + dx,
      y: dragRef.current.initY + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    switch (phase) {
      case "working": return "Status: Working";
      case "break": return "Status: Break";
      case "alarm-break": return "Status: Break Time! (Alarm)";
      case "alarm-work": return "Status: Back to Work! (Alarm)";
      default: return "Status: Stopped";
    }
  };

  return (
    <div
      className="fixed z-50 shadow-2xl overflow-hidden touch-none select-none"
      style={{
        left: position.x,
        bottom: position.y,
        width: 280,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        transition: dragRef.current ? "none" : "width 0.2s, height 0.2s",
      }}
    >
      {/* Header / Drag Handle */}
      <div 
        className="flex items-center justify-between px-3 py-2 cursor-move"
        style={{ background: "var(--s2)", borderBottom: "1px solid var(--border)" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} style={{ color: "var(--faint)" }} />
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--muted)" }}>
            Break Reminder
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <button onClick={() => setShowSettings(!showSettings)} className="p-1 rounded hover:bg-white/10" style={{ color: "var(--faint)" }}>
              <Settings size={14} />
            </button>
          )}
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 rounded hover:bg-white/10" style={{ color: "var(--faint)" }}>
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--faint)" }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-4">
          
          {showSettings && (
            <div className="p-3 rounded-lg space-y-2 mb-4 text-sm" style={{ background: "var(--s2)", border: "1px solid var(--border)" }}>
              <p className="font-bold text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Settings</p>
              <div className="flex justify-between items-center">
                <label style={{ color: "var(--text)" }}>Alarm Duration (sec):</label>
                <input 
                  type="number" 
                  value={settings.alarmDuration}
                  onChange={(e) => setSettings({...settings, alarmDuration: e.target.value})}
                  className="w-16 text-center px-1 py-0.5 rounded text-sm"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  disabled={phase !== "stopped"}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label style={{ color: "var(--text)" }} className="text-sm">Work Duration (m):</label>
              <input 
                type="number" 
                value={settings.workDuration}
                onChange={(e) => setSettings({...settings, workDuration: e.target.value})}
                className="w-16 text-center px-2 py-1 rounded text-sm font-mono"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                disabled={phase !== "stopped"}
              />
            </div>
            <div className="flex justify-between items-center">
              <label style={{ color: "var(--text)" }} className="text-sm">Break Duration (m):</label>
              <input 
                type="number" 
                value={settings.breakDuration}
                onChange={(e) => setSettings({...settings, breakDuration: e.target.value})}
                className="w-16 text-center px-2 py-1 rounded text-sm font-mono"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                disabled={phase !== "stopped"}
              />
            </div>
          </div>

          <div className="text-center py-2">
            <p className="text-4xl font-bold font-mono tracking-wider" style={{ color: phase === "stopped" ? "var(--faint)" : "var(--text)" }}>
              {phase === "stopped" ? "00:00" : formatTime(timeLeft)}
            </p>
          </div>

          <button 
            onClick={toggleTimer}
            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all ${phase !== "stopped" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"}`}
          >
            {phase !== "stopped" ? "Stop" : "Start"}
          </button>

          <p className="text-xs text-center font-medium" style={{ color: "var(--faint)" }}>
            {getStatusText()}
          </p>
        </div>
      )}
      
      {isMinimized && (
        <div className="p-2 flex items-center justify-between">
          <p className="text-lg font-bold font-mono tracking-wider" style={{ color: phase === "stopped" ? "var(--faint)" : "var(--text)" }}>
            {phase === "stopped" ? "00:00" : formatTime(timeLeft)}
          </p>
          <button 
            onClick={toggleTimer}
            className="px-3 py-1 rounded text-xs font-bold transition-all"
            style={{ 
              background: phase !== "stopped" ? "#4a0d0d" : "#063e2b", 
              color: phase !== "stopped" ? "#F87171" : "#34D399",
              border: `1px solid ${phase !== "stopped" ? "#F87171" : "#34D399"}`
            }}
          >
            {phase !== "stopped" ? "Stop" : "Start"}
          </button>
        </div>
      )}
    </div>
  );
}
