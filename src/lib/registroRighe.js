import { formattaData, formattaOra } from './attivita'

// Struttura UNICA dei registri immersioni (pre e post evento), usata sia dal
// PDF sia dal CSV (e dall'esportazione su Drive), così i documenti sono
// sempre congruenti: una riga per partecipante, con i dati comuni
// (data, orari, località, centro, istruttore, profondità, autorespiratori,
// miscele) ripetuti su ogni riga.

export const COLONNE_REGISTRO = [
  { chiave: 'data', etichetta: 'Data' },
  { chiave: 'ora_inizio', etichetta: 'Orario inizio' },
  { chiave: 'ora_fine', etichetta: 'Orario fine' },
  { chiave: 'localita', etichetta: 'Località' },
  { chiave: 'centro', etichetta: 'Centro di immersione' },
  { chiave: 'istruttore', etichetta: 'Istruttore' },
  { chiave: 'istruttore_info', etichetta: 'Istruttore (didattica — n. brevetto)' },
  { chiave: 'partecipante', etichetta: 'Partecipante' },
  { chiave: 'brevetto', etichetta: 'Brevetto' },
  { chiave: 'profondita', etichetta: 'Profondità massima (m)' },
  { chiave: 'autorespiratori', etichetta: 'Autorespiratore/i' },
  { chiave: 'miscele', etichetta: 'Miscela/e' },
]

// `comuni` ha le chiavi dei campi comuni (data, ora_inizio, ora_fine,
// localita, centro, istruttore, istruttore_info, profondita,
// autorespiratori, miscele), già formattate come testo.
// `partecipanti` è l'elenco già ordinato: { cognome, nome, brevetto_descrizione }.
// Senza partecipanti restituisce comunque una riga con i dati comuni.
export function righeRegistro(comuni, partecipanti) {
  const base = {}
  for (const c of COLONNE_REGISTRO) base[c.chiave] = comuni[c.chiave] ?? ''

  if (!partecipanti || partecipanti.length === 0) {
    return [{ ...base, partecipante: '', brevetto: '' }]
  }
  return partecipanti.map((p) => ({
    ...base,
    partecipante: `${p.cognome || ''} ${p.nome || ''}`.trim(),
    brevetto: p.brevetto_descrizione || '—',
  }))
}

// Testo "didattica — n. brevetto" dell'istruttore (campo vuoto se non noto).
export function testoInfoIstruttore(info) {
  if (!info) return ''
  return [info.didattica, info.numero_brevetto_istruttore ? `n. ${info.numero_brevetto_istruttore}` : null]
    .filter(Boolean)
    .join(' — ')
}

// Dati comuni di una riga del registro post-evento (voce dalla vista
// registro_immersioni) o di un'attività del pre-evento. Usati identici da
// PDF e CSV.
export function comuniUscita(riga, istruttoreInfo) {
  return {
    data: formattaData(riga.data),
    ora_inizio: formattaOra(riga.ora_inizio),
    ora_fine: formattaOra(riga.ora_fine),
    localita: riga.localita || '',
    centro: riga.centro_immersione || '',
    istruttore: riga.istruttore || '',
    istruttore_info: testoInfoIstruttore(istruttoreInfo),
    profondita: riga.profondita_massima_raggiunta ? `${riga.profondita_massima_raggiunta}` : '',
    autorespiratori: riga.autorespiratori || '',
    miscele: riga.miscele || '',
  }
}

export function comuniPreEvento(attivita, extra = {}) {
  return {
    data: formattaData(attivita.data),
    ora_inizio: formattaOra(attivita.ora_inizio),
    ora_fine: attivita.ora_fine ? formattaOra(attivita.ora_fine) : '',
    localita: extra.localita || '',
    centro: extra.centro || '',
  }
}
