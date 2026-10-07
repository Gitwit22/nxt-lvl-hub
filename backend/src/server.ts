import { createApp } from "./app.js";
import { env, isR2Configured } from "./config/env.js";
import { jsonStore } from "./database/json-store.js";

async function startServer() {
  await jsonStore.initialize();

  const app = createApp();

  if (!isR2Configured()) {
    console.warn(
      "[upload] R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET[_NAME], R2_PUBLIC_BASE_URL/R2_PUBLIC_URL). " +
        "Logo uploads will be written to local disk and will not survive a redeploy on ephemeral hosts.",
    );
  }

  app.listen(env.port, () => {
    console.log(`Backend running on port ${env.port}`);
  });
}

void startServer();