import { createHash } from "node:crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type CloudinaryUploadResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string };

type CloudinaryResponse = {
  secure_url?: unknown;
  error?: { message?: unknown };
};

/** Returns an error message for an unsupported file, or null when the file is fine. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_FILE_SIZE) {
    return "Дозволені JPG, PNG або WebP розміром до 5 МБ";
  }
  return null;
}

export function cloudinarySignature(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export async function uploadImageToCloudinary(
  file: File,
  folder: string,
): Promise<CloudinaryUploadResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    return { ok: false, status: 400, error: validationError };
  }

  const cloudName = process.env.CLODINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLODINARY_API_SECRET ?? process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false, status: 500, error: "Не налаштовано доступ до Cloudinary" };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const uploadData = new FormData();
  uploadData.set("file", file);
  uploadData.set("api_key", apiKey);
  uploadData.set("timestamp", timestamp);
  uploadData.set("folder", folder);
  uploadData.set("signature", cloudinarySignature({ folder, timestamp }, apiSecret));

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: "POST", body: uploadData, signal: AbortSignal.timeout(30_000) },
    );
  } catch (error) {
    console.error("Cloudinary upload request failed", error);
    return {
      ok: false,
      status: 502,
      error: "Не вдалося з’єднатися з Cloudinary. Спробуйте ще раз.",
    };
  }

  let result: CloudinaryResponse;
  try {
    result = (await response.json()) as CloudinaryResponse;
  } catch (error) {
    console.error("Cloudinary returned an invalid upload response", error);
    return {
      ok: false,
      status: 502,
      error: "Cloudinary повернув некоректну відповідь. Спробуйте ще раз.",
    };
  }

  if (!response.ok || typeof result.secure_url !== "string") {
    const message =
      typeof result.error?.message === "string"
        ? result.error.message
        : "Не вдалося завантажити зображення";
    console.error("Cloudinary image upload failed", { status: response.status, message });
    return { ok: false, status: 502, error: message };
  }

  return { ok: true, url: result.secure_url };
}

/** Reads the `file` field from a multipart request. */
export async function readImageFromRequest(
  request: Request,
): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return { ok: false, error: "Не вдалося прочитати файл. Спробуйте зображення до 5 МБ." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Оберіть файл зображення" };
  }
  return { ok: true, file };
}
