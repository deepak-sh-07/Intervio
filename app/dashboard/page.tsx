"use client";

import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Interview {
  id: number;
  role: string;
  company: string;
  skills: string[];
  topics: string[];
  type: "Technical" | "Behavioral" | "Product / Case" | "Mixed";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  score: number;
  status: "Completed" | "In Progress" | "Abandoned";
  date: string;
}

interface NewSession {
  role: string;
  company: string;
  level: string;
  duration: string;
  skills: string[];
  topics: string[];
  focus: string;
  type: Interview["type"];
  difficulty: Interview["difficulty"];
}

// ── Seed data ──────────────────────────────────────────────────────────────────
const SEED: Interview[] = [
  { id: 1, role: "Software Engineer", company: "Google", skills: ["Python", "System Design"], topics: ["Algorithms", "Scalability"], type: "Technical", difficulty: "Advanced", duration: "45 min", score: 88, status: "Completed", date: "Jun 24, 2026" },
  { id: 2, role: "Product Manager", company: "Meta", skills: ["Product Sense", "Analytics"], topics: ["Go-to-market", "Metrics"], type: "Product / Case", difficulty: "Intermediate", duration: "30 min", score: 76, status: "Completed", date: "Jun 22, 2026" },
  { id: 3, role: "Data Scientist", company: "Netflix", skills: ["SQL", "Statistics"], topics: ["ML Concepts", "A/B Testing"], type: "Mixed", difficulty: "Intermediate", duration: "60 min", score: 61, status: "Completed", date: "Jun 20, 2026" },
  { id: 4, role: "Frontend Engineer", company: "Stripe", skills: ["React", "CSS", "TypeScript"], topics: ["Performance", "Accessibility"], type: "Technical", difficulty: "Intermediate", duration: "30 min", score: 91, status: "Completed", date: "Jun 18, 2026" },
  { id: 5, role: "ML Engineer", company: "OpenAI", skills: ["PyTorch", "MLOps"], topics: ["Model Deployment", "LLMs"], type: "Technical", difficulty: "Advanced", duration: "45 min", score: 70, status: "Completed", date: "Jun 15, 2026" },
  { id: 6, role: "Software Engineer", company: "Amazon", skills: ["Java", "Concurrency"], topics: ["Distributed Systems"], type: "Technical", difficulty: "Advanced", duration: "60 min", score: 55, status: "Completed", date: "Jun 12, 2026" },
  { id: 7, role: "Product Manager", company: "Airbnb", skills: ["Roadmapping", "Metrics"], topics: ["Prioritization", "Behavioral"], type: "Behavioral", difficulty: "Intermediate", duration: "30 min", score: 82, status: "Completed", date: "Jun 10, 2026" },
  { id: 8, role: "Software Engineer", company: "", skills: ["Python", "APIs"], topics: ["Algorithms", "REST"], type: "Technical", difficulty: "Beginner", duration: "45 min", score: 0, status: "In Progress", date: "Jun 9, 2026" },
  { id: 9, role: "Data Scientist", company: "Spotify", skills: ["R", "Visualization"], topics: ["Experimentation"], type: "Mixed", difficulty: "Intermediate", duration: "45 min", score: 68, status: "Completed", date: "Jun 6, 2026" },
  { id: 10, role: "Frontend Engineer", company: "", skills: ["TypeScript", "Testing"], topics: ["Component Design"], type: "Technical", difficulty: "Beginner", duration: "15 min", score: 0, status: "Abandoned", date: "Jun 3, 2026" },
  { id: 11, role: "ML Engineer", company: "Anthropic", skills: ["Python", "NLP"], topics: ["Transformers", "Fine-tuning"], type: "Technical", difficulty: "Advanced", duration: "60 min", score: 85, status: "Completed", date: "May 30, 2026" },
  { id: 12, role: "Software Engineer", company: "Figma", skills: ["Go", "Concurrency"], topics: ["System Design", "Behavioral"], type: "Mixed", difficulty: "Intermediate", duration: "60 min", score: 72, status: "Completed", date: "May 27, 2026" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#d97706";
  return "#dc2626";
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Interview["status"] }) {
  const styles: Record<string, string> = {
    "Completed": "bg-emerald-50 text-emerald-700 border border-emerald-200",
    "In Progress": "bg-blue-50 text-blue-700 border border-blue-200",
    "Abandoned": "bg-gray-100 text-gray-500 border border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function DiffBadge({ diff }: { diff: Interview["difficulty"] }) {
  const styles: Record<string, string> = {
    "Beginner": "bg-teal-50 text-teal-700",
    "Intermediate": "bg-amber-50 text-amber-700",
    "Advanced": "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[diff]}`}>
      {diff}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  if (!score) return <span className="text-gray-300 text-sm">—</span>;
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[56px]">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums min-w-[32px] text-right" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

// ── Tag input ──────────────────────────────────────────────────────────────────
function TagInput({ tags, setTags, placeholder }: { tags: string[]; setTags: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");

  function addTag(val: string) {
    const clean = val.trim().replace(/,$/, "");
    if (clean && !tags.includes(clean)) setTags([...tags, clean]);
    setInput("");
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); }
    if (e.key === "Backspace" && !input && tags.length) setTags(tags.slice(0, -1));
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg bg-white min-h-[40px] cursor-text focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all"
      onClick={() => document.getElementById(`ti-${placeholder}`)?.focus()}>
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
          {t}
          <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-indigo-400 hover:text-indigo-700 leading-none text-sm">×</button>
        </span>
      ))}
      <input id={`ti-${placeholder}`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
        placeholder={tags.length ? "" : placeholder}
        className="border-none outline-none bg-transparent text-sm text-gray-700 placeholder:text-gray-300 flex-1 min-w-[100px]" />
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
const TYPES: { label: Interview["type"]; icon: string; sub: string }[] = [
  { label: "Technical", icon: "💻", sub: "Coding & system design" },
  { label: "Behavioral", icon: "💬", sub: "STAR & culture fit" },
  { label: "Product / Case", icon: "💡", sub: "Strategy & PM skills" },
  { label: "Mixed", icon: "🔄", sub: "All of the above" },
];
const DIFFS: Interview["difficulty"][] = ["Beginner", "Intermediate", "Advanced"];
const DURATIONS = ["15 min", "30 min", "45 min", "60 min"];

const BLANK: NewSession = {
  role: "", company: "", level: "", duration: "30 min",
  skills: [], topics: [], focus: "",
  type: "Technical", difficulty: "Intermediate",
};

function NewSessionModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (s: NewSession) => void }) {
  const [form, setForm] = useState<NewSession>({ ...BLANK });
  const [roleErr, setRoleErr] = useState(false);

  function set<K extends keyof NewSession>(k: K, v: NewSession[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "role") setRoleErr(false);
  }

  function submit() {
    if (!form.role.trim()) { setRoleErr(true); return; }
    onCreate({ ...form });
    setForm({ ...BLANK });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-[580px] max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Head */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">New interview session</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure your AI-powered mock interview</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-lg">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Basic info */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 pb-2 border-b border-gray-100">Basic info</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target role *</label>
                <input value={form.role} onChange={(e) => set("role", e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all bg-white ${roleErr ? "border-red-400 ring-2 ring-red-50" : "border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"}`} />
                {roleErr && <p className="text-xs text-red-500 mt-1">Role is required.</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company (optional)</label>
                <input value={form.company} onChange={(e) => set("company", e.target.value)}
                  placeholder="e.g. Google"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Experience level</label>
                <select value={form.level} onChange={(e) => set("level", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all bg-white text-gray-700">
                  <option value="">Select level</option>
                  {["Entry level", "Mid level", "Senior", "Staff / Principal", "Manager"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d} type="button" onClick={() => set("duration", d)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${form.duration === d ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-medium" : "border-gray-200 text-gray-500 hover:border-indigo-200 hover:text-indigo-600"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Skills & topics */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 pb-2 border-b border-gray-100">Skills & topics</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Skills to assess</label>
                <TagInput tags={form.skills} setTags={(t) => set("skills", t)} placeholder="Type skill and press Enter…" />
                <p className="text-[11px] text-gray-300 mt-1">e.g. Python, System Design, SQL, React</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Topics to cover</label>
                <TagInput tags={form.topics} setTags={(t) => set("topics", t)} placeholder="Type topic and press Enter…" />
                <p className="text-[11px] text-gray-300 mt-1">e.g. Algorithms, Behavioral, Leadership, Product Sense</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Additional focus (optional)</label>
                <input value={form.focus} onChange={(e) => set("focus", e.target.value)}
                  placeholder="e.g. Distributed systems, Real-time apps, A/B testing"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all bg-white" />
              </div>
            </div>
          </section>

          {/* Interview type */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 pb-2 border-b border-gray-100">Interview type</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(({ label, icon, sub }) => (
                <button key={label} type="button" onClick={() => set("type", label)}
                  className={`flex items-center gap-3 px-3 py-3 border rounded-xl text-left transition-all ${form.type === label ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-200 bg-white"}`}>
                  <span className="text-xl leading-none">{icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${form.type === label ? "text-indigo-700" : "text-gray-700"}`}>{label}</p>
                    <p className={`text-xs ${form.type === label ? "text-indigo-500" : "text-gray-400"}`}>{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Difficulty */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 pb-2 border-b border-gray-100">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFS.map((d) => (
                <button key={d} type="button" onClick={() => set("difficulty", d)}
                  className={`py-3 rounded-xl border text-center transition-all ${form.difficulty === d ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-200 bg-white"}`}>
                  <p className={`text-sm font-medium ${form.difficulty === d ? "text-indigo-700" : "text-gray-700"}`}>{d}</p>
                  <p className={`text-xs mt-0.5 ${form.difficulty === d ? "text-indigo-400" : "text-gray-400"}`}>
                    {d === "Beginner" ? "Foundational" : d === "Intermediate" ? "Real-world" : "FAANG-level"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-white transition-all">Cancel</button>
          <button onClick={submit} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <span>▶</span> Start session
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [interviews, setInterviews] = useState<Interview[]>(SEED);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");

  const uniqueRoles = useMemo(() => [...new Set(SEED.map((i) => i.role))], []);

  const filtered = useMemo(() => interviews.filter((r) => {
    const q = search.toLowerCase();
    const matchQ = !q || r.role.toLowerCase().includes(q) || r.company.toLowerCase().includes(q) || r.skills.join(" ").toLowerCase().includes(q) || r.topics.join(" ").toLowerCase().includes(q);
    const matchR = !roleFilter || r.role === roleFilter;
    const matchT = !typeFilter || r.type === typeFilter;
    return matchQ && matchR && matchT;
  }), [interviews, search, roleFilter, typeFilter]);

  const stats = useMemo(() => {
    const completed = interviews.filter((i) => i.status === "Completed");
    const avg = completed.length ? Math.round(completed.reduce((s, i) => s + i.score, 0) / completed.length) : 0;
    const hours = interviews.reduce((s, i) => s + parseInt(i.duration), 0) / 60;
    return { total: interviews.length, avg, hours: hours.toFixed(1), roles: new Set(interviews.map((i) => i.role)).size };
  }, [interviews]);

  function handleCreate(s: NewSession) {
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setInterviews((prev) => [{
      id: Date.now(), role: s.role, company: s.company,
      skills: s.skills.length ? s.skills : ["General"],
      topics: s.topics.length ? s.topics : ["General"],
      type: s.type, difficulty: s.difficulty,
      duration: s.duration, score: 0, status: "In Progress", date: now,
    }, ...prev]);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">

      {/* Topbar */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">AI</div>
          <span className="font-semibold text-gray-900 text-[15px]">InterviewAI</span>
        </div>
        <nav className="flex items-center gap-1">
          {["Dashboard", "Analytics", "Templates", "Settings"].map((n) => (
            <button key={n} onClick={() => setActiveNav(n)}
              className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${activeNav === n ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
              {n}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">AK</div>
          <span className="text-sm text-gray-500">Arjun K.</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden px-6 py-5 gap-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {[
            { label: "Total sessions", val: stats.total, sub: "+8 this week", subColor: "text-emerald-600" },
            { label: "Avg. score", val: `${stats.avg}%`, sub: "+3 pts vs last month", subColor: "text-emerald-600" },
            { label: "Time practiced", val: `${stats.hours}h`, sub: "across all sessions", subColor: "text-gray-400" },
            { label: "Roles covered", val: stats.roles, sub: "SWE, PM, DS & more", subColor: "text-gray-400" },
          ].map(({ label, val, sub, subColor }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
              <p className="text-3xl font-semibold text-gray-900 leading-none">{val}</p>
              <p className={`text-xs mt-1.5 ${subColor}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Table section */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Section header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h2 className="text-[15px] font-semibold text-gray-900">Previous interviews</h2>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sessions…"
                  className="text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-300 w-44" />
              </div>
              {/* Role filter */}
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 outline-none cursor-pointer">
                <option value="">All roles</option>
                {uniqueRoles.map((r) => <option key={r}>{r}</option>)}
              </select>
              {/* Type filter */}
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 outline-none cursor-pointer">
                <option value="">All types</option>
                {(["Technical", "Behavioral", "Product / Case", "Mixed"] as const).map((t) => <option key={t}>{t}</option>)}
              </select>
              {/* New session */}
              <button onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                <span className="text-base leading-none">+</span> New session
              </button>
            </div>
          </div>

          {/* Scrollable table */}
          <div className="flex-1 bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-sm">
            {/* Sticky thead */}
            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                    {[
                      { label: "Role", w: "18%" }, { label: "Skills", w: "14%" }, { label: "Topics", w: "13%" },
                      { label: "Type", w: "11%" }, { label: "Difficulty", w: "10%" }, { label: "Duration", w: "8%" },
                      { label: "Score", w: "12%" }, { label: "Status", w: "9%" }, { label: "Date", w: "9%" }, { label: "", w: "6%" },
                    ].map(({ label, w }) => (
                      <th key={label} style={{ width: w }}
                        className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-gray-400 text-sm">No sessions match your filters.</td>
                    </tr>
                  ) : filtered.map((row, i) => (
                    <tr key={row.id} className={`group transition-colors hover:bg-indigo-50/40 ${i !== filtered.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-800 text-sm truncate">{row.role}</p>
                        {row.company && <p className="text-xs text-gray-400 truncate">{row.company}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {row.skills.slice(0, 2).map((s) => (
                            <span key={s} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{s}</span>
                          ))}
                          {row.skills.length > 2 && <span className="text-[11px] text-gray-400">+{row.skills.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 truncate">{row.topics.slice(0, 2).join(", ")}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{row.type}</td>
                      <td className="px-4 py-3.5"><DiffBadge diff={row.difficulty} /></td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{row.duration}</td>
                      <td className="px-4 py-3.5"><ScoreBar score={row.score} /></td>
                      <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 text-sm transition-colors" title="View">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => setInterviews((prev) => prev.filter((x) => x.id !== row.id))}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
              <p className="text-xs text-gray-400">{filtered.length} of {interviews.length} sessions</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Completed</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />In progress</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Abandoned</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      <NewSessionModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </div>
  );
}