import { create } from 'zustand';
import { AppState, Note } from '../types';
import { clearRootHandle, getRootHandle, saveRootHandle } from '../lib/storage';
import {
  ensureDirectories,
  listNotes,
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
  deleteActiveNote: () => Promise<void>;
  renameActiveNote: (newName: string) => Promise<void>;
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  rootHandle: null,
  notesDirHandle: null,
  archiveDirHandle: null,
  notes: [],
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
          set({ rootHandle: handle, notesDirHandle, archiveDirHandle });
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
      
      set({ rootHandle: handle, notesDirHandle, archiveDirHandle, error: null });
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
      notes: [],
      activeNote: null,
      searchQuery: '',
      error: null
    });
  },

  loadNotes: async () => {
    const { notesDirHandle } = get();
    if (!notesDirHandle) return;
    
    try {
      const notes = await listNotes(notesDirHandle);
      set({ notes });
    } catch (e) {
      console.error('Failed to load notes', e);
      set({ error: 'Failed to load notes' });
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
    const { notesDirHandle } = get();
    if (!notesDirHandle) return;

    try {
      const handle = await fsCreateNote(notesDirHandle, name);
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
    const { activeNote, notesDirHandle } = get();
    if (!activeNote || !notesDirHandle) return;

    try {
      await fsDeleteNote(notesDirHandle, activeNote.name);
      set({ activeNote: null });
      await get().loadNotes();
    } catch(e) {
      console.error('Failed to delete note', e);
      set({ error: 'Failed to delete note' });
    }
  },

  renameActiveNote: async (newName: string) => {
    const { activeNote, notesDirHandle } = get();
    if (!activeNote || !notesDirHandle) return;
    
    try {
      const newHandle = await fsRenameNote(notesDirHandle, activeNote.name, newName);
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
  }

}));
