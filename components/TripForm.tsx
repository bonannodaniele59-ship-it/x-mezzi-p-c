
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
    icon: activeTrip?.icon || '📍',
    notes: activeTrip?.notes || '',
    refuelingDone: activeTrip?.refuelingDone || false,
    maintenanceNeeded: activeTrip?.maintenanceNeeded?.needed || false,
    maintenanceDescription: activeTrip?.maintenanceNeeded?.description || '',
  });

  const isKmInvalid = isEnding && formData.endKm < (activeTrip?.startKm || 0);

  const adjustKm = (amount: number) => {
    setFormData(prev => ({ ...prev, endKm: Math.max(0, prev.endKm + amount) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isKmInvalid) return;

    const selectedVolunteer = volunteers.find(v => v.id === formData.volunteerId);
    const driverName = selectedVolunteer ? `${selectedVolunteer.name} ${selectedVolunteer.surname}` : 'Sconosciuto';

    if (isEnding) {
      onSave({
        ...activeTrip,
        endTime: new Date().toISOString(),
        endKm: Math.round(formData.endKm),
        refuelingDone: formData.refuelingDone,
        maintenanceNeeded: { needed: formData.maintenanceNeeded, description: formData.maintenanceDescription },
        status: TripStatus.COMPLETED
      });
    } else {
      onSave({
        id: 'T' + Date.now(),
        vehicleId: formData.vehicleId,
        volunteerId: formData.volunteerId,
        driverName: driverName,
        startKm: Math.round(formData.startKm),
        destination: formData.destination,
        icon: formData.icon,
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
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Mezzo</label>
              <select className="w-full rounded-xl border-2 border-gray-50 p-4 font-bold text-blue-900" value={formData.vehicleId} onChange={(e) => setFormData({...formData, vehicleId: e.target.value})} required>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Autista</label>
              <select className="w-full rounded-xl border-2 border-gray-50 p-4 font-bold text-blue-900" value={formData.volunteerId} onChange={(e) => setFormData({...formData, volunteerId: e.target.value})} required>
                <option value="" disabled>Seleziona Autista</option>
                {volunteers.map(v => <option key={v.id} value={v.id}>{v.name} {v.surname}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tipo di Servizio</label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button key={cat.label} type="button" onClick={() => setFormData({...formData, icon: cat.icon})} className={`flex items-center gap-1 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${formData.icon === cat.icon ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">KM Iniziali</label>
                <input type="number" className="w-full rounded-xl border-2 border-gray-50 p-4 font-black" value={formData.startKm} onChange={(e) => setFormData({...formData, startKm: Number(e.target.value)})} required />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Destinazione</label>
                <input type="text" className="w-full rounded-xl border-2 border-gray-50 p-4 font-bold" value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} required />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-900 p-5 rounded-2xl text-white flex justify-between items-center relative overflow-hidden">
               <div className="absolute right-[-10px] top-[-10px] text-6xl opacity-10">{activeTrip.icon}</div>
               <div className="relative z-10">
                  <p className="text-[9px] opacity-60 uppercase font-black">Mezzo</p>
                  <p className="text-xl font-black">{activeTrip.icon} {vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</p>
               </div>
               <div className="text-right z-10">
                  <p className="text-[9px] opacity-60 uppercase font-black">Partenza</p>
                  <p className="text-lg font-black">{activeTrip.startKm} KM</p>
               </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block text-center">KM al Rientro</label>
              <div className="flex items-center justify-center gap-4">
                <button type="button" onClick={() => adjustKm(-1)} disabled={formData.endKm <= activeTrip.startKm} className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center disabled:opacity-30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                </button>
                <input type="number" className={`w-32 text-center rounded-2xl border-4 p-4 text-4xl font-black ${isKmInvalid ? 'border-red-500 text-red-600 bg-red-50' : 'border-blue-100 text-blue-900'}`} value={formData.endKm} onChange={(e) => setFormData({...formData, endKm: Number(e.target.value)})} required />
                <button type="button" onClick={() => adjustKm(1)} className="w-14 h-14 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>
          </>
        )}
        <button type="submit" disabled={isKmInvalid} className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl transition-all ${isKmInvalid ? 'bg-gray-400' : (isEnding ? 'bg-green-600' : 'bg-blue-600')}`}>
          {isEnding ? 'COMPLETA' : 'AVVIA'}
        </button>
      </div>
    </form>
  );
};

export default TripForm;
