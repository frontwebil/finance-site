"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteUserButtonProps = {
  id: number;
  name: string;
};

export default function DeleteUserButton({
  id,
  name,
}: DeleteUserButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDelete = async () => {
    if (!window.confirm(`Видалити користувача ${name}?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await axios.delete(`/api/admin/users/${id}`);
      router.refresh();
    } catch (error) {
      const message = axios.isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error
        : undefined;
      setErrorMessage(message ?? "Не вдалося видалити користувача.");
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="delete-user-button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Видалити користувача ${name}`}
      >
        {isDeleting ? "Видалення..." : "Видалити"}
      </button>
      {errorMessage ? (
        <p className="delete-user-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
