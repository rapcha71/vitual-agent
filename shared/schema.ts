
import { pgTable, text, serial, integer, boolean, jsonb, numeric, timestamp, index } from "drizzle-orm/pg-core";
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
  paymentMobile: text("payment_mobile"),
  email: text("email"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: text("reset_password_expires"),
  nickname: text("nickname"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  rememberToken: text("remember_token"),
  lastLoginAt: text("last_login_at"),
  biometricCredentialId: text("biometric_credential_id"),
  biometricPublicKey: text("biometric_public_key"),
  biometricCounter: integer("biometric_counter").default(0),
  biometricEnabled: boolean("biometric_enabled").default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

// Define the messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientId: integer("recipient_id").references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  unreadByUsers: integer("unread_by_users").array().notNull().default([]),
});

// Define the session table for express-session
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6, withTimezone: false }).notNull(),
});

// Define the location type for better TypeScript support
export type LocationType = {
  lat: number;
  lng: number;
  address?: string;
};

export const PROVINCE_CODES: Record<string, string> = {
  "01": "San José",
  "02": "Cartago",
  "03": "Heredia",
  "04": "Alajuela",
  "05": "Puntarenas",
  "06": "Guanacaste",
  "07": "Limón",
};

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyType: text("property_type").notNull(),
  province: text("province"),
  signPhoneNumber: text("sign_phone_number"),
  location: jsonb("location").notNull().$type<LocationType>(),
  propertyId: text("property_id").notNull().unique(),
  images: jsonb("images").notNull().$type<string[]>(),
  kmlData: text("kml_data"),
  markerColor: text("marker_color").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  viewedByAdmin: boolean("viewed_by_admin").notNull().default(false),
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => [
  index("properties_user_id_idx").on(t.userId),
  index("properties_phone_idx").on(t.signPhoneNumber)
]);

// Define the payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  amount: integer("amount").notNull(),
});

// Define the earnings table
export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id),
  paymentType: text("payment_type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  processedAt: text("processed_at"),
  createdAt: text("created_at").notNull().default("(now() AT TIME ZONE 'UTC'::text)::text"),
  weekOf: text("week_of").notNull(),
});

// Define the weekly_payments table
export const weeklyPayments = pgTable("weekly_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  weekOf: text("week_of").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  propertyCount: integer("property_count").notNull().default(0),
  status: text("status").notNull().default("pending"),
  processedAt: text("processed_at"),
  createdAt: text("created_at").notNull().default("(now() AT TIME ZONE 'UTC'::text)::text"),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  messages: many(messages, { relationName: "sentMessages" }),
  payments: many(payments),
  earnings: many(earnings),
  weeklyPayments: many(weeklyPayments),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
  payments: many(payments),
  earnings: many(earnings),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [payments.propertyId],
    references: [properties.id],
  }),
}));

export const earningsRelations = relations(earnings, ({ one }) => ({
  user: one(users, {
    fields: [earnings.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [earnings.propertyId],
    references: [properties.id],
  }),
}));

export const weeklyPaymentsRelations = relations(weeklyPayments, ({ one }) => ({
  user: one(users, {
    fields: [weeklyPayments.userId],
    references: [users.id],
  }),
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

/** Schema estricto para el formulario de registro: todos los campos obligatorios */
export const registerFormSchema = z.object({
  fullName: z.string().min(1, "El nombre completo es requerido"),
  username: z.string().min(1, "El correo es requerido").email("Correo electrónico inválido"),
  mobile: z.string().min(1, "El teléfono es requerido"),
  paymentMobile: z.string().min(1, "El teléfono SINPE es requerido"),
  nickname: z.string().min(1, "El alias es requerido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  senderId: true,
  createdAt: true,
  unreadByUsers: true,
}).extend({
  content: z.string().min(1, "El mensaje no puede estar vacío"),
  recipientId: z.number().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

// Define property schema with createdAt
export const propertySchema = z.object({
  id: z.number(),
  userId: z.number(),
  propertyId: z.string(),
  propertyType: z.enum(["house", "land", "commercial"]),
  signPhoneNumber: z.string().nullable(),
  location: LocationSchema,
  images: z.array(z.string()),
  kmlData: z.string().nullable(),
  markerColor: z.string(),
  createdAt: z.string()
});

// Modified insertPropertySchema to include createdAt
export const insertPropertySchema = createInsertSchema(properties)
  .pick({
    propertyType: true,
    province: true,
    signPhoneNumber: true,
    location: true,
    images: true,
    kmlData: true,
    markerColor: true
  })
  .extend({
    propertyType: z.enum([PropertyType.house, PropertyType.land, PropertyType.commercial]),
    province: z.enum(["01", "02", "03", "04", "05", "06", "07"]).optional().default("01"),
    location: LocationSchema,
    kmlData: z.string().optional(),
    markerColor: z.string().optional().default(""),
    images: z.object({
      sign: z.string().optional(),
      property: z.string().optional()
    }),
    createdAt: z.string().optional(),
  });

// Add schemas for new tables
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
});

export const insertEarningSchema = createInsertSchema(earnings).omit({
  id: true,
});

export const insertWeeklyPaymentSchema = createInsertSchema(weeklyPayments).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Earning = typeof earnings.$inferSelect;
export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type WeeklyPayment = typeof weeklyPayments.$inferSelect;
export type InsertWeeklyPayment = z.infer<typeof insertWeeklyPaymentSchema>;

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
