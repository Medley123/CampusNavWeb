import { Router } from "express";
import { requireSuperAdmin } from "../middlewares/admin-auth.js";
import { supabase } from "../lib/supabase.js";

const router = Router();
const FLOOR_LEVELS = ["Ground", "2F", "3F", "4F"] as const;
type FloorLevel = typeof FLOOR_LEVELS[number];

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

export default router;