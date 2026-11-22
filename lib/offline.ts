export type OfflineQueueItem = {
  id: string;
  url: string;
  method: string;
  body: string;
  createdAt: string;
};

export type OfflineSyncFailure = {
  id: string;
  url: string;
  createdAt: string;
  status: number | null;
  error: string;
};

const DB_NAME = "frota-one-offline";
const STORE = "requests";

function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openQueue();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function pendingOfflineRequests() {
  return transaction<OfflineQueueItem[]>("readonly", (store) => store.getAll());
}

export async function offlineQueueCount() {
  return transaction<number>("readonly", (store) => store.count());
}

export async function queueOfflineRequest(url: string, init: RequestInit) {
  const item: OfflineQueueItem = {
    id: crypto.randomUUID(),
    url,
    method: init.method || "POST",
    body: typeof init.body === "string" ? init.body : "{}",
    createdAt: new Date().toISOString(),
  };
  await transaction("readwrite", (store) => store.put(item));
  window.dispatchEvent(new CustomEvent("frota-sync-change"));
  return item;
}

export async function flushOfflineQueue() {
  if (!navigator.onLine) return { synced: 0, conflicts: 0, pending: await offlineQueueCount(), failures: [] as OfflineSyncFailure[] };
  const items = await pendingOfflineRequests();
  let synced = 0;
  let conflicts = 0;
  const failures: OfflineSyncFailure[] = [];
  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { "content-type": "application/json", "x-offline-operation-id": item.id },
        body: item.body,
      });
      if (response.status === 409) {
        await transaction("readwrite", (store) => store.delete(item.id));
        conflicts += 1;
        continue;
      }
      if (!response.ok) {
        let error = `Servidor recusou o lançamento (HTTP ${response.status}).`;
        try {
          const data = await response.clone().json();
          error = data.error || data.message || data.errors?.[0]?.error || error;
        } catch {}
        failures.push({ id: item.id, url: item.url, createdAt: item.createdAt, status: response.status, error });
        if (response.status >= 500) break;
        continue;
      }
      await transaction("readwrite", (store) => store.delete(item.id));
      synced += 1;
    } catch (error) {
      failures.push({ id: item.id, url: item.url, createdAt: item.createdAt, status: null, error: error instanceof Error ? error.message : "A conexão foi interrompida durante a sincronização." });
      break;
    }
  }
  localStorage.setItem("frota-last-sync", new Date().toISOString());
  window.dispatchEvent(new CustomEvent("frota-sync-change"));
  return { synced, conflicts, pending: await offlineQueueCount(), failures };
}

export async function offlineRequest(url: string, init: RequestInit) {
  if (!navigator.onLine) {
    await queueOfflineRequest(url, init);
    return new Response(JSON.stringify({ queued: true, message: "Salvo neste aparelho. Será sincronizado quando a internet voltar." }), {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  }
  try {
    return await fetch(url, init);
  } catch {
    await queueOfflineRequest(url, init);
    return new Response(JSON.stringify({ queued: true, message: "Conexão interrompida. O lançamento ficou pendente neste aparelho." }), {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  }
}
