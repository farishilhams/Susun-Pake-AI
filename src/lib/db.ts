// ============================================================
// lib/db.ts — Singleton MongoDB connection via Mongoose
// Menggunakan pattern cache agar tidak membuat koneksi baru
// di setiap hot-reload (development) atau serverless invocation.
// ============================================================

import mongoose from "mongoose";

// Cache koneksi di global scope supaya tidak re-connect setiap request
// (pattern standar untuk Next.js App Router + Mongoose)
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null };
global.__mongooseCache = cached;

async function syncUserIndexes(m: typeof mongoose) {
  try {
    const db = m.connection.db;
    if (!db) return;
    const collections = await db.listCollections({ name: "users" }).toArray();
    if (collections.length === 0) return;

    const usersCollection = db.collection("users");
    const indexes = await usersCollection.indexes();
    const googleIdIdx = indexes.find((i) => i.name === "googleId_1");

    // Jika index googleId_1 ada tapi belum memiliki partialFilterExpression
    if (googleIdIdx && !googleIdIdx.partialFilterExpression) {
      console.log("🔄 [DB] Memperbarui index googleId_1 lama ke partial unique index...");
      await usersCollection.dropIndex("googleId_1");

      // Bersihkan dokumen yang menyimpan googleId: null
      await usersCollection.updateMany(
        { googleId: null },
        { $unset: { googleId: "" } }
      );

      // Buat partial unique index baru
      await usersCollection.createIndex(
        { googleId: 1 },
        {
          unique: true,
          partialFilterExpression: { googleId: { $type: "string" } },
          name: "googleId_1",
        }
      );
      console.log("✅ [DB] Index googleId_1 berhasil dimigrasi ke partial unique index!");
    }
  } catch (err) {
    console.warn("⚠️ [DB] Sync user index warning (non-fatal):", err);
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  // Validasi di dalam fungsi agar tidak gagal saat build tanpa env
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "❌ MONGODB_URI tidak ditemukan di environment variables. " +
        "Tambahkan MONGODB_URI ke file .env.local"
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
      })
      .then(async (m) => {
        console.log("✅ MongoDB connected");
        await syncUserIndexes(m);
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}


export default connectDB;
