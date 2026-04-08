import type { Request, Response } from "express";
import { jsonStore } from "../database/json-store.js";
import { sendSuccess } from "../utils/response.js";

export async function getHealth(_request: Request, response: Response) {
  await jsonStore.initialize();
  const state = await jsonStore.read();

  return sendSuccess(
    response,
    {
      status: jsonStore.getStatus(state),
    },
    "Backend running",
  );
}
