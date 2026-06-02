import { Note } from '../types';

export const FOLDERS = {
  NOTES: 'Notes',
  ARCHIVE: 'Archive',
};

// Check if we have permission, request if we don't
export async function verifyPermission(fileHandle: FileSystemHandle, readWrite: boolean = true): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = {
    mode: readWrite ? 'readwrite' : 'read'
  };

  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }

  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}

export async function ensureDirectories(rootHandle: FileSystemDirectoryHandle) {
  const notesDirHandle = await rootHandle.getDirectoryHandle(FOLDERS.NOTES, { create: true });
  const archiveDirHandle = await rootHandle.getDirectoryHandle(FOLDERS.ARCHIVE, { create: true });

  return {
    notesDirHandle,
    archiveDirHandle
  };
}

export function extractTitle(content: string, filename: string): string {
  const lines = content.split('\n');
  const h1 = lines.find(line => line.trim().startsWith('# '));
  if (h1) {
    return h1.replace(/^#\s+/, '').trim();
  }
  return filename.replace(/\.md$/, '');
}

export async function listNotes(dirHandle: FileSystemDirectoryHandle): Promise<Note[]> {
  const notes: Note[] = [];

  for await (const entry of (dirHandle as any).values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const content = await file.text();
      const title = extractTitle(content, file.name);

      notes.push({
        name: file.name,
        handle: fileHandle,
        lastModified: file.lastModified,
        title,
        // We won't load the full content into memory for all notes immediately to be scalable,
        // but for now let's just make search work by having contents or refetching later.
        // Given offline first and text files, it's fine to load to support search.
        content,
      });
    }
  }

  return notes.sort((a, b) => b.lastModified - a.lastModified);
}

export async function writeNote(handle: FileSystemFileHandle, content: string): Promise<number> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  
  const file = await handle.getFile();
  return file.lastModified;
}

export async function createNote(dirHandle: FileSystemDirectoryHandle, name: string): Promise<FileSystemFileHandle> {
  const fileName = name.endsWith('.md') ? name : `${name}.md`;
  return await dirHandle.getFileHandle(fileName, { create: true });
}

export async function deleteNote(dirHandle: FileSystemDirectoryHandle, name: string): Promise<void> {
  await dirHandle.removeEntry(name);
}

export async function renameNote(dirHandle: FileSystemDirectoryHandle, oldName: string, newName: string): Promise<FileSystemFileHandle> {
  const newFileName = newName.endsWith('.md') ? newName : `${newName}.md`;
  
  const oldHandle = await dirHandle.getFileHandle(oldName);
  const file = await oldHandle.getFile();
  const content = await file.text();

  const newHandle = await dirHandle.getFileHandle(newFileName, { create: true });
  await writeNote(newHandle, content);
  
  await dirHandle.removeEntry(oldName);
  
  return newHandle;
}
