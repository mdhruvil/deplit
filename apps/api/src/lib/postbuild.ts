import { env } from "cloudflare:workers";

/**
 * Invalidate the cache for a specific tag from cloudflare cache
 * @param tag site:${subdomain}
 */
export async function invalidateCacheByTag(tag: string) {
  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`,
    {
      body: JSON.stringify({ tags: [tag] }),
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_KEY}`,
        "X-Auth-Email": env.CLOUDFLARE_EMAIL,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  if (!resp.ok) {
    console.error(await resp.json());
    throw new Error(
      `Failed to invalidate cache for tag ${tag}: ${resp.statusText}`,
    );
  }
  const data = await resp.json();
  console.log("Cache invalidated for tag:", tag);
  console.log("Cache invalidation response:", data);
  return true;
}
``;
