const DATABASE_NAME = "is-yatirim-agent-suite";
const DATABASE_VERSION = 1;
const SNAPSHOT_STORE = "snapshots";
const FALLBACK_PREFIX = "is-yatirim-agent:suite-snapshot:";

type StoredSnapshot<T> = {
  key: string;
  value: T;
  updatedAt: string;
};

let databasePromise: Promise<IDBDatabase> | undefined;

function openSuiteDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }

  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOT_STORE)) {
        database.createObjectStore(SNAPSHOT_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return databasePromise;
}

export async function loadSuiteSnapshot<T>(key: string) {
  try {
    const database = await openSuiteDatabase();
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(SNAPSHOT_STORE, "readonly");
      const request = transaction.objectStore(SNAPSHOT_STORE).get(key);

      request.onsuccess = () => {
        const snapshot = request.result as StoredSnapshot<T> | undefined;
        resolve(snapshot?.value);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    try {
      const fallback = window.localStorage.getItem(`${FALLBACK_PREFIX}${key}`);
      return fallback ? (JSON.parse(fallback) as T) : undefined;
    } catch {
      return undefined;
    }
  }
}

export async function saveSuiteSnapshot<T>(key: string, value: T) {
  try {
    const database = await openSuiteDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SNAPSHOT_STORE, "readwrite");
      transaction.objectStore(SNAPSHOT_STORE).put({
        key,
        value,
        updatedAt: new Date().toISOString(),
      } satisfies StoredSnapshot<T>);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch {
    window.localStorage.setItem(`${FALLBACK_PREFIX}${key}`, JSON.stringify(value));
  }
}
