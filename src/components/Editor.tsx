import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { ArrowLeft, BookOpen, Edit3, Trash, CheckCircle2, Loader2, AlertCircle, Save } from 'lucide-react';

export default function Editor() {
  const { activeNote, saveNote, setActiveNote, deleteActiveNote } = useAppStore();
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // When activeNote changes, fetch its latest content fresh to ensure we have it if it wasn't preloaded
  useEffect(() => {
    if (activeNote) {
       setContent(activeNote.content || '');
       setSaveStatus('idle');
    } else {
       setContent('');
    }
  }, [activeNote?.name]);

  const handleManualSave = async () => {
    if (!activeNote) return;
    
    setSaveStatus('saving');
    try {
      console.log('Executing manual save. Content length:', content.length);
      await saveNote(activeNote, content);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Manual save failed:', err);
      setSaveStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSaveStatus('idle'); // Just show idle, changes are unsaved.
  };


  if (!activeNote) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950 text-gray-400 dark:text-orange-400/50">
        <p>Select or create a note to begin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveNote(null)}
            className="md:hidden p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-medium text-gray-500 truncate max-w-[200px] md:max-w-[400px]">
            {activeNote.name}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-blue-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-green-500 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                Save Failed
              </span>
            )}
          </div>
        </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-900 text-sm font-medium transition-colors text-gray-700 dark:text-zinc-300 disabled:opacity-50"
              title="Save note"
            >
              <Save className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this note?')) {
                  deleteActiveNote();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium transition-colors text-red-600 dark:text-red-400"
              title="Delete note"
            >
              <Trash className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsPreview(!isPreview)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-900 text-sm font-medium transition-colors text-gray-700 dark:text-zinc-300"
            >
          {isPreview ? <Edit3 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
          {isPreview ? "Edit" : "Preview"}
        </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto h-full">
          {isPreview ? (
            <div className="prose prose-blue dark:prose-invert dark:text-orange-400 dark:*:text-orange-400 max-w-none">
              <ReactMarkdown>{content || '*Empty note*'}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              className={cn(
                "w-full h-full resize-none outline-none bg-transparent",
                "font-mono text-base leading-relaxed text-gray-900 dark:text-orange-400",
                "placeholder:text-gray-300 dark:placeholder:text-orange-700/50"
              )}
              value={content}
              onChange={handleChange}
              placeholder="# Note Title&#10;&#10;Start typing your markdown here..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
