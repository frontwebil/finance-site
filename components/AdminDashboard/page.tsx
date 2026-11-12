"use client";

import Link from "next/link";
import "./page.css";
import LogoutButton from "./LogoutButton";

type AdminDashboardProps = {
  data: {
    totalUsers: number;
    users24h: number;
    users7d: number;
  };
};

export default function AdminDashboardPage({ data }: AdminDashboardProps) {
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
          <Link className="is-active" href="/admin" aria-current="page">
            Головна
          </Link>
          <Link href="/admin/users">Користувачі</Link>
          <Link href="/admin/offers">Офери</Link>
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
          <LogoutButton />
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
