import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloorPlanMapEditor, { type FloorPlanBounds } from "@/components/FloorPlanMapEditor";
import { ADMIN_CAMPUSES, DEFAULT_ADMIN_CAMPUS } from "@/lib/campuses";

const FLOOR_LEVELS = ["Ground", "2F", "3F", "4F"] as const;
type FloorLevel = typeof FLOOR_LEVELS[number];
type FloorColors = Record<FloorLevel, string>;

const DEFAULT_FLOOR_COLORS: FloorColors = {
  Ground: "#22C55E",
  "2F": "#EAB308",
  "3F": "#3B82F6",
  "4F": "#EF4444",
};

const FLOOR_LABELS: Record<FloorLevel, string> = {
  Ground: "Ground floor",
  "2F": "2nd floor",
  "3F": "3rd floor",
  "4F": "4th floor",
};

type CampusFloorPlan = {
  campusName: string;
  floorLevel: FloorLevel;
  imageUrl: string;
  bounds: FloorPlanBounds;
  updatedAt: string;
};

function defaultBounds(latitude: number, longitude: number): FloorPlanBounds {
  return {
    north: latitude + 0.00035,
    south: latitude - 0.00035,
    east: longitude + 0.00045,
    west: longitude - 0.00045,
  };
}

export default function CampusFloorPlansPage() {
  const [campusName, setCampusName] = useState<string>(DEFAULT_ADMIN_CAMPUS.name);
  const [floorLevel, setFloorLevel] = useState<FloorLevel>("Ground");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [bounds, setBounds] = useState(() => defaultBounds(DEFAULT_ADMIN_CAMPUS.latitude, DEFAULT_ADMIN_CAMPUS.longitude));
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [floorColors, setFloorColors] = useState<FloorColors>(DEFAULT_FLOOR_COLORS);
  const [colorsLoading, setColorsLoading] = useState(true);
  const [colorsSaving, setColorsSaving] = useState(false);
  const [colorsError, setColorsError] = useState<string | null>(null);
  const [colorsMessage, setColorsMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedCampus = ADMIN_CAMPUSES.find((campus) => campus.name === campusName) ?? DEFAULT_ADMIN_CAMPUS;

  useEffect(() => {
    let active = true;
    const loadPlan = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const params = new URLSearchParams({ campusName });
        const response = await fetch(`/api/campus-floor-plans?${params}`, { credentials: "same-origin" });
        const plans = await response.json();
        if (!response.ok) throw new Error(plans?.error || "Could not load this floor plan.");
        if (!active) return;
        const campusPlans = (plans as CampusFloorPlan[]).filter((item) => item.campusName === campusName);
        const plan = campusPlans.find((item) => item.floorLevel === floorLevel);
        const referencePlan = campusPlans.find((item) => item.floorLevel === "Ground") ?? campusPlans[0];
        setImageUrl(plan?.imageUrl ?? null);
        setBounds(plan?.bounds ?? referencePlan?.bounds ?? defaultBounds(selectedCampus.latitude, selectedCampus.longitude));
        setFileName(null);
      } catch (reason) {
        if (!active) return;
        setImageUrl(null);
        setBounds(defaultBounds(selectedCampus.latitude, selectedCampus.longitude));
        setError(reason instanceof Error ? reason.message : "Could not load this floor plan.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPlan();
    return () => { active = false; };
  }, [campusName, floorLevel, selectedCampus.latitude, selectedCampus.longitude]);

  useEffect(() => {
    let active = true;
    const loadColors = async () => {
      setColorsLoading(true);
      setColorsError(null);
      try {
        const response = await fetch("/api/floor-colors", { credentials: "same-origin" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load floor colors.");
        if (active) setFloorColors({ ...DEFAULT_FLOOR_COLORS, ...data });
      } catch (reason) {
        if (active) setColorsError(reason instanceof Error ? reason.message : "Could not load floor colors.");
      } finally {
        if (active) setColorsLoading(false);
      }
    };
    void loadColors();
    return () => { active = false; };
  }, []);

  const saveFloorColors = async () => {
    setColorsSaving(true);
    setColorsError(null);
    setColorsMessage(null);
    try {
      const response = await fetch("/api/admin/floor-colors", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: floorColors }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save floor colors.");
      setFloorColors({ ...DEFAULT_FLOOR_COLORS, ...data });
      setColorsMessage("Floor legend colors saved.");
    } catch (reason) {
      setColorsError(reason instanceof Error ? reason.message : "Could not save floor colors.");
    } finally {
      setColorsSaving(false);
    }
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/api/uploads/floor-plans", { method: "POST", credentials: "same-origin", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not upload this image.");
      setImageUrl(data.url);
      setFileName(file.name);
      setMessage("Image uploaded. Position it on the map, then save the floor plan.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload this image.");
    } finally {
      setUploading(false);
    }
  };

  const savePlan = async () => {
    if (!imageUrl) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/campus-floor-plans", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusName, floorLevel, imageUrl, bounds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save this floor plan.");
      setBounds(data.bounds);
      setMessage(`${campusName} ${floorLevel} floor plan saved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this floor plan.");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async () => {
    if (!imageUrl || !window.confirm(`Delete the ${floorLevel} floor plan for ${campusName}?`)) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/campus-floor-plans", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusName, floorLevel, imageUrl }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not delete this floor plan.");
      setImageUrl(null);
      setFileName(null);
      setBounds(defaultBounds(selectedCampus.latitude, selectedCampus.longitude));
      setMessage(`${campusName} ${floorLevel} floor plan deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete this floor plan.");
    } finally {
      setSaving(false);
    }
  };

  const resetPosition = () => {
    setBounds(defaultBounds(selectedCampus.latitude, selectedCampus.longitude));
    setMessage(null);
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Campus Floor Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage floor-plan overlays on the campus street map.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} className="gap-2">
          {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? "Uploading..." : imageUrl ? "Replace image" : "Upload floor image"}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadImage(event)} className="sr-only" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          Campus
          <select value={campusName} onChange={(event) => setCampusName(event.target.value)} disabled={loading || saving || uploading} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {ADMIN_CAMPUSES.map((campus) => <option key={campus.name} value={campus.name}>{campus.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Floor
          <select value={floorLevel} onChange={(event) => setFloorLevel(event.target.value as FloorLevel)} disabled={loading || saving || uploading} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {FLOOR_LEVELS.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
          </select>
        </label>
      </div>

      <section className="space-y-3 border-b border-border pb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Floor legend colors</h2>
          <p className="mt-1 text-xs text-muted-foreground">Choose the colors users see for each floor in the app.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FLOOR_LEVELS.map((floor) => (
            <label key={floor} className="flex items-center gap-3 text-sm font-medium">
              <input
                type="color"
                aria-label={`${FLOOR_LABELS[floor]} legend color`}
                value={floorColors[floor]}
                onChange={(event) => setFloorColors((current) => ({ ...current, [floor]: event.target.value }))}
                disabled={colorsLoading || colorsSaving}
                className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent p-1"
              />
              <span>{FLOOR_LABELS[floor]}</span>
            </label>
          ))}
        </div>
        {colorsError && <p role="alert" className="text-sm text-destructive">{colorsError}</p>}
        {colorsMessage && <p role="status" className="text-sm text-emerald-700">{colorsMessage}</p>}
        <Button type="button" onClick={() => void saveFloorColors()} disabled={colorsLoading || colorsSaving} className="gap-2">
          <Save className="h-4 w-4" />{colorsSaving ? "Saving colors..." : "Save colors"}
        </Button>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}

      <FloorPlanMapEditor
        key={campusName}
        latitude={selectedCampus.latitude}
        longitude={selectedCampus.longitude}
        imageUrl={imageUrl}
        bounds={bounds}
        onBoundsChange={setBounds}
      />

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          {loading ? "Loading saved floor plan..." : fileName ? `Selected image: ${fileName}` : imageUrl ? "Saved floor-plan image" : "No image uploaded for this floor yet."}
        </p>
        <div className="flex gap-2">
          {imageUrl && <Button type="button" variant="destructive" onClick={() => void deletePlan()} disabled={loading || saving || uploading} className="gap-2"><Trash2 className="h-4 w-4" />Delete image</Button>}
          <Button type="button" variant="outline" onClick={resetPosition} disabled={loading || saving || !imageUrl}>Reset position</Button>
          <Button type="button" onClick={() => void savePlan()} disabled={loading || saving || uploading || !imageUrl} className="gap-2">
            <Save className="h-4 w-4" />{saving ? "Saving..." : "Save floor plan"}
          </Button>
        </div>
      </footer>
    </div>
  );
}