type Site = {
  commitHash: string;
  spa?: boolean;
  htmlRoutes: Record<string, string>;
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const sites = env.SITES;
    const mainStart = performance.now();
    const url = new URL(request.url);

    const subdomain = url.hostname.split(".")[0];
    // used for local testing
    // const subdomain = 'zaggonaut';

    const kvStart = performance.now();
    const site = (await sites.get(subdomain, {
      type: "json",
    })) as Site;
    const kvEnd = performance.now();

    if (!subdomain || !site) {
      // if the site is not found, we want to return a custom 404 page
      // TODO: respond with custom 404 page
      return new Response("Deplit - Not found", { status: 404 });
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
      url.pathname = ["", subdomain, site.commitHash].join("/") + url.pathname;
    }

    url.hostname = env.BLOB_HOSTNAME;
    console.log("Request URL: ", url.toString());
    const contentFetchStart = performance.now();
    let response = await fetch(url, {
      cf: {
        // Always cache this fetch regardless of content type
        // for a max of 24 hours before revalidating the resource
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

    response.headers.forEach((_, key) => {
      if (key.startsWith("x-ms-")) {
        response.headers.delete(key);
      }
    });
    const headers = {
      "deplit-cache-status": cfCacheStatus ?? "miss",
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
      "deplit-kv-time": (kvEnd - kvStart).toString(),
      "deplit-total-time": (mainEnd - mainStart).toString(),
      "deplit-content-fetch-time": (
        contentFetchEnd - contentFetchStart
      ).toString(),
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
  },
} satisfies ExportedHandler<Env>;
