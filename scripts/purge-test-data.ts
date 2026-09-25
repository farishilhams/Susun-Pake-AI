// ============================================================
// scripts/purge-test-data.ts
// Pembersihan Total Residu Data Testing di MongoDB Atlas
// Sesuai Instruksi User: zero residual data di seluruh koleksi
// ============================================================

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import mongoose from "mongoose";

async function purge() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI tidak ditemukan di .env.local");
    process.exit(1);
  }

  console.log("🔌 Menghubungkan ke MongoDB Atlas untuk pembersihan total...");
  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;

  if (!db) {
    console.error("❌ Database tidak dapat diakses");
    process.exit(1);
  }

  const collections = [
    "users",
    "projects",
    "projectfiles",
    "file_versions",
    "chathistories",
    "usagelogs",
    "sessions",
    "accounts"
  ];

  console.log("🧹 Memulai penghapusan dokumen residu testing...");
  for (const colName of collections) {
    const exists = await db.listCollections({ name: colName }).toArray();
    if (exists.length > 0) {
      const result = await db.collection(colName).deleteMany({});
      console.log(` ✅ [${colName}]: ${result.deletedCount} dokumen berhasil dihapus.`);
    } else {
      console.log(` ℹ️ [${colName}]: Koleksi tidak ditemukan atau sudah kosong.`);
    }
  }

  console.log("\n📊 Verifikasi Pasca-Pembersihan:");
  const postCollections = await db.listCollections().toArray();
  for (const col of postCollections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(` - ${col.name}: ${count} dokumen`);
  }

  await mongoose.disconnect();
  console.log("\n✨ Pembersihan data residu di MongoDB Atlas selesai 100%!");
}

purge().catch((err) => {
  console.error("❌ Error saat pembersihan database:", err);
  process.exit(1);
});
