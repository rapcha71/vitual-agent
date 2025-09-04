import { DatabaseStorage } from "./storage/database-storage";
import { IStorage } from "./storage/types";

// Re-export the interface for any legacy imports that might exist
export type { IStorage };

// Export a single instance of the DatabaseStorage, typed as IStorage
export const storage: IStorage = new DatabaseStorage();