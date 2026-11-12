import { createSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { login, password } = await req.json();

  if (
    !process.env.ADMIN_PASSWORD ||
    !process.env.ADMIN_SECRET ||
    !process.env.ADMIN_LOGIN
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (
    password !== process.env.ADMIN_PASSWORD ||
    login !== process.env.ADMIN_LOGIN
  ) {
    return NextResponse.json(
      { error: "Неправильні данні для входу" },
      { status: 401 },
    );
  }

  await createSession();

  return NextResponse.json({ success: true });
}
