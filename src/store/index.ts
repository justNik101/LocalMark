import { create } from 'zustand';
import { AppState, Note, Folder } from '../types';
import { clearRootHandle, getRootHandle, saveRootHandle } from '../lib/storage';
import {
  ensureDirectories,
  listItems,
  createNote as fsCreateNote,
  deleteNote as fsDeleteNote,
  renameNote as fsRenameNote,
  writeNote,
  verifyPermission
} from '../lib/fs';

interface AppActions {
  initStore: () => Promise<void>;
  selectRootFolder: () => Promise<void>;
  unlinkRootFolder: () => Promise<void>;
  loadNotes: () => Promise<void>;
  setActiveNote: (note: Note | null) => void;
  setSearchQuery: (query: string) => void;
  saveActiveNote: (content: string) => Promise<void>;
  createNewNote: (name: string) => Promise<void>;
  createNewFolder: (name: string) => Promise<void>;
  deleteActiveNote: () => Promise<void>;
  renameActiveNote: (newName: string) => Promise<void>;
  navigateToFolder: (handle: FileSystemDirectoryHandle, name: string) => Promise<void>;
  navigateUp: () => Promise<void>;
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  rootHandle: null,
  notesDirHandle: null,
  archiveDirHandle: null,
  
  currentFolderHandle: null,
  folderStack: [],
  notes: [],
  folders: [],
  
  activeNote: null,
  searchQuery: '',
  isInitializing: true,
  error: null,

  initStore: async () => {
    try {
      const handle = await getRootHandle();
      if (handle) {
        // We have a stored handle, but we might not have permission yet
        // In some browsers, we need user interaction to re-verify permission.
        // We will optimistically try if read permission is granted, 
        // if not we clear it and prompt again (or wait for user gesture)
        const hasPermission = await verifyPermission(handle, false);
        if (hasPermission) {
          const { notesDirHandle, archiveDirHandle } = await ensureDirectories(handle);
          set({ 
            rootHandle: handle, 
            notesDirHandle, 
            archiveDirHandle,
            currentFolderHandle: notesDirHandle,
            folderStack: [{ name: 'Notes', handle: notesDirHandle }]
          });
          await get().loadNotes();
        } else {
           // We might need to ask for permission. We will set the rootHandle so the UI can show a "Resume" button
           set({ rootHandle: handle });
        }
      }
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to initialize store' });
    } finally {
      set({ isInitializing: false });
    }
  },

  selectRootFolder: async () => {
    try {
      // Need cast to any because File System Access API types are not completely standard in all TS versions
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      
      await saveRootHandle(handle);
      const { notesDirHandle, archiveDirHandle } = await ensureDirectories(handle);
      
      set({ 
        rootHandle: handle, 
        notesDirHandle, 
        archiveDirHandle, 
        currentFolderHandle: notesDirHandle,
        folderStack: [{ name: 'Notes', handle: notesDirHandle }],
        error: null 
      });
      await get().loadNotes();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        set({ error: 'Could not open directory. Please try again.' });
      }
    }
  },

  unlinkRootFolder: async () => {
    await clearRootHandle();
    set({
      rootHandle: null,
      notesDirHandle: null,
      archiveDirHandle: null,
      currentFolderHandle: null,
      folderStack: [],
      notes: [],
      folders: [],
      activeNote: null,
      searchQuery: '',
      error: null
    });
  },

  loadNotes: async () => {
    const { currentFolderHandle } = get();
    if (!currentFolderHandle) return;
    
    try {
      const { notes, folders } = await listItems(currentFolderHandle);
      set({ notes, folders });
    } catch (e) {
      console.error('Failed to load items', e);
      set({ error: 'Failed to load items' });
    }
  },

  setActiveNote: (note) => {
    set({ activeNote: note });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  saveActiveNote: async (content: string) => {
    const { activeNote, notes } = get();
    if (!activeNote) return;

    try {
      const lastModified = await writeNote(activeNote.handle, content);
      
      // Update local state
      const updatedNote: Note = { ...activeNote, content, lastModified };
      // Title extraction might be heavy here, ideally done inside component or debounced.
      // But let's just let listNotes handle it on reload, OR update locally roughly
      
      const lines = content.split('\n');
      const h1 = lines.find(line => line.trim().startsWith('# '));
      updatedNote.title = h1 ? h1.replace(/^#\s+/, '').trim() : activeNote.name.replace(/\.md$/, '');

      set({ 
        activeNote: updatedNote,
        notes: notes.map(n => n.name === activeNote.name ? updatedNote : n).sort((a,b) => b.lastModified - a.lastModified)
      });
    } catch (e) {
      console.error('Failed to save note', e);
      set({ error: 'Failed to save note. Ensure you have granted write permissions.' });
    }
  },

  createNewNote: async (name: string) => {
    const { currentFolderHandle } = get();
    if (!currentFolderHandle) return;

    try {
      const handle = await fsCreateNote(currentFolderHandle, name);
      // Let's reload to get a consistent state
      await get().loadNotes();
      
      // select it
      const newNotes = get().notes;
      const created = newNotes.find(n => n.name === (name.endsWith('.md') ? name : `${name}.md`));
      if (created) {
        set({ activeNote: created });
      }
    } catch (e) {
      console.error('Failed to create note', e);
      set({ error: 'Failed to create note' });
    }
  },

  deleteActiveNote: async () => {
    const { activeNote, currentFolderHandle } = get();
    if (!activeNote || !currentFolderHandle) return;

    try {
      await fsDeleteNote(currentFolderHandle, activeNote.name);
      set({ activeNote: null });
      await get().loadNotes();
    } catch(e) {
      console.error('Failed to delete note', e);
      set({ error: 'Failed to delete note' });
    }
  },

  renameActiveNote: async (newName: string) => {
    const { activeNote, currentFolderHandle } = get();
    if (!activeNote || !currentFolderHandle) return;
    
    try {
      const newHandle = await fsRenameNote(currentFolderHandle, activeNote.name, newName);
      await get().loadNotes();
      
      const newNotes = get().notes;
      const renamed = newNotes.find(n => n.name === (newName.endsWith('.md') ? newName : `${newName}.md`));
      if (renamed) {
        set({ activeNote: renamed });
      }
    } catch (e) {
      console.error('Failed to rename', e);
      set({ error: 'Failed to rename note' });
    }
  },
  
  createNewFolder: async (name: string) => {
    const { currentFolderHandle } = get();
    if (!currentFolderHandle) return;
    try {
      await currentFolderHandle.getDirectoryHandle(name, { create: true });
      await get().loadNotes();
    } catch (e) {
      console.error('Failed to create folder', e);
      set({ error: 'Failed to create folder' });
    }
  },
  
  navigateToFolder: async (handle, name) => {
    const { folderStack } = get();
    set({ 
      currentFolderHandle: handle,
      folderStack: [...folderStack, { name, handle }],
      activeNote: null,
      searchQuery: ''
    });
    await get().loadNotes();
  },
  
  navigateUp: async () => {
    const { folderStack } = get();
    if (folderStack.length <= 1) return;
    const newStack = folderStack.slice(0, -1);
    const newCurrent = newStack[newStack.length - 1].handle;
    set({
      currentFolderHandle: newCurrent,
      folderStack: newStack,
      activeNote: null,
      searchQuery: ''
    });
    await get().loadNotes();
  }

}));
