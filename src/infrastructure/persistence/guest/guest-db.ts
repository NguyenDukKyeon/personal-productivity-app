import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const GUEST_DB_NAME = 'personal-productivity-guest';
export const GUEST_DB_VERSION = 4;

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
  focusSessions: {
    key: string;
    value: unknown;
    indexes: { workItemId: string; status: string };
  };
  distractions: {
    key: string;
    value: unknown;
    indexes: { focusSessionId: string };
  };
  habits: {
    key: string;
    value: unknown;
    indexes: { status: string };
  };
  habitCheckIns: {
    key: string;
    value: unknown;
    indexes: { habitId: string; date: string; habitId_date: [string, string] };
  };
  routines: {
    key: string;
    value: unknown;
  };
  projects: {
    key: string;
    value: unknown;
    indexes: { status: string };
  };
  projectMilestones: {
    key: string;
    value: unknown;
    indexes: { projectId: string };
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

      if (!db.objectStoreNames.contains('focusSessions')) {
        const store = db.createObjectStore('focusSessions', { keyPath: 'id' });
        store.createIndex('workItemId', 'workItemId');
        store.createIndex('status', 'status');
      }

      if (!db.objectStoreNames.contains('distractions')) {
        const store = db.createObjectStore('distractions', { keyPath: 'id' });
        store.createIndex('focusSessionId', 'focusSessionId');
      }

      if (!db.objectStoreNames.contains('habits')) {
        const store = db.createObjectStore('habits', { keyPath: 'id' });
        store.createIndex('status', 'status');
      }

      if (!db.objectStoreNames.contains('habitCheckIns')) {
        const store = db.createObjectStore('habitCheckIns', { keyPath: 'id' });
        store.createIndex('habitId', 'habitId');
        store.createIndex('date', 'date');
        store.createIndex('habitId_date', ['habitId', 'date'], { unique: true });
      }

      if (!db.objectStoreNames.contains('routines')) {
        db.createObjectStore('routines', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('projects')) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('status', 'status');
      }

      if (!db.objectStoreNames.contains('projectMilestones')) {
        const store = db.createObjectStore('projectMilestones', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
      }
    },
  });
}
