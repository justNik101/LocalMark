import { Note } from '../types';
import { useAppStore } from '../store';
import { FileText, Search, Pencil, Trash, X } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface NoteItemProps {
  note: Note;
  isActive: boolean;
  onClick: (note: Note) => void;
}

export function NoteItem({ note, isActive, onClick }: NoteItemProps) {
  const { deleteActiveNote, setActiveNote, renameActiveNote } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [renameValue, setRenameValue] = useState(note.name.replace(/\.md$/, ''));

  const handleRename = async () => {
    if (renameValue.trim() && renameValue !== note.name.replace(/\.md$/, '')) {
       await renameActiveNote(renameValue.trim());
    }
    setIsEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') setIsEditing(false);
  }

  return (
    <div 
      className={cn(
        "group flex items-center justify-between px-3 py-2 cursor-pointer border-l-2 transition-colors",
        isActive 
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-orange-300" 
          : "border-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-orange-400/80"
      )}
      onClick={() => {
        if (!isEditing) onClick(note);
      }}
    >
       <div className="flex flex-col overflow-hidden w-full">
         {isEditing && isActive ? (
           <input 
             autoFocus
             value={renameValue}
             onChange={e => setRenameValue(e.target.value)}
             onBlur={handleRename}
             onKeyDown={onKeyDown}
             className="bg-white dark:bg-zinc-900 border border-blue-500 rounded px-1 py-0.5 text-sm outline-none text-gray-900 dark:text-orange-400"
             onClick={e => e.stopPropagation()}
           />
         ) : (
           <span className="font-medium truncate text-sm">
             {note.title || note.name.replace(/\.md$/, '')}
           </span>
         )}
         <span className={cn(
             "text-xs mt-0.5",
             isActive ? "text-blue-600 dark:text-orange-400/80" : "text-gray-500 dark:text-orange-400/50"
           )}>
           {format(new Date(note.lastModified), 'MMM d, yyyy')}
         </span>
       </div>
       
       {isActive && !isEditing && (
         <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded">
             <Pencil className="w-3 h-3" />
           </button>
           <button onClick={(e) => { e.stopPropagation(); deleteActiveNote(); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded">
             <Trash className="w-3 h-3" />
           </button>
         </div>
       )}
    </div>
  );
}

export default function Sidebar() {
  const { notes, activeNote, setActiveNote, searchQuery, setSearchQuery, createNewNote, unlinkRootFolder, rootHandle } = useAppStore();
  const [creating, setCreating] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');

  const filteredNotes = notes.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.name.toLowerCase().includes(q) || n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q));
  });
  
  const recentNotes = notes.slice(0, 5); // Last 5 edited notes

  const handleCreate = async () => {
    if (newNoteName.trim()) {
      await createNewNote(newNoteName.trim());
      setCreating(false);
      setNewNoteName('');
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-zinc-900/50 border-r border-gray-200 dark:border-zinc-800">
      
      {/* Header / Actions */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
           <h2 className="text-sm font-semibold text-gray-900 dark:text-orange-400 truncate pr-2">
             {rootHandle?.name || "Local Notes"}
           </h2>
           <button 
             onClick={unlinkRootFolder}
             className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-orange-300"
             title="Switch Folder"
           >
              Switch
           </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-md text-sm outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-orange-400"
          />
        </div>
        
        <button 
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          New Note
        </button>
        
        {creating && (
          <div className="flex items-center gap-1 mt-1">
             <input
               autoFocus
               placeholder="Note name..."
               value={newNoteName}
               onChange={e => setNewNoteName(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') handleCreate();
                 if (e.key === 'Escape') setCreating(false);
               }}
               className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm outline-none dark:bg-zinc-900 text-gray-900 dark:text-orange-400"
             />
             <button onClick={() => setCreating(false)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-700">
                <X className="w-3 h-3" />
             </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!searchQuery && recentNotes.length > 0 && (
          <div className="mb-4">
             <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-orange-400/50">
               Recent
             </div>
             <div className="flex flex-col">
               {recentNotes.map(n => (
                 <NoteItem key={n.name} note={n} isActive={activeNote?.name === n.name} onClick={setActiveNote} />
               ))}
             </div>
          </div>
        )}

        <div className="pb-4">
           <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-orange-400/50">
             {searchQuery ? "Search Results" : "All Notes"}
           </div>
           <div className="flex flex-col">
             {filteredNotes.map(n => (
               <NoteItem key={n.name} note={n} isActive={activeNote?.name === n.name} onClick={setActiveNote} />
             ))}
             {filteredNotes.length === 0 && (
               <div className="px-4 py-3 text-sm text-gray-500">
                 No notes found.
               </div>
             )}
           </div>
        </div>
      </div>

    </div>
  );
}
