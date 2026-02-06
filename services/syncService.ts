
import { Trip, Vehicle } from "../types";

// Target Spreadsheet ID: 1Gz-4UrHEJnNG8P86Ehmq0BfjT_0xs2E-CrvnwyNL7pw

/**
 * Genera una stringa CSV dai viaggi forniti.
 * Usa il punto e virgola come separatore per compatibilità Excel IT.
 */
export const generateTripsCSV = (trips: Trip[], vehicles: Vehicle[]): string => {
  const headers = [
    "ID", "Data", "Ora Inizio", "Ora Fine", "Targa", "Modello", 
    "Autista", "KM Inizio", "KM Fine", "KM Percorsi", "Destinazione", 
    "Servizio", "Rifornimento", "Guasti", "Note"
  ];

  const rows = trips.map(trip => {
    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    const kmPercorsi = (trip.endKm || 0) - trip.startKm;
    
    const data = [
      trip.id,
      new Date(trip.startTime).toLocaleDateString('it-IT'),
      new Date(trip.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      trip.endTime ? new Date(trip.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '',
      vehicle?.plate || 'N/D',
      vehicle?.model || 'N/D',
      `"${trip.driverName.replace(/"/g, '""')}"`,
      trip.startKm,
      trip.endKm || '',
      kmPercorsi > 0 ? kmPercorsi : 0,
      `"${trip.destination.replace(/"/g, '""')}"`,
      `"${trip.reason.replace(/"/g, '""')}"`,
      trip.refuelingDone ? 'SI' : 'NO',
      trip.maintenanceNeeded.needed ? `"${trip.maintenanceNeeded.description.replace(/"/g, '""')}"` : 'NO',
      `"${(trip.notes || '').replace(/"/g, '""')}"`
    ];
    return data.join(';');
  });

  return [headers.join(';'), ...rows].join('\n');
};

/**
 * Invia un singolo viaggio al Google Sheets tramite Apps Script.
 */
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
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error("Errore sincronizzazione Cloud:", error);
    return false;
  }
};

/**
 * Invia l'intero CSV al cloud per un backup massivo.
 */
export const uploadCSVToCloud = async (csvContent: string, scriptUrl: string): Promise<boolean> => {
  if (!scriptUrl) return false;

  const payload = {
    spreadsheetId: '1Gz-4UrHEJnNG8P86Ehmq0BfjT_0xs2E-CrvnwyNL7pw',
    action: 'uploadCSV',
    csvData: csvContent,
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error("Errore upload CSV:", error);
    return false;
  }
};
