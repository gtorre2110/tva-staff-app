export const GIORNI_SETTIMANA = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
]

export function formattaData(data) {
  if (!data) return '—'
  return new Date(data).toLocaleDateString('it-IT')
}

export function formattaOra(ora) {
  if (!ora) return '—'
  return ora.slice(0, 5)
}

export function formattaDataOra(valore) {
  if (!valore) return '—'
  return new Date(valore).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// I campi <input type="datetime-local"> danno un orario "da orologio" senza
// fuso (es. 2026-10-10T10:00). Salvato così, Postgres lo legge come UTC e
// l'app lo rimostra spostato di 1-2 ore: lo convertiamo in un istante vero
// (interpretato nel fuso del browser) prima di salvarlo...
export function inputLocaleAIso(valore) {
  if (!valore) return null
  return new Date(valore).toISOString()
}

// ...e facciamo l'operazione inversa quando lo rimettiamo in un form.
export function isoAInputLocale(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
