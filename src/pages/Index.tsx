import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/6bd4b7c1-d8cc-44eb-9522-1545746deb84";

type Page = "home" | "categories" | "topics" | "profile" | "search" | "rules" | "moderation";
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

interface Post {
  id: number;
  author: string;
  avatar: string;
  title: string;
  content: string;
  category: string;
  status: PostStatus;
  date: string;
  replies: number;
  views: number;
  isNew?: boolean;
}

interface User {
  id: number;
  name: string;
  avatar: string;
  role: "admin" | "moderator" | "user" | "banned";
  posts: number;
  joined: string;
}

const POSTS: Post[] = [
  { id: 1, author: "Алексей К.", avatar: "А", title: "Как настроить виртуальный сервер для продакшна?", content: "Хочу разобраться с конфигурацией nginx + docker compose. Поделитесь опытом...", category: "DevOps", status: "approved", date: "2 мин назад", replies: 14, views: 342, isNew: true },
  { id: 2, author: "Мария Л.", avatar: "М", title: "Лучшие практики State Management в 2025", content: "Zustand vs Redux Toolkit — что выбираете вы? Делитесь своим стеком...", category: "React", status: "pending", date: "17 мин назад", replies: 8, views: 198 },
  { id: 3, author: "Дмитрий В.", avatar: "Д", title: "PostgreSQL: оптимизация медленных запросов", content: "Собрал коллекцию кейсов по оптимизации. Запросы с миллионами строк...", category: "Базы данных", status: "approved", date: "1 час назад", replies: 22, views: 567 },
  { id: 4, author: "Спамер99", avatar: "С", title: "КУПИ КРИПТОВАЛЮТУ ДЁШЕВО", content: "Лучшие инвестиции 2025...", category: "Оффтоп", status: "rejected", date: "2 часа назад", replies: 0, views: 12 },
  { id: 5, author: "Елена П.", avatar: "Е", title: "TypeScript 6: что нового?", content: "Разбираем новые фичи и рассказываем о breaking changes...", category: "TypeScript", status: "approved", date: "3 часа назад", replies: 31, views: 892 },
  { id: 6, author: "Игорь С.", avatar: "И", title: "Мой стек для стартапа в 2025 году", content: "После 5 лет в энтерпрайзе пишу свой проект. Выбрал Next + Supabase...", category: "Стартапы", status: "pending", date: "5 часов назад", replies: 4, views: 134, isNew: true },
];

const USERS: User[] = [
  { id: 1, name: "Алексей К.", avatar: "А", role: "user", posts: 156, joined: "Янв 2024" },
  { id: 2, name: "Мария Л.", avatar: "М", role: "moderator", posts: 432, joined: "Мар 2023" },
  { id: 3, name: "Спамер99", avatar: "С", role: "banned", posts: 3, joined: "Апр 2025" },
  { id: 4, name: "Дмитрий В.", avatar: "Д", role: "user", posts: 289, joined: "Июн 2023" },
  { id: 5, name: "Елена П.", avatar: "Е", role: "admin", posts: 1024, joined: "Янв 2022" },
];

const CATEGORIES = [
  { name: "React", count: 342, icon: "⚛️", borderColor: "#00d4ff", desc: "Всё о React-экосистеме" },
  { name: "TypeScript", count: 218, icon: "🔷", borderColor: "#a855f7", desc: "Типизация и паттерны" },
  { name: "DevOps", count: 189, icon: "🚀", borderColor: "#00ff9d", desc: "CI/CD, контейнеры, облака" },
  { name: "Базы данных", count: 156, icon: "🗄️", borderColor: "#a855f7", desc: "SQL, NoSQL, оптимизация" },
  { name: "Стартапы", count: 98, icon: "💡", borderColor: "#00d4ff", desc: "Бизнес и продуктовая разработка" },
  { name: "Карьера", count: 74, icon: "💼", borderColor: "#00ff9d", desc: "Советы, оффер, рост" },
];

const statusConfig: Record<PostStatus, { label: string; cls: string }> = {
  approved: { label: "Одобрен", cls: "gradient-badge-green" },
  pending: { label: "На проверке", cls: "gradient-badge-orange" },
  rejected: { label: "Отклонён", cls: "gradient-badge-red" },
};

const roleConfig: Record<User["role"], { label: string; cls: string }> = {
  admin: { label: "Админ", cls: "gradient-badge-purple" },
  moderator: { label: "Модератор", cls: "gradient-badge-green" },
  user: { label: "Участник", cls: "gradient-badge-green" },
  banned: { label: "Заблокирован", cls: "gradient-badge-red" },
};

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ onSuccess }: { onSuccess: (user: ForumUser, token: string) => void }) {
  const [view, setView] = useState<AuthView>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginData, setLoginData] = useState({ login: "", password: "" });
  const [regData, setRegData] = useState({ username: "", email: "", password: "", display_name: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка входа"); return; }
      localStorage.setItem("forum_token", data.token);
      onSuccess(data.user, data.token);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка регистрации"); return; }
      localStorage.setItem("forum_token", data.token);
      onSuccess(data.user, data.token);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative glass-card rounded-2xl p-8 w-full max-w-md border border-[#00ff9d]/30 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00ff9d]/30 to-[#a855f7]/30 border border-[#00ff9d]/40 flex items-center justify-center">
            <span className="text-xl">⚡</span>
          </div>
          <span className="font-oswald text-2xl font-bold neon-text-green tracking-wider">DEVFORUM</span>
        </div>

        <div className="flex rounded-xl bg-muted/30 p-1 mb-6">
          <button
            onClick={() => { setView("login"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${view === "login" ? "bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30" : "text-muted-foreground"}`}
          >
            Вход
          </button>
          <button
            onClick={() => { setView("register"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${view === "register" ? "bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30" : "text-muted-foreground"}`}
          >
            Регистрация
          </button>
        </div>

        {view === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Логин или email</label>
              <input
                className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                placeholder="username или email"
                value={loginData.login}
                onChange={e => setLoginData(p => ({ ...p, login: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Пароль</label>
              <input
                type="password"
                className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            {error && <p className="text-sm text-[#ff2d78] bg-[#ff2d78]/10 border border-[#ff2d78]/30 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Имя пользователя</label>
              <input
                className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors"
                placeholder="username"
                value={regData.username}
                onChange={e => setRegData(p => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Отображаемое имя</label>
              <input
                className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors"
                placeholder="Иван Петров"
                value={regData.display_name}
                onChange={e => setRegData(p => ({ ...p, display_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors"
                placeholder="email@example.com"
                value={regData.email}
                onChange={e => setRegData(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Пароль</label>
              <input
                type="password"
                className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors"
                placeholder="Минимум 6 символов"
                value={regData.password}
                onChange={e => setRegData(p => ({ ...p, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-[#ff2d78] bg-[#ff2d78]/10 border border-[#ff2d78]/30 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#a855f7] text-white font-semibold text-sm hover:bg-[#a855f7]/90 transition-all disabled:opacity-50 mt-2"
            >
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
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [users, setUsers] = useState<User[]>(USERS);
  const [selectedTopic, setSelectedTopic] = useState<Post | null>(null);
  const [modTab, setModTab] = useState<"posts" | "users">("posts");

  // Auth
  const [currentUser, setCurrentUser] = useState<ForumUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: "", bio: "" });

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("forum_token");
    if (!token) { setAuthLoading(false); return; }
    fetch(`${AUTH_URL}?action=me`, {
      headers: { "X-Auth-Token": token },
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          setProfileForm({ display_name: data.user.display_name, bio: data.user.bio });
        } else {
          localStorage.removeItem("forum_token");
        }
      })
      .catch(() => localStorage.removeItem("forum_token"))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuthSuccess = (user: ForumUser, _token: string) => {
    setCurrentUser(user);
    setProfileForm({ display_name: user.display_name, bio: user.bio });
    setShowAuth(false);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("forum_token");
    if (token) {
      await fetch(`${AUTH_URL}?action=logout`, {
        method: "POST",
        headers: { "X-Auth-Token": token },
      }).catch(() => {});
    }
    localStorage.removeItem("forum_token");
    setCurrentUser(null);
    setPage("home");
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("forum_token");
    if (!token || !currentUser) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2000);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const pendingCount = posts.filter(p => p.status === "pending").length;

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "categories", label: "Категории", icon: "LayoutGrid" },
    { id: "topics", label: "Темы", icon: "MessageSquare" },
    { id: "search", label: "Поиск", icon: "Search" },
    { id: "profile", label: "Профиль", icon: "User" },
    { id: "rules", label: "Правила", icon: "ShieldCheck" },
  ];

  const updatePostStatus = (id: number, status: PostStatus) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const updateUserRole = (id: number, role: User["role"]) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const filteredPosts = search
    ? posts.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.author.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00ff9d]/30 to-[#a855f7]/30 border border-[#00ff9d]/40 flex items-center justify-center animate-pulse">
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-muted-foreground text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-bg">
      {showAuth && <AuthModal onSuccess={handleAuthSuccess} />}

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => setPage("home")} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00ff9d]/30 to-[#a855f7]/30 border border-[#00ff9d]/40 flex items-center justify-center">
              <span className="text-lg">⚡</span>
            </div>
            <span className="font-oswald text-xl font-bold neon-text-green tracking-wider">DEVFORUM</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setSelectedTopic(null); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                  page === item.id
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
                <button
                  onClick={() => setPage("moderation")}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    page === "moderation"
                      ? "bg-[#a855f7]/25 border-[#a855f7]/50 text-[#a855f7]"
                      : "bg-[#a855f7]/15 border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/25"
                  }`}
                >
                  <Icon name="ShieldAlert" size={15} />
                  <span className="hidden sm:inline">Модерация</span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#ff2d78] text-white text-xs flex items-center justify-center font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setPage("profile"); setSelectedTopic(null); }}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center text-sm font-bold text-white hover:opacity-90 transition-opacity"
                  title={currentUser.display_name}
                >
                  {currentUser.avatar_letter}
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all"
              >
                <Icon name="LogIn" size={15} />
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 flex">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => { setPage(item.id); setSelectedTopic(null); }}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-all ${
              page === item.id ? "text-[#00ff9d]" : "text-muted-foreground"
            }`}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
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
                  Онлайн: 238 разработчиков
                </div>
                <h1 className="font-oswald text-4xl md:text-6xl font-bold text-white mb-3 tracking-wide">
                  DEV<span className="neon-text-green">FORUM</span>
                </h1>
                <p className="text-muted-foreground text-lg mb-6 max-w-xl">
                  Сообщество разработчиков — обсуждай технологии, делись опытом, решай задачи вместе
                </p>
                <div className="flex flex-wrap gap-3">
                  {currentUser ? (
                    <button
                      onClick={() => setPage("topics")}
                      className="px-5 py-2.5 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all hover:shadow-[0_0_20px_rgba(0,255,157,0.4)] active:scale-95"
                    >
                      Создать тему
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAuth(true)}
                      className="px-5 py-2.5 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all active:scale-95"
                    >
                      Присоединиться
                    </button>
                  )}
                  <button
                    onClick={() => setPage("categories")}
                    className="px-5 py-2.5 rounded-xl border border-[#a855f7]/40 text-[#a855f7] font-semibold text-sm hover:bg-[#a855f7]/10 transition-all"
                  >
                    Смотреть категории
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Тем", value: "1 247", icon: "MessageSquare", color: "#00ff9d" },
                { label: "Участников", value: "3 841", icon: "Users", color: "#a855f7" },
                { label: "Ответов", value: "18 592", icon: "Reply", color: "#00d4ff" },
                { label: "Категорий", value: "24", icon: "LayoutGrid", color: "#ff2d78" },
              ].map(stat => (
                <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
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

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-oswald text-2xl font-bold text-white tracking-wide">
                  ПОСЛЕДНИЕ <span className="neon-text-green">ТЕМЫ</span>
                </h2>
                <button
                  onClick={() => setPage("topics")}
                  className="text-sm text-[#00d4ff] hover:text-[#00ff9d] transition-colors flex items-center gap-1"
                >
                  Все темы <Icon name="ArrowRight" size={14} />
                </button>
              </div>
              <div className="space-y-3">
                {posts.filter(p => p.status === "approved").slice(0, 4).map((post, i) => (
                  <button
                    key={post.id}
                    onClick={() => { setSelectedTopic(post); setPage("topics"); }}
                    className="w-full glass-card glass-card-hover rounded-xl p-4 text-left"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {post.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-1">{post.title}</h3>
                          {post.isNew && (
                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#00ff9d]/15 border border-[#00ff9d]/30 text-[#00ff9d]">NEW</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-muted-foreground">{post.author}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">{post.category}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{post.date}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Icon name="MessageSquare" size={11} /> {post.replies}</span>
                          <span className="flex items-center gap-1"><Icon name="Eye" size={11} /> {post.views}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== CATEGORIES ===== */}
        {page === "categories" && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <h2 className="font-oswald text-3xl font-bold text-white tracking-wide mb-1">
                КАТЕГО<span className="neon-text-purple">РИИ</span>
              </h2>
              <p className="text-muted-foreground">Выбери тему для обсуждения</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat.name}
                  onClick={() => setPage("topics")}
                  className="glass-card glass-card-hover rounded-xl p-5 text-left border"
                  style={{ animationDelay: `${i * 0.07}s`, borderColor: `${cat.borderColor}40` }}
                >
                  <div className="text-3xl mb-3">{cat.icon}</div>
                  <h3 className="font-oswald text-xl font-bold text-white tracking-wide">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">{cat.desc}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="MessageSquare" size={12} />
                    <span>{cat.count} тем</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== TOPICS LIST ===== */}
        {page === "topics" && !selectedTopic && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-oswald text-3xl font-bold text-white tracking-wide">
                  ТЕ<span className="neon-text-cyan">МЫ</span>
                </h2>
                <p className="text-muted-foreground text-sm">{posts.filter(p => p.status === "approved").length} активных обсуждений</p>
              </div>
              {currentUser ? (
                <button className="px-4 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all flex items-center gap-2">
                  <Icon name="Plus" size={15} />
                  Новая тема
                </button>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-4 py-2 rounded-xl border border-[#00ff9d]/40 text-[#00ff9d] font-semibold text-sm hover:bg-[#00ff9d]/10 transition-all flex items-center gap-2"
                >
                  <Icon name="LogIn" size={15} />
                  Войти
                </button>
              )}
            </div>
            <div className="space-y-3">
              {posts.map((post, i) => (
                <div key={post.id} className="glass-card rounded-xl p-4" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff9d]/40 to-[#a855f7]/40 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {post.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 mb-1">
                        <button
                          onClick={() => setSelectedTopic(post)}
                          className="font-semibold text-white hover:text-[#00ff9d] transition-colors text-sm leading-snug"
                        >
                          {post.title}
                        </button>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[post.status].cls}`}>
                          {statusConfig[post.status].label}
                        </span>
                        {post.isNew && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff9d]/15 border border-[#00ff9d]/30 text-[#00ff9d]">NEW</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{post.content}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{post.author}</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted/50">{post.category}</span>
                        <span className="flex items-center gap-1"><Icon name="MessageSquare" size={11} /> {post.replies}</span>
                        <span className="flex items-center gap-1"><Icon name="Eye" size={11} /> {post.views}</span>
                        <span className="ml-auto">{post.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== TOPIC DETAIL ===== */}
        {page === "topics" && selectedTopic && (
          <div className="animate-fade-in">
            <button
              onClick={() => setSelectedTopic(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-[#00ff9d] transition-colors mb-5 text-sm"
            >
              <Icon name="ArrowLeft" size={16} /> Назад к темам
            </button>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[selectedTopic.status].cls}`}>
                      {statusConfig[selectedTopic.status].label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">{selectedTopic.date}</span>
                  </div>
                  <p className="text-foreground/80 leading-relaxed">{selectedTopic.content}</p>
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/40 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Icon name="MessageSquare" size={14} /> {selectedTopic.replies} ответов</span>
                    <span className="flex items-center gap-1.5"><Icon name="Eye" size={14} /> {selectedTopic.views} просмотров</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-oswald text-lg font-bold text-white mb-3">Написать ответ</h3>
              {currentUser ? (
                <>
                  <textarea
                    className="w-full bg-muted/30 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                    rows={4}
                    placeholder="Поделитесь своим мнением..."
                  />
                  <div className="flex justify-end mt-3">
                    <button className="px-5 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all">
                      Отправить ответ
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm mb-3">Войдите, чтобы оставить ответ</p>
                  <button
                    onClick={() => setShowAuth(true)}
                    className="px-5 py-2 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all"
                  >
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="gradient-badge-purple text-xs px-2 py-0.5 rounded-full font-medium">
                        {roleConfig[currentUser.role]?.label ?? currentUser.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5">@{currentUser.username}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Постов", value: String(currentUser.posts_count) },
                    { label: "Ответов", value: "—" },
                    { label: "Лайков", value: "—" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-muted/30 rounded-xl p-3 text-center">
                      <div className="font-oswald text-2xl font-bold neon-text-green">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Отображаемое имя</label>
                    <input
                      className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors"
                      value={profileForm.display_name}
                      onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">О себе</label>
                    <textarea
                      className="w-full mt-1.5 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#a855f7]/50 transition-colors resize-none"
                      rows={3}
                      value={profileForm.bio}
                      onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Расскажи о себе..."
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                      profileSaved
                        ? "bg-[#00ff9d] text-[#0d0f1a]"
                        : "bg-[#a855f7] text-white hover:bg-[#a855f7]/90 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    }`}
                  >
                    {profileSaved ? "✓ Сохранено!" : profileLoading ? "Сохраняем..." : "Сохранить изменения"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl border border-[#ff2d78]/30 text-[#ff2d78] font-semibold text-sm hover:bg-[#ff2d78]/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="LogOut" size={15} />
                    Выйти
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center border border-[#00ff9d]/20">
                <Icon name="User" size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
                <h2 className="font-oswald text-2xl font-bold text-white mb-2">Войдите в аккаунт</h2>
                <p className="text-muted-foreground mb-6">Чтобы просматривать и редактировать профиль</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#00ff9d] text-[#0d0f1a] font-semibold text-sm hover:bg-[#00ff9d]/90 transition-all"
                >
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
              <h2 className="font-oswald text-3xl font-bold text-white tracking-wide mb-1">
                ПОИ<span className="neon-text-cyan">СК</span>
              </h2>
              <p className="text-muted-foreground">Найди нужную тему или автора</p>
            </div>
            <div className="relative mb-6">
              <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full bg-muted/30 border border-border rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#00d4ff]/50 transition-colors text-sm"
                placeholder="Поиск тем, авторов, категорий..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Icon name="X" size={16} />
                </button>
              )}
            </div>
            {search ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Найдено: {filteredPosts.length}</p>
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />
                    <p>Ничего не найдено</p>
                  </div>
                ) : (
                  filteredPosts.map(post => (
                    <button
                      key={post.id}
                      onClick={() => { setSelectedTopic(post); setPage("topics"); }}
                      className="w-full glass-card glass-card-hover rounded-xl p-4 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">{post.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[post.status].cls}`}>
                          {statusConfig[post.status].label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-sm mb-1">{post.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{post.content}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{post.author} · {post.date}</p>
                    </button>
                  ))
                )}
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
              <h2 className="font-oswald text-3xl font-bold text-white tracking-wide mb-1">
                ПРА<span className="neon-text-green">ВИЛА</span>
              </h2>
              <p className="text-muted-foreground">Обязательны для всех участников форума</p>
            </div>
            <div className="space-y-4">
              {[
                { num: "01", title: "Уважение к участникам", text: "Запрещены оскорбления, дискриминация, агрессивные высказывания. Общайтесь профессионально и уважительно, даже при несогласии.", icon: "Heart", color: "#00ff9d" },
                { num: "02", title: "Качество контента", text: "Темы должны быть содержательными и по теме форума. Запрещены флуд, копипаст без ссылки на источник, нерелевантные сообщения.", icon: "FileText", color: "#a855f7" },
                { num: "03", title: "Запрет рекламы и спама", text: "Самореклама и спам без разрешения модераторов запрещены. Ссылки на свои проекты — только в специальных разделах.", icon: "Ban", color: "#00d4ff" },
                { num: "04", title: "Система модерации", text: "Все новые посты проходят модерацию перед публикацией. Нарушения правил → предупреждение → бан. Решения модераторов обжалуются через поддержку.", icon: "ShieldCheck", color: "#ff2d78" },
                { num: "05", title: "Авторские права", text: "Публикуй только контент, на который у тебя есть права. При использовании чужих материалов обязательно указывай источник.", icon: "Lock", color: "#ffa500" },
              ].map((rule, i) => (
                <div key={rule.num} className="glass-card rounded-xl p-5 flex gap-4" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${rule.color}20`, border: `1px solid ${rule.color}40` }}
                    >
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
                <h2 className="font-oswald text-3xl font-bold text-white tracking-wide mb-1">
                  МОДЕ<span className="neon-text-purple">РАЦИЯ</span>
                </h2>
                <p className="text-muted-foreground">Управление контентом и пользователями</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ff2d78]/10 border border-[#ff2d78]/30">
                <span className="w-2 h-2 rounded-full bg-[#ff2d78] animate-pulse" />
                <span className="text-sm text-[#ff2d78] font-medium">{pendingCount} ожидают</span>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {[
                { id: "posts" as const, label: "Посты", icon: "FileText" },
                { id: "users" as const, label: "Пользователи", icon: "Users" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    modTab === tab.id
                      ? "bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7]"
                      : "glass-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon name={tab.icon} size={15} />
                  {tab.label}
                </button>
              ))}
            </div>

            {modTab === "posts" && (
              <div className="space-y-3">
                {posts.map(post => (
                  <div key={post.id} className="glass-card rounded-xl p-4 border border-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[post.status].cls}`}>
                            {statusConfig[post.status].label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">{post.category}</span>
                        </div>
                        <h3 className="font-semibold text-white text-sm mb-0.5">{post.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{post.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{post.author} · {post.date}</p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {post.status !== "approved" && (
                          <button
                            onClick={() => updatePostStatus(post.id, "approved")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00ff9d]/15 border border-[#00ff9d]/30 text-[#00ff9d] text-xs font-medium hover:bg-[#00ff9d]/25 transition-all"
                          >
                            <Icon name="Check" size={12} /> Одобрить
                          </button>
                        )}
                        {post.status !== "rejected" && (
                          <button
                            onClick={() => updatePostStatus(post.id, "rejected")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff2d78]/15 border border-[#ff2d78]/30 text-[#ff2d78] text-xs font-medium hover:bg-[#ff2d78]/25 transition-all"
                          >
                            <Icon name="X" size={12} /> Отклонить
                          </button>
                        )}
                        {post.status !== "pending" && (
                          <button
                            onClick={() => updatePostStatus(post.id, "pending")}
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
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{user.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleConfig[user.role].cls}`}>
                            {roleConfig[user.role].label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{user.posts} постов · с {user.joined}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.role !== "moderator" && user.role !== "admin" && (
                        <button
                          onClick={() => updateUserRole(user.id, "moderator")}
                          className="px-3 py-1.5 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#a855f7] text-xs font-medium hover:bg-[#a855f7]/25 transition-all"
                        >
                          Модератор
                        </button>
                      )}
                      {user.role !== "banned" ? (
                        <button
                          onClick={() => updateUserRole(user.id, "banned")}
                          className="px-3 py-1.5 rounded-lg bg-[#ff2d78]/15 border border-[#ff2d78]/30 text-[#ff2d78] text-xs font-medium hover:bg-[#ff2d78]/25 transition-all"
                        >
                          Заблокировать
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUserRole(user.id, "user")}
                          className="px-3 py-1.5 rounded-lg bg-[#00ff9d]/15 border border-[#00ff9d]/30 text-[#00ff9d] text-xs font-medium hover:bg-[#00ff9d]/25 transition-all"
                        >
                          Разблокировать
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
