import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const userId = Number(id);
  if (!Number.isSafeInteger(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const result = await prisma.user.deleteMany({ where: { id: userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
