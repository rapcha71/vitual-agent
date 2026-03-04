import { storage } from "../storage";
import { logger } from "../lib/logger";

export interface PropertyNotification {
  type: 'new_property';
  propertyId: string;
  propertyType: string;
  agentName: string;
  createdAt: string;
}

class NotificationService {
  async notifyNewProperty(property: {
    propertyId: string;
    propertyType: string;
    agentName: string;
    createdAt: string;
  }): Promise<void> {
    logger.debug('New property registered:', property.propertyId, 'Agent:', property.agentName);
  }

  async getUnviewedCount(): Promise<number> {
    return await storage.getUnviewedPropertiesCount();
  }
}

export const notificationService = new NotificationService();
