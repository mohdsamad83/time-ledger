"use client";
import { AppData, CATEGORIES } from "@/lib/types";
import { parseISO, format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

interface Props { data: AppData }

export default function InsightsView({ data }: Props) {
  const allDates = Object.keys(data.days).sort().reverse();
  const days7 = allDates.slice(0, 7);

  if (days7.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "var(--text)" }} className="font-serif text-3xl mb-3">No data yet</p>
        <p style={{ color: "var(--faint)" }} className="text-sm">Start logging your hours to see insights here.</p>
      </div>
    );
  }

  // 1. Time Allocation Data (Stacked Bar)
  const timeData = [...days7].reverse().map(d => {
    const day = data.days[d];
    const obj: any = { date: format(parseISO(d), "MMM d") };
    for (const block of Object.values(day.blocks)) {
      obj[block.category] = (obj[block.category] || 0) + 1;
    }
    return obj;
  });

  // 2. Drucker Split (Donut)
  let focused = 0, maintenance = 0, reactive = 0;
  for (const d of days7) {
    for (const block of Object.values(data.days[d].blocks)) {
      const hasPriority = block.contributedPriority ? block.contributedPriority !== "None" : block.contributedToTopPriority;
      if (hasPriority) focused++;
      else if (block.wasPlanned) maintenance++;
      else reactive++;
    }
  }
  const donutData = [
    { name: "Focused Contribution", value: focused, color: "#4ADE80" },
    { name: "Planned Routine", value: maintenance, color: "#60A5FA" },
    { name: "Reactive / Distraction", value: reactive, color: "#F87171" }
  ].filter(d => d.value > 0);

  // 3. Trends (Lines)
  const trendData = [...days7].reverse().map(d => {
    const blocks = Object.values(data.days[d].blocks);
    const avgSat = blocks.length > 0 ? blocks.reduce((a, b) => a + b.satisfaction, 0) / blocks.length : null;
    const avgEnergy = blocks.length > 0 ? blocks.reduce((a, b) => a + (b.energy === "high" ? 5 : b.energy === "medium" ? 3 : 1), 0) / blocks.length : null;
    return {
      date: format(parseISO(d), "MMM d"),
      Satisfaction: avgSat ? Number(avgSat.toFixed(1)) : undefined,
      Energy: avgEnergy ? Number(avgEnergy.toFixed(1)) : undefined
    };
  });

  // 4. Targets Met (Area)
  const targetData = [...days7].reverse().map(d => {
    const t = data.days[d].targets || {};
    const count = Object.values(t).filter(Boolean).length;
    return {
      date: format(parseISO(d), "MMM d"),
      Targets: count
    };
  });

  // Custom Tooltip component for better styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="font-bold mb-2" style={{ color: "var(--text)" }}>{label}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex justify-between gap-4 mb-1">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span style={{ color: "var(--text)" }} className="font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <h2 style={{ color: "var(--text)" }} className="font-serif text-3xl mb-8">Visual Insights</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Chart 1: Time Allocation */}
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-serif text-lg mb-1" style={{ color: "var(--text)" }}>Where Time Goes</h3>
          <p className="text-xs mb-6" style={{ color: "var(--faint)" }}>Hours logged by category (Last 7 Days)</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-serif text-lg mb-1" style={{ color: "var(--text)" }}>The Drucker Split</h3>
          <p className="text-xs mb-6" style={{ color: "var(--faint)" }}>Intentional vs Reactive focus</p>
          <div className="h-64 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', color: 'var(--faint)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Satisfaction & Energy */}
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-serif text-lg mb-1" style={{ color: "var(--text)" }}>Satisfaction & Energy</h3>
          <p className="text-xs mb-6" style={{ color: "var(--faint)" }}>1-5 scale based on your logs</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: 'var(--faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} tick={{ fill: 'var(--faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', color: 'var(--faint)' }} />
                <Line type="monotone" dataKey="Satisfaction" stroke="#A78BFA" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Energy" stroke="#FBBF24" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Daily Targets Met */}
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-serif text-lg mb-1" style={{ color: "var(--text)" }}>Targets Reached</h3>
          <p className="text-xs mb-6" style={{ color: "var(--faint)" }}>Number of checkboxes ticked per day</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={targetData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTargets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
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
