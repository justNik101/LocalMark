export interface Note {
  name: string;
  handle: FileSystemFileHandle;
  lastModified: number;
  title: string;
  content?: string;
}

export interface Folder {
  name: string;
  handle: FileSystemDirectoryHandle;
}

export interface AppState {
  rootHandle: FileSystemDirectoryHandle | null;
  notesDirHandle: FileSystemDirectoryHandle | null;
  archiveDirHandle: FileSystemDirectoryHandle | null;
  
  currentFolderHandle: FileSystemDirectoryHandle | null;
  folderStack: { name: string, handle: FileSystemDirectoryHandle }[];
  
  notes: Note[];
  folders: Folder[];
  
  activeNote: Note | null;
  searchQuery: string;
  isInitializing: boolean;
  error: string | null;
}
