// Genera i PDF del registro immersioni (Legge 70/2006), A4, con titolo e
// piè di pagina con numero progressivo:
//  - generaPdfRegistroUscita: una singola uscita del Post-evento (dati già
//    esportati in CSV + una scheda per partecipante con la sua immagine)
//  - generaPdfRegistroPreEvento: gli iscritti a un'attività, col loro
//    brevetto più alto e relativa immagine

import jsPDF from 'jspdf'
import { formattaData, formattaOra } from './attivita'

const MARGINE = 16
const LARGHEZZA_PAGINA = 210
const ALTEZZA_PAGINA = 297
const LARGHEZZA_UTILE = LARGHEZZA_PAGINA - 2 * MARGINE
const LARGHEZZA_IMMAGINE = 55
const ALTEZZA_IMMAGINE = 55

function formatoDa(dataUrl) {
  const match = /^data:image\/(\w+);/.exec(dataUrl || '')
  const tipo = (match ? match[1] : '').toLowerCase()
  if (tipo === 'png') return 'PNG'
  if (tipo === 'webp') return 'WEBP'
  return 'JPEG'
}

// Scarica l'immagine del brevetto e la converte in data URL per jsPDF.
// Se manca, è un PDF non ancora convertito o il caricamento fallisce
// (CORS, file cancellato, ecc.), restituisce null: il chiamante lascia lo
// spazio vuoto invece di bloccare l'export.
async function caricaImmagine(url) {
  if (!url || url.toLowerCase().endsWith('.pdf')) return null
  try {
    const risposta = await fetch(url)
    if (!risposta.ok) return null
    const blob = await risposta.blob()
    if (!blob.type.startsWith('image/')) return null

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    const dimensioni = await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ larghezza: img.naturalWidth, altezza: img.naturalHeight })
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })

    return dimensioni ? { dataUrl, ...dimensioni } : null
  } catch {
    return null
  }
}

function scriviCampo(doc, etichetta, valore, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const etichettaTesto = `${etichetta}: `
  doc.text(etichettaTesto, MARGINE, y)
  const larghezzaEtichetta = doc.getTextWidth(etichettaTesto)

  doc.setFont('helvetica', 'normal')
  const righe = doc.splitTextToSize(valore || '—', LARGHEZZA_UTILE - larghezzaEtichetta)
  doc.text(righe, MARGINE + larghezzaEtichetta, y)
  return y + Math.max(righe.length, 1) * 5.6 + 2.5
}

function scriviTitolo(doc, titolo) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const righeTitolo = doc.splitTextToSize(titolo, LARGHEZZA_UTILE)
  doc.text(righeTitolo, MARGINE, MARGINE)
  let y = MARGINE + righeTitolo.length * 8 + 4
  doc.setDrawColor(190)
  doc.line(MARGINE, y, LARGHEZZA_PAGINA - MARGINE, y)
  return y + 9
}

function scriviIntestazioneSezione(doc, testo, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(testo, MARGINE, y)
  return y + 9
}

// Disegna la scheda di un partecipante (immagine a sinistra — o lo spazio
// vuoto se non disponibile, per mantenere l'allineamento — nome/cognome e
// brevetto a destra), passando pagina quando non c'è più posto. Restituisce
// la nuova y.
async function scriviSchedaPartecipante(doc, p, y) {
  const altezzaBlocco = ALTEZZA_IMMAGINE + 14
  if (y + altezzaBlocco > ALTEZZA_PAGINA - MARGINE) {
    doc.addPage()
    y = MARGINE
  }

  const immagine = await caricaImmagine(p.immagine_url)

  if (immagine) {
    const scala = Math.min(LARGHEZZA_IMMAGINE / immagine.larghezza, ALTEZZA_IMMAGINE / immagine.altezza)
    const larghezzaFinale = immagine.larghezza * scala
    const altezzaFinale = immagine.altezza * scala
    const xImg = MARGINE + (LARGHEZZA_IMMAGINE - larghezzaFinale) / 2
    const yImg = y + (ALTEZZA_IMMAGINE - altezzaFinale) / 2
    doc.addImage(immagine.dataUrl, formatoDa(immagine.dataUrl), xImg, yImg, larghezzaFinale, altezzaFinale)
  }
  // Se l'immagine manca, lo spazio (LARGHEZZA_IMMAGINE × ALTEZZA_IMMAGINE)
  // resta semplicemente vuoto: nessun riquadro, nessuna scritta, così
  // l'allineamento con le schede vicine non cambia.

  const xTesto = MARGINE + LARGHEZZA_IMMAGINE + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`${p.cognome} ${p.nome}`, xTesto, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const righeBrevetto = doc.splitTextToSize(
    p.brevetto_descrizione || 'Nessun brevetto registrato',
    LARGHEZZA_UTILE - LARGHEZZA_IMMAGINE - 8
  )
  doc.text(righeBrevetto, xTesto, y + 15)

  return y + altezzaBlocco
}

function aggiungiPiePagina(doc) {
  const totalePagine = doc.internal.getNumberOfPages()
  for (let pagina = 1; pagina <= totalePagine; pagina++) {
    doc.setPage(pagina)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(130)
    doc.text(`Pag. ${pagina} di ${totalePagine}`, LARGHEZZA_PAGINA / 2, ALTEZZA_PAGINA - 10, { align: 'center' })
    doc.setTextColor(0)
  }
}

function nomeFileSicuro(testo) {
  return (testo || 'registro').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export async function generaPdfRegistroUscita(riga, partecipanti) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  let y = scriviTitolo(doc, `${riga.localita || 'Uscita'} — ${formattaData(riga.data)}`)

  y = scriviCampo(doc, 'Orario', `${formattaOra(riga.ora_inizio)} – ${formattaOra(riga.ora_fine)}`, y)
  y = scriviCampo(doc, 'Centro di immersione', riga.centro_immersione, y)
  y = scriviCampo(doc, 'Istruttore', riga.istruttore, y)
  y = scriviCampo(doc, 'Partecipanti', riga.partecipanti, y)
  y = scriviCampo(doc, 'Brevetti', riga.brevetti, y)
  y = scriviCampo(
    doc,
    'Profondità massima raggiunta',
    riga.profondita_massima_raggiunta ? `${riga.profondita_massima_raggiunta} m` : null,
    y
  )
  y = scriviCampo(doc, 'Autorespiratore/i', riga.autorespiratori, y)
  y = scriviCampo(doc, 'Miscela/e', riga.miscele, y)

  y += 5
  doc.setDrawColor(190)
  doc.line(MARGINE, y, LARGHEZZA_PAGINA - MARGINE, y)
  y += 10
  y = scriviIntestazioneSezione(doc, 'Partecipanti e brevetti', y)

  for (const p of partecipanti) {
    y = await scriviSchedaPartecipante(doc, p, y)
  }

  aggiungiPiePagina(doc)
  doc.save(`registro-${nomeFileSicuro(riga.localita)}-${riga.data}.pdf`)
}

export async function generaPdfRegistroPreEvento(attivita, iscritti) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  let y = scriviTitolo(doc, `${attivita.nome || 'Attività'} — ${formattaData(attivita.data)}`)

  y = scriviCampo(doc, 'Orario', formattaOra(attivita.ora_inizio), y)
  y = scriviCampo(doc, 'Iscritti confermati', String(iscritti.length), y)

  y += 5
  doc.setDrawColor(190)
  doc.line(MARGINE, y, LARGHEZZA_PAGINA - MARGINE, y)
  y += 10
  y = scriviIntestazioneSezione(doc, 'Partecipanti e brevetti', y)

  for (const p of iscritti) {
    y = await scriviSchedaPartecipante(doc, p, y)
  }

  aggiungiPiePagina(doc)
  doc.save(`registro-pre-evento-${nomeFileSicuro(attivita.nome)}-${attivita.data}.pdf`)
}
