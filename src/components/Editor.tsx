import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { ArrowLeft, BookOpen, Edit3 } from 'lucide-react';

export default function Editor() {
  const { activeNote, saveActiveNote, setActiveNote } = useAppStore();
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  
  // Ref for debouncing auto-save
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // When activeNote changes, fetch its latest content fresh to ensure we have it if it wasn't preloaded
  useEffect(() => {
    let isMounted = true;
    if (activeNote) {
       // get the content. If activeNote.content exists we use it to start, but better to fetch from disk for freshness.
       activeNote.handle.getFile().then(file => file.text()).then(text => {
         if (isMounted) setContent(text);
       });
    } else {
       setContent('');
    }
    return () => { isMounted = false; };
  }, [activeNote?.name]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      saveActiveNote(newContent);
    }, 500); // 500ms debounce auto-save
  };

  if (!activeNote) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950 text-gray-400 dark:text-zinc-600">
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
        </div>
        <button 
          onClick={() => setIsPreview(!isPreview)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-900 text-sm font-medium transition-colors text-gray-700 dark:text-zinc-300"
        >
          {isPreview ? <Edit3 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
          {isPreview ? "Edit" : "Preview"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto h-full">
          {isPreview ? (
            <div className="prose prose-blue dark:prose-invert max-w-none">
              <ReactMarkdown>{content || '*Empty note*'}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              className={cn(
                "w-full h-full resize-none outline-none bg-transparent",
                "font-mono text-base leading-relaxed text-gray-900 dark:text-gray-100",
                "placeholder:text-gray-300 dark:placeholder:text-zinc-700"
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
