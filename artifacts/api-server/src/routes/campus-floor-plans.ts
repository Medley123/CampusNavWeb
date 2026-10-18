import { Router } from "express";
import { requireSuperAdmin } from "../middlewares/admin-auth.js";
import { storageBucket, supabase } from "../lib/supabase.js";

const router = Router();
const FLOOR_LEVELS = ["Ground", "2F", "3F", "4F"] as const;
type FloorLevel = typeof FLOOR_LEVELS[number];
const DEFAULT_FLOOR_COLORS: Record<FloorLevel, string> = {
  Ground: "#22C55E",
  "2F": "#EAB308",
  "3F": "#3B82F6",
  "4F": "#EF4444",
};

type FloorPlanRow = {
  campus_name: string;
  floor_level: FloorLevel;
  image_url: string;
  north: number;
  south: number;
  east: number;
  west: number;
  updated_at: string;
};

function toFloorPlan(row: FloorPlanRow) {
  return {
    campusName: row.campus_name,
    floorLevel: row.floor_level,
    imageUrl: row.image_url,
    bounds: { north: row.north, south: row.south, east: row.east, west: row.west },
    updatedAt: row.updated_at,
  };
}

function getFloorPlanStoragePath(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    const prefix = `/storage/v1/object/public/${storageBucket}/`;
    if (!url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    return path.startsWith("floor-plans/") ? path : null;
  } catch {
    return null;
  }
}

router.get("/campus-floor-plans", async (req, res) => {
  try {
    let query = supabase.from("campus_floor_plans").select("*");
    const campusName = typeof req.query.campusName === "string" ? req.query.campusName.trim() : "";
    const floorLevel = typeof req.query.floorLevel === "string" ? req.query.floorLevel : "";
    if (campusName) query = query.eq("campus_name", campusName);
    if (floorLevel && FLOOR_LEVELS.includes(floorLevel as FloorLevel)) {
      query = query.eq("floor_level", floorLevel);
    }
    const { data, error } = await query.order("campus_name").order("floor_level");
    if (error) throw error;
    res.json((data as FloorPlanRow[]).map(toFloorPlan));
  } catch (err) {
    req.log.error({ err }, "Failed to list campus floor plans");
    res.status(500).json({ error: "Failed to fetch campus floor plans." });
  }
});

router.get("/floor-colors", async (req, res) => {
  try {
    const { data, error } = await supabase.from("floor_legend_colors").select("floor_level, color");
    if (error) throw error;
    const colors = { ...DEFAULT_FLOOR_COLORS };
    for (const row of data) {
      if (FLOOR_LEVELS.includes(row.floor_level as FloorLevel)) {
        colors[row.floor_level as FloorLevel] = row.color;
      }
    }
    res.json(colors);
  } catch (err) {
    req.log.error({ err }, "Failed to load floor legend colors");
    res.status(500).json({ error: "Failed to fetch floor legend colors." });
  }
});

router.put("/admin/floor-colors", requireSuperAdmin, async (req, res) => {
  const colors = req.body?.colors;
  if (!colors || FLOOR_LEVELS.some((floor) => typeof colors[floor] !== "string" || !/^#[0-9a-fA-F]{6}$/.test(colors[floor]))) {
    res.status(400).json({ error: "Provide a valid hex color for each floor." });
    return;
  }

  try {
    const { data, error } = await supabase.from("floor_legend_colors").upsert(
      FLOOR_LEVELS.map((floor) => ({
        floor_level: floor,
        color: colors[floor],
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "floor_level" },
    ).select("floor_level, color");
    if (error) throw error;
    const savedColors = { ...DEFAULT_FLOOR_COLORS };
    for (const row of data) savedColors[row.floor_level as FloorLevel] = row.color;
    res.json(savedColors);
  } catch (err) {
    req.log.error({ err }, "Failed to save floor legend colors");
    res.status(500).json({ error: "Failed to save floor legend colors." });
  }
});

router.put("/campus-floor-plans", requireSuperAdmin, async (req, res) => {
  const campusName = typeof req.body?.campusName === "string" ? req.body.campusName.trim() : "";
  const floorLevel = req.body?.floorLevel;
  const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "";
  const bounds = req.body?.bounds;
  const north = Number(bounds?.north);
  const south = Number(bounds?.south);
  const east = Number(bounds?.east);
  const west = Number(bounds?.west);

  if (
    !campusName || campusName.length > 160 || !FLOOR_LEVELS.includes(floorLevel as FloorLevel) ||
    !imageUrl || !Number.isFinite(north) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(west) ||
    north <= south || east <= west || north > 85 || south < -85 || east > 180 || west < -180
  ) {
    res.status(400).json({ error: "A valid campus, floor, image, and map position are required." });
    return;
  }

  try {
    const { data, error } = await supabase.from("campus_floor_plans").upsert({
      campus_name: campusName,
      floor_level: floorLevel,
      image_url: imageUrl,
      north,
      south,
      east,
      west,
      updated_at: new Date().toISOString(),
    }, { onConflict: "campus_name,floor_level" }).select("*").single();
    if (error) throw error;
    res.json(toFloorPlan(data as FloorPlanRow));
  } catch (err) {
    req.log.error({ err }, "Failed to save campus floor plan");
    res.status(500).json({ error: "Failed to save campus floor plan." });
  }
});

router.delete("/campus-floor-plans", requireSuperAdmin, async (req, res) => {
  const campusName = typeof req.body?.campusName === "string" ? req.body.campusName.trim() : "";
  const floorLevel = req.body?.floorLevel;
  const uploadedImageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : null;
  if (!campusName || campusName.length > 160 || !FLOOR_LEVELS.includes(floorLevel as FloorLevel)) {
    res.status(400).json({ error: "A valid campus and floor are required." });
    return;
  }

  try {
    const { data: existing, error: lookupError } = await supabase.from("campus_floor_plans")
      .select("image_url")
      .eq("campus_name", campusName)
      .eq("floor_level", floorLevel)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const { error: deleteError } = await supabase.from("campus_floor_plans")
      .delete()
      .eq("campus_name", campusName)
      .eq("floor_level", floorLevel);
    if (deleteError) throw deleteError;

    const paths = [...new Set([
      getFloorPlanStoragePath(existing?.image_url),
      getFloorPlanStoragePath(uploadedImageUrl),
    ].filter((path): path is string => Boolean(path)))];
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from(storageBucket).remove(paths);
      if (storageError) req.log.error({ err: storageError }, "Failed to remove deleted floor-plan image from storage");
    }

    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete campus floor plan");
    res.status(500).json({ error: "Failed to delete this floor plan." });
  }
});

export default router;