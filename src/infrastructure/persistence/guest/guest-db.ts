import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const GUEST_DB_NAME = 'personal-productivity-guest';
export const GUEST_DB_VERSION = 1;

export interface GuestTodayDB extends DBSchema {
  workItems: {
    key: string;
    value: unknown;
  };
  dailyPlans: {
    key: string;
    value: unknown;
    indexes: { date: string };
  };
  dailyPriorities: {
    key: string;
    value: unknown;
    indexes: { dailyPlanId: string };
  };
  timeBlocks: {
    key: string;
    value: unknown;
    indexes: { date: string; workItemId: string };
  };
  dailyCommitments: {
    key: string;
    value: unknown;
    indexes: { date: string };
  };
  meta: {
    key: string;
    value: unknown;
  };
}

export async function openGuestTodayDb(
  databaseName: string = GUEST_DB_NAME,
): Promise<IDBPDatabase<GuestTodayDB>> {
  return openDB<GuestTodayDB>(databaseName, GUEST_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('workItems')) {
        db.createObjectStore('workItems', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('dailyPlans')) {
        const store = db.createObjectStore('dailyPlans', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: true });
      }

      if (!db.objectStoreNames.contains('dailyPriorities')) {
        const store = db.createObjectStore('dailyPriorities', { keyPath: 'id' });
        store.createIndex('dailyPlanId', 'dailyPlanId');
      }

      if (!db.objectStoreNames.contains('timeBlocks')) {
        const store = db.createObjectStore('timeBlocks', { keyPath: 'id' });
        store.createIndex('date', 'date');
        store.createIndex('workItemId', 'workItemId');
      }

      if (!db.objectStoreNames.contains('dailyCommitments')) {
        const store = db.createObjectStore('dailyCommitments', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: true });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });
}
