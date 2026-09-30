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

// Data di scadenza ingressi: valorizzata solo sulla categoria "Allenamenti"
// (colonna categorie.data_scadenza), mostrata solo se il cliente ha quella
// categoria confermata.
export async function scadenzaIngressiAllenamenti(supabase, clienteId) {
  const { data, error } = await supabase
    .from('clienti_categorie')
    .select('confermata, categorie(nome, data_scadenza)')
    .eq('cliente_id', clienteId)
    .eq('confermata', true)

  if (error || !data) return null
  const riga = data.find(
    (r) => r.categorie?.nome?.toUpperCase().startsWith('ALLENAMENTI') && r.categorie?.data_scadenza
  )
  return riga ? riga.categorie.data_scadenza : null
}
