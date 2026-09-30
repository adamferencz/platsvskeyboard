/**
 * Whitelist učitelů a výjimek (kolekce allowedUsers, id = e-mail malými písmeny).
 *
 *   npm run allow -- garrukaf@gmail.com admin "Adam Ferencz"
 *   npm run allow -- kolega@ghb.cz teacher
 *   npm run allow -- --list
 *   npm run allow -- --remove kdo@kde.cz
 */
const { admin, init } = require("./_admin");

async function main() {
  const db = init();
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--list")) {
    const snap = await db.collection("allowedUsers").get();
    if (snap.empty) return console.log('Whitelist je prázdný. Přidej: npm run allow -- email role "Jméno"');
    console.log("Whitelist:");
    snap.docs.forEach((d) => console.log(`  ${d.id.padEnd(34)} ${String(d.data().role).padEnd(8)} ${d.data().displayName || ""}`));
    return;
  }
  if (args[0] === "--remove") {
    await db.collection("allowedUsers").doc(args[1].toLowerCase()).delete();
    return console.log(`Odebrán ${args[1]}`);
  }

  const email = args[0].toLowerCase().trim();
  const role = args[1] || "teacher";
  const displayName = args[2] || "";
  if (!email.includes("@")) throw new Error("První argument musí být e-mail.");
  if (!["teacher", "admin"].includes(role)) throw new Error("Role musí být teacher nebo admin.");

  await db.collection("allowedUsers").doc(email).set(
    { role, displayName, createdAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
  console.log(`OK: ${email} → ${role}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
