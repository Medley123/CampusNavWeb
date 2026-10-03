import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";

const required = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing environment values: ${missing.join(", ")}`);

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const firestore = getFirestore();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "building-photos";

function toIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function migratePhoto(url, buildingId, index) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "firebasestorage.googleapis.com" && parsed.hostname !== "storage.googleapis.com") {
    return url;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download Firebase photo for building ${buildingId} (${response.status}).`);
  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[contentType] || "jpg";
  const path = `buildings/${buildingId}/${index + 1}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, await response.arrayBuffer(), {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Could not save migrated photo for building ${buildingId}: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const buildingSnapshot = await firestore.collection("buildings").get();
const buildingRows = [];
for (const [index, doc] of buildingSnapshot.docs.entries()) {
  const source = doc.data();
  const id = Number(source.id) || index + 1;
  const images = await Promise.all((source.images || []).map((url, imageIndex) => migratePhoto(url, id, imageIndex)));
  buildingRows.push({
    id,
    slug: source.slug,
    name: source.name,
    short_name: source.shortName || source.name,
    category: source.category || "facility",
    description: source.description || "",
    floors: source.floors || 1,
    floors_locations: source.floorsLocations?.length ? source.floorsLocations : ["Ground"],
    rooms: source.rooms || [],
    latitude: source.latitude || 0,
    longitude: source.longitude || 0,
    color: source.color || "#800000",
    images,
    created_at: toIso(source.createdAt),
    updated_at: toIso(source.updatedAt),
  });
}

if (buildingRows.length) {
  const { error } = await supabase.from("buildings").upsert(buildingRows, { onConflict: "id" });
  if (error) throw new Error(`Could not migrate buildings: ${error.message}`);
}

const userSnapshot = await firestore.collection("users").get();
const userRows = userSnapshot.docs.map((doc) => {
  const source = doc.data();
  return {
    email: source.email,
    username: source.username,
    name: source.name || source.username,
    picture: source.picture || null,
    last_login_at: toIso(source.lastLoginAt),
  };
}).filter((user) => user.email && user.username);

if (userRows.length) {
  const { error } = await supabase.from("users").upsert(userRows, { onConflict: "email" });
  if (error) throw new Error(`Could not migrate users: ${error.message}`);
}

const adminDoc = await firestore.collection("settings").doc("admin").get();
const adminSnapshot = adminDoc.exists ? adminDoc.data() : null;
if (adminSnapshot) {
  const { error } = await supabase.from("admin_settings").upsert({
    id: 1,
    email: adminSnapshot.email,
    name: adminSnapshot.name,
    password_hash: adminSnapshot.passwordHash,
    password_salt: adminSnapshot.passwordSalt,
  }, { onConflict: "id" });
  if (error) throw new Error(`Could not migrate admin settings: ${error.message}`);
}

const { error: sequenceError } = await supabase.rpc("sync_building_id_sequence");
if (sequenceError) throw new Error(`Could not sync building ID sequence: ${sequenceError.message}`);

console.log(`Migrated ${buildingRows.length} buildings, ${userRows.length} users, ${buildingRows.reduce((sum, row) => sum + row.images.length, 0)} building photos, and ${adminSnapshot ? 1 : 0} admin account.`);