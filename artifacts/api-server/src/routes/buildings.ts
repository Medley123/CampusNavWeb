import { Router } from "express";
import { requireAdmin } from "../middlewares/admin-auth.js";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../lib/firebase.js";

const router = Router();
const COL = "buildings";
const META = "meta";
const COUNTER_DOC = "buildingCounter";

async function getNextId(): Promise<number> {
  const ref = db.collection(META).doc(COUNTER_DOC);
  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const current = doc.exists ? (doc.data()?.["nextId"] as number ?? 1) : 1;
    tx.set(ref, { nextId: current + 1 }, { merge: true });
    return current;
  });
  return result;
}

function docToBuilding(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id: data["id"] as number,
    slug: data["slug"] as string,
    name: data["name"] as string,
    shortName: data["shortName"] as string,
    category: data["category"] as string,
    description: data["description"] as string,
    floors: data["floors"] as number,
    floorsLocations: (data["floorsLocations"] as string[])?.length
      ? (data["floorsLocations"] as string[])
      : ["Ground"],
    rooms: (data["rooms"] as string[]) ?? [],
    latitude: data["latitude"] as number,
    longitude: data["longitude"] as number,
    color: data["color"] as string,
    images: (data["images"] as string[]) ?? [],
    createdAt: data["createdAt"]?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: data["updatedAt"]?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

// GET /buildings
router.get("/buildings", async (req, res) => {
  try {
    const snap = await db.collection(COL).orderBy("name").get();
    const buildings = snap.docs.map((d) => docToBuilding(d.id, d.data()));
    res.json(buildings);
  } catch (err) {
    req.log.error({ err }, "Failed to list buildings");
    res.status(500).json({ error: "Failed to fetch buildings" });
  }
});

// GET /buildings/stats
router.get("/buildings/stats", async (req, res) => {
  try {
    const snap = await db.collection(COL).get();
    const total = snap.size;
    const byCategory: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const cat = d.data()["category"] as string;
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    });
    const byCategoryArr = Object.entries(byCategory).map(([category, count]) => ({ category, count }));
    res.json({ total, byCategory: byCategoryArr });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /buildings/:id
router.get("/buildings/:id", async (req, res) => {
  const parsed = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(parsed)) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const snap = await db.collection(COL).where("id", "==", parsed).limit(1).get();
    if (snap.empty) { res.status(404).json({ error: "Building not found" }); return; }
    res.json(docToBuilding(snap.docs[0].id, snap.docs[0].data()));
  } catch (err) {
    req.log.error({ err }, "Failed to get building");
    res.status(500).json({ error: "Failed to fetch building" });
  }
});

// POST /buildings
router.post("/buildings", requireAdmin, async (req, res) => {
  const body = req.body;
  if (!body?.name || !body?.slug) {
    res.status(400).json({ error: "name and slug are required" });
    return;
  }
  try {
    const existing = await db.collection(COL).where("slug", "==", body.slug).limit(1).get();
    if (!existing.empty) {
      res.status(400).json({ error: "A building with this slug already exists" });
      return;
    }
    const id = await getNextId();
    const now = FieldValue.serverTimestamp();
    const data = {
      id,
      slug: body.slug,
      name: body.name,
      shortName: body.shortName ?? body.name,
      category: body.category ?? "facility",
      description: body.description ?? "",
      floors: body.floors ?? 1,
      floorsLocations: body.floorsLocations ?? [],
      rooms: body.rooms ?? [],
      latitude: body.latitude ?? 0,
      longitude: body.longitude ?? 0,
      color: body.color ?? "#1B6B3A",
      images: body.images ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(COL).add(data);
    const created = await ref.get();
    res.status(201).json(docToBuilding(ref.id, { ...data, createdAt: new Date(), updatedAt: new Date() }));
  } catch (err) {
    req.log.error({ err }, "Failed to create building");
    res.status(500).json({ error: "Failed to create building" });
  }
});

// PUT /buildings/:id
router.put("/buildings/:id", requireAdmin, async (req, res) => {
  const parsed = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(parsed)) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const snap = await db.collection(COL).where("id", "==", parsed).limit(1).get();
    if (snap.empty) { res.status(404).json({ error: "Building not found" }); return; }
    const docRef = snap.docs[0].ref;
    const updates = { ...req.body, updatedAt: FieldValue.serverTimestamp() };
    delete updates.id;
    delete updates.createdAt;
    await docRef.update(updates);
    const updated = await docRef.get();
    res.json(docToBuilding(docRef.id, updated.data()!));
  } catch (err) {
    req.log.error({ err }, "Failed to update building");
    res.status(500).json({ error: "Failed to update building" });
  }
});

// DELETE /buildings/:id
router.delete("/buildings/:id", requireAdmin, async (req, res) => {
  const parsed = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(parsed)) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const snap = await db.collection(COL).where("id", "==", parsed).limit(1).get();
    if (snap.empty) { res.status(404).json({ error: "Building not found" }); return; }
    await snap.docs[0].ref.delete();
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete building");
    res.status(500).json({ error: "Failed to delete building" });
  }
});

// POST /buildings/seed
router.post("/buildings/seed", requireAdmin, async (req, res) => {
  const CTU_BUILDINGS = [
    { slug: "coe", name: "College of Engineering", shortName: "COE", category: "academic", description: "The College of Engineering offering courses in civil, electrical, and mechanical engineering.", floors: 3, rooms: ["CE Lab", "EE Lab", "ME Lab", "Lecture Hall 1", "Lecture Hall 2", "Faculty Room"], latitude: 10.5038, longitude: 124.02965, color: "#D44E2A" },
    { slug: "cme", name: "College of Maritime Education", shortName: "CME", category: "academic", description: "Offering maritime-related courses for future seafarers and marine professionals.", floors: 3, rooms: ["Navigation Lab", "Engine Room Simulator", "Lecture Hall", "Faculty Room"], latitude: 10.50375, longitude: 124.0293, color: "#2A5DA4" },
    { slug: "ceas", name: "College of Education Arts and Sciences", shortName: "CEAS", category: "academic", description: "Offers teacher education, arts, and science programs for the community.", floors: 3, rooms: ["Science Lab", "Computer Lab", "Library Section", "Lecture Rooms", "Faculty Room"], latitude: 10.50385, longitude: 124.0286, color: "#2A8FA4" },
    { slug: "cot", name: "College of Technology", shortName: "COT", category: "academic", description: "Provides technology-based programs including electronics, automotive, and drafting.", floors: 3, rooms: ["Electronics Lab", "Automotive Lab", "Drafting Room", "Lecture Hall", "Faculty Room"], latitude: 10.5035, longitude: 124.0273, color: "#8B4513" },
    { slug: "fablab", name: "Fabrication Laboratory", shortName: "FabLab", category: "academic", description: "A state-of-the-art fabrication lab equipped with 3D printers and CNC machines.", floors: 1, rooms: ["3D Printing Area", "CNC Workshop", "Prototyping Room"], latitude: 10.50372, longitude: 124.0276, color: "#1A5276" },
    { slug: "admin", name: "Administration Building", shortName: "Admin", category: "admin", description: "Main administration office of CTU Danao Campus.", floors: 3, rooms: ["Office of the Campus Director", "Finance Office", "HR Office", "Conference Room"], latitude: 10.50380, longitude: 124.0278, color: "#1B6B3A" },
    { slug: "old-admin", name: "Old Administration Building", shortName: "Old Admin", category: "admin", description: "The original administration building now used for auxiliary offices.", floors: 2, rooms: ["Records Room", "Storage", "Meeting Room"], latitude: 10.50370, longitude: 124.0274, color: "#5D4E75" },
    { slug: "osa", name: "Office of Student Affairs", shortName: "OSA", category: "admin", description: "Student affairs office handling student services, scholarships, and organizations.", floors: 2, rooms: ["Guidance Office", "Scholarship Desk", "Student Council Room"], latitude: 10.50350, longitude: 124.0285, color: "#A52A2A" },
    { slug: "registrar", name: "Registrar Office", shortName: "Regist.", category: "admin", description: "Handles student enrollment, grades, and academic records.", floors: 1, rooms: ["Registration Area", "Records Section", "Evaluation Room"], latitude: 10.50368, longitude: 124.0305, color: "#3D6B35" },
    { slug: "cashier", name: "Cashier Office", shortName: "Cashier", category: "admin", description: "Handles tuition fee payments and other financial transactions.", floors: 1, rooms: ["Payment Counter", "Finance Records"], latitude: 10.50362, longitude: 124.031, color: "#6B4226" },
    { slug: "mis", name: "Management Information System", shortName: "MIS", category: "admin", description: "Manages the campus IT infrastructure and student information systems.", floors: 1, rooms: ["Server Room", "IT Support Desk", "Help Center"], latitude: 10.50382, longitude: 124.0304, color: "#2D4A7A" },
    { slug: "rotc", name: "ROTC Office", shortName: "ROTC", category: "admin", description: "Reserve Officers Training Corps office for military science training.", floors: 1, rooms: ["ROTC Office", "Storage Room"], latitude: 10.5036, longitude: 124.0308, color: "#5A3E1B" },
    { slug: "nstp", name: "National Service Training Program", shortName: "NSTP", category: "admin", description: "Coordinates CWTS, ROTC, and LTS programs for students.", floors: 1, rooms: ["NSTP Office", "Training Room"], latitude: 10.50285, longitude: 124.0286, color: "#2E4D2E" },
    { slug: "re-office", name: "Research and Extension Office", shortName: "R&E", category: "admin", description: "Oversees research programs, publications, and community extension activities.", floors: 1, rooms: ["Research Office", "Publication Room"], latitude: 10.50298, longitude: 124.028, color: "#5C5C8A" },
    { slug: "alumni-affairs", name: "Alumni Affairs Office", shortName: "Alumni", category: "admin", description: "Connects CTU graduates through alumni programs and events.", floors: 1, rooms: ["Alumni Office", "Reception Area"], latitude: 10.50305, longitude: 124.0283, color: "#8B4513" },
    { slug: "production", name: "Production Office", shortName: "Prod", category: "admin", description: "Manages campus production materials and resources.", floors: 1, rooms: ["Production Office", "Storage"], latitude: 10.5029, longitude: 124.0279, color: "#6B6B1A" },
    { slug: "maintenance", name: "Maintenance Office", shortName: "Maint.", category: "admin", description: "Responsible for campus facilities maintenance and upkeep.", floors: 1, rooms: ["Workshop", "Storage Room", "Maintenance Office"], latitude: 10.50372, longitude: 124.0275, color: "#6B6B6B" },
    { slug: "guardhouse", name: "Guardhouse", shortName: "Guard", category: "admin", description: "Campus entrance security station manned 24/7.", floors: 1, rooms: ["Guard Station", "Visitor Log Area"], latitude: 10.50295, longitude: 124.0298, color: "#8B8000" },
    { slug: "new-library", name: "New Library", shortName: "Library", category: "facility", description: "The main campus library with a modern collection of books, journals, and digital resources.", floors: 3, rooms: ["Reading Room", "Digital Resources Section", "Reference Section", "Periodicals", "Faculty Carrel"], latitude: 10.50385, longitude: 124.0302, color: "#6B4226" },
    { slug: "old-library", name: "Old Library", shortName: "Old Lib", category: "facility", description: "The original campus library building now housing special collections.", floors: 2, rooms: ["Special Collections", "Archival Room"], latitude: 10.50378, longitude: 124.0303, color: "#A0522D" },
    { slug: "clinic", name: "Medical Clinic", shortName: "Clinic", category: "facility", description: "Provides basic medical services and first aid to students and staff.", floors: 1, rooms: ["Consultation Room", "Treatment Room", "Waiting Area"], latitude: 10.50368, longitude: 124.0307, color: "#C53030" },
    { slug: "canteen", name: "Canteen", shortName: "Canteen", category: "facility", description: "Campus dining area offering affordable meals and snacks for students and staff.", floors: 1, rooms: ["Food Stalls", "Seating Area", "Storage"], latitude: 10.50275, longitude: 124.0287, color: "#F0A500" },
    { slug: "centrum", name: "Centrum", shortName: "Centrum", category: "facility", description: "Multi-purpose hall used for large campus events, ceremonies, and meetings.", floors: 2, rooms: ["Main Hall", "Stage", "Storage Room", "Restrooms"], latitude: 10.5041, longitude: 124.0286, color: "#4A90D9" },
    { slug: "dance-studio", name: "Dance Studio", shortName: "Dance", category: "facility", description: "Practice venue for dance groups and cultural performances.", floors: 1, rooms: ["Dance Floor", "Changing Room"], latitude: 10.50308, longitude: 124.0283, color: "#D497D0" },
    { slug: "sac", name: "Student Activity Center", shortName: "SAC", category: "facility", description: "Center for student organizations, activities, and campus events.", floors: 2, rooms: ["Activity Room", "Organization Offices", "Meeting Room"], latitude: 10.50395, longitude: 124.0295, color: "#D4700A" },
    { slug: "kadasig-gym", name: "Kadasig Gymnasium", shortName: "Gym", category: "sports", description: "The main gymnasium hosting basketball, volleyball, and campus sports events.", floors: 1, rooms: ["Main Court", "Bleachers", "Locker Rooms", "Equipment Room"], latitude: 10.5043, longitude: 124.0277, color: "#1B6B3A" },
    { slug: "oval", name: "Oval Track and Field", shortName: "Oval", category: "sports", description: "400-meter oval track and field facility for athletics and physical education.", floors: 1, rooms: ["Running Track", "Field Area", "Bleachers"], latitude: 10.5034, longitude: 124.0264, color: "#1B6B3A" },
    { slug: "grandstand", name: "Grandstand", shortName: "Grandstand", category: "sports", description: "Covered grandstand seating for campus sports events and ceremonies.", floors: 2, rooms: ["Seating Area", "VIP Box", "Press Area"], latitude: 10.5027, longitude: 124.0275, color: "#2D5016" },
  ];

  try {
    const batch = db.batch();
    const existing = await db.collection(COL).get();
    existing.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    let nextId = 1;
    const addBatch = db.batch();
    for (const b of CTU_BUILDINGS) {
      const ref = db.collection(COL).doc();
      addBatch.set(ref, { ...b, id: nextId++, images: [], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    }
    await addBatch.commit();
    await db.collection(META).doc(COUNTER_DOC).set({ nextId });
    res.json({ inserted: CTU_BUILDINGS.length, message: `Seeded ${CTU_BUILDINGS.length} buildings` });
  } catch (err) {
    req.log.error({ err }, "Failed to seed");
    res.status(500).json({ error: "Failed to seed buildings" });
  }
});

export default router;
