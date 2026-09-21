import { serve } from "@hono/node-server";

import { createApp } from "./app.ts";
import { env } from "./env.ts";

const app = createApp();

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`SplitBills API listening on http://localhost:${info.port}`);
  console.log(`  health  http://localhost:${info.port}/api/health`);
});

export { app };
export type { AppType } from "./app.ts";
