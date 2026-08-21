import { useState } from "react";
import { CustomCategory, DEFAULT_CATEGORIES } from "@/lib/types";
import { Plus, Trash2, Save, Undo, RefreshCw, Settings2, Loader2, CheckCircle } from "lucide-react";
import { saveCategories } from "@/lib/storage";

interface Props {
  initialCategories: CustomCategory[];
  onUpdate: (categories: CustomCategory[]) => void;
}

export default function SettingsView({ initialCategories, onUpdate }: Props) {
  const [categories, setCategories] = useState<CustomCategory[]>(
    initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAdd = () => {
    setCategories([
      ...categories,
      {
        value: `cat-${Date.now()}`,
        label: "New Category",
        color: "#9CA3AF",
        bg: "rgba(156, 163, 175, 0.1)",
        emoji: "🏷️",
      },
    ]);
  };

  const handleUpdate = (index: number, field: keyof CustomCategory, value: string) => {
    const next = [...categories];
    next[index] = { ...next[index], [field]: value };
    setCategories(next);
    setSaved(false);
  };

  const handleDelete = (index: number) => {
    const next = [...categories];
    next.splice(index, 1);
    setCategories(next);
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveCategories(categories);
    if (success) {
      onUpdate(categories);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert("Failed to sync categories to Google Sheets.");
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    if (confirm("Reset to default categories? You will still need to click Save to apply.")) {
      setCategories([...DEFAULT_CATEGORIES]);
      setSaved(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 style={{ color: "var(--text)" }} className="font-bold text-3xl tracking-tight flex items-center gap-3">
            <Settings2 className="text-blue-500" /> Settings
          </h2>
          <p style={{ color: "var(--faint)" }} className="text-sm mt-1">
            Manage your time-tracking categories. Changes sync to Google Sheets.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
            style={{ color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <RefreshCw size={14} /> Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--primary)", color: "white" }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {isSaving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-12 gap-4 pb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            <div className="col-span-1 text-center">Emoji</div>
            <div className="col-span-4">Label</div>
            <div className="col-span-3">Internal Value</div>
            <div className="col-span-2">Color (Hex)</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {categories.map((cat, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 items-center group">
              <div className="col-span-1 flex justify-center">
                <input
                  type="text"
                  value={cat.emoji}
                  onChange={(e) => handleUpdate(i, "emoji", e.target.value)}
                  className="w-10 text-center bg-transparent border-b focus:outline-none focus:border-blue-500 text-xl pb-1"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  value={cat.label}
                  onChange={(e) => handleUpdate(i, "label", e.target.value)}
                  className="w-full bg-transparent border-b focus:outline-none focus:border-blue-500 pb-1 font-semibold"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  value={cat.value}
                  onChange={(e) => handleUpdate(i, "value", e.target.value)}
                  className="w-full bg-transparent border-b focus:outline-none focus:border-blue-500 pb-1 font-mono text-xs opacity-70"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  title="Unique ID used in sheets (changing this will orphan past logs)"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="color"
                  value={cat.color.startsWith("var") ? "#60A5FA" : cat.color}
                  onChange={(e) => {
                    handleUpdate(i, "color", e.target.value);
                    handleUpdate(i, "bg", e.target.value + "20"); 
                  }}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  onClick={() => handleDelete(i)}
                  className="p-2 rounded text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete category"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleAdd}
            className="w-full mt-4 py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 font-semibold transition-all hover:bg-opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--s2)" }}
          >
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>
    </div>
  );
}
