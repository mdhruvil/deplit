import Cloudflare from "cloudflare";
import { env } from "cloudflare:workers";

/**
 * Invalidate the cache for a specific tag from cloudflare cache
 * @param tag site:${subdomain}
 */
export async function invalidateCacheByTag(tag: string) {
  const cloudflare = new Cloudflare({
    apiEmail: env.CLOUDFLARE_EMAIL,
    apiKey: env.CLOUDFLARE_API_KEY,
  });
  const data = await cloudflare.cache.purge({
    tags: [tag],
    zone_id: env.CLOUDFLARE_ZONE_ID,
  });
  console.log("Cache invalidated", data);
}
