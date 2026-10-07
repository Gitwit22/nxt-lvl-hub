import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env, isR2Configured } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

type ImageType = { mimeType: string; extension: string };

/**
 * Detects the image type from file signature bytes. The client-supplied
 * mimetype is not trusted for deciding what gets stored and served.
 */
export function detectImageType(buffer: Buffer): ImageType | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") {
      return { mimeType: "image/gif", extension: "gif" };
    }
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

export type StoredLogo = {
  fileName: string;
  logoUrl: string;
  storage: "r2" | "local";
};

export class UploadService {
  private r2Client: S3Client | null = null;

  private getR2Client() {
    if (!this.r2Client) {
      this.r2Client = new S3Client({
        region: "auto",
        endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.r2.accessKeyId,
          secretAccessKey: env.r2.secretAccessKey,
        },
      });
    }
    return this.r2Client;
  }

  buildLogoUrl(request: { protocol: string; host: string }, filename: string) {
    return `${request.protocol}://${request.host}/uploads/${filename}`;
  }

  async storeLogo(file: { buffer: Buffer }, request: { protocol: string; host: string }): Promise<StoredLogo> {
    const imageType = detectImageType(file.buffer);
    if (!imageType) {
      throw new AppError("File content is not a valid PNG, JPG, GIF, or WEBP image.", 400);
    }

    // Random names: uploads can never collide with or overwrite another logo.
    const fileName = `${Date.now()}-${randomUUID()}.${imageType.extension}`;

    if (isR2Configured()) {
      const key = `logos/${fileName}`;
      try {
        await this.getR2Client().send(
          new PutObjectCommand({
            Bucket: env.r2.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: imageType.mimeType,
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
      } catch (error) {
        console.error("[upload] R2 put failed", { key, message: error instanceof Error ? error.message : String(error) });
        throw new AppError("Logo storage is unavailable. Please try again.", 502);
      }
      return { fileName, logoUrl: `${env.r2.publicBaseUrl}/${key}`, storage: "r2" };
    }

    // Local-disk fallback (development). On hosts with ephemeral disks these files are lost on redeploy.
    await fs.mkdir(env.uploadPath, { recursive: true });
    await fs.writeFile(path.join(env.uploadPath, fileName), file.buffer);
    return { fileName, logoUrl: this.buildLogoUrl(request, fileName), storage: "local" };
  }
}

export const uploadService = new UploadService();
