import Link from "next/link";

export type AdminSection = "home" | "users" | "offers" | "broadcasts";

const NAV_ITEMS: Array<{ key: AdminSection; href: string; label: string }> = [
  { key: "home", href: "/admin", label: "Головна" },
  { key: "users", href: "/admin/users", label: "Користувачі" },
  { key: "offers", href: "/admin/offers", label: "Офери" },
  { key: "broadcasts", href: "/admin/broadcasts", label: "Розсилки" },
];

export default function AdminSidebar({ active }: { active: AdminSection }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">FinWay Admin</div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) =>
          item.key === active ? (
            <Link key={item.key} className="is-active" href={item.href} aria-current="page">
              {item.label}
            </Link>
          ) : (
            <Link key={item.key} href={item.href}>
              {item.label}
            </Link>
          ),
        )}
      </nav>
    </aside>
  );
}
