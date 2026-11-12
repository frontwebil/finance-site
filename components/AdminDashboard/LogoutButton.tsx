"use client";

import { useRouter } from "next/navigation";
import axios from "axios";

export default function LogoutButton() {
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

  return (
    <button type="button" className="logout-button" onClick={handleLogout}>
      Вийти
    </button>
  );
}
