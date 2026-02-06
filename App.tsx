
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/layout';
import TripForm from './components/trip-form';
import { analyzeMaintenanceTrends, suggestNoteOptimization } from './services/geminiService';
import { syncTripToGoogleSheets, generateTripsCSV, uploadCSVToCloud } from './services/syncService';
import { Trip, TripStatus, Vehicle, Volunteer, INITIAL_VEHICLES, INITIAL_VOLUNTEERS, AppSettings } from './types';

type View = 'DASHBOARD' | 'NEW_TRIP' | 'END_TRIP' | 'ADMIN' | 'ANALYSIS';

const ADMIN_PASSWORD_DEFAULT = 'leini';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
        registration.showNotification(title, { body });
      });
    } else {
      new Notification(title, { body });
    }
  }, [settings.notificationsEnabled]);

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
      let optimizedNotes = completedTrip.notes;
      if (completedTrip.notes && completedTrip.notes.length > 5) {
        optimizedNotes = await suggestNoteOptimization(completedTrip.notes);
      }
      const finalTrip = { ...completedTrip, notes: optimizedNotes };
      setTrips(prev => prev.map(t => t.id === finalTrip.id ? finalTrip : t));
      setActiveTrip(null);
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
    if (!settings.googleScriptUrl) return alert("Configura URL script!");
    setIsSyncingAll(true);
    const unsynced = trips.filter(t => t.status === TripStatus.COMPLETED && !t.synced);
    for (const trip of unsynced) {
      const vehicle = vehicles.find(v => v.id === trip.vehicleId);
      await syncTripToGoogleSheets(trip, vehicle, settings.googleScriptUrl);
      setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, synced: true, syncError: false } : t));
    }
    setIsSyncingAll(false);
    alert("Sincronizzazione completata.");
  };

  const handleDownloadCSV = () => {
    const csv = generateTripsCSV(trips, vehicles);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `logbook_prociv_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloudCSVBackup = async () => {
    if (!settings.googleScriptUrl) return alert("Configura URL script!");
    setIsExporting(true);
    const csv = generateTripsCSV(trips, vehicles);
    const success = await uploadCSVToCloud(csv, settings.googleScriptUrl);
    setIsExporting(false);
    if (success) alert("Backup CSV inviato al Cloud con successo.");
    else alert("Errore durante l'invio del backup.");
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
        <button onClick={() => checkAdminPassword(() => setCurrentView('ADMIN'))} className="p-3 text-white bg-blue-700/80 rounded-full shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      )}
    >
      {currentView === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center">
            {activeTrip ? (
              <div className="w-full bg-blue-600 rounded-3xl p-6 text-white text-left relative overflow-hidden shadow-2xl">
                <div className="absolute right-[-20px] bottom-[-20px] text-8xl opacity-10 rotate-12">{activeTrip.icon}</div>
                <div className="relative z-10">
                  <span className="px-3 py-1 bg-white text-blue-600 text-[10px] font-black rounded-full uppercase mb-4 inline-block">In Corso</span>
                  <p className="text-sm font-black mb-1">{vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</p>
                  <p className="text-xl font-black mb-6">{activeTrip.destination}</p>
                  <button onClick={() => setCurrentView('END_TRIP')} className="w-full bg-yellow-400 text-blue-900 py-4 rounded-2xl font-black uppercase shadow-lg">Registra Rientro</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCurrentView('NEW_TRIP')} className="w-full bg-blue-600 text-white py-7 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4">AVVIA SERVIZIO</button>
            )}
            <button onClick={handleAiAnalysis} className="mt-6 text-[10px] font-black text-blue-800 bg-blue-50 px-4 py-2 rounded-full uppercase" disabled={isAiLoading}>✨ Analisi IA</button>
          </div>

          <div className="space-y-3 px-2">
            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest">Cronologia Recente</h3>
            {trips.filter(t => t.status === TripStatus.COMPLETED).slice(0, 5).map(trip => (
              <div key={trip.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-xl">{trip.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-blue-900 text-sm">{vehicles.find(v => v.id === trip.vehicleId)?.plate}</p>
                    <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase ${trip.synced ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                      {trip.synced ? 'Sinc' : 'Local'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold truncate uppercase">{trip.reason}</p>
                </div>
                <p className="text-sm font-black text-gray-700">{(trip.endKm || 0) - trip.startKm} KM</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'NEW_TRIP' && <TripForm onSave={handleSaveTrip} vehicles={vehicles} volunteers={volunteers} />}
      {currentView === 'END_TRIP' && activeTrip && <TripForm onSave={handleSaveTrip} activeTrip={activeTrip} vehicles={vehicles} volunteers={volunteers} />}
      
      {currentView === 'ADMIN' && (
        <div className="space-y-6 pb-10 animate-in slide-in-from-right">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-lg">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Esportazione & Backup</h3>
             </div>
             
             <div className="grid grid-cols-1 gap-3">
               <button 
                onClick={handleDownloadCSV}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border-2 border-gray-100 transition-all group"
               >
                 <div className="text-left">
                    <p className="text-[10px] font-black text-blue-900 uppercase">Scarica CSV Locale</p>
                    <p className="text-[8px] text-gray-400 font-bold">Ottimizzato per Excel IT</p>
                 </div>
                 <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm group-active:scale-90 transition-transform">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 </div>
               </button>

               <button 
                onClick={handleCloudCSVBackup}
                disabled={isExporting || !settings.googleScriptUrl}
                className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl border-2 border-blue-100 transition-all group disabled:opacity-50"
               >
                 <div className="text-left">
                    <p className="text-[10px] font-black text-blue-900 uppercase">Backup Cloud (CSV)</p>
                    <p className="text-[8px] text-gray-400 font-bold">Invia tutto a Google Sheet</p>
                 </div>
                 <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm group-active:scale-90 transition-transform">
                   {isExporting ? (
                     <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                   )}
                 </div>
               </button>
             </div>
          </div>

          <div className="bg-blue-900 p-6 rounded-[2.5rem] text-white shadow-2xl space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-blue-200">Configurazione Cloud</h3>
               <span className="text-[8px] bg-blue-800 text-yellow-400 px-2 py-1 rounded-lg font-black uppercase">ID: 1Gz...NL7pw</span>
             </div>
             <input 
                type="text" 
                placeholder="URL Script Google" 
                className="w-full text-xs p-4 rounded-xl border-none text-blue-900 font-bold focus:ring-2 focus:ring-yellow-400 outline-none"
                value={settings.googleScriptUrl}
                onChange={(e) => setSettings(prev => ({...prev, googleScriptUrl: e.target.value}))}
             />
             <button 
                onClick={syncAllUnsynced}
                disabled={isSyncingAll || trips.filter(t => !t.synced).length === 0}
                className="w-full bg-yellow-500 text-blue-900 p-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2"
             >
                Sincronizza {trips.filter(t => t.status === TripStatus.COMPLETED && !t.synced).length} viaggi locali
             </button>
          </div>

          <button 
            onClick={() => {
              if(window.confirm("Attenzione! Questo resetterà tutti i dati locali. Proseguire?")) {
                localStorage.clear();
                window.location.reload();
              }
            }} 
            className="w-full bg-red-100 text-red-600 py-4 rounded-2xl font-black text-xs uppercase border border-red-200"
          >
            Svuota Database Locale
          </button>
        </div>
      )}

      {currentView === 'ANALYSIS' && aiSummary && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-blue-600">
            <span className="text-2xl">✨</span>
            <h2 className="font-black uppercase tracking-widest text-sm">Analisi IA</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed font-medium italic">
            "{aiSummary}"
          </p>
          <button 
            onClick={() => setCurrentView('DASHBOARD')}
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase"
          >
            Torna alla Dashboard
          </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
