import { resolve } from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export const uploadRoot = () =>
  resolve(process.env.UPLOADS_DIR || "var/uploads");
export function validateDocumentFile(base64: string) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0)
    throw new Error("Arquivo inválido.");
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > 10 * 1024 * 1024)
    throw new Error("O arquivo deve ter no máximo 10 MB.");
  const ext =
    buffer.subarray(0, 5).toString() === "%PDF-"
      ? "pdf"
      : buffer
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "png"
        : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
          ? "jpg"
          : null;
  if (!ext) throw new Error("Envie um arquivo PDF, PNG ou JPEG válido.");
  return { buffer, ext };
}
export async function saveDocumentFile(base64: string, prefix: string) {
  const { buffer, ext } = validateDocumentFile(base64);
  await mkdir(uploadRoot(), { recursive: true });
  const key = `${prefix}_${randomUUID()}.${ext}`;
  const path = resolve(uploadRoot(), key);
  await writeFile(path, buffer, { flag: "wx" });
  return {
    url: `/uploads/${key}`,
    cleanup: () => unlink(path).catch(() => {}),
  };
}
