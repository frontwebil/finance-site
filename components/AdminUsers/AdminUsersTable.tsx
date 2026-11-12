import prisma from "@/lib/prisma";
import DeleteUserButton from "./DeleteUserButton";

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
            <th>Дія</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.userName}</td>
              <td>{user.chat_id.toString()}</td>
              <td>{user.createdAt.toLocaleString("uk-UA")}</td>
              <td>
                <DeleteUserButton id={user.id} name={user.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
