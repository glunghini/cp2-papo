declare global {
  namespace Express {
    interface Request {
      auth?: { uid: string };
    }
  }
}

export {};
