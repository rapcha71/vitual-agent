import { google } from "googleapis";
import { sheets_v4 } from "@googleapis/sheets";
import { IStorage } from "../storage";
import { User, Property, InsertUser, InsertProperty } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class GoogleSheetsStorage implements IStorage {
  static getServiceAccountEmail(): string {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS!);
      return credentials.client_email || "No client_email found in credentials";
    } catch (error) {
      console.error("Error parsing credentials:", error);
      return "Error reading credentials";
    }
  }

  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  private users: Map<number, User>;
  private currentUserId: number;
  private currentPropertyId: number;
  public sessionStore: session.Store;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS!);

    // Initialize the Google Sheets API client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.users = new Map();
    this.currentUserId = 1;
    this.currentPropertyId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });

    this.initializeSpreadsheet();
  }

  private async initializeSpreadsheet() {
    try {
      // Initialize headers if they don't exist
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Properties!A1:H1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'Property ID',
            'User ID',
            'Property Type',
            'Sign Phone Number',
            'Location',
            'Images',
            'Created At',
            'Username'
          ]]
        }
      });
    } catch (error) {
      console.error('Error initializing spreadsheet:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      fullName: insertUser.fullName || null,
      mobile: insertUser.mobile || null,
      nickname: insertUser.nickname || null
    };
    this.users.set(id, user);
    return user;
  }

  async createProperty(insertProperty: InsertProperty & { userId: number }): Promise<Property> {
    const id = this.currentPropertyId++;
    const property: Property = {
      ...insertProperty,
      id,
      signPhoneNumber: insertProperty.signPhoneNumber || null
    };

    // Get the username from the users map
    const user = await this.getUser(property.userId);
    const username = user?.username || '';

    // Prepare the row data
    const rowData = [
      property.propertyId,
      property.userId.toString(),
      property.propertyType,
      property.signPhoneNumber || '',
      JSON.stringify(property.location),
      JSON.stringify(property.images),
      new Date().toISOString(),
      username
    ];

    try {
      // Append the property data to the spreadsheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Properties!A:H',
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData]
        }
      });

      return property;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  async getPropertiesByUserId(userId: number): Promise<Property[]> {
    try {
      // Get all properties from the spreadsheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Properties!A2:H'
      });

      const values = response.data.values || [];

      // Filter and transform the data
      return values
        .filter(row => row[1] === userId.toString())
        .map((row): Property => ({
          id: this.currentPropertyId++,
          propertyId: row[0],
          userId: parseInt(row[1]),
          propertyType: row[2],
          signPhoneNumber: row[3] || null,
          location: JSON.parse(row[4]),
          images: JSON.parse(row[5])
        }));
    } catch (error) {
      console.error('Error getting properties:', error);
      throw error;
    }
  }
}