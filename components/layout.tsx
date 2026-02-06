
import React, { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onBack, actions }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 shadow-2xl relative border-x border-gray-200">
      <header className="prociv-blue text-white p-4 sticky top-0 z-20 flex flex-col shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-blue-800 rounded-full transition-all active:scale-90">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-black tracking-tighter uppercase">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {actions}
          </div>
        </div>
        {!isOnline && (
          <div className="bg-red-500 text-[9px] font-black text-center py-1 rounded uppercase tracking-widest animate-pulse">
            Modalità Offline - I dati verranno salvati localmente
          </div>
        )}
      </header>
      
      <main className="flex-1 p-4 pb-28 overflow-y-auto">
        {children}
      </main>

      <footer className="prociv-yellow p-3 text-center absolute bottom-0 w-full border-t border-yellow-500 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">
          Protezione Civile Leinì • Logbook v1.2
        </p>
      </footer>
    </div>
  );
};

export default Layout;
