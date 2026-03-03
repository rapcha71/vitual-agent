import { storage } from "../storage";

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
    console.log('New property registered:', property.propertyId);
    console.log('Agent:', property.agentName);
    console.log('Type:', property.propertyType);
  }

  async getUnviewedCount(): Promise<number> {
    return await storage.getUnviewedPropertiesCount();
  }
}

export const notificationService = new NotificationService();
