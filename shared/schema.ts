import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
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
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  rememberToken: text("remember_token"),
  lastLoginAt: timestamp("last_login_at"),
  biometricCredentialId: text("biometric_credential_id"),
  biometricPublicKey: text("biometric_public_key"),
  biometricCounter: integer("biometric_counter").default(0),
  biometricEnabled: boolean("biometric_enabled").default(false),
});

// Define the messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  unreadByUsers: jsonb("unread_by_users").notNull().$type<number[]>(), // Array of user IDs who haven't read the message
  senderId: integer("sender_id").notNull().references(() => users.id),
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
  operationType: text("operation_type").notNull(), // "Alquiler" o "Venta"
  propertyType: text("property_type").notNull(),
  signPhoneNumber: text("sign_phone_number"),
  location: jsonb("location").notNull().$type<LocationType>(),
  propertyId: text("property_id").notNull().unique(),
  images: jsonb("images").notNull().$type<string[]>(),
  kmlData: text("kml_data"),
  markerColor: text("marker_color").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tabla para propiedades eliminadas (backup)
export const deletedProperties = pgTable("deleted_properties", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  operationType: text("operation_type").notNull(), // "Alquiler" o "Venta"
  propertyType: text("property_type").notNull(),
  signPhoneNumber: text("sign_phone_number"),
  location: jsonb("location").notNull().$type<LocationType>(),
  propertyId: text("property_id").notNull(),
  images: jsonb("images").notNull().$type<string[]>(),
  kmlData: text("kml_data"),
  markerColor: text("marker_color").notNull(),
  createdAt: timestamp("created_at").notNull(),
  deletedAt: timestamp("deleted_at").notNull().defaultNow(),
  deletedBy: integer("deleted_by").notNull().references(() => users.id),
  deleteReason: text("delete_reason"),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  messages: many(messages, { relationName: "sentMessages" }),
  deletedProperties: many(deletedProperties),
  deletedByProperties: many(deletedProperties, { relationName: "deletedByUser" })
}));

export const propertiesRelations = relations(properties, ({ one }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  })
}));

export const deletedPropertiesRelations = relations(deletedProperties, ({ one }) => ({
  user: one(users, {
    fields: [deletedProperties.userId],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [deletedProperties.deletedBy],
    references: [users.id],
    relationName: "deletedByUser"
  })
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
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

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
}).extend({
  content: z.string().min(1, "El mensaje no puede estar vacío"),
});

export const insertPropertySchema = createInsertSchema(properties)
  .pick({
    operationType: true,
    propertyType: true,
    signPhoneNumber: true,
    location: true,
    propertyId: true,
    images: true,
    kmlData: true,
    markerColor: true
  })
  .extend({
    operationType: z.enum(["Alquiler", "Venta"]),
    propertyType: z.enum([PropertyType.house, PropertyType.land, PropertyType.commercial]),
    location: LocationSchema,
    kmlData: z.string().optional(),
    markerColor: z.string(),
    images: z.object({
      sign: z.string().optional(),
      property: z.string().optional()
    })
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type DeletedProperty = typeof deletedProperties.$inferSelect;

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