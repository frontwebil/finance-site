"use client";

import { useRouter } from "next/navigation";
import "./page.css";
import axios from "axios";

type AdminDashboardProps = {
  data: {
    totalUsers: number;
    users24h: number;
    users7d: number;
  };
};

export default function AdminDashboardPage({ data }: AdminDashboardProps) {
  const router = useRouter();
  const handleLogout = async () => {
    try {
      await axios.post("/api/admin/logout");
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const stats = [
    {
      label: "Всього користувачів",
      value: data.totalUsers.toLocaleString("uk-UA"),
    },
    {
      label: "Нових за 24 години",
      value: data.users24h.toLocaleString("uk-UA"),
    },
    {
      label: "Нових за 7 днів",
      value: data.users7d.toLocaleString("uk-UA"),
    },
  ];
  return (
    <main className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar__brand">FinWay Admin</div>
        <nav className="sidebar__nav">
          <a className="is-active" href="#">
            Головна
          </a>
          <a href="#">Користувачі</a>
          {/* <a href="#">Статистика</a> */}
          {/* <a href="#">Налаштування</a> */}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Огляд</p>
            <h1>Панель управління</h1>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Вийти
          </button>
        </header>

        <div className="stats-grid">
          {stats.map((item) => (
            <article className="stat-card" key={item.label}>
              <span className="stat-card__label">{item.label}</span>
              <strong className="stat-card__value">{item.value}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
