import { IStorage } from "./storage";
import session from "express-session";
import { User, Property, InsertUser, InsertProperty } from "@shared/schema";
import { DatabaseStorage } from "./storage/database-storage";

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByRememberToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createProperty(property: InsertProperty & { userId: number }): Promise<Property>;
  getPropertiesByUserId(userId: number): Promise<Property[]>;
  updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Buffer;
    publicKey: Buffer;
    counter: number;
  }): Promise<void>;
  updateUserBiometricCounter(userId: number, counter: number): Promise<void>;
  updateUserRememberToken(userId: number, token: string | null): Promise<void>;
}

// Switch to DatabaseStorage for persistent storage
export const storage: IStorage = new DatabaseStorage();