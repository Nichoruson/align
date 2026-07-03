import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Plus, Trash2, Check, Clock, StickyNote, X, Bell, Search,
  BarChart2, Settings, Home, Flame, Star, AlertCircle,
  ChevronRight, RefreshCw, TrendingUp, Award, Zap,
  User, Edit3, Target, Calendar, Save, Sparkles, Volume2, VolumeX,
  PlusCircle, CheckCircle2, ChevronLeft
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "health" | "work" | "personal" | "fitness" | "mindfulness";
type Priority = "high" | "medium" | "low";
type Tab = "home" | "stats" | "profile" | "settings";

interface Task {
  id: string;
  name: string;
  time: string;
  notes: string;
  category: Category;
  priority: Priority;
  completed: boolean;
  date: string; // YYYY-MM-DD format
  completedAt?: number;
}

interface CompletionRecord {
  taskId: string;
  taskName: string;
  date: string; // YYYY-MM-DD
  category: Category;
  priority: Priority;
  completedAt: number;
}

interface Profile {
  name: string;
  tagline: string;
  avatarColor: string;
  dailyGoal: number;
  joinDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<Category, { label: string; color: string; bg: string; text: string }> = {
  health:      { label: "Health",      color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", text: "#10b981" },
  work:        { label: "Work",        color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)", text: "#a78bfa" },
  personal:    { label: "Personal",    color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", text: "#fbbf24" },
  fitness:     { label: "Fitness",     color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)",  text: "#f87171" },
  mindfulness: { label: "Mindfulness", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", text: "#60a5fa" },
};

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  high:   { label: "High",   color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
  medium: { label: "Medium", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  low:    { label: "Low",    color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
};

const AVATAR_COLORS = [
  "#8b5cf6", "#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#f97316", "#14b8a6",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const QUOTES = [
  "Small steps every day lead to big changes.",
  "Discipline is choosing between what you want now and what you want most.",
  "Progress, not perfection.",
  "One day at a time. One task at a time.",
  "Your future self is watching. Make them proud.",
  "Consistency beats intensity.",
  "Done is better than perfect.",
  "You do not rise to the level of your goals. You fall to the level of your systems.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  return `${h % 12 || 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
}

function isOverdue(time: string, taskDate: string) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (taskDate < todayStr) return true;
  if (taskDate > todayStr) return false;

  const [h, m] = time.split(":").map(Number);
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── Tone Synthesizer ─────────────────────────────────────────────────────────

const playChime = (soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    // Pleasant high chime: E5 (659.25Hz) and B5 (987.77Hz)
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start(ctx.currentTime + 0.08);

    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn("Audio Context failed:", err);
  }
};

// ─── UI Components ────────────────────────────────────────────────────────────

function Avatar({ profile, size = 44, pulse = false }: { profile: Profile; size?: number; pulse?: boolean }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none transition-transform"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${profile.avatarColor} 0%, ${profile.avatarColor}99 100%)`,
        fontSize: size * 0.36,
        color: "#fff",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxShadow: `0 4px 16px ${profile.avatarColor}44`,
        animation: pulse ? "breathe 3s ease-in-out infinite" : "none",
      }}
    >
      {getInitials(profile.name)}
    </div>
  );
}

function AmbientOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[
        { size: 450, x: "-10%", y: "-10%", color: "rgba(139, 92, 246, 0.08)", dur: "15s" },
        { size: 350, x: "80%", y: "10%", color: "rgba(239, 68, 68, 0.04)", dur: "18s" },
        { size: 300, x: "40%", y: "50%", color: "rgba(16, 185, 129, 0.04)", dur: "14s" },
        { size: 400, x: "70%", y: "80%", color: "rgba(59, 130, 246, 0.06)", dur: "22s" },
      ].map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full filter blur-[80px]"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            animation: `orbFloat ${orb.dur} ease-in-out infinite alternate`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Task Card Component ──────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

function TaskCard({ task, onToggle, onDelete, onEdit }: TaskCardProps) {
  const cat = CATEGORY_META[task.category];
  const pri = PRIORITY_META[task.priority];
  const overdue = !task.completed && isOverdue(task.time, task.date);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-[#15132d]/45 hover:bg-[#181635]/65 transition-all duration-300 group shadow-lg hover:shadow-xl hover:translate-y-[-2px] p-5 flex flex-col justify-between"
      style={{
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        opacity: task.completed ? 0.65 : 1
      }}
    >
      {/* Priority Indicator Line */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: pri.color }} />

      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex flex-wrap gap-1.5">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full select-none"
              style={{ background: cat.bg, color: cat.text }}
            >
              {cat.label}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full select-none flex items-center gap-0.5"
              style={{ background: pri.bg, color: pri.color }}
            >
              {task.priority === "high" ? "🔥" : task.priority === "medium" ? "⚡" : "•"} {pri.label}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-85 lg:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors cursor-pointer"
              title="Edit Task"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
              title="Delete Task"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Task Title */}
        <h3
          className="text-base font-bold leading-snug mb-1 text-white tracking-wide break-words cursor-pointer select-none"
          onClick={() => onToggle(task.id)}
          style={{ textDecoration: task.completed ? "line-through" : "none", opacity: task.completed ? 0.6 : 1 }}
        >
          {task.name}
        </h3>

        {/* Notes */}
        {task.notes && (
          <p className="text-xs text-white/60 mb-4 font-normal line-clamp-2 leading-relaxed flex items-start gap-1">
            <StickyNote size={12} className="mt-0.5 flex-shrink-0 text-white/40" />
            {task.notes}
          </p>
        )}
      </div>

      {/* Footer Info & Toggle */}
      <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 mt-auto">
        <span
          className="text-xs font-semibold flex items-center gap-1"
          style={{ color: overdue ? "#ef4444" : "rgba(255,255,255,0.6)" }}
        >
          <Clock size={12} />
          {formatTime(task.time)}
          {overdue && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded-md animate-pulse">
              Overdue
            </span>
          )}
        </span>

        <button
          onClick={() => onToggle(task.id)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer"
          style={{
            borderColor: task.completed ? "#10b981" : "rgba(255, 255, 255, 0.15)",
            background: task.completed ? "rgba(16, 185, 129, 0.1)" : "transparent",
            color: task.completed ? "#10b981" : "#fff",
          }}
        >
          {task.completed ? (
            <>
              <CheckCircle2 size={13} />
              <span>Done</span>
            </>
          ) : (
            <span>Pending</span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Add/Edit Task Modal ──────────────────────────────────────────────────────

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (t: Omit<Task, "id" | "completed"> & { id?: string }) => void;
  editingTask?: Task | null;
  selectedDate: string;
}

function TaskModal({ open, onClose, onSave, editingTask, selectedDate }: TaskModalProps) {
  const [name, setName]         = useState("");
  const [time, setTime]         = useState("08:00");
  const [notes, setNotes]       = useState("");
  const [category, setCategory] = useState<Category>("personal");
  const [priority, setPriority] = useState<Priority>("medium");
  const [taskDate, setTaskDate] = useState(selectedDate);

  useEffect(() => {
    if (editingTask) {
      setName(editingTask.name);
      setTime(editingTask.time);
      setNotes(editingTask.notes);
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setTaskDate(editingTask.date);
    } else {
      setName("");
      setTime("08:00");
      setNotes("");
      setCategory("personal");
      setPriority("medium");
      setTaskDate(selectedDate);
    }
  }, [editingTask, open, selectedDate]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: editingTask?.id,
      name: name.trim(),
      time,
      notes: notes.trim(),
      category,
      priority,
      date: taskDate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#060515]/80 backdrop-blur-md" onClick={onClose} />

      {/* Dialog container */}
      <div className="relative w-full max-w-md bg-[#13112c] border border-white/[0.08] rounded-3xl p-6 shadow-2xl z-10 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 to-rose-400" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-violet-400" />
            {editingTask ? "Edit Reminder" : "New Reminder"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1.5">Reminder Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning meditation"
              className="w-full bg-[#1b1937] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#1b1937] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1.5">Date</label>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full bg-[#1b1937] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1.5">Priority</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as Priority[]).map((p) => {
                const m = PRIORITY_META[p];
                const sel = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all border cursor-pointer"
                    style={{
                      borderColor: sel ? m.color : "rgba(255,255,255,0.06)",
                      background: sel ? m.bg : "rgba(255,255,255,0.02)",
                      color: sel ? "#fff" : m.color,
                      boxShadow: sel ? `0 4px 12px ${m.color}22` : "none",
                    }}
                  >
                    {p === "high" ? "🔥" : p === "medium" ? "⚡" : "•"} {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1.5">Category</label>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
                const m = CATEGORY_META[cat];
                const sel = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer"
                    style={{
                      borderColor: sel ? m.color : "rgba(255,255,255,0.06)",
                      background: sel ? m.bg : "rgba(255,255,255,0.02)",
                      color: sel ? "#fff" : m.text,
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add reminder description..."
              rows={2}
              className="w-full bg-[#1b1937] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full mt-6 py-3.5 rounded-2xl font-extrabold text-sm transition-all cursor-pointer"
          style={{
            background: name.trim() ? "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)" : "rgba(255,255,255,0.05)",
            color: name.trim() ? "#fff" : "rgba(255,255,255,0.25)",
            cursor: name.trim() ? "pointer" : "default",
          }}
        >
          {editingTask ? "Save Changes" : "Create Reminder"}
        </button>
      </div>
    </div>
  );
}

// ─── Stats Screen ─────────────────────────────────────────────────────────────

function StatsScreen({ history, totalCreated }: { history: CompletionRecord[]; totalCreated: number }) {
  // Process history for past 7 days
  const weeklyChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayLabel = DAYS[d.getDay()];

      // Count completions in history matching dateStr
      const completes = history.filter((h) => h.date === dateStr).length;
      data.push({ day: dayLabel, completed: completes });
    }
    return data;
  }, [history]);

  // Process category distribution
  const categoryData = useMemo(() => {
    const counts: Record<Category, number> = { health: 0, work: 0, personal: 0, fitness: 0, mindfulness: 0 };
    history.forEach((h) => {
      if (counts[h.category] !== undefined) counts[h.category]++;
    });

    return (Object.keys(CATEGORY_META) as Category[])
      .map((cat) => ({
        name: CATEGORY_META[cat].label,
        value: counts[cat],
        color: CATEGORY_META[cat].color,
      }))
      .filter((d) => d.value > 0);
  }, [history]);

  const totalCompletions = history.length;

  // Streak calculator
  const streak = useMemo(() => {
    if (history.length === 0) return 0;
    const completedDates = Array.from(new Set(history.map(h => h.date))).sort();
    let currentStreak = 0;
    let checkDate = new Date();

    while (true) {
      const checkStr = getLocalDateString(checkDate);
      if (completedDates.includes(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Allow streak to continue if checking today and user hasn't finished any today yet, but did yesterday
        const todayStr = getLocalDateString(new Date());
        if (checkStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = getLocalDateString(checkDate);
          if (completedDates.includes(yesterdayStr)) {
            continue;
          }
        }
        break;
      }
    }
    return currentStreak;
  }, [history]);

  const hasData = history.length > 0;

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in hide-scrollbar">
      <div>
        <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Analytics</h2>
        <p className="text-sm text-white/50 font-normal">Real-time statistics of your daily routine performance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Check size={20} color="#10b981" />, label: "Total Completed", val: totalCompletions, bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
          { icon: <TrendingUp size={20} color="#8b5cf6" />, label: "Total Created", val: totalCreated, bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
          { icon: <Flame size={20} color="#ef4444" />, label: "Current Streak", val: `${streak} Day${streak === 1 ? "" : "s"} 🔥`, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
        ].map((kpi, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 flex flex-col gap-2 items-start border bg-[#15132d]/45"
            style={{ borderColor: kpi.border }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>{kpi.icon}</div>
            <div className="flex flex-col">
              <span className="text-xs text-white/55 mb-0.5">{kpi.label}</span>
              <span className="text-2xl font-black text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{kpi.val}</span>
            </div>
          </div>
        ))}
      </div>

      {!hasData ? (
        /* Empty State */
        <div className="flex-1 min-h-[300px] border border-white/[0.06] bg-[#15132d]/25 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center animate-pulse">
            <BarChart2 size={28} className="text-violet-400/60" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white mb-1">No Activity Logged</h4>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              Your analytics dashboard is empty. Tick off reminders in the Reminders tab to start generating performance data.
            </p>
          </div>
        </div>
      ) : (
        /* Charts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Bar Chart */}
          <div className="border border-white/[0.06] bg-[#15132d]/45 rounded-3xl p-5 shadow-xl">
            <h4 className="text-sm font-extrabold text-white/80 mb-6 flex items-center gap-2">
              <Calendar size={14} className="text-violet-400" />
              Weekly Reminders Log
            </h4>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#110f27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 12 }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="completed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution Pie Chart */}
          <div className="border border-white/[0.06] bg-[#15132d]/45 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
            <h4 className="text-sm font-extrabold text-white/80 mb-6 flex items-center gap-2">
              <Target size={14} className="text-emerald-400" />
              Completed by Category
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center flex-1 py-4">
              <div className="w-[130px] h-[130px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} strokeWidth={0} paddingAngle={2}>
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 flex-1 w-full max-w-[200px]">
                {categoryData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between border-b border-white/[0.03] pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-xs text-white/70 font-semibold">{d.name}</span>
                    </div>
                    <span className="text-xs font-black text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

interface ProfileScreenProps {
  profile: Profile;
  setProfile: (p: Profile) => void;
  history: CompletionRecord[];
}

function ProfileScreen({ profile, setProfile, history }: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState<Profile>(profile);

  const save = () => {
    setProfile(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(profile);
    setEditing(false);
  };

  const totalCompletions = history.length;

  // Unlocked achievements criteria
  const achievements = useMemo(() => {
    const list = [
      { id: "first", icon: "🚀", label: "First Step", desc: "Complete 1 reminder", unlocked: totalCompletions >= 1 },
      { id: "stylist", icon: "🎨", label: "Profile Custom", desc: "Change avatar color", unlocked: profile.avatarColor !== "#8b5cf6" },
      { id: "active", icon: "⚡", label: "Productive Day", desc: "Log 5 completed tasks", unlocked: history.length >= 5 },
      { id: "perfect", icon: "🏆", label: "Peak Routine", desc: "Complete 15 reminders", unlocked: totalCompletions >= 15 },
    ];
    return list;
  }, [totalCompletions, profile.avatarColor, history]);

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in hide-scrollbar">
      <div>
        <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Profile</h2>
        <p className="text-sm text-white/50 font-normal">Manage your dashboard info and verify unlocked credentials.</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#1e1b42]/35 p-6 relative overflow-hidden flex flex-col gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <Avatar profile={editing ? draft : profile} size={76} pulse />
            <div>
              {editing ? (
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="bg-[#13112c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-base font-bold text-white outline-none focus:border-violet-500 transition-colors"
                />
              ) : (
                <h2 className="text-xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{profile.name}</h2>
              )}
              <p className="text-xs text-white/40 mt-1 select-none font-semibold">User since {profile.joinDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/35 text-violet-300 transition-all select-none cursor-pointer"
              >
                <Edit3 size={13} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={cancel}
                  className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={save}
                  className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Save size={14} /> Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-4">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Motto / Tagline</label>
          {editing ? (
            <input
              value={draft.tagline}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
              placeholder="Your custom motto"
              className="bg-[#13112c] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500 transition-colors w-full"
            />
          ) : (
            <p className="text-sm italic text-white/80 font-normal">"{profile.tagline}"</p>
          )}
        </div>

        {/* Avatar Colors selector */}
        {editing && (
          <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-4">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Avatar Color Theme</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraft({ ...draft, avatarColor: c })}
                  className="w-7 h-7 rounded-full transition-all border border-transparent cursor-pointer"
                  style={{
                    background: c,
                    transform: draft.avatarColor === c ? "scale(1.15)" : "scale(1)",
                    borderColor: draft.avatarColor === c ? "#fff" : "transparent",
                    boxShadow: draft.avatarColor === c ? `0 0 10px ${c}aa` : "none",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Goal & History Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 border border-white/[0.06] bg-[#15132d]/45">
          <span className="text-xs text-white/55 block mb-1">Lifetime Completions</span>
          <span className="text-3xl font-black text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{totalCompletions}</span>
        </div>
        <div className="rounded-2xl p-5 border border-white/[0.06] bg-[#15132d]/45 flex flex-col justify-between">
          <div>
            <span className="text-xs text-white/55 block mb-1">Daily Task Goal</span>
            <span className="text-3xl font-black text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{profile.dailyGoal}</span>
          </div>
          {editing && (
            <div className="flex gap-1.5 mt-2">
              {[3, 5, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setDraft({ ...draft, dailyGoal: n })}
                  className="flex-1 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer"
                  style={{
                    borderColor: draft.dailyGoal === n ? "#8b5cf6" : "rgba(255,255,255,0.06)",
                    background: draft.dailyGoal === n ? "rgba(139, 92, 246, 0.1)" : "transparent",
                    color: draft.dailyGoal === n ? "#fff" : "rgba(255,255,255,0.4)"
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Achievements Column */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-bold text-white/80 flex items-center gap-1.5">
          <Award size={15} className="text-amber-400" />
          Achievements & Badges
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border p-4 flex items-center gap-3 bg-[#15132d]/45 transition-opacity"
              style={{
                borderColor: item.unlocked ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.04)",
                opacity: item.unlocked ? 1 : 0.4,
              }}
            >
              <span className="text-3xl select-none filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{item.icon}</span>
              <div>
                <h5 className="text-xs font-bold text-white">{item.label}</h5>
                <p className="text-[10px] text-white/50">{item.desc}</p>
                {item.unlocked ? (
                  <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md mt-1 inline-block">
                    UNLOCKED
                  </span>
                ) : (
                  <span className="text-[9px] font-extrabold text-white/35 bg-white/5 px-1.5 py-0.2 rounded-md mt-1 inline-block">
                    LOCKED
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Screen ───────────────────────────────────────────────────────────

interface SettingsScreenProps {
  sound: boolean;
  setSound: (b: boolean) => void;
  onSeed: () => void;
  onClear: () => void;
}

function SettingsScreen({ sound, setSound, onSeed, onClear }: SettingsScreenProps) {
  return (
    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in hide-scrollbar">
      <div>
        <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Settings</h2>
        <p className="text-sm text-white/50 font-normal">Configure routine audio feedback and core database parameters.</p>
      </div>

      <div className="border border-white/[0.06] bg-[#15132d]/45 rounded-3xl p-5 shadow-xl divide-y divide-white/[0.04]">
        {/* Toggle Sound */}
        <div className="flex items-center justify-between py-4 first:pt-0">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              {sound ? <Volume2 size={16} className="text-violet-400" /> : <VolumeX size={16} className="text-white/40" />}
              Sound Effects
            </h4>
            <p className="text-xs text-white/55">Synthesizes a soft completion chime when ticking off a reminder.</p>
          </div>
          <button
            onClick={() => setSound(!sound)}
            className="w-12 h-6.5 rounded-full p-1 transition-colors duration-300 outline-none flex items-center cursor-pointer"
            style={{ background: sound ? "#8b5cf6" : "#1f1d37" }}
          >
            <div
              className="w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300"
              style={{ transform: sound ? "translateX(20px)" : "translateX(0px)" }}
            />
          </button>
        </div>

        {/* Data Seeding */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h4 className="text-sm font-bold text-white">Seed Simulation Data</h4>
            <p className="text-xs text-white/55">Instantly populates the routine dashboard and completions log for evaluation.</p>
          </div>
          <button
            onClick={onSeed}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 transition-all text-xs font-extrabold rounded-xl text-white select-none shadow-md shadow-violet-700/20 cursor-pointer"
          >
            Seed Demo
          </button>
        </div>

        {/* Reset Database */}
        <div className="flex items-center justify-between py-4 last:pb-0">
          <div>
            <h4 className="text-sm font-bold text-red-400">Reset Application Database</h4>
            <p className="text-xs text-white/55">Clears all reminders and logged achievements permanently from local storage.</p>
          </div>
          <button
            onClick={onClear}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all border border-red-500/25 text-xs font-extrabold rounded-xl text-red-400 select-none cursor-pointer"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Home Screen (Dashboard Content) ──────────────────────────────────────────

interface HomeScreenProps {
  tasks: Task[];
  history: CompletionRecord[];
  profile: Profile;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  onToggle: (id: string, rect?: DOMRect) => void;
  onDelete: (id: string) => void;
  onEdit: (t: Task) => void;
  onOpenModal: () => void;
}

function HomeScreen({
  tasks, history, profile, selectedDate, setSelectedDate,
  onToggle, onDelete, onEdit, onOpenModal,
}: HomeScreenProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [sort, setSort]     = useState<"time" | "priority">("time");
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Quote Rotator
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((i) => (i + 1) % QUOTES.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  // Filter and sort reminders
  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => t.date === selectedDate);

    // Apply Search
    if (search.trim()) {
      list = list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Apply Completion Filter
    list = list.filter((t) => {
      if (filter === "pending") return !t.completed;
      if (filter === "done") return t.completed;
      return true;
    });

    // Apply Sort
    const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return [...list].sort((a, b) => {
      if (sort === "priority") {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.time.localeCompare(b.time);
    });
  }, [tasks, selectedDate, search, filter, sort]);

  // Today's total list stats for selectedDate
  const selectedDateTasks = tasks.filter(t => t.date === selectedDate);
  const completedCount = selectedDateTasks.filter(t => t.completed).length;
  const progressPercent = selectedDateTasks.length > 0 ? Math.round((completedCount / selectedDateTasks.length) * 100) : 0;

  // Calendar Week Generator
  const calendarWeek = useMemo(() => {
    const days = [];
    const today = new Date();
    // Get starting point (last Sunday)
    const base = new Date(today);
    base.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = getLocalDateString(d);
      days.push({
        label: DAYS[d.getDay()],
        dateNum: d.getDate(),
        dateStr,
        isToday: dateStr === getLocalDateString(today),
      });
    }
    return days;
  }, []);

  return (
    <div className="flex-1 w-full flex flex-col gap-6 lg:gap-8 animate-fade-in">
      {/* 2 Column Grid for Desktop Dashboard, stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left/Main Column - Reminders */}
        <div className="lg:col-span-8 flex flex-col gap-6 order-2 lg:order-1">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-white/45 uppercase tracking-wider block mb-0.5 select-none">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {greetingWord()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-rose-300">{profile.name.split(" ")[0]}</span> 👋
              </h1>
            </div>
            <button
              onClick={onOpenModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-700 hover:to-rose-600 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-violet-700/20 transition-all select-none cursor-pointer"
            >
              <PlusCircle size={15} />
              Add Reminder
            </button>
          </div>

          {/* Inspirational Quote Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[#1e1b42]/20 p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0 animate-pulse">
              <Zap size={15} />
            </div>
            <p className="text-xs italic text-white/80 leading-relaxed font-normal flex-1">
              "{QUOTES[quoteIdx]}"
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/[0.04] pb-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(["all", "pending", "done"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer"
                  style={{
                    background: filter === f ? "#8b5cf6" : "rgba(255,255,255,0.03)",
                    color: filter === f ? "#fff" : "rgba(255,255,255,0.5)",
                    border: filter === f ? "1px solid #8b5cf6" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search + Sort */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-[#15132d]/45 border border-white/[0.06] rounded-xl px-3 py-1.5 flex-1 sm:w-48">
                <Search size={13} className="text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search routine..."
                  className="bg-transparent text-xs text-white outline-none w-full placeholder-white/35"
                />
                {search && <X size={12} className="text-white/40 cursor-pointer" onClick={() => setSearch("")} />}
              </div>
              <button
                onClick={() => setSort((s) => (s === "time" ? "priority" : "time"))}
                className="flex items-center gap-1 px-3 py-2 border border-white/[0.06] bg-[#15132d]/45 text-white/50 hover:text-white/80 transition-colors text-xs font-bold rounded-xl cursor-pointer"
              >
                <Star size={11} className={sort === "priority" ? "text-amber-400 fill-amber-400" : ""} />
                <span>{sort === "time" ? "Time" : "Priority"}</span>
              </button>
            </div>
          </div>

          {/* Reminders List (Grid layout for Premium feel) */}
          {filteredTasks.length === 0 ? (
            <div className="py-14 border border-dashed border-white/[0.08] bg-[#15132d]/10 rounded-3xl flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                <Target size={24} className="text-white/30" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">
                  {search ? "No matches found" : "All clean!"}
                </h4>
                <p className="text-xs text-white/40 max-w-xs px-4">
                  {search ? "Try refining your query terms." : "No reminder routines scheduled for this day. Click '+' above to start."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar Column - Calendar Strip & Analytics Summary Widget */}
        <div className="lg:col-span-4 flex flex-col gap-6 order-1 lg:order-2">
          
          {/* Calendar Strip Panel */}
          <div className="border border-white/[0.06] bg-[#15132d]/45 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
            <span className="text-xs font-bold text-white/70 flex items-center gap-1.5 select-none">
              <Calendar size={14} className="text-violet-400" />
              Calendar Routine Selector
            </span>
            <div className="flex justify-between gap-1 select-none">
              {calendarWeek.map((day) => {
                const isSelected = selectedDate === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedDate(day.dateStr)}
                    className="flex-1 py-3 px-1 rounded-2xl flex flex-col items-center gap-1.5 transition-all outline-none cursor-pointer"
                    style={{
                      background: isSelected
                        ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                        : "transparent",
                      color: isSelected ? "#fff" : "rgba(255,255,255,0.4)",
                      boxShadow: isSelected ? "0 4px 16px rgba(139, 92, 246, 0.4)" : "none",
                    }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">{day.label}</span>
                    <span
                      className="w-7 h-7 flex items-center justify-center text-xs font-black rounded-full"
                      style={{
                        background: day.isToday && !isSelected ? "rgba(139, 92, 246, 0.15)" : "transparent",
                        color: day.isToday && !isSelected ? "#a78bfa" : undefined,
                      }}
                    >
                      {day.dateNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Circular Progress Ring Widget */}
          <div className="border border-white/[0.06] bg-[#15132d]/45 rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-xs font-bold text-white/70 w-full text-left select-none">
              Today's Completion
            </span>
            
            <div className="relative w-28 h-28 flex items-center justify-center my-2 select-none">
              {/* Circular Progress Path */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-white/[0.05]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-violet-500 transition-all duration-700 ease-out"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white">{progressPercent}%</span>
                <span className="text-[9px] text-white/40 uppercase font-semibold">Progress</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-white/70 font-semibold mb-1">
                {completedCount} of {selectedDateTasks.length} reminders completed
              </p>
              <p className="text-[10px] text-white/40 leading-relaxed font-normal">
                Select other weekdays above to build or review routines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App Shell Layout ───────────────────────────────────────────────────

export default function App() {
  // Sound effect state
  const [sound, setSound] = useState(() => {
    const saved = localStorage.getItem("align_sound");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // State initialization with localStorage
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("align_tasks");
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<CompletionRecord[]>(() => {
    const saved = localStorage.getItem("align_completion_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [profile, setProfile] = useState<Profile>(() => {
    const saved = localStorage.getItem("align_profile");
    if (saved) return JSON.parse(saved);
    return {
      name: "Alex Johnson",
      tagline: "Building better habits, one daily routine at a time.",
      avatarColor: "#8b5cf6",
      dailyGoal: 5,
      joinDate: "July 2026",
    };
  });

  const [totalCreatedCount, setTotalCreatedCount] = useState<number>(() => {
    const saved = localStorage.getItem("align_total_created");
    return saved ? JSON.parse(saved) : 0;
  });

  const [tab, setTab] = useState<Tab>("home");
  const [modalOpen, setModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString(new Date()));

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem("align_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("align_completion_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("align_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("align_sound", JSON.stringify(sound));
  }, [sound]);

  useEffect(() => {
    localStorage.setItem("align_total_created", JSON.stringify(totalCreatedCount));
  }, [totalCreatedCount]);

  // Complete/Toggle Reminder
  const handleToggle = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const newCompletedState = !t.completed;

        // Sound effect
        if (newCompletedState) {
          playChime(sound);
        }

        // Manage completion history record
        if (newCompletedState) {
          const rec: CompletionRecord = {
            taskId: t.id,
            taskName: t.name,
            date: t.date,
            category: t.category,
            priority: t.priority,
            completedAt: Date.now(),
          };
          setHistory((h) => [...h.filter((x) => x.taskId !== id || x.date !== t.date), rec]);
        } else {
          setHistory((h) => h.filter((x) => !(x.taskId === id && x.date === t.date)));
        }

        return { ...t, completed: newCompletedState, completedAt: newCompletedState ? Date.now() : undefined };
      })
    );
  }, [sound]);

  // Delete Reminder
  const handleDelete = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setHistory((h) => h.filter((x) => x.taskId !== id));
  }, []);

  // Open Edit Task Modal
  const handleEditInit = useCallback((task: Task) => {
    setEditingTask(task);
    setModal(true);
  }, []);

  // Save Task (Add or Update)
  const handleSaveTask = useCallback((payload: Omit<Task, "id" | "completed"> & { id?: string }) => {
    if (payload.id) {
      // Update
      setTasks((prev) =>
        prev.map((t) => (t.id === payload.id ? { ...t, ...payload } : t))
      );
    } else {
      // Create
      const newTask: Task = {
        ...payload,
        id: Date.now().toString(),
        completed: false,
      };
      setTasks((prev) => [...prev, newTask]);
      setTotalCreatedCount((c) => c + 1);
    }
  }, []);

  // Data Seeder Setting
  const handleSeed = () => {
    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const prevDay = new Date();
    prevDay.setDate(prevDay.getDate() - 2);
    const prevDayStr = getLocalDateString(prevDay);

    const seedTasks: Task[] = [
      { id: "seed-1", name: "Morning meditation cardio", time: "07:30", notes: "10 mins breathing + light stretch", category: "mindfulness", priority: "high", completed: true, date: todayStr, completedAt: Date.now() },
      { id: "seed-2", name: "Team standup zoom meeting", time: "09:30", notes: "Status check & next project goals", category: "work", priority: "high", completed: false, date: todayStr },
      { id: "seed-3", name: "Drink 2L mineral water", time: "11:00", notes: "Keep hydrated all day", category: "health", priority: "medium", completed: true, date: todayStr, completedAt: Date.now() },
      { id: "seed-4", name: "Read 15 pages of book", time: "20:30", notes: "Non-fiction personal growth", category: "personal", priority: "low", completed: false, date: todayStr },
      { id: "seed-5", name: "Gym core/chest workout", time: "18:00", notes: "45 minutes focus", category: "fitness", priority: "medium", completed: true, date: yesterdayStr, completedAt: Date.now() - 86400000 },
      { id: "seed-6", name: "Plan tomorrow routine log", time: "22:00", notes: "Lock priority actions", category: "work", priority: "low", completed: true, date: yesterdayStr, completedAt: Date.now() - 80000000 },
      { id: "seed-7", name: "Stretching and yoga poses", time: "21:30", notes: "Relax hamstrings and hips", category: "mindfulness", priority: "medium", completed: true, date: prevDayStr, completedAt: Date.now() - 172800000 },
    ];

    const seedHistory: CompletionRecord[] = [
      { taskId: "seed-1", taskName: "Morning meditation cardio", date: todayStr, category: "mindfulness", priority: "high", completedAt: Date.now() },
      { taskId: "seed-3", taskName: "Drink 2L mineral water", date: todayStr, category: "health", priority: "medium", completedAt: Date.now() },
      { taskId: "seed-5", taskName: "Gym core/chest workout", date: yesterdayStr, category: "fitness", priority: "medium", completedAt: Date.now() - 86400000 },
      { taskId: "seed-6", taskName: "Plan tomorrow routine log", date: yesterdayStr, category: "work", priority: "low", completedAt: Date.now() - 80000000 },
      { taskId: "seed-7", taskName: "Stretching and yoga poses", date: prevDayStr, category: "mindfulness", priority: "medium", completedAt: Date.now() - 172800000 },
    ];

    setTasks(seedTasks);
    setHistory(seedHistory);
    setTotalCreatedCount(15);
  };

  // Clear Database Setting
  const handleClear = () => {
    setTasks([]);
    setHistory([]);
    setTotalCreatedCount(0);
    localStorage.removeItem("align_tasks");
    localStorage.removeItem("align_completion_history");
    localStorage.removeItem("align_total_created");
  };

  return (
    <>
      <div className="min-h-screen w-full flex bg-[#070514] text-[#f0eeff] overflow-x-hidden font-sans relative">
        <AmbientOrbs />

        {/* Desktop Left Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-72 h-screen border-r border-white/[0.05] bg-[#0e0c21]/80 backdrop-blur-xl p-6 sticky top-0 z-30 select-none justify-between">
          <div className="flex flex-col gap-8">
            {/* Logo Brand */}
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-rose-400 shadow-md shadow-violet-500/20">
                <Target size={15} color="#fff" strokeWidth={3} />
              </div>
              <span className="text-lg font-black tracking-widest text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                ALIGN
              </span>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-1.5">
              {[
                { id: "home", label: "Reminders", icon: <Home size={18} /> },
                { id: "stats", label: "Analytics", icon: <BarChart2 size={18} /> },
                { id: "profile", label: "Profile", icon: <User size={18} /> },
                { id: "settings", label: "Settings", icon: <Settings size={18} /> },
              ].map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id as Tab)}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all outline-none cursor-pointer"
                    style={{
                      background: active ? "rgba(139, 92, 246, 0.08)" : "transparent",
                      color: active ? "#a78bfa" : "rgba(255, 255, 255, 0.45)",
                      border: active ? "1px solid rgba(139, 92, 246, 0.15)" : "1px solid transparent",
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer User Card */}
          <div className="border-t border-white/[0.04] pt-5 flex items-center gap-3">
            <Avatar profile={profile} size={42} />
            <div className="min-w-0">
              <h4 className="text-xs font-black text-white truncate">{profile.name}</h4>
              <p className="text-[10px] text-white/40 truncate">{profile.tagline}</p>
            </div>
          </div>
        </aside>

        {/* Mobile Top Branding Bar */}
        <div className="lg:hidden flex items-center justify-between w-full h-14 border-b border-white/[0.04] bg-[#0c0a20]/95 backdrop-blur-lg px-6 fixed top-0 left-0 right-0 z-30 select-none animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-rose-400">
              <Target size={13} color="#fff" strokeWidth={3} />
            </div>
            <span className="text-sm font-black tracking-widest text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              ALIGN
            </span>
          </div>
          <Avatar profile={profile} size={30} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 px-6 pt-20 pb-24 lg:py-10">
          <div className="w-full flex-1 flex flex-col">
            {tab === "home" && (
              <HomeScreen
                tasks={tasks}
                history={history}
                profile={profile}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEditInit}
                onOpenModal={() => {
                  setEditingTask(null);
                  setModal(true);
                }}
              />
            )}
            {tab === "stats" && <StatsScreen history={history} totalCreated={totalCreatedCount} />}
            {tab === "profile" && <ProfileScreen profile={profile} setProfile={setProfile} history={history} />}
            {tab === "settings" && <SettingsScreen sound={sound} setSound={setSound} onSeed={handleSeed} onClear={handleClear} />}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden flex items-center justify-around w-full h-16 border-t border-white/[0.04] bg-[#0c0a20]/96 backdrop-blur-xl px-2 pb-2 pt-1 fixed bottom-0 left-0 right-0 z-30 select-none">
          {[
            { id: "home", label: "Reminders", icon: <Home size={18} /> },
            { id: "stats", label: "Analytics", icon: <BarChart2 size={18} /> },
            { id: "profile", label: "Profile", icon: <User size={18} /> },
            { id: "settings", label: "Settings", icon: <Settings size={18} /> },
          ].map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as Tab)}
                className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 text-center transition-all outline-none cursor-pointer"
                style={{
                  color: active ? "#a78bfa" : "rgba(255, 255, 255, 0.4)",
                }}
              >
                {item.icon}
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        selectedDate={selectedDate}
      />
    </>
  );
}
