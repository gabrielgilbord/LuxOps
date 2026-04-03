import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function extensionFromDataUrl(dataUrl: string) {
  if (dataUrl.startsWith("data:application/pdf")) return "pdf";
  if (dataUrl.startsWith("data:image/png")) return "png";
  if (dataUrl.startsWith("data:image/webp")) return "webp";
  return "jpg";
}

function contentTypeFromExt(ext: string) {
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function uploadDataUrlToStorage(params: {
  bucket: string;
  path: string;
  dataUrl: string;
}) {
  const { bucket, path, dataUrl } = params;
  const parts = dataUrl.split(",");
  if (parts.length < 2) throw new Error("Data URL inválido");

  const ext = extensionFromDataUrl(dataUrl);
  const bytes = Buffer.from(parts[1], "base64");
  const supabase = createSupabaseAdminClient();

  const uploadPath = `${path}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(uploadPath, bytes, {
    contentType: contentTypeFromExt(ext),
    upsert: true,
  });
  if (error) throw error;

  return { path: uploadPath };
}

export async function createSignedStorageUrl(params: {
  bucket: string;
  path: string;
  expiresIn?: number;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.path, params.expiresIn ?? 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadStorageBytes(params: { bucket: string; path: string }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(params.bucket).download(params.path);
  if (error || !data) return null;
  const buffer = await data.arrayBuffer();
  return Buffer.from(buffer);
}
