import { IStorage } from "./storage";
import session from "express-session";
import { User, Property, InsertUser, InsertProperty } from "@shared/schema";
import { GoogleSheetsStorage } from "./storage/google-sheets";
import { MemStorage } from "./storage/mem-storage";

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createProperty(property: InsertProperty & { userId: number }): Promise<Property>;
  getPropertiesByUserId(userId: number): Promise<Property[]>;
}

// Now that we have proper permissions, use GoogleSheetsStorage
export const storage: IStorage = new GoogleSheetsStorage();