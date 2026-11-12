import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { parseOfferPayload } from "@/lib/offer-validation";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Некоректний ID оферу" }, { status: 400 });
  }

  const payload = parseOfferPayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ error: "Некоректні дані оферу" }, { status: 400 });
  }

  const result = await prisma.offer.updateMany({ where: { id }, data: payload });
  if (result.count === 0) {
    return NextResponse.json({ error: "Офер не знайдено" }, { status: 404 });
  }

  const offer = await prisma.offer.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ offer });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Некоректний ID оферу" }, { status: 400 });
  }

  const result = await prisma.offer.deleteMany({ where: { id } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Офер не знайдено" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
