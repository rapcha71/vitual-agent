import { IStorage } from "./storage";
import session from "express-session";
import { User, Property, InsertUser, InsertProperty } from "@shared/schema";
import { HybridStorage } from "./storage/hybrid-storage";

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByRememberToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createProperty(property: InsertProperty & { userId: number }): Promise<Property>;
  getPropertiesByUserId(userId: number): Promise<Property[]>;
  getAllPropertiesWithUsers(): Promise<(Property & { user: User })[]>;
  updateUserRememberToken(userId: number, token: string | null): Promise<void>;
  updateLastLogin(userId: number): Promise<void>;
}

// Switch to HybridStorage for synchronized storage
export const storage: IStorage = new HybridStorage();