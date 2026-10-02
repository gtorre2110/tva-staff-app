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

// Versioni generiche degli stessi controlli, usabili per qualsiasi data di
// scadenza (DAN, FIPSAS, ecc.), non solo per il certificato medico.
export function scadenzaPassata(data) {
  if (!data) return false
  const oggi = new Date().toISOString().slice(0, 10)
  return data < oggi
}

export function scadenzaInArrivo(data, giorni = 15) {
  if (!data || scadenzaPassata(data)) return false
  const soglia = new Date()
  soglia.setDate(soglia.getDate() + giorni)
  return data <= soglia.toISOString().slice(0, 10)
}

// Data di scadenza ingressi: presa dalla prima categoria confermata del
// cliente che ha una data_scadenza impostata (in pratica solo "Allenamento",
// ma non si assume il nome esatto: basta che lo staff l'abbia valorizzata
// su una categoria che il cliente ha confermata).
export async function scadenzaIngressiAllenamenti(supabase, clienteId) {
  const { data, error } = await supabase
    .from('clienti_categorie')
    .select('confermata, categorie(nome, data_scadenza)')
    .eq('cliente_id', clienteId)
    .eq('confermata', true)

  if (error || !data) return null
  const riga = data.find((r) => r.categorie?.data_scadenza)
  return riga ? riga.categorie.data_scadenza : null
}
