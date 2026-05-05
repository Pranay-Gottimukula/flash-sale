export {};

declare global {
  namespace Express {
    interface Locals {
      client?: {
        id:        string;
        email:     string;
        name:      string | null;
        role:      string;
        publicKey: string;
      };
    }
  }
}
