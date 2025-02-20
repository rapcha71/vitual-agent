import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  rememberToken: text("remember_token"),
  lastLoginAt: text("last_login_at"),
  // Store biometric data as base64 encoded strings
  biometricCredentialId: text("biometric_credential_id"),
  biometricPublicKey: text("biometric_public_key"),
  biometricCounter: integer("biometric_counter").default(0),
  biometricEnabled: boolean("biometric_enabled").default(false),
});

// Define the location type for better TypeScript support
export type LocationType = {
  lat: number;
  lng: number;
  address?: string;
};

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyType: text("property_type").notNull(),
  signPhoneNumber: text("sign_phone_number"),
  location: jsonb("location").notNull().$type<LocationType>(),
  propertyId: text("property_id").notNull().unique(),
  images: jsonb("images").notNull().$type<string[]>(),
  kmlData: text("kml_data"),
  markerColor: text("marker_color").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties)
}));

export const propertiesRelations = relations(properties, ({ one }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  })
}));

// Enhanced location type
const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  biometricCredentialId: true,
  biometricPublicKey: true,
  biometricCounter: true,
  biometricEnabled: true
}).extend({
  rememberMe: z.boolean().optional()
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

// Admin types with proper typing
export type PropertyWithUser = {
  id: number;
  userId: number;
  propertyType: string;
  signPhoneNumber: string | null;
  location: LocationType;
  propertyId: string;
  images: string[];
  kmlData: string | null;
  markerColor: string;
  createdAt: string;
  user: User;
};