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
