import { app } from "./app";

const start = async () => {
  try {
    await app.listen({
      port: 4000,
    });

    console.log("Backend running on port 4000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
