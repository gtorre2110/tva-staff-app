export function certificatoScaduto(cliente) {
  if (!cliente.scadenza_certificato_medico) return false
  const oggi = new Date().toISOString().slice(0, 10)
  return cliente.scadenza_certificato_medico < oggi
}

export function certificatoInScadenza(cliente, giorni = 15) {
  if (!cliente.scadenza_certificato_medico || certificatoScaduto(cliente)) return false
  const soglia = new Date()
  soglia.setDate(soglia.getDate() + giorni)
  return cliente.scadenza_certificato_medico <= soglia.toISOString().slice(0, 10)
}

export function formattaData(data) {
  if (!data) return '—'
  return new Date(data).toLocaleDateString('it-IT')
}
