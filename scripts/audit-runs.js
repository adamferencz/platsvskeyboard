/**
 * Audit běhů: projde běhy za posledních N dní, přepočítá heuristiky nad logem úhozů
 * a označí podezřelé (`suspicious`). Pouští se ručně nebo z Task Scheduleru.
 *
 *   npm run audit              # posledních 7 dní
 *   npm run audit -- --days 30
 */
const { admin, init } = require("./_admin");

function analyse(run) {
  const ks = run.keystrokes || [];
  const times = [];
  for (let i = 0; i < ks.length; i += 2) times.push(ks[i]);
  const intervals = times.slice(1).map((t, i) => t - times[i]);
  const reasons = [];
  if (run.cpm > 700) reasons.push(`cpm ${run.cpm}`);
  if (intervals.length >= 20) {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const sd = Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length);
    if (sd < 8) reasons.push(`sd intervalů ${sd.toFixed(1)} ms`);
    if (mean < 40) reasons.push(`průměrný interval ${mean.toFixed(0)} ms`);
    const span = times[times.length - 1] - times[0];
    if (span > run.durationMs * 1.2) reasons.push("časové značky přesahují délku běhu");
  }
  if (run.correct >= 60 && run.errors === 0 && run.cpm > 400) reasons.push("0 chyb při vysoké rychlosti");
  const expectedCorrect = (run.cpm * run.durationMs) / 60000;
  if (run.correct > 0 && Math.abs(expectedCorrect - run.correct) / run.correct > 0.1) reasons.push("cpm nesedí na počet znaků");
  return reasons.length ? reasons.join("; ") : null;
}

async function main() {
  const db = init();
  const daysArg = process.argv.indexOf("--days");
  const days = daysArg >= 0 ? Number(process.argv[daysArg + 1]) : 7;
  const since = admin.firestore.Timestamp.fromMillis(Date.now() - days * 86400000);
  const snap = await db.collection("runs").where("startedAt", ">=", since).get();
  let flagged = 0;
  const batch = db.batch();
  for (const d of snap.docs) {
    const run = d.data();
    const reason = analyse(run);
    if (reason !== (run.suspicious ?? null)) {
      batch.update(d.ref, { suspicious: reason });
      if (reason) {
        flagged++;
        console.log(`! ${d.id} ${run.uid} ${run.levelId}: ${reason}`);
      }
    }
  }
  await batch.commit();
  console.log(`Zkontrolováno ${snap.size} běhů za ${days} dní, označeno ${flagged}.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
