import type { StoredAgentDbSnapshot } from "@/lib/isYatirimAgentDb";

const DATABASE_NAME = "is-yatirim-agent-db";
const DATABASE_VERSION = 1;
const STORE_NAME = "snapshots";
const SNAPSHOT_KEY = "feedback-survey";

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB kullanılamıyor."));
  }
  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

export async function loadAgentDbSnapshot() {
  const database = await openDatabase();
  return new Promise<StoredAgentDbSnapshot | undefined>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(SNAPSHOT_KEY);
    request.onsuccess = () =>
      resolve(request.result as StoredAgentDbSnapshot | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAgentDbSnapshot(snapshot: StoredAgentDbSnapshot) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
