import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define property types enum
export const PropertyType = {
  house: "house",
  land: "land",
  commercial: "commercial"
} as const;

// Define marker colors
export const MarkerColors = {
  house: "blue",
  land: "green",
  commercial: "yellow"
} as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  mobile: text("mobile"),
  nickname: text("nickname"),
  isAdmin: boolean("is_admin").notNull().default(false),
  biometricCredentialId: text("biometric_credential_id"),
  biometricPublicKey: text("biometric_public_key"),
  biometricCounter: integer("biometric_counter")
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  propertyType: text("property_type").notNull(),
  signPhoneNumber: text("sign_phone_number"),
  location: jsonb("location").notNull(),
  propertyId: text("property_id").notNull().unique(),
  images: jsonb("images").notNull(),
  kmlData: text("kml_data"),
  markerColor: text("marker_color").notNull()
});

// Enhanced location type
const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  mobile: true,
  nickname: true,
  isAdmin: true
});

export const insertPropertySchema = createInsertSchema(properties)
  .pick({
    propertyType: true,
    signPhoneNumber: true,
    location: true,
    propertyId: true,
    images: true
  })
  .extend({
    propertyType: z.enum([PropertyType.house, PropertyType.land, PropertyType.commercial]),
    location: LocationSchema,
    kmlData: z.string().optional(),
    markerColor: z.string()
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Location = z.infer<typeof LocationSchema>;