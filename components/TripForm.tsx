
import React, { useState } from 'react';
import { Trip, TripStatus, Vehicle, Volunteer } from '../types';

interface TripFormProps {
  onSave: (trip: Partial<Trip>) => void;
  activeTrip?: Trip;
  vehicles: Vehicle[];
  volunteers: Volunteer[];
}

const TripForm: React.FC<TripFormProps> = ({ onSave, activeTrip, vehicles, volunteers }) => {
  const isEnding = !!activeTrip;
  
  const [formData, setFormData] = useState({
    vehicleId: activeTrip?.vehicleId || (vehicles[0]?.id || ''),
    volunteerId: activeTrip?.volunteerId || (volunteers[0]?.id || ''),
    startKm: activeTrip?.startKm || 0,
    endKm: activeTrip?.endKm || 0,
    destination: activeTrip?.destination || '',
    reason: activeTrip?.reason || '',
    notes: activeTrip?.notes || '',
    refuelingDone: activeTrip?.refuelingDone || false,
    maintenanceNeeded: activeTrip?.maintenanceNeeded?.needed || false,
    maintenanceDescription: activeTrip?.maintenanceNeeded?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
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
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">KM Iniziali</label>
              <input
                type="number"
                inputMode="numeric"
                className="w-full rounded-xl border-2 border-gray-100 p-4 font-black text-2xl text-blue-900 focus:border-blue-500 outline-none"
                value={formData.startKm}
                onChange={(e) => setFormData({...formData, startKm: Number(e.target.value)})}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Destinazione/Servizio</label>
              <input
                type="text"
                className="w-full rounded-xl border-2 border-gray-100 p-4 font-semibold text-blue-900 focus:border-blue-500 outline-none"
                placeholder="Es: Incendio boschivo, pattugliamento..."
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-900 p-5 rounded-2xl text-white flex justify-between items-center shadow-inner">
               <div>
                  <p className="text-[9px] opacity-60 uppercase font-black">Mezzo in uso</p>
                  <p className="text-xl font-black">{vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</p>
               </div>
               <div className="text-right">
                  <p className="text-[9px] opacity-60 uppercase font-black">Partenza</p>
                  <p className="text-lg font-black">{activeTrip.startKm} KM</p>
               </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block">KM al Rientro</label>
              <input
                type="number"
                inputMode="numeric"
                className="w-full rounded-xl border-4 border-blue-100 p-4 text-4xl font-black text-blue-900 focus:border-blue-500 outline-none"
                value={formData.endKm}
                onChange={(e) => setFormData({...formData, endKm: Number(e.target.value)})}
                min={activeTrip.startKm}
                required
              />
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

      <button
        type="submit"
        className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl transform active:scale-95 transition-all ${isEnding ? 'bg-green-600 shadow-green-200' : 'bg-blue-600 shadow-blue-200'}`}
      >
        {isEnding ? 'COMPLETA E CHIUDI' : 'AVVIA SERVIZIO'}
      </button>
    </form>
  );
};

export default TripForm;
