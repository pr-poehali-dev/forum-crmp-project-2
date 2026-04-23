import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/6bd4b7c1-d8cc-44eb-9522-1545746deb84";
const TOPICS_URL = "https://functions.poehali.dev/ce79f8a9-5e2a-4a47-ac9b-9945568bdebc";

type Page = "home" | "categories" | "topics" | "topic-detail" | "new-topic" | "profile" | "search" | "rules" | "moderation";
type PostStatus = "pending" | "approved" | "rejected";
type AuthView = "login" | "register";

interface ForumUser {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "moderator" | "user" | "banned";
  avatar_letter: string;
  bio: string;
  posts_count: number;
  created_at: string;
}

interface Topic {
  id: number;
  title: string;
  content: string;
  category: string;
  status: PostStatus;
  views: number;
  replies_count: number;
  date: string;
  created_at: string;
  author: string;
  avatar: string;
  user_id: number;
}

interface Reply {
  id: number;
  content: string;
  date: string;
  author: string;
  avatar: string;
  user_id: number;
}

const CATEGORIES = [
  { name: "React", icon: "⚛️", borderColor: "#00d4ff", desc: "Всё о React-экосистеме" },
  { name: "TypeScript", icon: "🔷", borderColor: "#a855f7", desc: "Типизация и паттерны" },
  { name: "DevOps", icon: "🚀", borderColor: "#00ff9d", desc: "CI/CD, контейнеры, облака" },
  { name: "Базы данных", icon: "🗄️", borderColor: "#a855f7", desc: "SQL, NoSQL, оптимизация" },
  { name: "Стартапы", icon: "💡", borderColor: "#00d4ff", desc: "Бизнес и продуктовая разработка" },
  { name: "Карьера", icon: "💼", borderColor: "#00ff9d", desc: "Советы, оффер, рост" },
  { name: "Оффтоп", icon: "💬", borderColor: "#ff2d78", desc: "Всё остальное" },
];

const statusConfig: Record<PostStatus, { label: string; cls: string }> = {
  approved: { label: "Одобрен", cls: "gradient-badge-green" },
  pending: { label: "На проверке", cls: "gradient-badge-orange" },
  rejected: { label: "Отклонён", cls: "gradient-badge-red" },
};

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ onSuccess, onClose }: { onSuccess: (user: ForumUser, token: string) => void; onClose: () => void }) {
  const [view, setView] = useState<AuthView>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginData, setLoginData] = useState({ login: "", password: "" });
  const [regData, setRegData] = useState({ username: "", email: "", password: "", display_name: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginData) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка входа"); return; }
      localStorage.setItem("forum_token", data.token);
      onSuccess(data.user, data.token);
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(regData) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка регистрации"); return; }
      localStorage.setItem("forum_token", data.token);
      onSuccess(data.user, data.token);
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card rounded-2xl p-8 w-full max-w-md border border-[#00ff9d]/30 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00ff9d]/30 to-[#a855f7]/30 border border-[#00ff9d]/40 flex items-center justify-center">
            <span className="text-xl">⚡</span>
          </div>
          <span className="font-oswald text-2xl font-bold neon-text-green tracking-wider">DEVFORUM</span>
        </div>
        <div className="flex rounded-xl bg-muted/30 p-1 mb-6">
          {(["login", "register"] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${view === v ? (v === "login" ? "bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30" : "bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30") : "text-muted-foreground"}`}
            >
              {v === "login" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>
        {view === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            {[
              { label: "Логин или email", key: "login", type: "text", placeholder: "username или email" },
              { label: "Пароль", key: "password", type: "password", placeholder: "••••••••" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} required
                  className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                  value={loginData[f.key as keyof typeof loginData]}
                  onChange={e => setLoginData(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            {error && <p className="text-sm text-[#ff2d78] bg-[#ff2d78]/10 border border-[#ff2d78]/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all disabled:opacity-50 mt-2">
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            {[
              { label: "Имя пользователя", key: "username", type: "text", placeholder: "username" },
              { label: "Отображаемое имя", key: "display_name", type: "text", placeholder: "Иван Петров" },
              { label: "Email", key: "email", type: "email", placeholder: "email@example.com" },
              { label: "Пароль", key: "password", type: "password", placeholder: "Минимум 6 символов" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} required
                  className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors"
                  value={regData[f.key as keyof typeof regData]}
                  onChange={e => setRegData(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            {error && <p className="text-sm text-[#ff2d78] bg-[#ff2d78]/10 border border-[#ff2d78]/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#a855f7] text-white font-semibold text-sm hover:bg-[#a855f7]/90 transition-all disabled:opacity-50 mt-2">
              {loading ? "Регистрируем..." : "Создать аккаунт"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [search, setSearch] = useState("");

  // Auth
  const [currentUser, setCurrentUser] = useState<ForumUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: "", bio: "" });

  // Topics
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicReplies, setTopicReplies] = useState<Reply[]>([]);
  const [topicLoading, setTopicLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState("");

  // New topic form
  const [newTopic, setNewTopic] = useState({ title: "", content: "", category: CATEGORIES[0].name });
  const [newTopicLoading, setNewTopicLoading] = useState(false);
  const [newTopicError, setNewTopicError] = useState("");

  // Moderation
  const [modTab, setModTab] = useState<"posts" | "users">("posts");
  const [modTopics, setModTopics] = useState<Topic[]>([]);

  const token = () => localStorage.getItem("forum_token") || "";

  // Restore session
  useEffect(() => {
    const t = localStorage.getItem("forum_token");
    if (!t) { setAuthLoading(false); return; }
    fetch(`${AUTH_URL}?action=me`, { headers: { "X-Auth-Token": t } })
      .then(r => r.json())
      .then(data => {
        if (data.user) { setCurrentUser(data.user); setProfileForm({ display_name: data.user.display_name, bio: data.user.bio }); }
        else localStorage.removeItem("forum_token");
      })
      .catch(() => localStorage.removeItem("forum_token"))
      .finally(() => setAuthLoading(false));
  }, []);

  const loadTopics = useCallback(async (statusFilter?: string) => {
    setTopicsLoading(true);
    try {
      const q = statusFilter ? `&status=${statusFilter}` : "";
      const res = await fetch(`${TOPICS_URL}?action=list${q}`);
      const data = await res.json();
      return data.topics as Topic[] || [];
    } catch { return []; }
    finally { setTopicsLoading(false); }
  }, []);

  // Load topics when page changes
  useEffect(() => {
    if (page === "topics" || page === "home") {
      loadTopics().then(t => setTopics(t));
    }
    if (page === "moderation") {
      loadTopics().then(t => setModTopics(t));
    }
  }, [page, loadTopics]);

  const openTopic = async (topic: Topic) => {
    setSelectedTopic(topic);
    setPage("topic-detail");
    setTopicLoading(true);
    setTopicReplies([]);
    setReplyText("");
    try {
      const res = await fetch(`${TOPICS_URL}?action=get&id=${topic.id}`);
      const data = await res.json();
      if (data.topic) setSelectedTopic(data.topic);
      if (data.replies) setTopicReplies(data.replies);
    } finally { setTopicLoading(false); }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplyError(""); setReplyLoading(true);
    try {
      const res = await fetch(`${TOPICS_URL}?action=reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token() },
        body: JSON.stringify({ topic_id: selectedTopic?.id, content: replyText }),
      });
      const data = await res.json();
      if (!res.ok) { setReplyError(data.error || "Ошибка"); return; }
      setTopicReplies(prev => [...prev, data.reply]);
      setReplyText("");
      setSelectedTopic(prev => prev ? { ...prev, replies_count: prev.replies_count + 1 } : prev);
    } catch { setReplyError("Ошибка соединения"); }
    finally { setReplyLoading(false); }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault(); setNewTopicError(""); setNewTopicLoading(true);
    try {
      const res = await fetch(`${TOPICS_URL}?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token() },
        body: JSON.stringify(newTopic),
      });
      const data = await res.json();
      if (!res.ok) { setNewTopicError(data.error || "Ошибка"); return; }
      setNewTopic({ title: "", content: "", category: CATEGORIES[0].name });
      setPage("topics");
    } catch { setNewTopicError("Ошибка соединения"); }
    finally { setNewTopicLoading(false); }
  };

  const handleModStatus = async (topicId: number, status: PostStatus) => {
    await fetch(`${TOPICS_URL}?action=set-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": token() },
      body: JSON.stringify({ topic_id: topicId, status }),
    });
    setModTopics(prev => prev.map(t => t.id === topicId ? { ...t, status } : t));
  };

  const handleAuthSuccess = (user: ForumUser) => {
    setCurrentUser(user);
    setProfileForm({ display_name: user.display_name, bio: user.bio });
    setShowAuth(false);
  };

  const handleLogout = async () => {
    const t = token();
    if (t) await fetch(`${AUTH_URL}?action=logout`, { method: "POST", headers: { "X-Auth-Token": t } }).catch(() => {});
    localStorage.removeItem("forum_token");
    setCurrentUser(null);
    setPage("home");
  };

  const handleSaveProfile = async () => {
    const t = token();
    if (!t || !currentUser) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=update-profile`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Auth-Token": t },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.user) { setCurrentUser(data.user); setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000); }
    } finally { setProfileLoading(false); }
  };

  const pendingCount = modTopics.filter(t => t.status === "pending").length;
  const filteredTopics = search
    ? topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.author.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    : topics;

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "categories", label: "Категории", icon: "LayoutGrid" },
    { id: "topics", label: "Темы", icon: "MessageSquare" },
    { id: "search", label: "Поиск", icon: "Search" },
    { id: "profile", label: "Профиль", icon: "User" },
    { id: "rules", label: "Правила", icon: "ShieldCheck" },
  ];

  const navPage = (p: Page) => {
    setPage(p);
    setSelectedTopic(null);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00ff9d]/30 to-[#a855f7]/30 border border-[#00ff9d]/40 flex items-center justify-center animate-pulse">
          <span className="text-2xl">⚡</span>
        </div>
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background grid-bg">
      {showAuth && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navPage("home")} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00ff9d]/30 to-[#a855f7]/30 border border-[#00ff9d]/40 flex items-center justify-center">
              <span className="text-lg">⚡</span>
            </div>
            <span className="font-oswald text-xl font-bold neon-text-green tracking-wider">DEVFORUM</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => navPage(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                  (page === item.id || (page === "topic-detail" && item.id === "topics") || (page === "new-topic" && item.id === "topics"))
                    ? "bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon name={item.icon} size={15} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <button onClick={() => navPage("moderation")}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    page === "moderation" ? "bg-[#a855f7]/25 border-[#a855f7]/50 text-[#a855f7]" : "bg-[#a855f7]/15 border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/25"
                  }`}
                >
                  <Icon name="ShieldAlert" size={15} />
                  <span className="hidden sm:inline">Модерация</span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#ff2d78] text-white text-xs flex items-center justify-center font-bold">{pendingCount}</span>
                  )}
                </button>
                <button onClick={() => navPage("profile")}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center text-sm font-bold text-white hover:opacity-90 transition-opacity"
                  title={currentUser.display_name}
                >
                  {currentUser.avatar_letter}
                </button>
              </>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all"
              >
                <Icon name="LogIn" size={15} />Войти
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 flex">
        {navItems.map(item => (
          <button key={item.id} onClick={() => navPage(item.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-all ${
              (page === item.id || (page === "topic-detail" && item.id === "topics") || (page === "new-topic" && item.id === "topics"))
                ? "text-[#00ff9d]" : "text-muted-foreground"
            }`}
          >
            <Icon name={item.icon} size={18} />{item.label}
          </button>
        ))}
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* ===== HOME ===== */}
        {page === "home" && (
          <div className="animate-fade-in space-y-8">
            <div className="relative overflow-hidden rounded-2xl p-8 md:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00ff9d]/10 via-[#a855f7]/10 to-[#00d4ff]/10" />
              <div className="absolute inset-0 border border-[#00ff9d]/20 rounded-2xl" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#a855f7]/15 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00ff9d]/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d] text-xs font-medium mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" />
                  {topics.length > 0 ? `${topics.length} тем в базе` : "Форум открыт"}
                </div>
                <h1 className="font-oswald text-4xl md:text-6xl font-bold text-white mb-3 tracking-wide">
                  DEV<span className="neon-text-green">FORUM</span>
                </h1>
                <p className="text-muted-foreground text-lg mb-6 max-w-xl">
                  Сообщество разработчиков — обсуждай технологии, делись опытом, решай задачи вместе
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => currentUser ? setPage("new-topic") : setShowAuth(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all hover:shadow-[0_0_20px_rgba(0,255,157,0.4)] active:scale-95"
                  >
                    {currentUser ? "Создать тему" : "Присоединиться"}
                  </button>
                  <button onClick={() => navPage("categories")}
                    className="px-5 py-2.5 rounded-xl border border-[#a855f7]/40 text-[#a855f7] font-semibold text-sm hover:bg-[#a855f7]/10 transition-all"
                  >
                    Категории
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Тем", value: String(topics.length), icon: "MessageSquare", color: "#00ff9d" },
                { label: "Одобрено", value: String(topics.filter(t => t.status === "approved").length), icon: "CheckCircle", color: "#a855f7" },
                { label: "Ответов", value: String(topics.reduce((a, t) => a + t.replies_count, 0)), icon: "Reply", color: "#00d4ff" },
                { label: "Категорий", value: String(CATEGORIES.length), icon: "LayoutGrid", color: "#ff2d78" },
              ].map(stat => (
                <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${stat.color}20`, border: `1px solid ${stat.color}40` }}
                  >
                    <Icon name={stat.icon} size={18} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="text-xl font-oswald font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-oswald text-2xl font-bold text-white tracking-wide">
                  ПОСЛЕДНИЕ <span className="neon-text-green">ТЕМЫ</span>
                </h2>
                <button onClick={() => navPage("topics")} className="text-sm text-[#00d4ff] hover:text-[#00ff9d] transition-colors flex items-center gap-1">
                  Все темы <Icon name="ArrowRight" size={14} />
                </button>
              </div>
              {topicsLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Загружаем темы...</div>
              ) : topics.filter(t => t.status === "approved").length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                  <Icon name="MessageSquare" size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="mb-3">Тем пока нет — будь первым!</p>
                  {currentUser && (
                    <button onClick={() => setPage("new-topic")} className="px-4 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm">
                      Создать тему
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {topics.filter(t => t.status === "approved").slice(0, 5).map((topic, i) => (
                    <button key={topic.id} onClick={() => openTopic(topic)}
                      className="w-full glass-card glass-card-hover rounded-xl p-4 text-left"
                      style={{ animationDelay: `${i * 0.07}s` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {topic.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-1 mb-1">{topic.title}</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{topic.author}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">{topic.category}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{topic.date}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Icon name="MessageSquare" size={11} /> {topic.replies_count}</span>
                            <span className="flex items-center gap-1"><Icon name="Eye" size={11} /> {topic.views}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== CATEGORIES ===== */}
        {page === "categories" && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <h2 className="font-oswald text-3xl font-bold text-white tracking-wide mb-1">КАТЕГО<span className="neon-text-purple">РИИ</span></h2>
              <p className="text-muted-foreground">Выбери тему для обсуждения</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map((cat, i) => (
                <button key={cat.name} onClick={() => navPage("topics")}
                  className="glass-card glass-card-hover rounded-xl p-5 text-left border"
                  style={{ animationDelay: `${i * 0.07}s`, borderColor: `${cat.borderColor}40` }}
                >
                  <div className="text-3xl mb-3">{cat.icon}</div>
                  <h3 className="font-oswald text-xl font-bold text-white tracking-wide">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">{cat.desc}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="MessageSquare" size={12} />
                    <span>{topics.filter(t => t.category === cat.name && t.status === "approved").length} тем</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== TOPICS LIST ===== */}
        {page === "topics" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-oswald text-3xl font-bold text-white tracking-wide">ТЕ<span className="neon-text-cyan">МЫ</span></h2>
                <p className="text-muted-foreground text-sm">{topics.filter(t => t.status === "approved").length} активных обсуждений</p>
              </div>
              {currentUser ? (
                <button onClick={() => setPage("new-topic")}
                  className="px-4 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all flex items-center gap-2"
                >
                  <Icon name="Plus" size={15} />Новая тема
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)}
                  className="px-4 py-2 rounded-xl border border-[#00ff9d]/40 text-[#00ff9d] text-sm font-semibold hover:bg-[#00ff9d]/10 transition-all flex items-center gap-2"
                >
                  <Icon name="LogIn" size={15} />Войти
                </button>
              )}
            </div>
            {topicsLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Загружаем темы...</div>
            ) : topics.length === 0 ? (
              <div className="glass-card rounded-xl p-10 text-center text-muted-foreground">
                <Icon name="MessageSquare" size={40} className="mx-auto mb-3 opacity-20" />
                <p className="mb-4">Тем пока нет — создай первую!</p>
                {currentUser && (
                  <button onClick={() => setPage("new-topic")} className="px-5 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm">
                    Создать тему
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {topics.map((topic, i) => (
                  <div key={topic.id} className="glass-card rounded-xl p-4" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff9d]/40 to-[#a855f7]/40 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {topic.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start gap-2 mb-1">
                          <button onClick={() => openTopic(topic)} className="font-semibold text-white hover:text-[#00ff9d] transition-colors text-sm leading-snug">
                            {topic.title}
                          </button>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[topic.status].cls}`}>
                            {statusConfig[topic.status].label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{topic.content}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">{topic.author}</span>
                          <span className="px-2 py-0.5 rounded-md bg-muted/50">{topic.category}</span>
                          <span className="flex items-center gap-1"><Icon name="MessageSquare" size={11} /> {topic.replies_count}</span>
                          <span className="flex items-center gap-1"><Icon name="Eye" size={11} /> {topic.views}</span>
                          <span className="ml-auto">{topic.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== NEW TOPIC ===== */}
        {page === "new-topic" && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <button onClick={() => navPage("topics")} className="flex items-center gap-2 text-muted-foreground hover:text-[#00ff9d] transition-colors mb-5 text-sm">
              <Icon name="ArrowLeft" size={16} /> Назад
            </button>
            <div className="glass-card rounded-2xl p-6 border border-[#00ff9d]/30">
              <h2 className="font-oswald text-2xl font-bold text-white tracking-wide mb-6">
                НОВАЯ <span className="neon-text-green">ТЕМА</span>
              </h2>
              <form onSubmit={handleCreateTopic} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Заголовок</label>
                  <input
                    className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                    placeholder="Чётко и по теме..."
                    value={newTopic.title}
                    onChange={e => setNewTopic(p => ({ ...p, title: e.target.value }))}
                    required minLength={5}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Категория</label>
                  <select
                    className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                    value={newTopic.category}
                    onChange={e => setNewTopic(p => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Содержание</label>
                  <textarea
                    className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#00ff9d]/50 transition-colors resize-none"
                    rows={6}
                    placeholder="Подробно опиши свой вопрос или тему..."
                    value={newTopic.content}
                    onChange={e => setNewTopic(p => ({ ...p, content: e.target.value }))}
                    required
                  />
                </div>
                {newTopicError && (
                  <p className="text-sm text-[#ff2d78] bg-[#ff2d78]/10 border border-[#ff2d78]/30 rounded-lg px-3 py-2">{newTopicError}</p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={newTopicLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all disabled:opacity-50"
                  >
                    {newTopicLoading ? "Отправляем..." : "Опубликовать тему"}
                  </button>
                  <button type="button" onClick={() => navPage("topics")}
                    className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
                  >
                    Отмена
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Тема появится после проверки модератором</p>
              </form>
            </div>
          </div>
        )}

        {/* ===== TOPIC DETAIL ===== */}
        {page === "topic-detail" && selectedTopic && (
          <div className="animate-fade-in">
            <button onClick={() => navPage("topics")} className="flex items-center gap-2 text-muted-foreground hover:text-[#00ff9d] transition-colors mb-5 text-sm">
              <Icon name="ArrowLeft" size={16} /> Назад к темам
            </button>

            {/* Topic card */}
            <div className="glass-card rounded-2xl p-6 border border-[#00ff9d]/30 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {selectedTopic.avatar}
                </div>
                <div className="flex-1">
                  <h2 className="font-oswald text-2xl font-bold text-white tracking-wide mb-2">{selectedTopic.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-sm font-medium text-[#00d4ff]">{selectedTopic.author}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">{selectedTopic.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[selectedTopic.status].cls}`}>{statusConfig[selectedTopic.status].label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{selectedTopic.date}</span>
                  </div>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedTopic.content}</p>
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/40 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Icon name="MessageSquare" size={14} /> {selectedTopic.replies_count} ответов</span>
                    <span className="flex items-center gap-1.5"><Icon name="Eye" size={14} /> {selectedTopic.views} просмотров</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies */}
            {topicLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Загружаем ответы...</div>
            ) : topicReplies.length > 0 && (
              <div className="space-y-3 mb-4">
                {topicReplies.map((reply, i) => (
                  <div key={reply.id} className="glass-card rounded-xl p-4" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00ff9d]/40 to-[#a855f7]/40 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {reply.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-[#00d4ff]">{reply.author}</span>
                          <span className="text-xs text-muted-foreground">{reply.date}</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-oswald text-lg font-bold text-white mb-3">Написать ответ</h3>
              {currentUser ? (
                selectedTopic.status === "approved" ? (
                  <>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        {currentUser.avatar_letter}
                      </div>
                      <textarea
                        className="flex-1 bg-muted/30 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                        rows={3}
                        placeholder="Поделитесь своим мнением..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                      />
                    </div>
                    {replyError && <p className="text-sm text-[#ff2d78] mb-2">{replyError}</p>}
                    <div className="flex justify-end">
                      <button
                        onClick={handleReply}
                        disabled={replyLoading || !replyText.trim()}
                        className="px-5 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all disabled:opacity-50"
                      >
                        {replyLoading ? "Отправляем..." : "Отправить ответ"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Тема на модерации — ответы временно недоступны</p>
                )
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-3">Войдите, чтобы оставить ответ</p>
                  <button onClick={() => setShowAuth(true)} className="px-5 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all">
                    Войти / Зарегистрироваться
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PROFILE ===== */}
        {page === "profile" && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            {currentUser ? (
              <div className="glass-card rounded-2xl p-6 border border-[#a855f7]/30">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center text-3xl font-bold text-white">
                    {currentUser.avatar_letter}
                  </div>
                  <div>
                    <h2 className="font-oswald text-2xl font-bold text-white">{currentUser.display_name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium gradient-badge-purple">{currentUser.role}</span>
                    <p className="text-sm text-muted-foreground mt-1.5">@{currentUser.username}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Постов", value: String(currentUser.posts_count) },
                    { label: "Ответов", value: "—" },
                    { label: "С нами", value: new Date(currentUser.created_at).toLocaleDateString("ru", { month: "short", year: "numeric" }) },
                  ].map(stat => (
                    <div key={stat.label} className="bg-muted/30 rounded-xl p-3 text-center">
                      <div className="font-oswald text-xl font-bold neon-text-green">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Отображаемое имя</label>
                    <input className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors"
                      value={profileForm.display_name} onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">О себе</label>
                    <textarea className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors resize-none"
                      rows={3} placeholder="Расскажи о себе..."
                      value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} />
                  </div>
                  <button onClick={handleSaveProfile} disabled={profileLoading}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${profileSaved ? "bg-[#00ff9d] text-[#0d0f1a]" : "bg-[#a855f7] text-white hover:bg-[#a855f7]/90"}`}
                  >
                    {profileSaved ? "✓ Сохранено!" : profileLoading ? "Сохраняем..." : "Сохранить изменения"}
                  </button>
                  <button onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl border border-[#ff2d78]/30 text-[#ff2d78] font-semibold text-sm hover:bg-[#ff2d78]/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="LogOut" size={15} />Выйти
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center border border-[#00ff9d]/20">
                <Icon name="User" size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
                <h2 className="font-oswald text-2xl font-bold text-white mb-2">Войдите в аккаунт</h2>
                <p className="text-muted-foreground mb-6">Чтобы просматривать и редактировать профиль</p>
                <button onClick={() => setShowAuth(true)} className="px-6 py-2.5 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all">
                  Войти / Зарегистрироваться
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== SEARCH ===== */}
        {page === "search" && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <h2 className="font-oswald text-3xl font-bold text-white tracking-wide mb-1">ПОИ<span className="neon-text-cyan">СК</span></h2>
              <p className="text-muted-foreground">Найди нужную тему</p>
            </div>
            <div className="relative mb-6">
              <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full bg-muted/30 border border-border rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#00d4ff]/50 transition-colors text-sm"
                placeholder="Поиск тем, авторов, категорий..."
                value={search} onChange={e => setSearch(e.target.value)} autoFocus
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Icon name="X" size={16} /></button>}
            </div>
            {search ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Найдено: {filteredTopics.length}</p>
                {filteredTopics.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />
                    <p>Ничего не найдено</p>
                  </div>
                ) : filteredTopics.map(topic => (
                  <button key={topic.id} onClick={() => openTopic(topic)} className="w-full glass-card glass-card-hover rounded-xl p-4 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">{topic.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[topic.status].cls}`}>{statusConfig[topic.status].label}</span>
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">{topic.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{topic.content}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{topic.author} · {topic.date}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Icon name="Search" size={48} className="mx-auto mb-3 opacity-20" />
                <p>Введите запрос для поиска</p>
              </div>
            )}
          </div>
        )}

        {/* ===== RULES ===== */}
        {page === "rules" && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="mb-8">
              <h2 className="font-oswald text-3xl font-bold text-white tracking-wide mb-1">ПРА<span className="neon-text-green">ВИЛА</span></h2>
              <p className="text-muted-foreground">Обязательны для всех участников форума</p>
            </div>
            <div className="space-y-4">
              {[
                { num: "01", title: "Уважение к участникам", text: "Запрещены оскорбления, дискриминация, агрессивные высказывания. Общайтесь профессионально и уважительно.", icon: "Heart", color: "#00ff9d" },
                { num: "02", title: "Качество контента", text: "Темы должны быть содержательными. Запрещены флуд, копипаст без ссылки на источник.", icon: "FileText", color: "#a855f7" },
                { num: "03", title: "Запрет рекламы и спама", text: "Самореклама и спам без разрешения модераторов запрещены.", icon: "Ban", color: "#00d4ff" },
                { num: "04", title: "Система модерации", text: "Все новые посты проходят модерацию перед публикацией. Нарушения → предупреждение → бан.", icon: "ShieldCheck", color: "#ff2d78" },
                { num: "05", title: "Авторские права", text: "Публикуй только контент, на который у тебя есть права. Указывай источники.", icon: "Lock", color: "#ffa500" },
              ].map((rule, i) => (
                <div key={rule.num} className="glass-card rounded-xl p-5 flex gap-4" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${rule.color}20`, border: `1px solid ${rule.color}40` }}>
                      <Icon name={rule.icon} size={18} style={{ color: rule.color }} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-mono mb-0.5">ПРАВИЛО {rule.num}</div>
                    <h3 className="font-oswald text-lg font-bold text-white tracking-wide mb-1">{rule.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{rule.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== MODERATION ===== */}
        {page === "moderation" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-oswald text-3xl font-bold text-white tracking-wide mb-1">МОДЕ<span className="neon-text-purple">РАЦИЯ</span></h2>
                <p className="text-muted-foreground">Управление контентом и пользователями</p>
              </div>
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ff2d78]/10 border border-[#ff2d78]/30">
                  <span className="w-2 h-2 rounded-full bg-[#ff2d78] animate-pulse" />
                  <span className="text-sm text-[#ff2d78] font-medium">{pendingCount} ожидают</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-6">
              {([{ id: "posts", label: "Темы", icon: "FileText" }, { id: "users", label: "Пользователи", icon: "Users" }] as const).map(tab => (
                <button key={tab.id} onClick={() => setModTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${modTab === tab.id ? "bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7]" : "glass-card text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon name={tab.icon} size={15} />{tab.label}
                </button>
              ))}
            </div>

            {modTab === "posts" && (
              <div className="space-y-3">
                {modTopics.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Нет тем для модерации</p>}
                {modTopics.map(topic => (
                  <div key={topic.id} className="glass-card rounded-xl p-4 border border-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[topic.status].cls}`}>{statusConfig[topic.status].label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">{topic.category}</span>
                        </div>
                        <h3 className="font-semibold text-white text-sm mb-0.5">{topic.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{topic.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{topic.author} · {topic.date}</p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {topic.status !== "approved" && (
                          <button onClick={() => handleModStatus(topic.id, "approved")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00ff9d]/15 border border-[#00ff9d]/30 text-[#00ff9d] text-xs font-medium hover:bg-[#00ff9d]/25 transition-all"
                          >
                            <Icon name="Check" size={12} /> Одобрить
                          </button>
                        )}
                        {topic.status !== "rejected" && (
                          <button onClick={() => handleModStatus(topic.id, "rejected")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff2d78]/15 border border-[#ff2d78]/30 text-[#ff2d78] text-xs font-medium hover:bg-[#ff2d78]/25 transition-all"
                          >
                            <Icon name="X" size={12} /> Отклонить
                          </button>
                        )}
                        {topic.status !== "pending" && (
                          <button onClick={() => handleModStatus(topic.id, "pending")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ffa500]/15 border border-[#ffa500]/30 text-[#ffa500] text-xs font-medium hover:bg-[#ffa500]/25 transition-all"
                          >
                            <Icon name="Clock" size={12} /> На проверку
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {modTab === "users" && (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
                <Icon name="Users" size={36} className="mx-auto mb-3 opacity-20" />
                <p>Управление пользователями будет добавлено в следующей версии</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
