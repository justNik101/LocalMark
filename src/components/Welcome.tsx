import { useAppStore } from '../store';
import { verifyPermission } from '../lib/fs';

export default function Welcome() {
  const { selectRootFolder, rootHandle, initStore } = useAppStore();

  const handleResume = async () => {
    if (rootHandle) {
      const options = { mode: 'readwrite' };
      const permission = await (rootHandle as any).requestPermission(options);
      if (permission === 'granted') {
         await initStore();
      }
    }
  }

  const isInIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const isIframe = isInIframe();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6 text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Local Notes
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          A minimalist, file-based note-taking application. Your notes live safely on your device in plain markdown format.
        </p>
        
        {isIframe ? (
          <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900/50">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Open in a new tab required
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>
                Because this app uses the local File System Access API, your browser requires it to be opened in its own window, and not inside a preview frame. 
                Please use the "Open in new tab" icon in the preview panel header above to continue.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <button
              onClick={selectRootFolder}
              className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              Select Notes Folder
            </button>
            
            {rootHandle && (
              <button
                 onClick={handleResume}
                 className="w-full rounded-md bg-white border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors"
              >
                Resume access to last folder ({rootHandle.name})
              </button>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500 pt-8">
          Privacy first: We don't store your notes. We just provide a beautiful interface for your local files.
        </p>
      </div>
    </div>
  );
}
