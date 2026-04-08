import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { jsonStore } from "./database/json-store.js";

async function startServer() {
  await jsonStore.initialize();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Backend running on port ${env.port}`);
  });
}

void startServer();