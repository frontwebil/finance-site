"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "./page.css";
import axios from "axios";
import { Loader } from "@/components/Loader/loader";

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!login.trim() || !password.trim()) {
      setError("Введіть email та пароль");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/api/admin/login", {
        login,
        password,
      });

      if (res.data.success) {
        router.replace("/admin");
        router.refresh();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || "Помилка під час авторизації");
      } else {
        setError("Невідома помилка");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      {loading && <Loader />}
      <section className="login-panel">
        <div className="login-panel__content">
          <div className="brand-block">
            <span className="brand-block__badge">FinWay</span>
            <h1>Адмін-панель</h1>
            <p>Увійдіть, щоб керувати ботом і переглядати статистику.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="text"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="admin@finway.ua"
              />
            </label>

            <label>
              <span>Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error ? <p className="login-form__error">{error}</p> : null}

            <button type="submit">Увійти</button>
          </form>
        </div>
      </section>
    </main>
  );
}
