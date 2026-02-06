
import { Trip, Vehicle } from "../types";

// Target Spreadsheet ID: 1Gz-4UrHEJnNG8P86Ehmq0BfjT_0xs2E-CrvnwyNL7pw
export const syncTripToGoogleSheets = async (trip: Trip, vehicle: Vehicle | undefined, scriptUrl: string): Promise<boolean> => {
  if (!scriptUrl || !scriptUrl.startsWith('http')) {
    console.warn("URL Script non valido o mancante.");
    return false;
  }

  const payload = {
    spreadsheetId: '1Gz-4UrHEJnNG8P86Ehmq0BfjT_0xs2E-CrvnwyNL7pw',
    action: 'appendTrip',
    data: {
      id: trip.id,
      data: new Date(trip.startTime).toLocaleDateString('it-IT'),
      ora_inizio: new Date(trip.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      ora_fine: trip.endTime ? new Date(trip.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '',
      targa: vehicle?.plate || 'N/D',
      modello: vehicle?.model || 'N/D',
      autista: trip.driverName,
      km_inizio: trip.startKm,
      km_fine: trip.endKm || 0,
      km_percorsi: (trip.endKm || 0) - trip.startKm,
      destinazione: trip.destination,
      tipo_servizio: trip.reason,
      rifornimento: trip.refuelingDone ? 'SI' : 'NO',
      guasti: trip.maintenanceNeeded.needed ? trip.maintenanceNeeded.description : 'NESSUNO',
      note: trip.notes || ''
    }
  };

  try {
    // Utilizziamo un timeout per evitare attese infinite in caso di rete instabile
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Necessario per bypassare CORS con Google Apps Script
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    // Con no-cors non abbiamo accesso al body della risposta, assumiamo successo se fetch non lancia errori
    console.log(`Sync trip ${trip.id} inviato a Google Sheets`);
    return true;
  } catch (error) {
    console.error("Errore sincronizzazione Cloud:", error);
    return false;
  }
};
