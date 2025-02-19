import "express-session";

declare module "express-session" {
  interface SessionData {
    challenge?: string;
    username?: string;
    customData?: {
      lastAccessed: Date;
      customField: any;
    };
  }
}
