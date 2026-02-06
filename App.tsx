
import React, { useState, useEffect, useRef } from 'react';
// Fix: Corrected import casing to match file system (Layout.tsx)
import Layout from './components/Layout';
// Fix: Corrected import casing to match file system (TripForm.tsx)
import TripForm from './components/TripForm';
import { analyzeMaintenanceTrends } from './services/geminiService';
import { Trip, TripStatus, Vehicle, Volunteer, INITIAL_VEHICLES, INITIAL_VOLUNTEERS, AppSettings } from './types';

type View = 'DASHBOARD' | 'NEW_TRIP' | 'END_TRIP' | 'ADMIN' | 'ANALYSIS';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);
  const [settings, setSettings] = useState<AppSettings>({ googleScriptUrl: '' });
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const syncingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const savedTrips = localStorage.getItem('prociv_trips');
    const savedVehicles = localStorage.getItem('prociv_vehicles');
    const savedVolunteers = localStorage.getItem('prociv_volunteers');
    const savedSettings = localStorage.getItem('prociv_settings');

    if (savedTrips) {
      const parsed = JSON.parse(savedTrips);
      setTrips(parsed);
      const active = parsed.find((t: Trip) => t.status === TripStatus.ACTIVE);
      if (active) setActiveTrip(active);
    }
    if (savedVehicles) setVehicles(JSON.parse(savedVehicles));
    if (savedVolunteers) setVolunteers(JSON.parse(savedVolunteers));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  useEffect(() => localStorage.setItem('prociv_trips', JSON.stringify(trips)), [trips]);
  useEffect(() => localStorage.setItem('prociv_vehicles', JSON.stringify(vehicles)), [vehicles]);
  useEffect(() => localStorage.setItem('prociv_volunteers', JSON.stringify(volunteers)), [volunteers]);
  useEffect(() => localStorage.setItem('prociv_settings', JSON.stringify(settings)), [settings]);

  const handleAiAnalysis = async () => {
    setIsAiLoading(true);
    const summary = await analyzeMaintenanceTrends(trips);
    setAiSummary(summary);
    setIsAiLoading(false);
    setCurrentView('ANALYSIS');
  };

  const exportForSA = () => {
    const headers = ['Data', 'Mezzo', 'Autista', 'KM Inizio', 'KM Fine', 'Percorsi', 'Destinazione', 'Guasti', 'Rifornimento'];
    const rows = trips.filter(t => t.status === TripStatus.COMPLETED).map(t => {
      const v = vehicles.find(vec => vec.id === t.vehicleId);
      return [
        new Date(t.startTime).toLocaleDateString(),
        v?.plate || 'N/D',
        t.driverName,
        t.startKm,
        t.endKm,
        (t.endKm || 0) - (t.startKm || 0),
        t.destination,
        t.maintenanceNeeded.needed ? t.maintenanceNeeded.description : 'NO',
        t.refuelingDone ? 'SI' : 'NO'
      ].join(';');
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Export_SA_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSaveTrip = async (tripData: Partial<Trip>) => {
    if (tripData.status === TripStatus.COMPLETED) {
      const completedTrip = tripData as Trip;
      setTrips(prev => prev.map(t => t.id === completedTrip.id ? completedTrip : t));
      setActiveTrip(null);
    } else {
      const newTrip = tripData as Trip;
      setTrips(prev => [newTrip, ...prev]);
      setActiveTrip(newTrip);
    }
    setCurrentView('DASHBOARD');
  };

  return (
    <Layout 
      title={currentView === 'DASHBOARD' ? 'LOGBOOK LEINÌ' : currentView.replace('_', ' ')}
      onBack={currentView !== 'DASHBOARD' ? () => setCurrentView('DASHBOARD') : undefined}
      actions={
        currentView === 'DASHBOARD' && (
          <button onClick={() => setCurrentView('ADMIN')} className="p-2 text-white bg-blue-800 rounded-full shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        )
      }
    >
      {currentView === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full opacity-50"></div>
            
            {activeTrip ? (
              <div className="w-full bg-blue-600 rounded-3xl p-6 text-white text-left animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-3 py-1 bg-white text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">In Missione</span>
                  <span className="text-sm font-black">{vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</span>
                </div>
                <p className="text-xl font-black mb-6">{activeTrip.destination}</p>
                <button 
                  onClick={() => setCurrentView('END_TRIP')}
                  className="w-full bg-yellow-400 text-blue-900 py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all uppercase"
                >
                  Registra Rientro
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setCurrentView('NEW_TRIP')}
                className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all group"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                NUOVA USCITA
              </button>
            )}

            <button 
              onClick={handleAiAnalysis}
              className="mt-6 flex items-center gap-2 text-[10px] font-black text-blue-800 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 uppercase tracking-tight hover:bg-blue-100 transition-colors"
              disabled={isAiLoading || trips.length === 0}
            >
              {isAiLoading ? 'Analisi in corso...' : '✨ Analisi Flotta IA'}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.2em] px-4">Ultime Missioni</h3>
            {trips.filter(t => t.status === TripStatus.COMPLETED).slice(0, 5).map(trip => (
              <div key={trip.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-black text-blue-900 text-sm">{vehicles.find(v => v.id === trip.vehicleId)?.plate}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[150px]">{trip.destination}</p>
                </div>
                <div className="text-right">
                   <p className="text-md font-black text-gray-800">{(trip.endKm || 0) - trip.startKm} KM</p>
                   {trip.maintenanceNeeded.needed && <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase">Guasto</span>}
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
                <h3 className="font-black text-blue-900 uppercase text-sm tracking-widest">Riepilogo Logistico IA</h3>
            </div>
            <div className="prose prose-sm text-gray-600 leading-relaxed font-medium">
                {aiSummary?.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
            </div>
            <button 
                onClick={() => setCurrentView('DASHBOARD')}
                className="w-full mt-6 bg-blue-900 text-white py-4 rounded-2xl font-black text-sm uppercase"
            >
                Torna Indietro
            </button>
        </div>
      )}

      {currentView === 'ADMIN' && (
        <div className="space-y-6 animate-in slide-in-from-right pb-10">
          <div className="bg-blue-900 p-6 rounded-[2.5rem] text-white shadow-2xl">
             <h3 className="text-xs font-black uppercase mb-4 tracking-widest text-blue-200">Gestione Database SA</h3>
             <button 
                onClick={exportForSA}
                className="w-full bg-white text-blue-900 py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-3 active:scale-95 transition-all"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Esporta CSV per SA
             </button>
             <p className="mt-3 text-[9px] text-blue-300 font-bold uppercase leading-tight text-center">Formato separato da punto e virgola (;)</p>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-lg">
             <h3 className="text-xs font-black text-gray-800 uppercase mb-4 tracking-widest">Configurazione Mezzi</h3>
             <div className="space-y-2 mb-6">
                {vehicles.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                    <p className="font-black text-blue-900 text-sm">{v.plate} <span className="text-gray-400 font-bold ml-2 text-xs uppercase">{v.model}</span></p>
                    <button onClick={() => setVehicles(vehicles.filter(item => item.id !== v.id))} className="text-red-400 p-2 hover:text-red-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
             </div>
             <form onSubmit={(e: any) => {
                 e.preventDefault();
                 setVehicles([...vehicles, { id: Date.now().toString(), plate: e.target.plate.value.toUpperCase(), model: e.target.model.value }]);
                 e.target.reset();
             }} className="space-y-2">
                <input name="plate" placeholder="Targa" className="w-full text-xs p-4 rounded-xl border-2 border-gray-50 font-bold focus:border-blue-500 outline-none" required />
                <input name="model" placeholder="Modello Mezzo" className="w-full text-xs p-4 rounded-xl border-2 border-gray-50 focus:border-blue-500 outline-none" required />
                <button className="w-full bg-blue-600 text-white p-4 rounded-xl font-black shadow-md uppercase text-xs tracking-widest">+ Aggiungi Mezzo</button>
             </form>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-lg">
             <h3 className="text-xs font-black text-gray-800 uppercase mb-4 tracking-widest">Banca Dati Autisti</h3>
             <div className="space-y-2 mb-6">
                {volunteers.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                    <p className="font-black text-blue-900 text-sm">{v.name} <span className="text-gray-900 font-black ml-1 uppercase">{v.surname}</span></p>
                    <button onClick={() => setVolunteers(volunteers.filter(item => item.id !== v.id))} className="text-red-400 p-2 hover:text-red-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
             </div>
             <form onSubmit={(e: any) => {
                 e.preventDefault();
                 setVolunteers([...volunteers, { id: 'V' + Date.now(), name: e.target.vname.value, surname: e.target.vsurname.value }]);
                 e.target.reset();
             }} className="space-y-2">
                <input name="vname" placeholder="Nome" className="w-full text-xs p-4 rounded-xl border-2 border-gray-50 font-bold focus:border-blue-500 outline-none" required />
                <input name="vsurname" placeholder="Cognome" className="w-full text-xs p-4 rounded-xl border-2 border-gray-50 font-bold focus:border-blue-500 outline-none" required />
                <button className="w-full bg-yellow-500 text-blue-900 p-4 rounded-xl font-black shadow-md uppercase text-xs tracking-widest">+ Aggiungi Autista</button>
             </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
