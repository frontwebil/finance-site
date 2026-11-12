import { Suspense } from "react";
import AdminSidebar from "@/components/AdminSidebar/AdminSidebar";
import LogoutButton from "@/components/AdminDashboard/LogoutButton";
import SendBroadcast from "./SendBroadcast";
import AdminUsersTable from "./AdminUsersTable";
import "./style.css";
import "./../AdminDashboard/page.css";

export default function AdminUsersPage() {
  return (
    <main className="dashboard-page">
      <AdminSidebar active="users" />

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
