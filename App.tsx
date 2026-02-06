
import React, { useState, useEffect, useCallback } from 'react';
// Fix: Correct casing for imports to match file names Layout.tsx and TripForm.tsx
import Layout from './components/Layout';
import TripForm from './components/TripForm';
import { analyzeMaintenanceTrends, suggestNoteOptimization } from './services/geminiService';
import { syncTripToGoogleSheets } from './services/syncService';
import { Trip, TripStatus, Vehicle, Volunteer, INITIAL_VEHICLES, INITIAL_VOLUNTEERS, AppSettings } from './types';

type View = 'DASHBOARD' | 'NEW_TRIP' | 'END_TRIP' | 'ADMIN' | 'ANALYSIS';

const ADMIN_PASSWORD_DEFAULT = 'leini';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('prociv_trips');
    return saved ? JSON.parse(saved) : [];
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('prociv_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
  });

  const [volunteers, setVolunteers] = useState<Volunteer[]>(() => {
    const saved = localStorage.getItem('prociv_volunteers');
    return saved ? JSON.parse(saved) : INITIAL_VOLUNTEERS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('prociv_settings');
    const defaultSettings: AppSettings = { 
      googleScriptUrl: '', 
      adminPassword: ADMIN_PASSWORD_DEFAULT,
      notificationsEnabled: false, 
      maxTripDurationHours: 4, 
      standardEndTime: '20:00' 
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [activeTrip, setActiveTrip] = useState<Trip | null>(() => {
    const saved = localStorage.getItem('prociv_trips');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.find((t: Trip) => t.status === TripStatus.ACTIVE) || null;
    }
    return null;
  });

  useEffect(() => localStorage.setItem('prociv_trips', JSON.stringify(trips)), [trips]);
  useEffect(() => localStorage.setItem('prociv_vehicles', JSON.stringify(vehicles)), [vehicles]);
  useEffect(() => localStorage.setItem('prociv_volunteers', JSON.stringify(volunteers)), [volunteers]);
  useEffect(() => localStorage.setItem('prociv_settings', JSON.stringify(settings)), [settings]);

  // Fix: Added missing getTitle function
  const getTitle = () => {
    switch (currentView) {
      case 'DASHBOARD': return 'Logbook Mezzi';
      case 'NEW_TRIP': return 'Nuova Uscita';
      case 'END_TRIP': return 'Registra Rientro';
      case 'ADMIN': return 'Impostazioni Admin';
      case 'ANALYSIS': return 'Analisi Logistica IA';
      default: return 'Protezione Civile';
    }
  };

  const sendNotification = useCallback((title: string, body: string) => {
    if (!settings.notificationsEnabled || Notification.permission !== 'granted') return;
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=prociv&backgroundColor=004a99',
          badge: 'https://api.dicebear.com/7.x/shapes/svg?seed=prociv&backgroundColor=004a99',
          vibrate: [200, 100, 200],
          tag: 'reminder-rientro'
        } as any);
      });
    } else {
      new Notification(title, { body });
    }
  }, [settings.notificationsEnabled]);

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setSettings(prev => ({ ...prev, notificationsEnabled: true }));
      sendNotification("Notifiche Attivate", "Riceverai promemoria per i rientri dei mezzi.");
    }
  };

  useEffect(() => {
    if (!activeTrip || !settings.notificationsEnabled) return;
    const interval = setInterval(() => {
      const now = new Date();
      const startTime = new Date(activeTrip.startTime);
      const diffHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      if (diffHours >= settings.maxTripDurationHours) {
        sendNotification("Promemoria Rientro", `Mezzo ${vehicles.find(v => v.id === activeTrip.vehicleId)?.plate} fuori da oltre ${settings.maxTripDurationHours} ore.`);
      }
      const [stdH, stdM] = settings.standardEndTime.split(':').map(Number);
      if (now.getHours() === stdH && now.getMinutes() === stdM) {
        sendNotification("Fine Turno Standard", "È l'ora standard di fine servizio. Ricorda di registrare il rientro.");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [activeTrip, settings, sendNotification, vehicles]);

  const checkAdminPassword = (action: () => void) => {
    if (isAdminAuth) {
      action();
      return;
    }
    const pwd = window.prompt("Password Amministratore:");
    const requiredPwd = settings.adminPassword || ADMIN_PASSWORD_DEFAULT;
    if (pwd === requiredPwd) {
      setIsAdminAuth(true);
      action();
    } else if (pwd !== null) {
      alert("Password errata!");
    }
  };

  const handleSaveTrip = async (tripData: Partial<Trip>) => {
    if (tripData.status === TripStatus.COMPLETED) {
      const completedTrip = tripData as Trip;
      
      // Opzionale: Ottimizzazione IA delle note prima del salvataggio finale
      let optimizedNotes = completedTrip.notes;
      if (completedTrip.notes && completedTrip.notes.length > 5) {
        optimizedNotes = await suggestNoteOptimization(completedTrip.notes);
      }
      
      const finalTrip = { ...completedTrip, notes: optimizedNotes };
      setTrips(prev => prev.map(t => t.id === finalTrip.id ? finalTrip : t));
      setActiveTrip(null);
      
      // Tentativo immediato di sincronizzazione
      if (settings.googleScriptUrl) {
        const vehicle = vehicles.find(v => v.id === finalTrip.vehicleId);
        const success = await syncTripToGoogleSheets(finalTrip, vehicle, settings.googleScriptUrl);
        setTrips(prev => prev.map(t => t.id === finalTrip.id ? { ...t, synced: success, syncError: !success } : t));
      }
    } else {
      const newTrip = tripData as Trip;
      setTrips(prev => [newTrip, ...prev]);
      setActiveTrip(newTrip);
    }
    setCurrentView('DASHBOARD');
  };

  const syncAllUnsynced = async () => {
    if (!settings.googleScriptUrl) {
      alert("Configura prima l'URL dello script nelle impostazioni.");
      return;
    }
    setIsSyncingAll(true);
    const unsynced = trips.filter(t => t.status === TripStatus.COMPLETED && !t.synced);
    
    for (const trip of unsynced) {
      const vehicle = vehicles.find(v => v.id === trip.vehicleId);
      const success = await syncTripToGoogleSheets(trip, vehicle, settings.googleScriptUrl);
      if (success) {
        setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, synced: true, syncError: false } : t));
      }
    }
    setIsSyncingAll(false);
    alert("Sincronizzazione completata.");
  };

  const handleAiAnalysis = async () => {
    setIsAiLoading(true);
    const summary = await analyzeMaintenanceTrends(trips);
    setAiSummary(summary);
    setIsAiLoading(false);
    setCurrentView('ANALYSIS');
  };

  const handleChangePassword = () => {
    const newPwd = window.prompt("Inserisci la nuova password:");
    if (newPwd && newPwd.trim().length >= 4) {
      setSettings(prev => ({ ...prev, adminPassword: newPwd.trim() }));
      alert("Password aggiornata.");
    }
  };

  return (
    <Layout 
      title={getTitle()}
      onBack={currentView !== 'DASHBOARD' ? () => setCurrentView('DASHBOARD') : undefined}
      actions={currentView === 'DASHBOARD' && (
        <button 
          onClick={() => checkAdminPassword(() => setCurrentView('ADMIN'))} 
          className="p-3 text-white bg-blue-700/80 rounded-full shadow-lg hover:bg-blue-800 transition-all active:scale-90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    >
      {currentView === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full opacity-50"></div>
            {activeTrip ? (
              <div className="w-full bg-blue-600 rounded-3xl p-6 text-white text-left relative overflow-hidden shadow-2xl">
                <div className="absolute right-[-20px] bottom-[-20px] text-8xl opacity-10 rotate-12">{activeTrip.icon}</div>
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-white text-blue-600 text-[10px] font-black rounded-full uppercase animate-pulse">Servizio attivo</span>
                    <span className="text-sm font-black">{activeTrip.icon} {vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</span>
                  </div>
                  <p className="text-xl font-black mb-6">{activeTrip.destination}</p>
                  <button onClick={() => setCurrentView('END_TRIP')} className="w-full bg-yellow-400 text-blue-900 py-4 rounded-2xl font-black text-sm uppercase shadow-lg active:scale-95 transition-all">
                    Registra Rientro
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCurrentView('NEW_TRIP')} className="w-full bg-blue-600 text-white py-7 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all group">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                </div>
                NUOVA USCITA
              </button>
            )}
            <button onClick={handleAiAnalysis} className="mt-6 flex items-center gap-2 text-[10px] font-black text-blue-800 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 uppercase hover:bg-blue-100 transition-colors" disabled={isAiLoading || trips.length === 0}>
              {isAiLoading ? 'Elaborazione IA...' : '✨ Analisi Logistica IA'}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.2em] px-4">Logbook Storico</h3>
            {trips.filter(t => t.status === TripStatus.COMPLETED).slice(0, 5).map(trip => (
              <div key={trip.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">{trip.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-blue-900 text-sm truncate">{vehicles.find(v => v.id === trip.vehicleId)?.plate}</p>
                    {trip.synced ? (
                      <span className="text-[7px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-black uppercase">Cloud ✅</span>
                    ) : (
                      <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase ${trip.syncError ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {trip.syncError ? 'Errore Sync' : 'Pendente'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{trip.reason} - {trip.destination}</p>
                </div>
                <div className="text-right">
                   <p className="text-md font-black text-gray-800">{(trip.endKm || 0) - trip.startKm} KM</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'NEW_TRIP' && <TripForm onSave={handleSaveTrip} vehicles={vehicles} volunteers={volunteers} />}
      {currentView === 'END_TRIP' && activeTrip && <TripForm onSave={handleSaveTrip} activeTrip={activeTrip} vehicles={vehicles} volunteers={volunteers} />}
      
      {currentView === 'ANALYSIS' && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black">✨</div>
                <h3 className="font-black text-blue-900 uppercase text-sm tracking-widest">Report IA</h3>
            </div>
            <div className="prose prose-sm text-gray-600 leading-relaxed">
                {aiSummary?.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
            </div>
            <button onClick={() => setCurrentView('DASHBOARD')} className="w-full mt-6 bg-blue-900 text-white py-4 rounded-2xl font-black text-sm uppercase">Chiudi</button>
        </div>
      )}

      {currentView === 'ADMIN' && (
        <div className="space-y-6 pb-10 animate-in slide-in-from-right">
          <div className="bg-blue-900 p-6 rounded-[2.5rem] text-white shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2">
               <h3 className="text-xs font-black uppercase tracking-widest text-blue-200">Connessione Cloud</h3>
               <span className="text-[8px] bg-blue-800 text-yellow-400 px-2 py-1 rounded-lg font-black uppercase">Report: 1Gz...NL7pw</span>
             </div>
             
             <div className="space-y-3">
               <input 
                  type="text" 
                  placeholder="URL Google Apps Script" 
                  className="w-full text-xs p-4 rounded-xl border-none text-blue-900 font-bold focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={settings.googleScriptUrl}
                  onChange={(e) => setSettings(prev => ({...prev, googleScriptUrl: e.target.value}))}
               />
               
               <button 
                onClick={syncAllUnsynced}
                disabled={isSyncingAll || trips.filter(t => !t.synced).length === 0}
                className="w-full bg-yellow-500 text-blue-900 p-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {isSyncingAll ? 'Sincronizzazione...' : (
                   <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Sincronizza {trips.filter(t => t.status === TripStatus.COMPLETED && !t.synced).length} Pendenti
                   </>
                 )}
               </button>
             </div>

             <div className="pt-4 border-t border-blue-800 flex justify-between items-center">
               <p className="text-[9px] font-black uppercase text-blue-300">Sicurezza Admin</p>
               <button onClick={handleChangePassword} className="text-[9px] font-black uppercase text-yellow-400 underline">Cambia Password</button>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-lg">
             <h3 className="text-xs font-black text-gray-800 uppercase mb-4 tracking-widest">Gestione Anagrafiche</h3>
             {/* List of volunteers/vehicles as before... */}
             <div className="text-[10px] text-gray-400 italic mb-4">Aggiungi o rimuovi volontari e mezzi dal database locale.</div>
             
             <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black uppercase mb-3 text-blue-900">Autisti ({volunteers.length})</p>
                    <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                        {volunteers.map(v => (
                            <div key={v.id} className="flex justify-between items-center text-xs font-bold text-gray-700 bg-white p-2 rounded-lg shadow-sm">
                                <span>{v.name} {v.surname}</span>
                                <button onClick={() => setVolunteers(prev => prev.filter(p => p.id !== v.id))} className="text-red-400">×</button>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black uppercase mb-3 text-blue-900">Mezzi ({vehicles.length})</p>
                    <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                        {vehicles.map(v => (
                            <div key={v.id} className="flex justify-between items-center text-xs font-bold text-gray-700 bg-white p-2 rounded-lg shadow-sm">
                                <span>{v.plate}</span>
                                <button onClick={() => setVehicles(prev => prev.filter(p => p.id !== v.id))} className="text-red-400">×</button>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </div>

          <button 
            onClick={() => {
              if(window.confirm("Sei sicuro? Questa azione eliminerà tutti i dati locali.")) {
                localStorage.clear();
                window.location.reload();
              }
            }} 
            className="w-full bg-red-100 text-red-600 py-4 rounded-2xl font-black text-xs uppercase border border-red-200"
          >
            Reset Totale Database
          </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
