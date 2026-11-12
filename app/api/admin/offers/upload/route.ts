import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type CloudinaryResponse = {
  secure_url?: unknown;
  error?: { message?: unknown };
};

export async function POST(request: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Не вдалося прочитати файл. Спробуйте зображення до 5 МБ." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Оберіть файл зображення" }, { status: 400 });
  }
  if (
    !ALLOWED_TYPES.has(file.type) ||
    file.size === 0 ||
    file.size > MAX_FILE_SIZE
  ) {
    return NextResponse.json(
      { error: "Дозволені JPG, PNG або WebP розміром до 5 МБ" },
      { status: 400 },
    );
  }

  const cloudName =
    process.env.CLODINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret =
    process.env.CLODINARY_API_SECRET ?? process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Не налаштовано доступ до Cloudinary" },
      { status: 500 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha1")
    .update(`folder=offers&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  const uploadData = new FormData();
  uploadData.set("file", file);
  uploadData.set("api_key", apiKey);
  uploadData.set("timestamp", timestamp);
  uploadData.set("folder", "offers");
  uploadData.set("signature", signature);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: "POST", body: uploadData, signal: AbortSignal.timeout(30_000) },
    );
  } catch (error) {
    console.error("Cloudinary upload request failed", error);
    return NextResponse.json(
      { error: "Не вдалося з’єднатися з Cloudinary. Спробуйте ще раз." },
      { status: 502 },
    );
  }

  let result: CloudinaryResponse;
  try {
    result = (await response.json()) as CloudinaryResponse;
  } catch (error) {
    console.error("Cloudinary returned an invalid upload response", error);
    return NextResponse.json(
      { error: "Cloudinary повернув некоректну відповідь. Спробуйте ще раз." },
      { status: 502 },
    );
  }

  if (!response.ok || typeof result.secure_url !== "string") {
    const message =
      typeof result.error?.message === "string"
        ? result.error.message
        : "Не вдалося завантажити зображення";
    console.error("Cloudinary image upload failed", {
      status: response.status,
      message,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ logoUrl: result.secure_url });
}
