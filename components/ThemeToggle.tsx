"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, THEMES, ThemeId } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        id="theme-toggle-btn"
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: open ? "var(--surface)" : "transparent",
          color: "var(--muted)",
          cursor: "pointer",
          fontSize: "12px",
          fontFamily: "var(--font-lato), sans-serif",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--dim)";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
          }
        }}
      >
        <Palette size={13} />
        <span className="hidden sm:inline">Theme</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "210px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "8px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            zIndex: 100,
            animation: "fadeUp 0.2s ease forwards",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--faint)",
              fontFamily: "var(--font-lato), sans-serif",
              fontWeight: 700,
              padding: "4px 8px 8px",
            }}
          >
            Appearance
          </p>

          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                id={`theme-option-${t.id}`}
                onClick={() => {
                  setTheme(t.id as ThemeId);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "none",
                  background: isActive ? "var(--s2)" : "transparent",
                  color: isActive ? "var(--text)" : "var(--muted)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  fontFamily: "var(--font-lato), sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--s2)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                  }
                }}
              >
                <span style={{ fontSize: "18px", lineHeight: 1 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: "11px", color: "var(--faint)", marginTop: "1px" }}>
                    {t.description}
                  </div>
                </div>
                {isActive && (
                  <Check
                    size={13}
                    style={{ color: "var(--gold)", flexShrink: 0 }}
                  />
                )}
              </button>
            );
          })}

          {/* Theme preview swatches */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              padding: "10px 10px 4px",
              borderTop: "1px solid var(--border)",
              marginTop: "6px",
            }}
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id as ThemeId); setOpen(false); }}
                title={t.label}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: theme === t.id ? "2px solid var(--gold)" : "2px solid transparent",
                  padding: "2px",
                  cursor: "pointer",
                  background: "transparent",
                  transition: "all 0.2s",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background:
                      t.id === "speedster"
                        ? "linear-gradient(135deg, #080C0A 0%, #8AE3B5 55%, #EA2839 100%)"
                        : t.id === "dark"
                        ? "linear-gradient(135deg, #17150F, #C9A84C)"
                        : t.id === "light"
                        ? "linear-gradient(135deg, #F5EDD6, #C9A84C)"
                        : "linear-gradient(135deg, #0F172A, #60A5FA)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
