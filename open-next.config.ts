import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// Cache ISR durable via R2 — activer après création du bucket (voir wrangler.jsonc) :
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  // incrementalCache: r2IncrementalCache,
});
