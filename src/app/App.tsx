import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Plus, Trash2, Check, Clock, StickyNote, X, Bell, Search,
  BarChart2, Settings, Home, Flame, Star, AlertCircle,
  ChevronRight, RefreshCw, TrendingUp, Award, Zap,
  User, Edit3, Target, Calendar, Save,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
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
  completedAt?: number;
}

interface Profile {
  name: string;
  tagline: string;
  avatarColor: string;
  dailyGoal: number;
  joinDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<Category, { label: string; color: string; bg: string }> = {
  health:      { label: "Health",      color: "#48dbac", bg: "#e8fdf6" },
  work:        { label: "Work",        color: "#7c6ff7", bg: "#f0eeff" },
  personal:    { label: "Personal",    color: "#ffc048", bg: "#fff8e6" },
  fitness:     { label: "Fitness",     color: "#ff6b6b", bg: "#fff0f0" },
  mindfulness: { label: "Mindfulness", color: "#54a0ff", bg: "#eef5ff" },
};

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  high:   { label: "High",   color: "#ff6b6b" },
  medium: { label: "Medium", color: "#ffc048" },
  low:    { label: "Low",    color: "#48dbac" },
};

const AVATAR_COLORS = [
  "#7c6ff7","#ff6b6b","#48dbac","#ffc048","#54a0ff","#f368e0","#ff9f43","#00d2d3",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const QUOTES = [
  "Small steps every day lead to big changes.",
  "Discipline is choosing between what you want now and what you want most.",
  "Progress, not perfection.",
  "One day at a time. One task at a time.",
  "Your future self is watching. Make them proud.",
  "Consistency beats intensity.",
  "Done is better than perfect.",
];

const INITIAL_TASKS: Task[] = [
  { id: "1", name: "Morning meditation",  time: "07:00", notes: "10 minutes of focused breathing",   category: "mindfulness", priority: "high",   completed: false },
  { id: "2", name: "Take vitamins",       time: "08:00", notes: "D3, Omega-3, Magnesium",            category: "health",      priority: "medium", completed: true  },
  { id: "3", name: "Team standup",        time: "09:30", notes: "Zoom — share screen",               category: "work",        priority: "high",   completed: false },
  { id: "4", name: "Lunch walk",          time: "12:30", notes: "At least 20 minutes outside",      category: "fitness",     priority: "medium", completed: false },
  { id: "5", name: "Read 30 pages",       time: "20:00", notes: "Currently: The Almanack",           category: "personal",    priority: "low",    completed: false },
  { id: "6", name: "Evening stretch",     time: "21:00", notes: "Hip flexors and shoulders",         category: "fitness",     priority: "low",    completed: false },
  { id: "7", name: "Review tomorrow",     time: "22:00", notes: "5-min plan for the next day",       category: "work",        priority: "medium", completed: false },
];

const INITIAL_PROFILE: Profile = {
  name: "Alex",
  tagline: "Building better habits, one day at a time.",
  avatarColor: "#7c6ff7",
  dailyGoal: 6,
  joinDate: "Jan 2025",
};

const WEEKLY_DATA = [
  { day: "Mon", done: 5, total: 7 },
  { day: "Tue", done: 7, total: 7 },
  { day: "Wed", done: 4, total: 7 },
  { day: "Thu", done: 6, total: 7 },
  { day: "Fri", done: 3, total: 7 },
  { day: "Sat", done: 7, total: 7 },
  { day: "Sun", done: 2, total: 7 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  return `${h % 12 || 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
}

function isOverdue(time: string) {
  const now = new Date();
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

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ profile, size = 44, pulse = false }: { profile: Profile; size?: number; pulse?: boolean }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${profile.avatarColor} 0%, ${profile.avatarColor}bb 100%)`,
        fontSize: size * 0.36,
        color: "#fff",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxShadow: `0 4px 16px ${profile.avatarColor}55`,
        animation: pulse ? "breathe 3s ease-in-out infinite" : "none",
      }}
    >
      {getInitials(profile.name)}
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function Confetti({ origin }: { origin: { x: number; y: number } }) {
  const colors = ["#7c6ff7","#ff6b6b","#48dbac","#ffc048","#54a0ff","#ffffff"];
  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 170,
    color: colors[i % colors.length],
    size: Math.random() * 6 + 4,
    delay: Math.random() * 0.15,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50" style={{ overflow: "hidden" }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: origin.x + p.x,
            top: origin.y,
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `confettiFall 0.9s ease-out ${p.delay}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Ambient Orbs ─────────────────────────────────────────────────────────────

function AmbientOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[
        { size: 200, x: "10%", y: "5%",  color: "rgba(124,111,247,0.12)", dur: "8s"  },
        { size: 150, x: "70%", y: "15%", color: "rgba(255,107,107,0.08)", dur: "11s" },
        { size: 120, x: "50%", y: "60%", color: "rgba(72,219,172,0.07)",  dur: "9s"  },
        { size: 180, x: "80%", y: "75%", color: "rgba(84,160,255,0.09)",  dur: "13s" },
        { size: 90,  x: "20%", y: "80%", color: "rgba(255,192,72,0.07)",  dur: "7s"  },
      ].map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            animation: `orbFloat ${orb.dur} ease-in-out infinite alternate`,
            animationDelay: `${i * 1.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Ripple FAB ───────────────────────────────────────────────────────────────

function RippleFAB({ onClick }: { onClick: () => void }) {
  const [ripples, setRipples] = useState<number[]>([]);
  const handleClick = () => {
    const id = Date.now();
    setRipples((r) => [...r, id]);
    setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 600);
    onClick();
  };
  return (
    <button
      onClick={handleClick}
      className="absolute bottom-20 right-6 w-14 h-14 rounded-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)",
        boxShadow: "0 6px 24px rgba(255,107,107,0.5)",
        animation: "fabPulse 2.5s ease-in-out infinite",
        zIndex: 10,
      }}
    >
      {ripples.map((id) => (
        <span key={id} className="absolute inset-0 rounded-full"
          style={{ background: "rgba(255,255,255,0.35)", animation: "rippleOut 0.6s ease-out forwards" }} />
      ))}
      <Plus size={24} color="#fff" strokeWidth={2.5} style={{ position: "relative", zIndex: 1 }} />
    </button>
  );
}

// ─── Swipe Card ───────────────────────────────────────────────────────────────

interface SwipeCardProps {
  task: Task;
  index: number;
  onComplete: (id: string, rect: DOMRect) => void;
  onDelete: (id: string) => void;
}

function SwipeCard({ task, index, onComplete, onDelete }: SwipeCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const THRESHOLD = 100;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 55);
    return () => clearTimeout(t);
  }, [index]);

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
    cardRef.current?.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - startX.current);
  };
  const handlePointerUp = () => {
    setIsDragging(false);
    if (offsetX > THRESHOLD) {
      setDismissed(true);
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect) setTimeout(() => onComplete(task.id, rect), 50);
    } else if (offsetX < -THRESHOLD) {
      setDismissed(true);
      setTimeout(() => onDelete(task.id), 300);
    } else {
      setOffsetX(0);
    }
  };

  const swipeProgress = Math.min(Math.abs(offsetX) / THRESHOLD, 1);
  const showComplete = offsetX > 20;
  const showDelete = offsetX < -20;
  const cat = CATEGORY_META[task.category];
  const pri = PRIORITY_META[task.priority];
  const overdue = !task.completed && isOverdue(task.time);

  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-3"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(18px)",
        transition: dismissed
          ? "height 0.3s ease, opacity 0.3s ease"
          : `opacity 0.4s ease ${index * 0.055}s, transform 0.4s ease ${index * 0.055}s`,
        height: dismissed ? 0 : undefined,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl">
        <div className="flex items-center gap-2 font-semibold text-sm"
          style={{ color: "#48dbac", opacity: showComplete ? swipeProgress : 0 }}>
          <Check size={20} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Done!</span>
        </div>
        <div className="flex items-center gap-2 font-semibold text-sm"
          style={{ color: "#ff6b6b", opacity: showDelete ? swipeProgress : 0 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Delete</span>
          <Trash2 size={20} />
        </div>
      </div>

      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative bg-card rounded-2xl px-4 py-4 cursor-grab active:cursor-grabbing select-none"
        style={{
          transform: `translateX(${dismissed ? (offsetX > 0 ? 420 : -420) : offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          opacity: task.completed ? 0.55 : 1,
          boxShadow: "0 2px 16px rgba(15,14,42,0.1)",
        }}
      >
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: pri.color }} />
        <div className="flex items-start gap-3 pl-2">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { const r = cardRef.current?.getBoundingClientRect(); if (r) onComplete(task.id, r); }}
            className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
            style={{
              borderColor: task.completed ? "#48dbac" : "#d1cff0",
              background: task.completed ? "#48dbac" : "transparent",
              boxShadow: task.completed ? "0 0 8px rgba(72,219,172,0.4)" : "none",
            }}
          >
            {task.completed && <Check size={13} color="#fff" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold leading-snug"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "0.9375rem",
                  color: task.completed ? "#a09cc4" : "#1a1535",
                  textDecoration: task.completed ? "line-through" : "none",
                }}>
                {task.name}
              </p>
              <ChevronRight size={15} style={{ color: "#d1cff0", flexShrink: 0 }} />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-medium"
                style={{ color: overdue ? "#ff6b6b" : "#8b85b8", fontFamily: "'Nunito', sans-serif", animation: overdue ? "overdueFlash 1.5s ease-in-out infinite" : "none" }}>
                {overdue && <AlertCircle size={10} />}
                <Clock size={10} />
                {formatTime(task.time)}{overdue && " · Overdue"}
              </span>
              {task.notes && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#b8b4d8", fontFamily: "'Nunito', sans-serif" }}>
                  <StickyNote size={10} />
                  {task.notes.length > 24 ? task.notes.slice(0, 24) + "…" : task.notes}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: cat.bg, color: cat.color, fontFamily: "'Nunito', sans-serif" }}>
                {cat.label}
              </span>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${pri.color}18`, color: pri.color, fontFamily: "'Nunito', sans-serif" }}>
                {task.priority === "high" ? "🔥" : task.priority === "medium" ? "⚡" : "•"} {pri.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Task Modal ────────────────────────────────────────────────────────────

function AddTaskModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (t: Omit<Task,"id"|"completed">) => void }) {
  const [name, setName]         = useState("");
  const [time, setTime]         = useState("08:00");
  const [notes, setNotes]       = useState("");
  const [category, setCategory] = useState<Category>("personal");
  const [priority, setPriority] = useState<Priority>("medium");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), time, notes: notes.trim(), category, priority });
    setName(""); setTime("08:00"); setNotes(""); setCategory("personal"); setPriority("medium");
    onClose();
  };

  const iStyle: React.CSSProperties = { background: "#f5f4ff", color: "#1a1535", fontFamily: "'Nunito', sans-serif", border: "2px solid transparent", transition: "border-color 0.2s" };
  const focusOn  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "#7c6ff7");
  const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "transparent");

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: "rgba(10,9,30,0.75)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full"
        style={{ maxWidth: 430, transform: `translateX(-50%) translateY(${open ? 0 : "100%"})`, transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        <div className="bg-white rounded-t-3xl px-6 pt-4 pb-8" style={{ boxShadow: "0 -8px 48px rgba(15,14,42,0.3)" }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "#e0ddf5" }} />
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold" style={{ color: "#1a1535", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>New Reminder</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#f0eeff" }}>
              <X size={16} color="#7c6ff7" />
            </button>
          </div>

          {[
            { label: "Task name", el: <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning run" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={iStyle} onFocus={focusOn} onBlur={focusOff} /> },
            { label: "Time",      el: <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={iStyle} onFocus={focusOn} onBlur={focusOff} /> },
          ].map(({ label, el }) => (
            <div key={label} className="mb-4">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>{label}</label>
              {el}
            </div>
          ))}

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>Priority</label>
            <div className="flex gap-2">
              {(["high","medium","low"] as Priority[]).map((p) => {
                const m = PRIORITY_META[p]; const sel = priority === p;
                return (
                  <button key={p} onClick={() => setPriority(p)} className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                    style={{ background: sel ? m.color : `${m.color}15`, color: sel ? "#fff" : m.color, fontFamily: "'Nunito', sans-serif", transform: sel ? "scale(1.04)" : "scale(1)", boxShadow: sel ? `0 2px 10px ${m.color}44` : "none" }}>
                    {p === "high" ? "🔥" : p === "medium" ? "⚡" : "•"} {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>Category</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
                const m = CATEGORY_META[cat]; const sel = category === cat;
                return (
                  <button key={cat} onClick={() => setCategory(cat)} className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{ background: sel ? m.color : m.bg, color: sel ? "#fff" : m.color, fontFamily: "'Nunito', sans-serif", transform: sel ? "scale(1.05)" : "scale(1)", boxShadow: sel ? `0 2px 8px ${m.color}44` : "none" }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note..." rows={2}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={iStyle}
              onFocus={focusOn as any} onBlur={focusOff as any} />
          </div>

          <button onClick={handleSubmit} disabled={!name.trim()}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: name.trim() ? "linear-gradient(135deg, #7c6ff7 0%, #9d89ff 100%)" : "#e0ddf5", color: name.trim() ? "#fff" : "#b8b4d8", boxShadow: name.trim() ? "0 4px 20px rgba(124,111,247,0.4)" : "none", cursor: name.trim() ? "pointer" : "default" }}>
            Add Reminder
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Stats Screen ─────────────────────────────────────────────────────────────

function StatsScreen({ tasks }: { tasks: Task[] }) {
  const completedCount = tasks.filter((t) => t.completed).length;
  const rate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const catData = (Object.keys(CATEGORY_META) as Category[]).map((cat) => ({
    name: CATEGORY_META[cat].label, value: tasks.filter((t) => t.category === cat).length, color: CATEGORY_META[cat].color,
  })).filter((d) => d.value > 0);

  return (
    <div className="px-6 pt-2 pb-6 overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
      <h2 className="text-xl font-extrabold mb-1" style={{ color: "#f0eeff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your Progress</h2>
      <p className="text-xs mb-5" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>This week at a glance</p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: <Check size={16} color="#48dbac" />, label: "Completed", val: completedCount, bg: "rgba(72,219,172,0.12)" },
          { icon: <TrendingUp size={16} color="#7c6ff7" />, label: "Rate", val: `${rate}%`, bg: "rgba(124,111,247,0.12)" },
          { icon: <Flame size={16} color="#ff6b6b" />, label: "Streak", val: "5 🔥", bg: "rgba(255,107,107,0.12)" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl p-3 flex flex-col gap-1.5 items-center"
            style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.12)", animation: `statBounce 0.5s ease ${i * 0.1}s both` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>{kpi.icon}</div>
            <span className="text-lg font-extrabold" style={{ color: "#f0eeff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{kpi.val}</span>
            <span className="text-xs" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.12)" }}>
        <p className="text-sm font-bold mb-3" style={{ color: "#c4bdff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Weekly Completion</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={WEEKLY_DATA} barSize={22} barGap={4}>
            <XAxis dataKey="day" tick={{ fill: "#8b85b8", fontSize: 11, fontFamily: "'Nunito', sans-serif" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "#13113a", border: "1px solid rgba(124,111,247,0.2)", borderRadius: 10, color: "#f0eeff", fontFamily: "'Nunito', sans-serif", fontSize: 12 }} cursor={{ fill: "rgba(124,111,247,0.08)" }} />
            <Bar dataKey="total" fill="rgba(124,111,247,0.15)" radius={[6,6,0,0]} />
            <Bar dataKey="done"  fill="#7c6ff7"               radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.12)" }}>
        <p className="text-sm font-bold mb-3" style={{ color: "#c4bdff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>By Category</p>
        <div className="flex items-center gap-4">
          <PieChart width={120} height={120}>
            <Pie data={catData} dataKey="value" cx={55} cy={55} innerRadius={32} outerRadius={52} strokeWidth={0}>
              {catData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
          <div className="flex flex-col gap-2 flex-1">
            {catData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs" style={{ color: "#c4bdff", fontFamily: "'Nunito', sans-serif" }}>{d.name}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: "#f0eeff", fontFamily: "'Nunito', sans-serif" }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

function ProfileScreen({ profile, setProfile, tasks }: { profile: Profile; setProfile: (p: Profile) => void; tasks: Task[] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState<Profile>(profile);

  const save = () => { setProfile(draft); setEditing(false); };
  const cancel = () => { setDraft(profile); setEditing(false); };

  const totalCompleted = tasks.filter((t) => t.completed).length + 42; // simulated history

  const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none";
  const inputSty: React.CSSProperties = { background: "#13113a", color: "#f0eeff", border: "1px solid rgba(124,111,247,0.25)", fontFamily: "'Nunito', sans-serif", transition: "border-color 0.2s" };

  return (
    <div className="px-6 pt-2 pb-6 overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
      {/* Profile card */}
      <div
        className="rounded-3xl p-5 mb-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e1b42 0%, #261e55 100%)", border: "1px solid rgba(124,111,247,0.2)" }}
      >
        {/* Shimmer */}
        <div className="absolute inset-0 pointer-events-none" style={{ animation: "shimmerSlide 4s ease-in-out infinite", background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)", backgroundSize: "200% 100%" }} />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <Avatar profile={editing ? draft : profile} size={68} pulse />
            <div>
              {editing ? (
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className={inputCls}
                  style={{ ...inputSty, fontSize: "1.1rem", fontWeight: 700, padding: "6px 12px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
              ) : (
                <h2 className="text-xl font-extrabold" style={{ color: "#f0eeff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {profile.name}
                </h2>
              )}
              <p className="text-xs mt-0.5" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
                Member since {profile.joinDate}
              </p>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(124,111,247,0.15)", border: "1px solid rgba(124,111,247,0.3)" }}>
              <Edit3 size={14} color="#c4bdff" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancel} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,107,107,0.15)" }}>
                <X size={14} color="#ff6b6b" />
              </button>
              <button onClick={save} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(72,219,172,0.15)" }}>
                <Save size={14} color="#48dbac" />
              </button>
            </div>
          )}
        </div>

        {/* Tagline */}
        {editing ? (
          <input value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
            placeholder="Your tagline..." className={inputCls} style={inputSty} />
        ) : (
          <p className="text-sm italic" style={{ color: "#9d97c8", fontFamily: "'Nunito', sans-serif" }}>
            "{profile.tagline}"
          </p>
        )}

        {/* Color picker */}
        {editing && (
          <div className="mt-3">
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>Avatar color</p>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button key={c} onClick={() => setDraft({ ...draft, avatarColor: c })}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    transform: draft.avatarColor === c ? "scale(1.25)" : "scale(1)",
                    boxShadow: draft.avatarColor === c ? `0 0 10px ${c}88` : "none",
                    border: draft.avatarColor === c ? "2px solid #fff" : "2px solid transparent",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: <Check size={15} color="#48dbac" />, label: "Total done",   val: totalCompleted, bg: "rgba(72,219,172,0.1)" },
          { icon: <Flame size={15} color="#ff6b6b" />, label: "Day streak",   val: "5 🔥",         bg: "rgba(255,107,107,0.1)" },
          { icon: <Target size={15} color="#ffc048" />, label: "Daily goal",  val: profile.dailyGoal, bg: "rgba(255,192,72,0.1)" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-3 flex flex-col items-center gap-1.5"
            style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.1)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>{s.icon}</div>
            <span className="text-base font-extrabold" style={{ color: "#f0eeff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.val}</span>
            <span className="text-xs text-center" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Daily goal editor */}
      {editing && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.12)" }}>
          <p className="text-sm font-bold mb-3" style={{ color: "#c4bdff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Daily task goal</p>
          <div className="flex items-center gap-3">
            {[3,5,6,7,8,10].map((n) => (
              <button key={n} onClick={() => setDraft({ ...draft, dailyGoal: n })}
                className="w-10 h-10 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: draft.dailyGoal === n ? "#7c6ff7" : "rgba(124,111,247,0.1)",
                  color: draft.dailyGoal === n ? "#fff" : "#8b85b8",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: draft.dailyGoal === n ? "0 2px 10px rgba(124,111,247,0.4)" : "none",
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      <p className="text-sm font-bold mb-3" style={{ color: "#c4bdff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Achievements</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "🔥", label: "5-Day Streak",  unlocked: true  },
          { icon: "⚡", label: "Speed Run",      unlocked: true  },
          { icon: "🌟", label: "Perfectionist",  unlocked: false },
          { icon: "🏆", label: "Champion",       unlocked: false },
          { icon: "🎯", label: "On Target",      unlocked: true  },
          { icon: "💎", label: "Diamond",        unlocked: false },
        ].map((a, i) => (
          <div key={i} className="rounded-2xl p-3 flex flex-col items-center gap-1.5"
            style={{ background: a.unlocked ? "#1e1b42" : "#16143a", border: `1px solid ${a.unlocked ? "rgba(124,111,247,0.2)" : "rgba(124,111,247,0.06)"}`, opacity: a.unlocked ? 1 : 0.4 }}>
            <span className="text-2xl">{a.icon}</span>
            <span className="text-xs text-center font-semibold" style={{ color: a.unlocked ? "#c4bdff" : "#4a456e", fontFamily: "'Nunito', sans-serif" }}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Screen ───────────────────────────────────────────────────────────

function SettingsScreen() {
  const [sound, setSound]     = useState(true);
  const [darkMode, setDark]   = useState(true);
  const [notifTime, setNotif] = useState("10");

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="relative w-12 h-6 rounded-full transition-all duration-300"
      style={{ background: on ? "#7c6ff7" : "#2e2a5a", boxShadow: on ? "0 0 12px rgba(124,111,247,0.4)" : "none" }}>
      <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300" style={{ left: on ? "calc(100% - 20px)" : 4 }} />
    </button>
  );

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid rgba(124,111,247,0.1)" }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: "#f0eeff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="px-6 pt-2 pb-6 overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
      <h2 className="text-xl font-extrabold mb-1" style={{ color: "#f0eeff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Settings</h2>
      <p className="text-xs mb-5" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>Customize your experience</p>
      <div className="rounded-2xl px-4 mb-4" style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.12)" }}>
        <Row label="Sound effects" sub="Play sounds on task completion"><Toggle on={sound} onToggle={() => setSound((v) => !v)} /></Row>
        <Row label="Dark mode" sub="Adjust the app appearance"><Toggle on={darkMode} onToggle={() => setDark((v) => !v)} /></Row>
        <Row label="Notify before" sub="Minutes before scheduled task">
          <select value={notifTime} onChange={(e) => setNotif(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
            style={{ background: "#13113a", color: "#c4bdff", border: "1px solid rgba(124,111,247,0.2)", fontFamily: "'Nunito', sans-serif" }}>
            {["5","10","15","30"].map((v) => <option key={v} value={v}>{v} min</option>)}
          </select>
        </Row>
      </div>
    </div>
  );
}

// ─── Bottom Nav ────────────────────────────────────────────────────────────────

function BottomNav({ tab, setTab, profile }: { tab: Tab; setTab: (t: Tab) => void; profile: Profile }) {
  const items: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "home",     icon: <Home size={19} />,     label: "Home"    },
    { id: "stats",    icon: <BarChart2 size={19} />, label: "Stats"   },
    { id: "profile",  icon: <User size={19} />,      label: "Profile" },
    { id: "settings", icon: <Settings size={19} />,  label: "More"    },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 pt-3 pb-4"
      style={{ background: "rgba(19,17,58,0.96)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(124,111,247,0.12)", zIndex: 20 }}>
      {items.map((item) => {
        const active = tab === item.id;
        return (
          <button key={item.id} onClick={() => setTab(item.id)}
            className="flex flex-col items-center gap-1 px-4 transition-all"
            style={{ color: active ? "#7c6ff7" : "#4a456e", transform: active ? "translateY(-2px)" : "none" }}>
            {item.id === "profile" ? (
              <div style={{
                padding: 2,
                borderRadius: "50%",
                border: active ? `2px solid ${profile.avatarColor}` : "2px solid transparent",
                boxShadow: active ? `0 0 8px ${profile.avatarColor}88` : "none",
                transition: "all 0.2s",
              }}>
                <Avatar profile={profile} size={26} />
              </div>
            ) : (
              <div style={{ filter: active ? "drop-shadow(0 0 6px rgba(124,111,247,0.6))" : "none", transition: "filter 0.2s" }}>
                {item.icon}
              </div>
            )}
            <span className="text-xs font-semibold" style={{ fontFamily: "'Nunito', sans-serif", color: active ? "#c4bdff" : "#4a456e" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Home Screen ───────────────────────────────────────────────────────────────

function HomeScreen({
  tasks, profile, onComplete, onDelete, onOpenModal,
}: {
  tasks: Task[];
  profile: Profile;
  onComplete: (id: string, rect: DOMRect) => void;
  onDelete: (id: string) => void;
  onOpenModal: () => void;
}) {
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<"all"|"pending"|"done">("all");
  const [sort, setSort]         = useState<"time"|"priority">("time");
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [calVisible, setCalVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const now = new Date();

  useEffect(() => {
    const id = setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 6000);
    return () => clearInterval(id);
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCalVisible(el.scrollTop < 48);
  };

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (filter === "pending") return !t.completed;
      if (filter === "done")    return t.completed;
      return true;
    });
    if (search.trim()) list = list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return [...list].sort((a, b) =>
      sort === "priority" ? order[a.priority] - order[b.priority] : a.time.localeCompare(b.time)
    );
  }, [tasks, filter, search, sort]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? completedCount / tasks.length : 0;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    return { label: DAYS[i], date: d.getDate(), isToday: i === now.getDay() };
  });

  return (
    <>
      {/* Static header (never scrolls) */}
      <div className="flex-shrink-0 px-6 pt-2 pb-3">
        {/* Greeting row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
              {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
            </p>
            <h1 className="text-[1.35rem] font-extrabold leading-tight" style={{ color: "#f0eeff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {greetingWord()},{" "}
              <span style={{ color: profile.avatarColor }}>{profile.name.split(" ")[0]}</span> 👋
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.2)" }}>
              <RefreshCw size={14} color="#7c6ff7" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.2)" }}>
              <Bell size={14} color="#7c6ff7" />
            </button>
          </div>
        </div>

        {/* Quote */}
        <div className="px-3 py-2 rounded-xl flex items-center gap-2 mb-3"
          style={{ background: "rgba(124,111,247,0.08)", border: "1px solid rgba(124,111,247,0.12)" }}>
          <Zap size={13} color="#ffc048" />
          <p key={quoteIdx} className="text-xs italic flex-1"
            style={{ color: "#c4bdff", fontFamily: "'Nunito', sans-serif", animation: "quoteFade 0.5s ease" }}>
            "{QUOTES[quoteIdx]}"
          </p>
        </div>

        {/* Progress card */}
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7c6ff7 0%, #5d52e0 100%)", boxShadow: "0 8px 24px rgba(124,111,247,0.35)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ animation: "shimmerSlide 3s ease-in-out infinite", background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)", backgroundSize: "200% 100%" }} />
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold opacity-75 text-white" style={{ fontFamily: "'Nunito', sans-serif" }}>Today's Progress</p>
              <p className="text-2xl font-extrabold text-white mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {completedCount} <span className="text-base font-medium opacity-70">/ {tasks.length}</span>
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.3)", animation: "breathe 3s ease-in-out infinite" }}>
                <span className="text-sm font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <span className="text-xs font-semibold text-white opacity-75" style={{ fontFamily: "'Nunito', sans-serif" }}>🔥 5-day streak</span>
            </div>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${progress * 100}%`, background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.6)" }} />
          </div>
        </div>

        {/* Calendar strip — collapses on scroll */}
        <div style={{
          maxHeight: calVisible ? 80 : 0,
          opacity: calVisible ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
          marginTop: calVisible ? 12 : 0,
        }}>
          <div className="flex justify-between">
            {weekDays.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-medium" style={{ color: d.isToday ? "#c4bdff" : "#4a456e", fontFamily: "'Nunito', sans-serif" }}>
                  {d.label}
                </span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: d.isToday ? "#7c6ff7" : "transparent",
                    color: d.isToday ? "#fff" : "#6b6490",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: d.isToday ? "0 2px 10px rgba(124,111,247,0.5)" : "none",
                    animation: d.isToday ? "breathe 3s ease-in-out infinite" : "none",
                  }}>
                  {d.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search + filters */}
        <div className="mt-3">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2.5"
            style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.12)" }}>
            <Search size={14} color="#8b85b8" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "#f0eeff", fontFamily: "'Nunito', sans-serif" }} />
            {search && <button onClick={() => setSearch("")}><X size={13} color="#8b85b8" /></button>}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {(["all","pending","done"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all"
                  style={{ fontFamily: "'Nunito', sans-serif", background: filter === f ? "#7c6ff7" : "#1e1b42", color: filter === f ? "#fff" : "#8b85b8", boxShadow: filter === f ? "0 2px 10px rgba(124,111,247,0.4)" : "none" }}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => setSort((s) => s === "time" ? "priority" : "time")}
              className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
              style={{ background: "#1e1b42", color: "#8b85b8", fontFamily: "'Nunito', sans-serif", border: "1px solid rgba(124,111,247,0.15)" }}>
              <Star size={10} />
              {sort === "time" ? "Time" : "Priority"}
            </button>
          </div>
        </div>

        <p className="text-xs mt-2" style={{ color: "#3d3860", fontFamily: "'Nunito', sans-serif" }}>
          ← swipe to delete &nbsp;·&nbsp; → swipe to complete
        </p>
      </div>

      {/* Scrollable task list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 pb-6"
        style={{ scrollbarWidth: "none" }}
      >
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-12 gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "#1e1b42", animation: "breathe 3s ease-in-out infinite" }}>
              <Award size={28} color="#7c6ff7" />
            </div>
            <p className="text-sm font-medium" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
              {search ? "No tasks match your search" : filter === "done" ? "No completed tasks yet" : "All done! Great work today 🎉"}
            </p>
          </div>
        )}
        {filtered.map((task, i) => (
          <SwipeCard key={task.id} task={task} index={i} onComplete={onComplete} onDelete={onDelete} />
        ))}
      </div>

      <RippleFAB onClick={onOpenModal} />
    </>
  );
}

// ─── Global CSS ────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
@keyframes orbFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(16px, -24px) scale(1.1); }
}
@keyframes fabPulse {
  0%, 100% { box-shadow: 0 6px 24px rgba(255,107,107,0.5); }
  50%       { box-shadow: 0 6px 36px rgba(255,107,107,0.75), 0 0 0 8px rgba(255,107,107,0.12); }
}
@keyframes rippleOut {
  0%   { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes confettiFall {
  0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translateY(130px) rotate(540deg) scale(0); opacity: 0; }
}
@keyframes overdueFlash {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.06); }
}
@keyframes shimmerSlide {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes quoteFade {
  0%   { opacity: 0; transform: translateX(8px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes statBounce {
  0%   { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tasks, setTasks]       = useState<Task[]>(INITIAL_TASKS);
  const [tab, setTab]           = useState<Tab>("home");
  const [modalOpen, setModal]   = useState(false);
  const [profile, setProfile]   = useState<Profile>(INITIAL_PROFILE);
  const [confetti, setConfetti] = useState<{ x: number; y: number; key: number } | null>(null);

  const handleComplete = useCallback((id: string, rect: DOMRect) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed, completedAt: Date.now() } : t));
    const task = tasks.find((t) => t.id === id);
    if (!task?.completed) {
      setConfetti({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, key: Date.now() });
      setTimeout(() => setConfetti(null), 1000);
    }
  }, [tasks]);

  const handleDelete = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleAdd = useCallback((task: Omit<Task,"id"|"completed">) => {
    setTasks((prev) => [...prev, { ...task, id: Date.now().toString(), completed: false }]);
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #0a0920 0%, #120f3a 100%)" }}>
        <div className="relative flex flex-col overflow-hidden"
          style={{
            width: "min(430px, 100vw)",
            height: "min(900px, 100vh)",
            background: "linear-gradient(180deg, #13113a 0%, #0f0e2a 100%)",
            borderRadius: "clamp(0px, 5vw, 40px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,111,247,0.15)",
          }}>
          <AmbientOrbs />

          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-4 pb-1 flex-shrink-0" style={{ position: "relative", zIndex: 1 }}>
            <span className="text-xs font-semibold" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
              {new Date().getHours().toString().padStart(2,"0")}:{new Date().getMinutes().toString().padStart(2,"0")}
            </span>
            <div className="flex gap-1 items-center">
              {[0,1,2].map((i) => <div key={i} className="w-1 h-1 rounded-full" style={{ background: "#7c6ff7", opacity: 0.4 + i * 0.3 }} />)}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 overflow-hidden pb-16" style={{ position: "relative", zIndex: 1 }}>
            {tab === "home" && (
              <HomeScreen tasks={tasks} profile={profile} onComplete={handleComplete} onDelete={handleDelete} onOpenModal={() => setModal(true)} />
            )}
            {tab === "stats"    && <StatsScreen tasks={tasks} />}
            {tab === "profile"  && <ProfileScreen profile={profile} setProfile={setProfile} tasks={tasks} />}
            {tab === "settings" && <SettingsScreen />}
          </div>

          <BottomNav tab={tab} setTab={setTab} profile={profile} />
        </div>
      </div>

      {confetti && <Confetti key={confetti.key} origin={{ x: confetti.x, y: confetti.y }} />}
      <AddTaskModal open={modalOpen} onClose={() => setModal(false)} onAdd={handleAdd} />
    </>
  );
}
