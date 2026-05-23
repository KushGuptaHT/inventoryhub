// WHAT:  Start the HTTP server.
// WHY:   Separates "build app" (testable) from "listen on port" (runtime).
// HOW:   buildApp() registers plugins; then listen on 4000.

import { buildApp } from "./app";

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: 4000 });
    console.log("Backend running on port 4000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
