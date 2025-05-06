type Site = {
  commitHash: string;
  spa?: boolean;
  htmlRoutes: Record<string, string>;
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    try {
      const sites = env.SITES;
      const mainStart = performance.now();
      const url = new URL(request.url);

      const subdomain = url.hostname.split(".")[0];
      // used for local testing
      // const subdomain = "zaggonaut";
      // url.protocol = "https:";

      const kvStart = performance.now();
      const cache = caches.default;
      const cacheKey = new URL(`cache://${subdomain}.deplit.tech`);
      let data = await cache.match(cacheKey);
      let kvCacheStatus = data ? "hit" : "miss";
      let kvCacheHeader = data?.headers.get("cf-cache-status");

      if (!data) {
        const site = await sites.get(subdomain, {
          type: "json",
        });

        if (!site) {
          // if the site is not found, we want to return a custom 404 page
          const notFoundResponse = await env.ASSETS.fetch(
            "https://assets.local/deployment-not-found",
          );

          return new Response(notFoundResponse.body, {
            status: 404,
          });
        }

        const response = new Response(JSON.stringify(site), {
          headers: {
            "Content-Type": "application/json",
            // TODO: change cacheTtl to 1 year
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "Cache-Tag": `site:${subdomain}`,
          },
        });
        kvCacheStatus = "revalidated";
        data = response.clone();
        await cache.put(cacheKey, response);
      }
      const kvEnd = performance.now();

      const site = (await data?.json()) as Site;

      if (!subdomain || !site) {
        // if the site is not found, we want to return a custom 404 page
        const notFoundResponse = await env.ASSETS.fetch(
          "https://assets.local/deployment-not-found",
        );

        return new Response(notFoundResponse.body, {
          status: 404,
        });
      }

      // if the site is spa and the request is for a html route, rewrite the url to the `/index.html` file
      if (!!site.spa) {
        if (site.htmlRoutes[url.pathname]) {
          url.pathname = site.htmlRoutes[url.pathname];
        } else if (!request.headers.get("accept")?.includes("text/html")) {
          // This is an asset request, let it pass through
          // (Keep the URL as is)
        } else {
          url.pathname = site.htmlRoutes["/"] ?? "index.html";
        }
      }

      if (!!site.htmlRoutes[url.pathname]) {
        url.pathname =
          ["", subdomain, site.commitHash, ""].join("/") +
          site.htmlRoutes[url.pathname];
      } else {
        // we dont need the trailing slash here because pathname is already has a leading slash
        url.pathname =
          ["", subdomain, site.commitHash].join("/") + url.pathname;
      }

      url.hostname = env.BLOB_HOSTNAME;
      if (env.DEBUG) {
        console.log("Request URL: ", url.toString());
      }
      const contentFetchStart = performance.now();
      let response = await fetch(url, {
        cf: {
          // Always cache this fetch regardless of content type
          // for a max of 24 hours before revalidating the resource
          // TODO: change cacheTtl to 1 year
          cacheTtl: 24 * 60 * 60,
          cacheEverything: true,
        },
      });
      const contentFetchEnd = performance.now();

      // if the response is a 404 and the request was for a blob, we want to return a custom 404
      // TODO: respond with custom 404 page
      if (response.headers.has("x-ms-request-id") && response.status === 404) {
        response = new Response("Deplit - Not found", { status: 404 });
      } else {
        response = new Response(response.body, response);
      }

      const cfCacheStatus = response.headers.get("cf-cache-status");
      if (cfCacheStatus) {
        response.headers.delete("cf-cache-status");
      }

      // Create an array of headers to delete
      const headersToDelete: string[] = [];
      response.headers.forEach((_, key) => {
        if (key.startsWith("x-ms-")) {
          headersToDelete.push(key);
        }
      });
      // Delete the headers after iteration
      headersToDelete.forEach((key) => response.headers.delete(key));
      const headers = {
        "deplit-cache-status": cfCacheStatus ?? "miss",
        "deplit-kv-cache-header": kvCacheHeader ?? "miss",
        "deplit-kv-cache-status": kvCacheStatus ?? "miss",
        "deplit-col": request.cf?.colo,
        "deplit-city": request.cf?.city,
        "deplit-continent": request.cf?.continent,
        "deplit-country": request.cf?.country,
        "deplit-region": request.cf?.region,
        "deplit-as-organization": request.cf?.asOrganization,
      };

      const mainEnd = performance.now();
      const debugHeaders = {
        "deplit-blob-url": url.toString(),
        "Server-Timing": [
          {
            name: "siteMetadata",
            desc: "Site metadata fetch",
            dur: kvEnd - kvStart,
          },
          {
            name: "contentFetch",
            desc: "Content fetch",
            dur: contentFetchEnd - contentFetchStart,
          },
          {
            name: "total",
            desc: "Total",
            dur: mainEnd - mainStart,
          },
        ]
          .map(
            (header) =>
              `${header.name};desc="${header.desc}";dur=${header.dur.toFixed(2)}`,
          )
          .join(", "),
      };

      for (const [key, value] of Object.entries(headers)) {
        if (value) {
          response.headers.set(key, value);
        }
      }

      if (env.DEBUG) {
        for (const [key, value] of Object.entries(debugHeaders)) {
          response.headers.set(key, value);
        }
      }
      return response;
    } catch (error) {
      if (env.DEBUG) {
        return new Response(
          JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
          { status: 500 },
        );
      } else {
        return new Response("Internal Server Error", { status: 500 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
