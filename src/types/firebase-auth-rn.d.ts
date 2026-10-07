import type { Persistence } from 'firebase/auth';

// O build de React Native do firebase/auth exporta getReactNativePersistence,
// mas a declaração de tipos padrão (web) não traz a função.
type ReactNativeStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeStorage): Persistence;
}
