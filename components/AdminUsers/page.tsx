import { Suspense } from "react";
import Link from "next/link";
import LogoutButton from "@/components/AdminDashboard/LogoutButton";
import SendBroadcast from "./SendBroadcast";
import AdminUsersTable from "./AdminUsersTable";
import "./style.css";
import "./../AdminDashboard/page.css";

export default function AdminUsersPage() {
  return (
    <main className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar__brand">FinWay Admin</div>
        <nav className="sidebar__nav">
          <Link href="/admin">Головна</Link>
          <Link
            className="is-active"
            href="/admin/users"
            aria-current="page"
          >
            Користувачі
          </Link>
          <Link href="/admin/offers">Офери</Link>
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Керування</p>
            <h1>Користувачі</h1>
          </div>
          <div className="users-header-actions">
            <SendBroadcast />
            <LogoutButton />
          </div>
        </header>

        <section className="panel users-panel" aria-label="Список користувачів">
          <div className="panel__header">
            <h2>Усі користувачі</h2>
            <span>Зареєстровані користувачі</span>
          </div>
          <Suspense
            fallback={
              <p className="users-empty" aria-busy="true">
                Завантаження користувачів...
              </p>
            }
          >
            <AdminUsersTable />
          </Suspense>
        </section>
      </section>
    </main>
  );
}
