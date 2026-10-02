// Genera il PDF di una singola uscita del registro immersioni
// (Post-evento, Legge 70/2006): prima parte con gli stessi dati già
// esportati in CSV, poi una scheda per partecipante con nome, cognome e
// immagine del suo brevetto. Formato A4, titolo con località e data,
// piè di pagina con numero progressivo.

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
// Se manca, è un PDF (non un'immagine) o il caricamento fallisce (CORS,
// file cancellato, ecc.), restituisce null: il chiamante mostra un
// riquadro "Immagine non disponibile" invece di bloccare l'export.
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

export async function generaPdfRegistroUscita(riga, partecipanti) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  let y = MARGINE

  const titolo = `${riga.localita || 'Uscita'} — ${formattaData(riga.data)}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const righeTitolo = doc.splitTextToSize(titolo, LARGHEZZA_UTILE)
  doc.text(righeTitolo, MARGINE, y)
  y += righeTitolo.length * 8 + 4

  doc.setDrawColor(190)
  doc.line(MARGINE, y, LARGHEZZA_PAGINA - MARGINE, y)
  y += 9

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

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Partecipanti e brevetti', MARGINE, y)
  y += 9

  for (const p of partecipanti) {
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
    } else {
      doc.setDrawColor(210)
      doc.rect(MARGINE, y, LARGHEZZA_IMMAGINE, ALTEZZA_IMMAGINE)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(140)
      doc.text('Immagine non disponibile', MARGINE + LARGHEZZA_IMMAGINE / 2, y + ALTEZZA_IMMAGINE / 2, {
        align: 'center',
        maxWidth: LARGHEZZA_IMMAGINE - 6,
      })
      doc.setTextColor(0)
    }

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

    y += altezzaBlocco
  }

  const totalePagine = doc.internal.getNumberOfPages()
  for (let pagina = 1; pagina <= totalePagine; pagina++) {
    doc.setPage(pagina)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(130)
    doc.text(`Pag. ${pagina} di ${totalePagine}`, LARGHEZZA_PAGINA / 2, ALTEZZA_PAGINA - 10, { align: 'center' })
    doc.setTextColor(0)
  }

  const nomeFile = `registro-${(riga.localita || 'uscita').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${riga.data}.pdf`
  doc.save(nomeFile)
}
