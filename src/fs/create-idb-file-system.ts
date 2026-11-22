export interface IdbFileSystem {
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  save(key: string, data: Uint8Array): Promise<void>;
  load(key: string): Promise<Uint8Array | null>;
  loadAll(): Promise<Array<{ key: string; data: Uint8Array }>>;
}

export async function createIdbFileSystem(
  name: string,
  version = 1,
): Promise<IdbFileSystem> {
  const db = await new Promise<IDBDatabase>((resolve) => {
    const idb = window.indexedDB.open(name, version);
    idb.onupgradeneeded = function () {
      this.result.createObjectStore("files");
    };
    idb.onsuccess = function () {
      resolve(this.result);
    };
  });

  return {
    delete(key: string): Promise<void> {
      return new Promise<void>((resolve) => {
        const request = db
          .transaction("files", "readwrite")
          .objectStore("files")
          .delete(key);
        request.onsuccess = function () {
          resolve();
        };
      });
    },
    clear(): Promise<void> {
      return new Promise<void>((resolve) => {
        const request = db
          .transaction("files", "readwrite")
          .objectStore("files")
          .clear();
        request.onsuccess = function () {
          resolve();
        };
      });
    },
    save(key: string, data: Uint8Array): Promise<void> {
      return new Promise<void>((resolve) => {
        const request = db
          .transaction("files", "readwrite")
          .objectStore("files")
          .put(data, key);
        request.onsuccess = function () {
          resolve();
        };
      });
    },
    load(key: string): Promise<Uint8Array | null> {
      return new Promise((resolve) => {
        const request = db
          .transaction("files", "readonly")
          .objectStore("files")
          .get(key);
        request.onsuccess = function (ev) {
          resolve((ev.target as IDBRequest<Uint8Array>).result ?? null);
        };
      });
    },
    loadAll(): Promise<Array<{ key: string; data: Uint8Array }>> {
      return new Promise((resolve) => {
        const items: Array<{ key: string; data: Uint8Array }> = [];
        const request = db
          .transaction("files", "readonly")
          .objectStore("files")
          .openCursor();
        request.onsuccess = function (ev) {
          const cursor = (ev.target as IDBRequest<IDBCursorWithValue | null>)
            .result;
          if (cursor) {
            items.push({
              key: String(cursor.key),
              data: cursor.value as Uint8Array,
            });
            cursor.continue();
          } else {
            resolve(items);
          }
        };
        request.onerror = function () {
          resolve(items);
        };
      });
    },
  };
}
