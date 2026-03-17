
import session from "express-session";
import { User, Property, InsertUser, InsertProperty, InsertMessage, Message } from "@shared/schema";

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByRememberToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: number): Promise<void>;
  hardDeleteUser(userId: number): Promise<void>;
  createProperty(property: InsertProperty & { userId: number; propertyId: string }): Promise<Property>;
  getPropertiesByUserId(userId: number): Promise<Property[]>;
  /** Lista ligera sin images/kmlData para carga rápida */
  getPropertiesListByUserId(userId: number): Promise<Array<Omit<Property, "images" | "kmlData"> & { hasImages: boolean }>>;
  getAllPropertiesWithUsers(): Promise<(Property & { user: User })[]>;
  updateUserRememberToken(userId: number, token: string | null): Promise<void>;
  updateLastLogin(userId: number): Promise<void>;
  updateUserRole(userId: number, isAdmin: boolean): Promise<User>;
  updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Uint8Array;
    publicKey: Uint8Array;
    counter: number;
  }): Promise<void>;
  updateUserBiometricCounter(userId: number, counter: number): Promise<void>;
  storePasswordResetCode(userId: number, code: string, expireTime: number): Promise<void>;
  verifyPasswordResetCode(userId: number, code: string): Promise<boolean>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  updateUserProfile(userId: number, data: { fullName?: string | null; mobile?: string | null; nickname?: string | null }): Promise<User>;
  clearPasswordResetCode(userId: number): Promise<void>;
  // New methods for messages
  createMessage(message: InsertMessage & { senderId: number }): Promise<Message>;
  getMessages(): Promise<(Message & { sender: User })[]>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;
  deleteOldMessages(daysOld: number): Promise<number>;
  // Payment calculation methods
  getWeeklyPayments(): Promise<Array<{
    userId: number;
    user: User;
    propertiesCount: number;
    totalPayment: number;
    weekStart: string;
    weekEnd: string;
  }>>;
  getUserPaymentHistory(userId: number): Promise<Array<{
    weekStart: string;
    weekEnd: string;
    propertiesCount: number;
    totalPayment: number;
  }>>;
  // Property notification methods for admin
  getUnviewedPropertiesCount(): Promise<number>;
  markPropertiesAsViewed(propertyIds: number[]): Promise<void>;
  getSuperAdminEmails(): Promise<string[]>;
  getPropertyByPropertyId(propertyId: string): Promise<Property | undefined>;
  getPropertiesByPhone(phone: string): Promise<Property[]>;
  // Payment processing
  getUnpaidProperties(): Promise<(Property & { user: User })[]>;
  markPropertiesAsPaid(propertyIds: number[], weeklyPaymentId: number): Promise<void>;
  createWeeklyPayment(data: {
    userId: number;
    weekOf: string;
    totalAmount: string;
    propertyCount: number;
    status: string;
  }): Promise<number>;
}

// Import and re-export the storage instance
import { storage } from "./storage/database-storage";
export { storage };
