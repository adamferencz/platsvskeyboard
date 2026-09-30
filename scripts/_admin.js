/**
 * Společná inicializace Admin SDK pro skripty (firebase-admin v14, modulární API).
 * Cestu k servisnímu účtu bere z GOOGLE_APPLICATION_CREDENTIALS (.env.local) — nikdy do gitu.
 */
require("dotenv").config({ path: ".env.local", quiet: true });
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

function init() {
  if (getApps().length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
      console.error("Chybí GOOGLE_APPLICATION_CREDENTIALS v .env.local (cesta k JSON servisního účtu).");
      process.exit(1);
    }
    const sa = require(path.resolve(credPath));
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  return getFirestore();
}

// kompatibilní tvar pro skripty: admin.firestore.FieldValue / Timestamp
const admin = { firestore: { FieldValue, Timestamp }, auth: getAuth };

module.exports = { admin, init };
