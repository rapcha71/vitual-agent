import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  mobile: text("mobile"),
  nickname: text("nickname")
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  propertyType: text("property_type").notNull(),
  signPhoneNumber: text("sign_phone_number"),
  location: jsonb("location").notNull(),
  propertyId: text("property_id").notNull().unique(),
  images: jsonb("images").notNull()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  mobile: true,
  nickname: true,
});

export const insertPropertySchema = createInsertSchema(properties).pick({
  propertyType: true,
  signPhoneNumber: true,
  location: true,
  propertyId: true,
  images: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
