import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { readImageFromRequest, uploadImageToCloudinary } from "@/lib/cloudinary";

export async function POST(request: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const read = await readImageFromRequest(request);
  if (!read.ok) {
    return NextResponse.json({ error: read.error }, { status: 400 });
  }

  const upload = await uploadImageToCloudinary(read.file, "broadcasts");
  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: upload.status });
  }

  return NextResponse.json({ photoUrl: upload.url });
}
