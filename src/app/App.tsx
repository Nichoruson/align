import { useState, useRef, useCallback } from "react";
import { Plus, Trash2, Check, Clock, StickyNote, X, Bell, ChevronRight } from "lucide-react";

type Category = "health" | "work" | "personal" | "fitness" | "mindfulness";

interface Task {
  id: string;
  name: string;
  time: string;
  notes: string;
  category: Category;
  completed: boolean;
}

const CATEGORY_META: Record<Category, { label: string; color: string; bg: string }> = {
  health:      { label: "Health",      color: "#48dbac", bg: "#e8fdf6" },
  work:        { label: "Work",        color: "#7c6ff7", bg: "#f0eeff" },
  personal:    { label: "Personal",    color: "#ffc048", bg: "#fff8e6" },
  fitness:     { label: "Fitness",     color: "#ff6b6b", bg: "#fff0f0" },
  mindfulness: { label: "Mindfulness", color: "#54a0ff", bg: "#eef5ff" },
};

const INITIAL_TASKS: Task[] = [
  { id: "1", name: "Morning meditation",   time: "07:00", notes: "10 minutes of focused breathing",     category: "mindfulness", completed: false },
  { id: "2", name: "Take vitamins",        time: "08:00", notes: "D3, Omega-3, Magnesium",              category: "health",      completed: true  },
  { id: "3", name: "Team standup",         time: "09:30", notes: "Zoom meeting — share screen",         category: "work",        completed: false },
  { id: "4", name: "Lunch walk",           time: "12:30", notes: "At least 20 minutes outside",        category: "fitness",     completed: false },
  { id: "5", name: "Read 30 pages",        time: "20:00", notes: "Currently reading The Almanack",      category: "personal",    completed: false },
  { id: "6", name: "Evening stretch",      time: "21:00", notes: "Hip flexors and shoulders",           category: "fitness",     completed: false },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatTime(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${ampm}`;
}

interface SwipeCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

function SwipeCard({ task, onComplete, onDelete }: SwipeCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const THRESHOLD = 100;

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
      setTimeout(() => onComplete(task.id), 300);
    } else if (offsetX < -THRESHOLD) {
      setDismissed(true);
      setTimeout(() => onDelete(task.id), 300);
    } else {
      setOffsetX(0);
    }
  };

  const swipeProgress = Math.abs(offsetX) / THRESHOLD;
  const showComplete = offsetX > 20;
  const showDelete = offsetX < -20;

  const cat = CATEGORY_META[task.category];

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3" style={{ height: dismissed ? 0 : undefined, transition: dismissed ? "height 0.3s ease" : undefined }}>
      {/* Background reveal */}
      <div className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl">
        <div
          className="flex items-center gap-2 font-semibold text-sm"
          style={{ color: "#48dbac", opacity: showComplete ? Math.min(swipeProgress, 1) : 0 }}
        >
          <Check size={20} />
          <span>Complete</span>
        </div>
        <div
          className="flex items-center gap-2 font-semibold text-sm"
          style={{ color: "#ff6b6b", opacity: showDelete ? Math.min(swipeProgress, 1) : 0 }}
        >
          <span>Delete</span>
          <Trash2 size={20} />
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative bg-card rounded-2xl px-4 py-4 cursor-grab active:cursor-grabbing select-none"
        style={{
          transform: `translateX(${dismissed ? (offsetX > 0 ? 400 : -400) : offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          opacity: task.completed ? 0.6 : 1,
          boxShadow: "0 2px 16px rgba(15,14,42,0.08)",
        }}
      >
        <div className="flex items-start gap-3">
          {/* Completion indicator */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onComplete(task.id)}
            className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
            style={{
              borderColor: task.completed ? "#48dbac" : "#d1cff0",
              background: task.completed ? "#48dbac" : "transparent",
            }}
          >
            {task.completed && <Check size={13} color="#fff" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p
                className="font-semibold text-card-foreground leading-snug"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  textDecoration: task.completed ? "line-through" : "none",
                  color: task.completed ? "#a09cc4" : undefined,
                  fontSize: "0.9375rem",
                }}
              >
                {task.name}
              </p>
              <ChevronRight size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#d1cff0" }} />
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}
              >
                <Clock size={11} />
                {formatTime(task.time)}
              </span>
              {task.notes && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#b8b4d8", fontFamily: "'Nunito', sans-serif" }}>
                  <StickyNote size={11} />
                  {task.notes.length > 28 ? task.notes.slice(0, 28) + "…" : task.notes}
                </span>
              )}
            </div>

            <div className="mt-2">
              <span
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: cat.bg, color: cat.color, fontFamily: "'Nunito', sans-serif" }}
              >
                {cat.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, "id" | "completed">) => void;
}

function AddTaskModal({ open, onClose, onAdd }: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("08:00");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<Category>("personal");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), time, notes: notes.trim(), category });
    setName("");
    setTime("08:00");
    setNotes("");
    setCategory("personal");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(10,9,30,0.75)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full"
        style={{
          maxWidth: 430,
          transform: `translateX(-50%) translateY(${open ? 0 : "100%"})`,
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div className="bg-white rounded-t-3xl px-6 pt-4 pb-8" style={{ boxShadow: "0 -8px 48px rgba(15,14,42,0.22)" }}>
          {/* Handle */}
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "#e0ddf5" }} />

          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-xl font-bold"
              style={{ color: "#1a1535", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              New Reminder
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#f0eeff" }}
            >
              <X size={16} color="#7c6ff7" />
            </button>
          </div>

          {/* Task name */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
              Task name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning run"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder-opacity-50"
              style={{
                background: "#f5f4ff",
                color: "#1a1535",
                fontFamily: "'Nunito', sans-serif",
                border: "2px solid transparent",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#7c6ff7")}
              onBlur={(e) => (e.target.style.borderColor = "transparent")}
            />
          </div>

          {/* Time */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: "#f5f4ff",
                color: "#1a1535",
                fontFamily: "'Nunito', sans-serif",
                border: "2px solid transparent",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#7c6ff7")}
              onBlur={(e) => (e.target.style.borderColor = "transparent")}
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
              Category
            </label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: selected ? meta.color : meta.bg,
                      color: selected ? "#fff" : meta.color,
                      fontFamily: "'Nunito', sans-serif",
                      boxShadow: selected ? `0 2px 8px ${meta.color}44` : "none",
                      transform: selected ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none placeholder-opacity-50"
              style={{
                background: "#f5f4ff",
                color: "#1a1535",
                fontFamily: "'Nunito', sans-serif",
                border: "2px solid transparent",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#7c6ff7")}
              onBlur={(e) => (e.target.style.borderColor = "transparent")}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: name.trim() ? "linear-gradient(135deg, #7c6ff7 0%, #9d89ff 100%)" : "#e0ddf5",
              color: name.trim() ? "#fff" : "#b8b4d8",
              boxShadow: name.trim() ? "0 4px 20px rgba(124,111,247,0.4)" : "none",
              transform: name.trim() ? "translateY(0)" : "none",
              cursor: name.trim() ? "pointer" : "default",
            }}
          >
            Add Reminder
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const now = new Date();
  const dayName = DAYS[now.getDay()];
  const dateStr = `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const handleComplete = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleAdd = useCallback((task: Omit<Task, "id" | "completed">) => {
    setTasks((prev) => [
      ...prev,
      { ...task, id: Date.now().toString(), completed: false },
    ]);
  }, []);

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "done") return t.completed;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? completedCount / tasks.length : 0;

  // Week row
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    return { label: DAYS[i], date: d.getDate(), isToday: i === now.getDay() };
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #0f0e2a 0%, #1a1050 100%)" }}
    >
      {/* Phone frame */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: "min(430px, 100vw)",
          height: "min(900px, 100vh)",
          background: "linear-gradient(180deg, #13113a 0%, #0f0e2a 100%)",
          borderRadius: "min(40px, 0px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,111,247,0.15)",
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <span className="text-xs font-semibold" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
            {now.getHours().toString().padStart(2, "0")}:{now.getMinutes().toString().padStart(2, "0")}
          </span>
          <div className="flex gap-1 items-center">
            <div className="w-1 h-1 rounded-full" style={{ background: "#7c6ff7" }} />
            <div className="w-1 h-1 rounded-full" style={{ background: "#7c6ff7" }} />
            <div className="w-1 h-1 rounded-full" style={{ background: "#7c6ff7" }} />
          </div>
        </div>

        {/* Header */}
        <div className="px-6 pt-2 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
                {dayName}, {dateStr}
              </p>
              <h1
                className="text-2xl font-extrabold leading-tight"
                style={{ color: "#f0eeff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"} 👋
              </h1>
            </div>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center mt-1"
              style={{ background: "#1e1b42", border: "1px solid rgba(124,111,247,0.2)" }}
            >
              <Bell size={18} color="#7c6ff7" />
            </button>
          </div>

          {/* Progress card */}
          <div
            className="mt-4 rounded-2xl p-4"
            style={{ background: "linear-gradient(135deg, #7c6ff7 0%, #5d52e0 100%)", boxShadow: "0 8px 24px rgba(124,111,247,0.35)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold opacity-75" style={{ fontFamily: "'Nunito', sans-serif", color: "#fff" }}>
                  Today's Progress
                </p>
                <p className="text-2xl font-extrabold text-white mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {completedCount} <span className="text-base font-medium opacity-70">/ {tasks.length} tasks</span>
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.3)" }}
              >
                <span className="text-sm font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${progress * 100}%`, background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.6)" }}
              />
            </div>
          </div>
        </div>

        {/* Week calendar */}
        <div className="px-6 mb-4">
          <div className="flex justify-between">
            {weekDays.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-medium" style={{ color: d.isToday ? "#c4bdff" : "#4a456e", fontFamily: "'Nunito', sans-serif" }}>
                  {d.label}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: d.isToday ? "#7c6ff7" : "transparent",
                    color: d.isToday ? "#fff" : "#6b6490",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: d.isToday ? "0 2px 10px rgba(124,111,247,0.5)" : "none",
                  }}
                >
                  {d.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-6 mb-4">
          <div className="flex gap-2">
            {(["all", "pending", "done"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  background: filter === f ? "#7c6ff7" : "#1e1b42",
                  color: filter === f ? "#fff" : "#8b85b8",
                  boxShadow: filter === f ? "0 2px 10px rgba(124,111,247,0.4)" : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div className="px-6 mb-2">
          <p className="text-xs" style={{ color: "#4a456e", fontFamily: "'Nunito', sans-serif" }}>
            ← swipe to delete &nbsp;·&nbsp; swipe to complete →
          </p>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 pb-24" style={{ scrollbarWidth: "none" }}>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-16 gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#1e1b42" }}>
                <Check size={28} color="#7c6ff7" />
              </div>
              <p className="text-sm font-medium" style={{ color: "#8b85b8", fontFamily: "'Nunito', sans-serif" }}>
                {filter === "done" ? "No completed tasks yet" : "All done! Great work today."}
              </p>
            </div>
          )}
          {filtered.map((task) => (
            <SwipeCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} />
          ))}
        </div>

        {/* FAB */}
        <button
          onClick={() => setModalOpen(true)}
          className="absolute bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)",
            boxShadow: "0 6px 24px rgba(255,107,107,0.5), 0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </button>
      </div>

      <AddTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
    </div>
  );
}
