import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buildingsTable = pgTable("buildings", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  floors: integer("floors").notNull().default(1),
  rooms: text("rooms").array().notNull().default([]),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  color: text("color").notNull().default("#1B6B3A"),
  images: text("images").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBuildingSchema = createInsertSchema(buildingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBuildingSchema = insertBuildingSchema.partial();

export const selectBuildingSchema = createSelectSchema(buildingsTable);

export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type UpdateBuilding = z.infer<typeof updateBuildingSchema>;
export type Building = typeof buildingsTable.$inferSelect;
