import { get, set, del } from 'idb-keyval';

const ROOT_DIR_KEY = 'local-notes-root-dir';

export async function saveRootHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await set(ROOT_DIR_KEY, handle);
}

export async function getRootHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await get<FileSystemDirectoryHandle>(ROOT_DIR_KEY);
    return handle || null;
  } catch (error) {
    console.error('Failed to get root handle from indexedDB:', error);
    return null;
  }
}

export async function clearRootHandle(): Promise<void> {
  await del(ROOT_DIR_KEY);
}
