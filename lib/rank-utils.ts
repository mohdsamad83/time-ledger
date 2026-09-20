import { AppData, TargetMeta } from "./types";
import { format, getDaysInMonth, startOfMonth, isSameMonth, isBefore, isAfter } from "date-fns";

export function calculateCurrentMonthRank(data: AppData) {
  if (!data) return { level: "0.00", rankStr: "E", rankColor: "text-red-400", rankLabel: "Needs Work" };

  const now = new Date();
  const currentMonth = startOfMonth(now);
  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStr = format(currentMonth, "yyyy-MM");
  
  let currentMonthlyTargets: TargetMeta[] = [];
  if (data.monthlyTargets) {
    const targetMap = new Map<string, TargetMeta>();
    const viewedMonthStart = startOfMonth(currentMonth);
    
    Object.keys(data.monthlyTargets).sort().forEach(m => {
      if (m <= monthStr) {
        for (const t of data.monthlyTargets![m]) {
          if (t.accomplishedAt === "dropped") {
            targetMap.delete(t.name);
            continue;
          }
          if (t.accomplishedAt) {
             const accDate = new Date(t.accomplishedAt);
             if (isBefore(accDate, viewedMonthStart)) continue;
          }
          targetMap.set(t.name, t);
        }
      }
    });
    currentMonthlyTargets = Array.from(targetMap.values());
  } else if (data.targets && data.targets.length > 0) {
    currentMonthlyTargets = data.targets.map(t => ({ name: t }));
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${monthStr}-${d.toString().padStart(2, "0")}`;
  });

  let totalElapsedDays = 0;
  let totalCompleted = 0;

  currentMonthlyTargets.forEach(targetMeta => {
    const target = targetMeta.name;
    let completed = 0;

    const startOfCurrentMonth = startOfMonth(currentMonth);
    const endOfCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), daysInMonth);
    
    let startDay = 1;
    if (targetMeta.createdAt) {
      const createdDate = new Date(targetMeta.createdAt);
      if (isSameMonth(createdDate, currentMonth)) {
        startDay = createdDate.getDate();
      } else if (isAfter(createdDate, endOfCurrentMonth)) {
        startDay = daysInMonth + 1; 
      }
    }
    
    let endDay = daysInMonth;
    if (targetMeta.accomplishedAt) {
      const accDate = new Date(targetMeta.accomplishedAt);
      if (isSameMonth(accDate, currentMonth)) {
        endDay = accDate.getDate();
      } else if (isBefore(accDate, startOfCurrentMonth)) {
        endDay = 0;
      }
    }
    
    let elapsedEndDay = isSameMonth(now, currentMonth) ? now.getDate() : (isAfter(now, endOfCurrentMonth) ? daysInMonth : 0);
    elapsedEndDay = Math.min(elapsedEndDay, endDay);
    const targetElapsedDays = Math.max(0, elapsedEndDay - startDay + 1);

    days.forEach((dateStr, idx) => {
      const dayData = data.days[dateStr];
      const dayNum = idx + 1;
      if (dayNum >= startDay && dayNum <= endDay) {
        if (dayData?.targets?.[target]) {
          completed++;
        }
      }
    });

    totalElapsedDays += targetElapsedDays;
    totalCompleted += completed;
  });

  const currentLevelNum = totalElapsedDays > 0 ? (totalCompleted / totalElapsedDays) * 100 : 0;
  const currentLevel = currentLevelNum.toFixed(2);
  
  let rankStr = "E";
  let rankColor = "text-red-400";
  let rankLabel = "Needs Work";
  if (currentLevelNum >= 90) { rankStr = "S"; rankColor = "text-amber-500"; rankLabel = "Legendary"; }
  else if (currentLevelNum >= 80) { rankStr = "A"; rankColor = "text-purple-500"; rankLabel = "Elite"; }
  else if (currentLevelNum >= 70) { rankStr = "B"; rankColor = "text-blue-500"; rankLabel = "Solid"; }
  else if (currentLevelNum >= 50) { rankStr = "C"; rankColor = "text-emerald-500"; rankLabel = "Average"; }

  return { level: currentLevel, rankStr, rankColor, rankLabel };
}
