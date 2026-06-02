export interface Note {
  name: string;
  handle: FileSystemFileHandle;
  lastModified: number;
  title: string;
  content?: string;
}

export interface AppState {
  rootHandle: FileSystemDirectoryHandle | null;
  notesDirHandle: FileSystemDirectoryHandle | null;
  archiveDirHandle: FileSystemDirectoryHandle | null;
  notes: Note[];
  activeNote: Note | null;
  searchQuery: string;
  isInitializing: boolean;
  error: string | null;
}
