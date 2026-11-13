import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { parseReorderPayload } from "@/lib/offer-order";
import prisma from "@/lib/prisma";

export async function PUT(request: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ids = parseReorderPayload(await request.json().catch(() => null));
  if (!ids) {
    return NextResponse.json({ error: "Некоректний порядок оферів" }, { status: 400 });
  }

  const existing = await prisma.offer.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((offer) => offer.id));
  if (existing.length !== ids.length || !ids.every((id) => existingIds.has(id))) {
    return NextResponse.json(
      { error: "Список оферів змінився. Оновіть сторінку і спробуйте ще раз." },
      { status: 409 },
    );
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.offer.update({ where: { id }, data: { order: index } })),
  );

  return NextResponse.json({ success: true });
}
