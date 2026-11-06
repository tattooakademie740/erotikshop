import { db } from "../src/db";
import { runOnce, scheduleImports } from "../src/server/jobs/worker";

let stop = false;
process.on("SIGTERM", () => (stop = true));
process.on("SIGINT", () => (stop = true));

async function loop() {
  let lastSchedule = 0;
  console.log("Worker gestartet.");
  while (!stop) {
    try {
      if (Date.now() - lastSchedule > 60_000) {
        await scheduleImports(db);
        lastSchedule = Date.now();
      }
      const n = await runOnce(db);
      if (n === 0) await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.error("Worker-Fehler:", e);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  console.log("Worker beendet.");
  process.exit(0);
}
loop();
