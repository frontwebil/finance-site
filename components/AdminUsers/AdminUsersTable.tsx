import prisma from "@/lib/prisma";
import DeleteUserButton from "./DeleteUserButton";
import { SendMessageToUser } from "./SendMessageToUser";
import './style.css'

export default async function AdminUsersTable() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (users.length === 0) {
    return <p className="users-empty">Користувачів поки немає.</p>;
  }

  return (
    <div className="users-table-wrapper">
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ім’я</th>
            <th>Username</th>
            <th>Chat ID</th>
            <th>Дата реєстрації</th>
            <th className="users-table-last-column">Дія</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td data-label="ID">{user.id}</td>
              <td data-label="Ім’я">{user.name}</td>
              <td data-label="Username">{user.userName}</td>
              <td data-label="Chat ID">{user.chat_id.toString()}</td>
              <td data-label="Дата реєстрації">{user.createdAt.toLocaleString("uk-UA")}</td>
              <td className="users-table__buttons">
                <DeleteUserButton id={user.id} name={user.name} />
                <SendMessageToUser chat_id={user.chat_id}/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
