"use client";
import { useState, useMemo } from "react";
import { AppData, CATEGORIES, Category } from "@/lib/types";
import { parseISO, format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { Target, Zap, Clock, Star } from "lucide-react";

interface Props { data: AppData }
type TimeRange = 7 | 30 | 9999;

export default function InsightsView({ data }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>(7);

  const allDates = Object.keys(data.days).sort().reverse();
  const selectedDates = useMemo(() => allDates.slice(0, timeRange), [allDates, timeRange]);

  if (selectedDates.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "var(--text)" }} className="font-bold text-3xl mb-3 tracking-tight">No data yet</p>
        <p style={{ color: "var(--faint)" }} className="text-sm">Start logging your hours to see insights here.</p>
      </div>
    );
  }

  const processedData = useMemo(() => {
    let totalHours = 0;
    let deepWorkHours = 0;
    let totalSatisfaction = 0;
    let totalEnergy = 0;
    let loggedDaysCount = 0;
    let targetsHit = 0;
    let possibleTargets = 0;

    let focused = 0, maintenance = 0, reactive = 0;

    const timeData = [...selectedDates].reverse().map(d => {
      const day = data.days[d];
      const obj: any = { date: format(parseISO(d), "MMM d") };
      const blocks = Object.values(day.blocks);
      
      if (blocks.length > 0) {
        loggedDaysCount++;
        blocks.forEach(b => {
          totalHours++;
          if (b.category === "deep-work") deepWorkHours++;
          totalSatisfaction += b.satisfaction;
          totalEnergy += b.energy === "high" ? 5 : b.energy === "medium" ? 3 : 1;
          
          obj[b.category] = (obj[b.category] || 0) + 1;

          // Drucker Split
          const hasPriority = b.contributedPriority ? b.contributedPriority !== "None" : b.contributedToTopPriority;
          if (hasPriority) focused++;
          else if (b.wasPlanned) maintenance++;
          else reactive++;
        });
      }
      return obj;
    });

    const trendData = [...selectedDates].reverse().map(d => {
      const blocks = Object.values(data.days[d].blocks);
      const avgSat = blocks.length > 0 ? blocks.reduce((a, b) => a + b.satisfaction, 0) / blocks.length : null;
      const avgEnergy = blocks.length > 0 ? blocks.reduce((a, b) => a + (b.energy === "high" ? 5 : b.energy === "medium" ? 3 : 1), 0) / blocks.length : null;
      return {
        date: format(parseISO(d), "MMM d"),
        Satisfaction: avgSat ? Number(avgSat.toFixed(1)) : undefined,
        Energy: avgEnergy ? Number(avgEnergy.toFixed(1)) : undefined
      };
    });

    const targetData = [...selectedDates].reverse().map(d => {
      const t = data.days[d].targets || {};
      const count = Object.values(t).filter(Boolean).length;
      targetsHit += count;
      possibleTargets += (data.targets?.length || 9); // Fallback to 9 if empty
      return {
        date: format(parseISO(d), "MMM d"),
        Targets: count
      };
    });

    return {
      totalHours,
      deepWorkRatio: totalHours > 0 ? Math.round((deepWorkHours / totalHours) * 100) : 0,
      avgSat: loggedDaysCount > 0 ? (totalSatisfaction / totalHours).toFixed(1) : "0.0",
      targetHitRatio: possibleTargets > 0 ? Math.round((targetsHit / possibleTargets) * 100) : 0,
      timeData,
      trendData,
      targetData,
      donutData: [
        { name: "Focused Contribution", value: focused, color: "#34D399" }, // Emerald
        { name: "Planned Routine", value: maintenance, color: "#60A5FA" }, // Blue
        { name: "Reactive / Distraction", value: reactive, color: "#F87171" } // Red
      ].filter(d => d.value > 0)
    };
  }, [selectedDates, data]);

  // Custom Tooltip component for better styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="font-bold mb-2" style={{ color: "var(--text)" }}>{label}</p>
          {payload.map((entry: any, i: number) => {
            // Find category to map to real label if needed
            const cat = CATEGORIES.find(c => c.value === entry.name);
            const name = cat ? cat.label : entry.name;
            return (
              <div key={i} className="flex justify-between gap-4 mb-1">
                <span style={{ color: entry.color }}>{name}</span>
                <span style={{ color: "var(--text)" }} className="font-bold">{entry.value}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16 fade-up">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 style={{ color: "var(--text)" }} className="font-bold text-3xl tracking-tight">Visual Insights</h2>
          <p style={{ color: "var(--faint)" }} className="text-sm mt-1">Analyze your time allocation and performance trends.</p>
        </div>
        
        <div className="flex items-center p-1 rounded-lg" style={{ background: "var(--s2)", border: "1px solid var(--border)" }}>
          {[
            { label: "7 Days", value: 7 },
            { label: "30 Days", value: 30 },
            { label: "All Time", value: 9999 }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value as TimeRange)}
              className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{
                background: timeRange === opt.value ? "var(--surface)" : "transparent",
                color: timeRange === opt.value ? "var(--primary)" : "var(--muted)",
                boxShadow: timeRange === opt.value ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Hours Logged</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>{processedData.totalHours}</p>
        </div>
        <div className="p-5 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Deep Work Ratio</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>{processedData.deepWorkRatio}%</p>
        </div>
        <div className="p-5 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} className="text-purple-500" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Avg Satisfaction</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>{processedData.avgSat}</p>
        </div>
        <div className="p-5 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Target Hit Rate</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>{processedData.targetHitRatio}%</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Chart 1: Time Allocation (Wider) */}
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="mb-6">
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>Where Time Goes</h3>
            <p className="text-xs" style={{ color: "var(--faint)" }}>Hours logged by the 5 Core Pillars</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.timeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: 'var(--faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {CATEGORIES.map(cat => (
                  <Bar key={cat.value} dataKey={cat.value} name={cat.label} stackId="a" fill={cat.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Drucker Split */}
        <div className="rounded-xl p-5 flex flex-col" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="mb-2">
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>The Drucker Split</h3>
            <p className="text-xs" style={{ color: "var(--faint)" }}>Intentional vs Reactive focus</p>
          </div>
          <div className="flex-1 w-full relative flex items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={processedData.donutData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                  {processedData.donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: '11px', color: 'var(--text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 3: Satisfaction & Energy */}
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="mb-6">
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>Satisfaction & Energy Trends</h3>
            <p className="text-xs" style={{ color: "var(--faint)" }}>1-5 scale based on your logs</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData.trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: 'var(--faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} tick={{ fill: 'var(--faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: 'var(--text)' }} />
                <Line type="monotone" dataKey="Satisfaction" stroke="#A78BFA" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Energy" stroke="#FBBF24" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Daily Targets Met */}
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="mb-6">
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>Target Consistency</h3>
            <p className="text-xs" style={{ color: "var(--faint)" }}>Number of daily habits ticked per day</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedData.targetData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTargets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: 'var(--faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Targets" stroke="#34D399" strokeWidth={3} fillOpacity={1} fill="url(#colorTargets)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
