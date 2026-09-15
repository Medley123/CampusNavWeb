import { useEffect, useRef, useState } from "react";
import { useWatch, useForm } from "react-hook-form";
import MapPicker from "@/components/MapPicker";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBuilding, useUpdateBuilding } from "@workspace/api-client-react";
import type { Building } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, Upload } from "lucide-react";

const MAX_IMAGES = 5;

const formSchema = z.object({
  slug: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  shortName: z.string().min(1, "Required"),
  category: z.enum(["academic", "admin", "facility", "sports"]),
  description: z.string().min(1, "Required"),
  floors: z.coerce.number().int().min(1, "At least 1 floor"),
  floorsLocations: z.array(z.enum(["Ground", "2F", "3F", "4F"])).min(1, "Select at least one floor"),
  rooms: z.string(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  color: z.string().min(1, "Required"),
  images: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  building: Building | null;
  onSuccess: () => void;
}

const DEFAULT_COLORS = [
  "#800000", "#D44E2A", "#2A5DA4", "#2A8FA4",
  "#8B4513", "#5D4E75", "#A52A2A", "#C53030",
  "#D4700A", "#F0A500", "#4A90D9", "#6B4226",
];

function CoordinatePicker({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  const latitude = useWatch({ control: form.control, name: "latitude" });
  const longitude = useWatch({ control: form.control, name: "longitude" });
  const color = useWatch({ control: form.control, name: "color" });

  return (
    <div className="space-y-3">
      <MapPicker
        latitude={Number(latitude) || 10.5034}
        longitude={Number(longitude) || 124.0292}
        color={color || "#800000"}
        onChange={(lat, lng) => {
          form.setValue("latitude", lat, { shouldValidate: true });
          form.setValue("longitude", lng, { shouldValidate: true });
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="latitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Latitude (manual)</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder="10.5034" className="font-mono text-xs" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="longitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Longitude (manual)</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder="124.0292" className="font-mono text-xs" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function ImageSlot({
  url,
  index,
  isFirst,
  uploading,
  onUpload,
  onRemove,
}: {
  url: string | undefined;
  index: number;
  isFirst: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) onUpload(file);
  };

  if (url) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border aspect-square group">
        <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
        {isFirst && (
          <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
            Cover
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-2 py-1 rounded bg-black/60 text-white text-[10px] font-medium hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Upload className="w-2.5 h-2.5" /> Replace
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border-2 border-dashed border-border aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
      onClick={() => fileRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {uploading ? (
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <ImagePlus className="w-5 h-5 text-muted-foreground/40" />
          <p className="text-[10px] text-muted-foreground/60 text-center px-1">
            {isFirst ? "Cover photo" : `Photo ${index + 1}`}
          </p>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function MultiImageUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File, slotIndex: number) => {
    setUploadingSlot(slotIndex);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || `Upload failed (${res.status})`);
      }

      const newUrls = [...value];
      if (slotIndex < newUrls.length) {
        newUrls[slotIndex] = data.url;
      } else {
        newUrls.push(data.url);
      }
      onChange(newUrls);
    } catch {
      toast({ title: "Upload failed", description: "Could not upload image.", variant: "destructive" });
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeSlot = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Building Photos</p>
        <p className="text-xs text-muted-foreground">{value.length}/{MAX_IMAGES} photos</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: MAX_IMAGES }).map((_, i) => (
          <ImageSlot
            key={i}
            index={i}
            url={value[i]}
            isFirst={i === 0}
            uploading={uploadingSlot === i}
            onUpload={(file) => uploadFile(file, i)}
            onRemove={() => removeSlot(i)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60">
        Drag & drop or click each slot · PNG, JPG, WebP · max 10MB each
      </p>
    </div>
  );
}

export default function BuildingFormModal({ open, onClose, building, onSuccess }: Props) {
  const { toast } = useToast();
  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const isEditing = !!building;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      name: "",
      shortName: "",
      category: "academic",
      description: "",
      floors: 1,
      floorsLocations: ["Ground"],
      rooms: "",
      latitude: 10.5034,
      longitude: 124.0292,
      color: "#800000",
      images: [],
    },
  });

  useEffect(() => {
    if (building) {
      form.reset({
        slug: building.slug,
        name: building.name,
        shortName: building.shortName,
        category: building.category as FormValues["category"],
        description: building.description,
        floors: building.floors,
        floorsLocations: (building as Building & { floorsLocations?: FormValues["floorsLocations"] }).floorsLocations ?? ["Ground"],
        rooms: building.rooms.join(", "),
        latitude: building.latitude,
        longitude: building.longitude,
        color: building.color,
        images: building.images ?? [],
      });
    } else {
      form.reset({
        slug: "",
        name: "",
        shortName: "",
        category: "academic",
        description: "",
        floors: 1,
        floorsLocations: ["Ground"],
        rooms: "",
        latitude: 10.5034,
        longitude: 124.0292,
        color: "#800000",
        images: [],
      });
    }
  }, [building, form, open]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      rooms: values.rooms
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      images: values.images,
    };

    try {
      if (isEditing && building) {
        await updateBuilding.mutateAsync({ id: building.id, data: payload });
        toast({ title: "Building updated", description: `${values.name} has been updated.` });
      } else {
        await createBuilding.mutateAsync({ data: payload });
        toast({ title: "Building created", description: `${values.name} has been added to the campus.` });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const isPending = createBuilding.isPending || updateBuilding.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Building" : "Add New Building"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Multi-Image Upload */}
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MultiImageUploader
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Building Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. College of Engineering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. COE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (URL ID)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. college-of-engineering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="admin">Administrative</SelectItem>
                        <SelectItem value="facility">Facility</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Floors</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="floorsLocations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floors where this building appears</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {["Ground", "2F", "3F", "4F"].map((floor) => {
                      const selected = field.value.includes(floor as FormValues["floorsLocations"][number]);
                      return (
                        <Button
                          key={floor}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const value = floor as FormValues["floorsLocations"][number];
                            field.onChange(selected ? field.value.filter((item) => item !== value) : [...field.value, value]);
                          }}
                        >
                          {floor === "Ground" ? "G / 1F" : floor}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the building and its purpose..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rooms (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Lab 1, Lecture Hall, Faculty Room" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CoordinatePicker form={form} />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Map Pin Color</FormLabel>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                    </FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {DEFAULT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: field.value === c ? "#000" : "transparent",
                          }}
                          onClick={() => field.onChange(c)}
                        />
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90">
                {isPending ? (isEditing ? "Saving..." : "Adding...") : isEditing ? "Save Changes" : "Add Building"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
