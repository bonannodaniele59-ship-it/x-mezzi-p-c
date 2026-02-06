
import { Trip, Vehicle } from "../types";

// L'URL deve essere quello del Web App pubblicato da Google Apps Script
// che punta al foglio 1Gz-4UrHEJnNG8P86Ehmq0BfjT_0xs2E-CrvnwyNL7pw
export const syncTripToGoogleSheets = async (trip: Trip, vehicle: Vehicle | undefined, scriptUrl: string): Promise<boolean> => {
  if (!scriptUrl) return false;

  const payload = {
    spreadsheetId: '1Gz-4UrHEJnNG8P86Ehmq0BfjT_0xs2E-CrvnwyNL7pw',
    data: {
      id: trip.id,
      data: new Date(trip.startTime).toLocaleDateString(),
      ora_inizio: new Date(trip.startTime).toLocaleTimeString(),
      ora_fine: trip.endTime ? new Date(trip.endTime).toLocaleTimeString() : '',
      targa: vehicle?.plate || 'N/D',
      modello: vehicle?.model || 'N/D',
      autista: trip.driverName,
      km_inizio: trip.startKm,
      km_fine: trip.endKm || 0,
      km_percorsi: (trip.endKm || 0) - trip.startKm,
      destinazione: trip.destination,
      tipo_servizio: trip.reason,
      rifornimento: trip.refuelingDone ? 'SI' : 'NO',
      guasti: trip.maintenanceNeeded.needed ? trip.maintenanceNeeded.description : 'NO',
      note: trip.notes
    }
  };

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Spesso necessario per Apps Script se non si gestisce CORS lato server
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    // Con no-cors non possiamo leggere la risposta, ma assumiamo successo se non ci sono eccezioni
    return true;
  } catch (error) {
    console.error("Sync error:", error);
    return false;
  }
};
