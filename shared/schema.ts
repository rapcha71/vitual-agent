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
  phoneNumber: text("phone_number"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  rememberToken: text("remember_token"),
  lastLoginAt: text("last_login_at"),
  biometricCredentialId: text("biometric_credential_id"),
  biometricPublicKey: text("biometric_public_key"),
  biometricCounter: integer("biometric_counter").default(0),
  biometricEnabled: boolean("biometric_enabled").default(false),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  unreadByUsers: jsonb("unread_by_users").notNull().$type<number[]>(),
  senderId: integer("sender_id").notNull().references(() => users.id),
});

export type LocationType = {
  lat: number;
  lng: number;
  address?: string;
};

export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyType: text("property_type").notNull(),
  signPhoneNumber: text("sign_phone_number"),
  location: jsonb("location").notNull().$type<LocationType>(),
  propertyId: text("property_id").notNull(),
  images: jsonb("images").notNull().$type<string[]>(),
  kmlData: text("kml_data"),
  markerColor: text("marker_color").notNull().default("blue"),
  createdAt: text("created_at").notNull(),
});

export const deletedProperties = pgTable("deleted_properties", {
  id: serial("id").primaryKey(),
  originalPropertyId: integer("original_property_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyType: text("property_type").notNull(),
  signPhoneNumber: text("sign_phone_number"),
  location: jsonb("location").notNull().$type<LocationType>(),
  propertyId: text("property_id").notNull(),
  images: jsonb("images").notNull().$type<string[]>(),
  kmlData: text("kml_data"),
  markerColor: text("marker_color").notNull(),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at").notNull(),
  deletedBy: integer("deleted_by").notNull().references(() => users.id),
  deletionReason: text("deletion_reason"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  messages: many(messages),
  deletedProperties: many(deletedProperties),
}));

export const propertiesRelations = relations(properties, ({ one }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
}));

export const deletedPropertiesRelations = relations(deletedProperties, ({ one }) => ({
  user: one(users, {
    fields: [deletedProperties.userId],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [deletedProperties.deletedBy],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
  })
  .extend({
    location: LocationSchema,
  });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type DeletedProperty = typeof deletedProperties.$inferSelect;

export type PropertyWithUser = Property & { user: User };
