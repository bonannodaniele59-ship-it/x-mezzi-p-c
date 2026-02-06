
import React, { useState } from 'react';
import { Trip, TripStatus, Vehicle, Volunteer } from '../types';

interface TripFormProps {
  onSave: (trip: Partial<Trip>) => void;
  activeTrip?: Trip;
  vehicles: Vehicle[];
  volunteers: Volunteer[];
}

const SERVICE_CATEGORIES = [
  { label: 'AIB', icon: '🔥' },
  { label: 'Pattuglia', icon: '🚓' },
  { label: 'Emergenza', icon: '🆘' },
  { label: 'Evento', icon: '🎪' },
  { label: 'Logistica', icon: '📦' },
  { label: 'Manutenzione', icon: '🛠️' },
  { label: 'Sede', icon: '🏢' },
  { label: 'Altro', icon: '📍' },
];

const TripForm: React.FC<TripFormProps> = ({ onSave, activeTrip, vehicles, volunteers }) => {
  const isEnding = !!activeTrip;
  
  const [formData, setFormData] = useState({
    vehicleId: activeTrip?.vehicleId || (vehicles[0]?.id || ''),
    volunteerId: activeTrip?.volunteerId || (volunteers[0]?.id || ''),
    startKm: activeTrip?.startKm || 0,
    endKm: activeTrip?.endKm || activeTrip?.startKm || 0,
    destination: activeTrip?.destination || '',
    reason: activeTrip?.reason || '',
    notes: activeTrip?.notes || '',
    icon: activeTrip?.icon || '📍',
    refuelingDone: activeTrip?.refuelingDone || false,
    maintenanceNeeded: activeTrip?.maintenanceNeeded?.needed || false,
    maintenanceDescription: activeTrip?.maintenanceNeeded?.description || '',
  });

  const isKmInvalid = isEnding && formData.endKm < (activeTrip?.startKm || 0);

  const adjustKm = (amount: number) => {
    setFormData(prev => ({
      ...prev,
      endKm: Math.max(0, prev.endKm + amount)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isKmInvalid) {
      return; 
    }

    const selectedVolunteer = volunteers.find(v => v.id === formData.volunteerId);
    const driverName = selectedVolunteer ? `${selectedVolunteer.name} ${selectedVolunteer.surname}` : 'Sconosciuto';

    const cleanStartKm = Math.round(Number(formData.startKm));
    const cleanEndKm = Math.round(Number(formData.endKm));

    if (isEnding) {
      onSave({
        ...activeTrip,
        endTime: new Date().toISOString(),
        endKm: cleanEndKm,
        refuelingDone: formData.refuelingDone,
        maintenanceNeeded: {
          needed: formData.maintenanceNeeded,
          description: formData.maintenanceDescription
        },
        notes: formData.notes,
        status: TripStatus.COMPLETED
      });
    } else {
      onSave({
        id: 'T' + Date.now(),
        vehicleId: formData.vehicleId,
        volunteerId: formData.volunteerId,
        driverName: driverName,
        startKm: cleanStartKm,
        destination: formData.destination,
        icon: formData.icon,
        reason: 'Servizio',
        notes: formData.notes,
        refuelingDone: formData.refuelingDone,
        startTime: new Date().toISOString(),
        status: TripStatus.ACTIVE,
        maintenanceNeeded: { needed: false, description: '' },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        {!isEnding ? (
          <>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Seleziona Mezzo</label>
              <select 
                className="w-full rounded-xl border-2 border-gray-100 p-4 bg-gray-50 font-bold text-blue-900 focus:border-blue-500 outline-none transition-all"
                value={formData.vehicleId}
                onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
                required
              >
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Autista (Volontario)</label>
              <select 
                className="w-full rounded-xl border-2 border-gray-100 p-4 bg-gray-50 font-bold text-blue-900 focus:border-blue-500 outline-none transition-all"
                value={formData.volunteerId}
                onChange={(e) => setFormData({...formData, volunteerId: e.target.value})}
                required
              >
                <option value="" disabled>Seleziona Autista</option>
                {volunteers.map(v => <option key={v.id} value={v.id}>{v.name} {v.surname}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tipo di Servizio</label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setFormData({...formData, icon: cat.icon})}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-bold text-xs transition-all ${formData.icon === cat.icon ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-blue-200'}`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">KM Iniziali</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full rounded-xl border-2 border-gray-100 p-4 font-black text-xl text-blue-900 focus:border-blue-500 outline-none"
                  value={formData.startKm}
                  onChange={(e) => setFormData({...formData, startKm: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Destinazione</label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-gray-100 p-4 font-semibold text-blue-900 focus:border-blue-500 outline-none"
                  placeholder="Località..."
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  required
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-900 p-5 rounded-2xl text-white flex justify-between items-center shadow-inner relative overflow-hidden">
               <div className="absolute right-[-10px] top-[-10px] text-6xl opacity-10">{activeTrip.icon}</div>
               <div className="relative z-10">
                  <p className="text-[9px] opacity-60 uppercase font-black">Mezzo in uso</p>
                  <p className="text-xl font-black">{activeTrip.icon} {vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</p>
               </div>
               <div className="text-right relative z-10">
                  <p className="text-[9px] opacity-60 uppercase font-black">Partenza</p>
                  <p className="text-lg font-black">{activeTrip.startKm} KM</p>
               </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block text-center">KM Registrati al Rientro</label>
              <div className="flex items-center justify-center gap-4">
                <button 
                  type="button"
                  onClick={() => adjustKm(-1)}
                  disabled={formData.endKm <= activeTrip.startKm}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all ${formData.endKm <= activeTrip.startKm ? 'bg-gray-100 text-gray-300' : 'bg-red-100 text-red-600 active:bg-red-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                  </svg>
                </button>

                <div className="relative flex-1 max-w-[150px]">
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`w-full text-center rounded-2xl border-4 p-4 text-4xl font-black focus:border-blue-500 outline-none transition-all ${isKmInvalid ? 'border-red-500 text-red-600 bg-red-50' : 'border-blue-100 text-blue-900 bg-blue-50/50'}`}
                    value={formData.endKm}
                    onChange={(e) => setFormData({...formData, endKm: Number(e.target.value)})}
                    required
                  />
                </div>

                <button 
                  type="button"
                  onClick={() => adjustKm(1)}
                  className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-md active:scale-95 active:bg-green-200 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-3 pt-2">
            <button 
                type="button"
                onClick={() => setFormData({...formData, refuelingDone: !formData.refuelingDone})}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${formData.refuelingDone ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-100'}`}
            >
                <span className="text-xs font-black uppercase text-gray-700">Rifornimento Eseguito</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${formData.refuelingDone ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-transparent'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            </button>

            {isEnding && (
              <div className="space-y-3">
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, maintenanceNeeded: !formData.maintenanceNeeded})}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${formData.maintenanceNeeded ? 'bg-red-50 border-red-400' : 'bg-gray-50 border-gray-100'}`}
                >
                    <span className="text-xs font-black uppercase text-red-600">Segnala Guasto/Anomalia</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${formData.maintenanceNeeded ? 'bg-red-500 text-white' : 'bg-gray-200 text-transparent'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                </button>
                {formData.maintenanceNeeded && (
                    <textarea 
                        className="w-full rounded-xl border-2 border-red-200 p-4 text-sm bg-red-50 focus:border-red-500 outline-none animate-in slide-in-from-top-2"
                        placeholder="Descrivi il guasto o l'anomalia riscontrata..."
                        value={formData.maintenanceDescription}
                        onChange={(e) => setFormData({...formData, maintenanceDescription: e.target.value})}
                        required
                    />
                )}
              </div>
            )}
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Note di Servizio</label>
          <textarea
            className="w-full rounded-xl border-2 border-gray-100 p-4 text-sm bg-gray-50 focus:border-blue-500 outline-none"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Eventuali segnalazioni non tecniche..."
          />
        </div>
      </div>

      {isKmInvalid && (
        <div className="bg-red-100 border-2 border-red-500 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
           <div className="bg-red-500 text-white p-1 rounded-full">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
             </svg>
           </div>
           <p className="text-red-700 text-xs font-black uppercase leading-tight">
             I KM di rientro non possono essere inferiori ai KM di partenza.
           </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isKmInvalid}
        className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl transform active:scale-95 transition-all ${isKmInvalid ? 'bg-gray-400 shadow-none cursor-not-allowed' : (isEnding ? 'bg-green-600 shadow-green-200' : 'bg-blue-600 shadow-blue-200')}`}
      >
        {isEnding ? 'COMPLETA E CHIUDI' : 'AVVIA SERVIZIO'}
      </button>
    </form>
  );
};

export default TripForm;
