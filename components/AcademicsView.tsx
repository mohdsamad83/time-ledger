"use client";

import React, { useState } from "react";
import { AppData, AcademicSubject, AcademicUnit, AcademicTask } from "@/lib/types";
import { Plus, Trash2, Edit3, Save, X, GraduationCap, CheckCircle2, Clock, Target, Check, Circle, GripVertical } from "lucide-react";

interface Props {
  data: AppData | null;
  onUpdate: (academics: AcademicSubject[]) => void;
}

const DEFAULT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#14b8a6", "#6366f1"];

export default function AcademicsView({ data, onUpdate }: Props) {
  const academics = data?.academics || [];

  const [editingSubject, setEditingSubject] = useState<AcademicSubject | null>(null);

  const handleSaveSubject = () => {
    if (!editingSubject || !editingSubject.name.trim()) return;
    
    const existing = academics.find(s => s.id === editingSubject.id);
    let next;
    if (existing) {
      next = academics.map(s => s.id === editingSubject.id ? editingSubject : s);
    } else {
      next = [...academics, editingSubject];
    }
    onUpdate(next);
    setEditingSubject(null);
  };

  const handleDeleteSubject = (id: string) => {
    if (!confirm("Are you sure you want to delete this subject? All progress will be lost.")) return;
    onUpdate(academics.filter(s => s.id !== id));
  };

  const handleAddUnit = (subjectId: string) => {
    const next = academics.map(s => {
      if (s.id !== subjectId) return s;
      const newUnit: AcademicUnit = {
        id: crypto.randomUUID(),
        title: `Week ${s.units.length + 1}`,
        lecturesTotal: 5,
        lecturesCompleted: 0,
        tasks: [
          { id: crypto.randomUUID(), name: "LS", completed: false },
          { id: crypto.randomUUID(), name: "PA", completed: false },
          { id: crypto.randomUUID(), name: "GA", completed: false }
        ]
      };
      return { ...s, units: [...s.units, newUnit] };
    });
    onUpdate(next);
  };

  const handleDeleteUnit = (subjectId: string, unitId: string) => {
    const next = academics.map(s => {
      if (s.id !== subjectId) return s;
      return { ...s, units: s.units.filter(u => u.id !== unitId) };
    });
    onUpdate(next);
  };

  const handleUpdateUnit = (subjectId: string, unitId: string, updates: Partial<AcademicUnit>) => {
    const next = academics.map(s => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        units: s.units.map(u => u.id === unitId ? { ...u, ...updates } : u)
      };
    });
    onUpdate(next);
  };

  const handleToggleTask = (subjectId: string, unitId: string, taskId: string) => {
    const next = academics.map(s => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        units: s.units.map(u => {
          if (u.id !== unitId) return u;
          return {
            ...u,
            tasks: u.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
          };
        })
      };
    });
    onUpdate(next);
  };

  const handleAddTask = (subjectId: string, unitId: string, taskName: string) => {
    if (!taskName.trim()) return;
    const next = academics.map(s => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        units: s.units.map(u => {
          if (u.id !== unitId) return u;
          return {
            ...u,
            tasks: [...u.tasks, { id: crypto.randomUUID(), name: taskName, completed: false }]
          };
        })
      };
    });
    onUpdate(next);
  };

  const handleDeleteTask = (subjectId: string, unitId: string, taskId: string) => {
    const next = academics.map(s => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        units: s.units.map(u => {
          if (u.id !== unitId) return u;
          return { ...u, tasks: u.tasks.filter(t => t.id !== taskId) };
        })
      };
    });
    onUpdate(next);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 pb-24 h-[100vh] flex flex-col fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 primary-text">
            <GraduationCap size={24} className="text-indigo-500" />
            Academic Progress
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--faint)" }}>
            Track subjects, lectures, and assignments precisely to hit your deadlines.
          </p>
        </div>
        <button 
          onClick={() => setEditingSubject({ id: crypto.randomUUID(), name: "", color: DEFAULT_COLORS[0], hoursPerTopic: 0.5, units: [] })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl shadow-2xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{academics.some(s => s.id === editingSubject.id) ? "Edit Subject" : "New Subject"}</h3>
              <button onClick={() => setEditingSubject(null)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Subject Name</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                  value={editingSubject.name}
                  onChange={e => setEditingSubject({...editingSubject, name: e.target.value})}
                  placeholder="e.g. Machine Learning"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Required Hours per Topic</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                  value={editingSubject.hoursPerTopic}
                  onChange={e => setEditingSubject({...editingSubject, hoursPerTopic: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Theme Color</label>
                <div className="flex gap-2">
                  {DEFAULT_COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => setEditingSubject({...editingSubject, color: c})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${editingSubject.color === c ? "scale-110 border-white" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setEditingSubject(null)} className="px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background: "var(--surface)" }}>Cancel</button>
              <button onClick={handleSaveSubject} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: "var(--primary)" }}>Save Subject</button>
            </div>
          </div>
        </div>
      )}

      {academics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-2xl" style={{ borderColor: "var(--border)" }}>
          <GraduationCap size={48} className="mb-4 opacity-20" />
          <h2 className="text-lg font-bold mb-2">No subjects yet</h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--faint)" }}>
            Create your first subject to start tracking your lectures, assignments, and overall preparation status.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
          {academics.map(subject => {
            const totalLectures = subject.units.reduce((acc, u) => acc + (u.lecturesTotal || 0), 0);
            const completedLectures = subject.units.reduce((acc, u) => acc + (u.lecturesCompleted || 0), 0);
            const progress = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;
            const remaining = totalLectures - completedLectures;
            const requiredHours = remaining * subject.hoursPerTopic;

            return (
              <div key={subject.id} className="rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                {/* Subject Header */}
                <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b relative" style={{ borderColor: "var(--border)" }}>
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundColor: subject.color }} />
                  
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-inner" style={{ backgroundColor: subject.color }}>
                      {subject.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        {subject.name}
                        <button onClick={() => setEditingSubject(subject)} className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity">
                          <Edit3 size={14} />
                        </button>
                      </h2>
                      <div className="flex items-center gap-4 text-xs font-medium mt-1" style={{ color: "var(--muted)" }}>
                        <span className="flex items-center gap-1"><Target size={12} /> {completedLectures} / {totalLectures} Topics</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {requiredHours.toFixed(1)} hrs needed</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-black" style={{ color: subject.color }}>{progress.toFixed(1)}%</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-50">Completed</div>
                    </div>
                    <button onClick={() => handleDeleteSubject(subject.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/5">
                  <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${progress}%`, backgroundColor: subject.color }} />
                </div>

                {/* Units/Weeks */}
                <div className="p-5 space-y-4">
                  {subject.units.map((unit, uIdx) => (
                    <div key={unit.id} className="flex flex-col xl:flex-row gap-4 p-4 rounded-xl border relative group transition-colors" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      
                      {/* Left: Unit Title & Lectures configuration */}
                      <div className="flex-shrink-0 w-full xl:w-48 flex xl:flex-col justify-between xl:justify-start gap-2 border-b xl:border-b-0 xl:border-r pb-3 xl:pb-0 xl:pr-4" style={{ borderColor: "var(--border)" }}>
                        <input 
                          type="text" 
                          value={unit.title}
                          onChange={e => handleUpdateUnit(subject.id, unit.id, { title: e.target.value })}
                          className="font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                        />
                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--faint)" }}>
                          <span className="opacity-70">Total Lectures:</span>
                          <input 
                            type="number"
                            min="1" max="50"
                            value={unit.lecturesTotal}
                            onChange={e => handleUpdateUnit(subject.id, unit.id, { lecturesTotal: parseInt(e.target.value) || 1, lecturesCompleted: Math.min(unit.lecturesCompleted, parseInt(e.target.value) || 1) })}
                            className="w-12 px-1 py-0.5 rounded border text-center font-mono"
                            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                        </div>
                        <button 
                          onClick={() => handleDeleteUnit(subject.id, unit.id)}
                          className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Middle: Checkboxes for Lectures */}
                      <div className="flex-1 flex flex-col justify-center gap-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">Lectures Progress</div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: unit.lecturesTotal }).map((_, i) => {
                            const isCompleted = i < unit.lecturesCompleted;
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  const newVal = i + 1 === unit.lecturesCompleted ? i : i + 1;
                                  handleUpdateUnit(subject.id, unit.id, { lecturesCompleted: newVal });
                                }}
                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  isCompleted ? "border-transparent text-white" : "border-dashed hover:border-solid"
                                }`}
                                style={isCompleted ? { backgroundColor: subject.color } : { borderColor: "var(--border)", color: "var(--faint)" }}
                              >
                                {isCompleted ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] opacity-30">{i + 1}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Tasks checklist */}
                      <div className="flex-shrink-0 w-full xl:w-72 flex flex-col gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 xl:border-l xl:pl-4" style={{ borderColor: "var(--border)" }}>
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Weekly Tasks</div>
                        <div className="space-y-1.5">
                          {unit.tasks.map(task => (
                            <div key={task.id} className="flex items-center gap-2 group/task">
                              <button 
                                onClick={() => handleToggleTask(subject.id, unit.id, task.id)}
                                className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${task.completed ? "border-transparent text-white" : "border-[var(--faint)] bg-transparent"}`}
                                style={task.completed ? { backgroundColor: subject.color } : {}}
                              >
                                {task.completed && <Check size={10} strokeWidth={4} />}
                              </button>
                              <span className={`text-xs flex-1 ${task.completed ? "line-through opacity-50" : "font-medium"}`}>{task.name}</span>
                              <button onClick={() => handleDeleteTask(subject.id, unit.id, task.id)} className="opacity-0 group-hover/task:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-all">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 mt-2">
                            <input 
                              type="text" 
                              placeholder="Add task (e.g. Lab)"
                              className="text-xs px-2 py-1.5 rounded border flex-1"
                              style={{ background: "transparent", borderColor: "var(--border)" }}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  handleAddTask(subject.id, unit.id, e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}

                  <button 
                    onClick={() => handleAddUnit(subject.id)}
                    className="w-full py-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-bold opacity-70 hover:opacity-100 transition-all hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <Plus size={16} /> Add Week / Unit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
