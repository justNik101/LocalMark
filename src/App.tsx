/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useAppStore } from './store';
import Welcome from './components/Welcome';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';

export default function App() {
  const { rootHandle, isInitializing, initStore, activeNote } = useAppStore();

  useEffect(() => {
    initStore();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="animate-pulse text-gray-400 dark:text-orange-400/50">Loading...</div>
      </div>
    );
  }

  if (!rootHandle) {
    return <Welcome />;
  }

  // Layout for authenticated/selected folder view
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Sidebar */}
      <div 
        className={`w-full md:w-72 flex-shrink-0 border-r border-gray-200 dark:border-zinc-800 ${
          activeNote ? 'hidden md:block' : 'block'
        }`}
      >
        <Sidebar />
      </div>
      
      {/* Editor Main Content */}
      <div 
        className={`flex-1 flex flex-col min-w-0 h-full ${
          !activeNote ? 'hidden md:flex' : 'flex'
        }`}
      >
        <Editor />
      </div>
    </div>
  );
}
