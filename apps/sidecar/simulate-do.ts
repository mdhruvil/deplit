// simulate-sidecar.ts
// Run with: ts-node simulate-sidecar.ts
// Or compile to JS and run with node.

// import fetch from 'node-fetch'; // Uncomment if using node-fetch on older Node versions
// For Node 18+ (ESM modules, or set "type": "module" in package.json):
// import fetch from 'node:http'; // Or just use global fetch

const WORKER_URL = "http://localhost:3000"; // Default wrangler dev port
const INGEST_ENDPOINT = `${WORKER_URL}/api/ingest`;
const SHARED_SECRET = "your_super_secret_value_for_sidecar"; // MUST MATCH WORKER SECRET
const BUILD_ID_1 = "build-abc-123";

async function sendLog(
  buildId: string,
  message: string,
  level: string = "info",
) {
  const payload = {
    buildId: buildId,
    message: message,
    timestamp: new Date().toISOString(),
    level: level,
  };

  try {
    console.log(`Sending to ${buildId}: ${message}`);
    const response = await fetch(INGEST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHARED_SECRET}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `Error sending log for ${buildId}: ${response.status} ${response.statusText}`,
      );
      const responseBody = await response.text();
      console.error("Response body:", responseBody);
    } else {
      // console.log(`Log sent for ${buildId}, status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Network error sending log for ${buildId}:`, error);
  }
}

async function simulateBuild(buildId: string) {
  const buildMessages = [
    "Initializing build environment...",
    "Cloning repository...",
    "Installing dependencies (npm install)...",
    "Running linters...",
    "Compiling TypeScript...",
    "Running tests (jest)...",
    "Packaging application...",
    "Pushing artifacts...",
    "Build complete!",
  ];

  while (true) {
    const message =
      buildMessages[Math.floor(Math.random() * buildMessages.length)];
    await sendLog(buildId, message);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1500 + 500),
    ); // Random delay
  }
}

async function main() {
  console.log(
    `Starting sidecar simulation. Sending logs to: ${INGEST_ENDPOINT}`,
  );
  console.log(
    `Using shared secret: ${SHARED_SECRET ? "Yes" : "No - WARNING!"}`,
  );

  if (!SHARED_SECRET) {
    console.warn(
      "Warning: CLOUDFLARE_WORKER_SECRET is not set in the simulator. This will likely fail against a secured worker.",
    );
  }

  // Simulate two concurrent builds
  await simulateBuild(BUILD_ID_1);
  // Stagger the start slightly

  console.log("Sidecar simulation finished.");
}

main().catch(console.error);
