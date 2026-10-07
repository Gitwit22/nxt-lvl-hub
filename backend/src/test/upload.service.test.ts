import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

const { env } = await import("../config/env.js");
const { detectImageType, UploadService } = await import("../services/upload.service.js");

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const request = { protocol: "https", host: "hub.example.com" };
const originalR2 = { ...env.r2 };
const originalUploadPath = env.uploadPath;

describe("detectImageType", () => {
  it("identifies supported signatures and rejects others", () => {
    expect(detectImageType(PNG)?.mimeType).toBe("image/png");
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.extension).toBe("jpg");
    expect(detectImageType(Buffer.from("GIF89a....")))?.toMatchObject({ extension: "gif" });
    expect(detectImageType(Buffer.from("RIFF0000WEBPVP8 "))?.extension).toBe("webp");
    expect(detectImageType(SVG)).toBeNull();
  });
});

describe("UploadService.storeLogo", () => {
  let tempDir: string;

  beforeEach(async () => {
    sendMock.mockReset();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "logo-upload-"));
    env.uploadPath = tempDir;
  });

  afterEach(async () => {
    Object.assign(env.r2, originalR2);
    env.uploadPath = originalUploadPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("rejects content that is not a supported image even if the client claimed image/*", async () => {
    await expect(new UploadService().storeLogo({ buffer: SVG }, request)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("writes to R2 and returns a durable public URL when configured", async () => {
    Object.assign(env.r2, {
      accountId: "acct",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "logos-bucket",
      publicBaseUrl: "https://cdn.example.com",
    });
    sendMock.mockResolvedValue({});

    const stored = await new UploadService().storeLogo({ buffer: PNG }, request);

    expect(stored.storage).toBe("r2");
    expect(stored.logoUrl).toMatch(/^https:\/\/cdn\.example\.com\/logos\/\d+-[0-9a-f-]+\.png$/);
    const command = sendMock.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({ Bucket: "logos-bucket", ContentType: "image/png" });
    expect(command.input.Key).toBe(stored.logoUrl.replace("https://cdn.example.com/", ""));
    await expect(fs.readdir(tempDir)).resolves.toHaveLength(0);
  });

  it("surfaces R2 failures as an error instead of returning a URL", async () => {
    Object.assign(env.r2, {
      accountId: "acct",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "logos-bucket",
      publicBaseUrl: "https://cdn.example.com",
    });
    sendMock.mockRejectedValue(new Error("AccessDenied"));

    await expect(new UploadService().storeLogo({ buffer: PNG }, request)).rejects.toMatchObject({ statusCode: 502 });
  });

  it("falls back to local disk with the existing /uploads URL when R2 is not configured", async () => {
    Object.assign(env.r2, { accountId: "", accessKeyId: "", secretAccessKey: "", bucket: "", publicBaseUrl: "" });

    const stored = await new UploadService().storeLogo({ buffer: PNG }, request);

    expect(stored.storage).toBe("local");
    expect(stored.logoUrl).toBe(`https://hub.example.com/uploads/${stored.fileName}`);
    await expect(fs.readFile(path.join(tempDir, stored.fileName))).resolves.toEqual(PNG);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
