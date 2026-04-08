import path from "node:path";
import multer from "multer";
import { env } from "./env.js";

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, env.uploadPath);
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname || "");
    const safeBase = path.basename(file.originalname || "logo", extension).replace(/[^a-zA-Z0-9-_]/g, "-");
    callback(null, `${Date.now()}-${safeBase}${extension}`);
  },
});

function fileFilter(_request: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image uploads are supported."));
    return;
  }

  callback(null, true);
}

export const uploadLogoMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");