/** Co je v databázi: počty dokumentů a pár čísel. */
const { init } = require("./_admin");

async function count(db, col) {
  const s = await db.collection(col).count().get();
  return s.data().count;
}

async function main() {
  const db = init();
  for (const col of ["allowedUsers", "users", "progress", "runs", "stats", "grades"]) {
    console.log(`${col.padEnd(14)} ${await count(db, col)}`);
  }
  const sus = await db.collection("runs").where("suspicious", "!=", null).count().get();
  console.log(`\npodezřelé běhy: ${sus.data().count}`);
  const top = await db.collection("stats").orderBy("bestNetCpm", "desc").limit(5).get();
  if (!top.empty) {
    console.log("\nTop 5 čistých úhozů/min:");
    top.docs.forEach((d) => {
      const s = d.data();
      console.log(`  ${(s.displayName || "?").padEnd(24)} ${String(s.bestNetCpm).padStart(4)}  ${s.classId || "-"}  ${s.courseCompletion}%`);
    });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
