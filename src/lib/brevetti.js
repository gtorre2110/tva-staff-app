// Ordina dall'ultimo ottenuto al primo (data di emissione decrescente).
// I brevetti senza data di emissione finiscono in fondo.
export function ordinaBrevetti(lista) {
  return [...lista].sort((a, b) => {
    if (!a.data_emissione && !b.data_emissione) return 0
    if (!a.data_emissione) return 1
    if (!b.data_emissione) return -1
    return a.data_emissione < b.data_emissione ? 1 : a.data_emissione > b.data_emissione ? -1 : 0
  })
}

// Tra tutti i brevetti di un cliente, sceglie quello "principale" da
// mostrare nel registro immersioni: vince sempre quello marcato dal
// cliente come riferimento; altrimenti quello col livello numerico più
// alto. Usata sia dal registro pre-evento che da quello post-evento, così
// il criterio è identico nei due documenti.
// `brevettiCliente` è un array di righe della tabella brevetti con il
// join `tipi_brevetto(tipo_brevetto, didattica, livello, immagine_url)`.
export function selezionaBrevettoPrincipale(brevettiCliente) {
  let scelto = null
  // Il cliente ha almeno un brevetto da istruttore (anche se quello
  // mostrato, perché marcato come riferimento, è un altro)?
  let haIstruttore = false

  for (const b of brevettiCliente || []) {
    const didattica = b.tipi_brevetto?.didattica || b.didattica_libera
    const tipo = b.tipi_brevetto?.tipo_brevetto || b.tipo_brevetto_libero
    if (b.tipi_brevetto?.istruttore) haIstruttore = true
    const livello = typeof b.tipi_brevetto?.livello === 'number' ? b.tipi_brevetto.livello : null
    const info = {
      livello,
      descrizione: [didattica, tipo].filter(Boolean).join(' — ') + (livello !== null ? ` (liv. ${livello})` : ''),
      immagine_url: b.immagine_url || b.tipi_brevetto?.immagine_url || null,
    }

    if (b.brevetto_riferimento) {
      scelto = { ...info, riferimento: true }
      continue
    }
    if (scelto?.riferimento) continue
    if (info.livello !== null && (!scelto || info.livello > scelto.livello)) {
      scelto = info
    }
  }

  if (!scelto) return haIstruttore ? { livello: null, descrizione: '', immagine_url: null, haIstruttore } : null
  return { ...scelto, haIstruttore }
}

// Ordine dei partecipanti nei registri: prima chi ha un brevetto da
// istruttore, poi per livello decrescente, a parità per cognome e nome.
export function ordinaPartecipanti(lista) {
  return [...lista].sort((a, b) => {
    if (!!b.haIstruttore !== !!a.haIstruttore) return b.haIstruttore ? 1 : -1
    const livelloA = a.livello ?? -Infinity
    const livelloB = b.livello ?? -Infinity
    if (livelloB !== livelloA) return livelloB - livelloA
    return `${a.cognome || ''} ${a.nome || ''}`.localeCompare(`${b.cognome || ''} ${b.nome || ''}`)
  })
}
