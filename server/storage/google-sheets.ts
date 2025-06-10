import { google } from "googleapis";
import { sheets_v4 } from "@googleapis/sheets";
import { IStorage } from "../storage";
import { User, Property, InsertUser, InsertProperty, PropertyType, MarkerColors } from "@shared/schema";
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
  public sessionStore: session.Store;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS!);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });

    this.initializeSpreadsheet();
  }

  private async initializeSpreadsheet() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheets = response.data.sheets || [];
      const sheetTitles = sheets.map(sheet => sheet.properties?.title);

      // Initialize Users sheet if it doesn't exist
      if (!sheetTitles.includes('Users')) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Users'
                }
              }
            }]
          }
        });

        // Add Users headers - UPDATED to include rememberToken and lastLoginAt
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Users!A1:M1', 
          valueInputOption: 'RAW',
          requestBody: {
            values: [[
              'ID',
              'Username',
              'Password',
              'Full Name',
              'Mobile',
              'Nickname',
              'Is Admin',
              'Created At',
              'Biometric Credential ID',
              'Biometric Public Key',
              'Biometric Counter',
              'Biometric Enabled',
              'Remember Token',
              'Last Login At'
            ]]
          }
        });
      }


      // Initialize Properties sheet if it doesn't exist
      if (!sheetTitles.includes('Properties')) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Properties'
                }
              }
            }]
          }
        });

        // Add Properties headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Properties!A1:K1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [[
              'Property ID',
              'User ID',
              'Property Type',
              'Sign Phone Number',
              'Location',
              'Images',
              'KML Data',
              'Marker Color',
              'Created At',
              'Username'
            ]]
          }
        });
      }

      console.log('Successfully initialized Google Sheets storage');
    } catch (error) {
      console.error('Error initializing spreadsheet:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A2:M' 
      });

      const values = response.data.values || [];
      const userRow = values.find(row => parseInt(row[0]) === id);

      if (!userRow) return undefined;

      return {
        id: parseInt(userRow[0]),
        username: userRow[1],
        password: userRow[2],
        fullName: userRow[3] || null,
        mobile: userRow[4] || null,
        nickname: userRow[5] || null,
        isAdmin: userRow[6] === 'TRUE',
        rememberToken: userRow[12] || null, // Added rememberToken
        lastLoginAt: userRow[13] || null    // Added lastLoginAt
      };
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A2:M' 
      });

      const values = response.data.values || [];
      const userRow = values.find(row => row[1] === username);

      if (!userRow) return undefined;

      return {
        id: parseInt(userRow[0]),
        username: userRow[1],
        password: userRow[2],
        fullName: userRow[3] || null,
        mobile: userRow[4] || null,
        nickname: userRow[5] || null,
        isAdmin: userRow[6] === 'TRUE',
        rememberToken: userRow[12] || null, // Added rememberToken
        lastLoginAt: userRow[13] || null    // Added lastLoginAt
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Get the last ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A2:A'
      });

      const values = response.data.values || [];
      const lastId = values.length > 0 ? Math.max(...values.map(row => parseInt(row[0]))) : 0;
      const newId = lastId + 1;

      const user: User = {
        id: newId,
        ...insertUser,
        fullName: insertUser.fullName || null,
        mobile: insertUser.mobile || null,
        nickname: insertUser.nickname || null,
        isAdmin: insertUser.isAdmin || false,
        rememberToken: null, // Added rememberToken
        lastLoginAt: null     // Added lastLoginAt
      };

      // Append the new user
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A:M', 
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            user.id.toString(),
            user.username,
            user.password,
            user.fullName || '',
            user.mobile || '',
            user.nickname || '',
            user.isAdmin ? 'TRUE' : 'FALSE',
            new Date().toISOString(),
            '', // Biometric Credential ID
            '', // Biometric Public Key
            0,   // Biometric Counter
            'FALSE', // Biometric Enabled
            '', // Remember Token
            ''  // Last Login At
          ]]
        }
      });

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async createProperty(insertProperty: InsertProperty & { userId: number }): Promise<Property> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Properties!A2:A'
      });

      const values = response.data.values || [];
      const lastId = values.length > 0 ? Math.max(...values.map(row => parseInt(row[0] || '0'))) : 0;
      const newId = lastId + 1;

      const markerColor = MarkerColors[insertProperty.propertyType as keyof typeof PropertyType];

      const property: Property = {
        ...insertProperty,
        id: newId,
        signPhoneNumber: insertProperty.signPhoneNumber || null,
        kmlData: insertProperty.kmlData || null,
        markerColor
      };

      // Get the username
      const user = await this.getUser(property.userId);
      const username = user?.username || '';

      // Append the property data
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Properties!A:K',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            property.propertyId,
            property.userId.toString(),
            property.propertyType,
            property.signPhoneNumber || '',
            JSON.stringify(property.location),
            JSON.stringify(property.images),
            property.kmlData || '',
            property.markerColor,
            new Date().toISOString(),
            username
          ]]
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
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Properties!A2:K'
      });

      const values = response.data.values || [];

      return values
        .filter(row => row[1] === userId.toString())
        .map((row): Property => ({
          id: parseInt(row[0]),
          propertyId: row[0],
          userId: parseInt(row[1]),
          propertyType: row[2],
          signPhoneNumber: row[3] || null,
          location: JSON.parse(row[4]),
          images: JSON.parse(row[5]),
          kmlData: row[6] || null,
          markerColor: row[7]
        }));
    } catch (error) {
      console.error('Error getting properties:', error);
      throw error;
    }
  }

  async updateUserBiometricCredentials(userId: number, credentials: {
    credentialID: Buffer;
    publicKey: Buffer;
    counter: number;
  }): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) throw new Error('User not found');

      // Find the user's row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A2:A'
      });

      const values = response.data.values || [];
      const rowIndex = values.findIndex(row => parseInt(row[0]) === userId) + 2; 

      if (rowIndex < 2) throw new Error('User row not found');

      // Update the biometric fields
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Users!I${rowIndex}:L${rowIndex}`, 
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            credentials.credentialID.toString('base64'),
            credentials.publicKey.toString('base64'),
            credentials.counter,
            'TRUE'
          ]]
        }
      });
    } catch (error) {
      console.error('Error updating biometric credentials:', error);
      throw error;
    }
  }

  async updateUserBiometricCounter(userId: number, counter: number): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) throw new Error('User not found');

      // Find the user's row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A2:A'
      });

      const values = response.data.values || [];
      const rowIndex = values.findIndex(row => parseInt(row[0]) === userId) + 2;

      if (rowIndex < 2) throw new Error('User row not found');

      // Update just the counter field
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Users!K${rowIndex}`, 
        valueInputOption: 'RAW',
        requestBody: {
          values: [[counter]]
        }
      });
    } catch (error) {
      console.error('Error updating biometric counter:', error);
      throw error;
    }
  }

  async getUserByRememberToken(token: string): Promise<User | undefined> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A2:M'
      });

      const values = response.data.values || [];
      const userRow = values.find(row => row[12] === token); 

      if (!userRow) return undefined;

      return {
        id: parseInt(userRow[0]),
        username: userRow[1],
        password: userRow[2],
        fullName: userRow[3] || null,
        mobile: userRow[4] || null,
        nickname: userRow[5] || null,
        isAdmin: userRow[6] === 'TRUE',
        rememberToken: userRow[12] || null,
        lastLoginAt: userRow[13] || null
      };
    } catch (error) {
      console.error('Error getting user by remember token:', error);
      throw error;
    }
  }

  async updateUserRememberToken(userId: number, token: string | null): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A2:A'
      });

      const values = response.data.values || [];
      const rowIndex = values.findIndex(row => parseInt(row[0]) === userId) + 2;

      if (rowIndex < 2) throw new Error('User row not found');

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Users!L${rowIndex}`, 
        valueInputOption: 'RAW',
        requestBody: {
          values: [[token || '']]
        }
      });
    } catch (error) {
      console.error('Error updating remember token:', error);
      throw error;
    }
  }

  async updateLastLogin(userId: number): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Users!A2:A'
      });

      const values = response.data.values || [];
      const rowIndex = values.findIndex(row => parseInt(row[0]) === userId) + 2;

      if (rowIndex < 2) throw new Error('User row not found');

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Users!M${rowIndex}`, 
        valueInputOption: 'RAW',
        requestBody: {
          values: [[new Date().toISOString()]]
        }
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }
}