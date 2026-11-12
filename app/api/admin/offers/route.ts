import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { parseOfferPayload } from "@/lib/offer-validation";
import prisma from "@/lib/prisma";

export async function GET() {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const offers = await prisma.offer.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ offers });
}

export async function POST(request: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = parseOfferPayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ error: "Некоректні дані оферу" }, { status: 400 });
  }

  const offer = await prisma.offer.create({ data: payload });
  return NextResponse.json({ offer }, { status: 201 });
}
