// Genera i PDF del registro immersioni (Legge 70/2006), A4 orizzontale:
//  - una tabella riepilogativa in alto con tutti i campi previsti dalla
//    normativa: una riga per partecipante, con i dati comuni ripetuti
//    (struttura condivisa col CSV: vedi registroRighe.js)
//  - sotto, una griglia con l'immagine del brevetto di ciascun
//    partecipante (nome e cognome ripetuti sopra l'immagine)
//
// generaPdfRegistroUscita: una singola uscita del Post-evento
// generaPdfRegistroPreEvento: gli iscritti a un'attività futura (i campi
//   non ancora noti restano in bianco, da compilare a penna)

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formattaData } from './attivita'
import { COLONNE_REGISTRO, righeRegistro, comuniUscita, comuniPreEvento } from './registroRighe'

const MARGINE = 12
const LARGHEZZA_PAGINA = 297
const ALTEZZA_PAGINA = 210
const LARGHEZZA_UTILE = LARGHEZZA_PAGINA - 2 * MARGINE

const LARGHEZZA_IMMAGINE = 70
const ALTEZZA_IMMAGINE = 45
const PER_RIGA = 3

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
export async function caricaImmagine(url) {
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

function scriviTitolo(doc, titolo) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const righeTitolo = doc.splitTextToSize(titolo, LARGHEZZA_UTILE)
  doc.text(righeTitolo, MARGINE, MARGINE + 4)
  return MARGINE + 4 + righeTitolo.length * 8 + 4
}

function scriviIntestazioneSezione(doc, testo, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(testo, MARGINE, y)
  return y + 9
}

// Disegna la tabella riepilogativa con tutti i campi previsti dalla
// normativa: UNA RIGA PER PARTECIPANTE, con i dati comuni ripetuti su ogni
// riga. Le colonne e le righe sono quelle di registroRighe.js, le stesse
// del file CSV.
function scriviTabellaRiepilogo(doc, y, righe) {
  autoTable(doc, {
    startY: y,
    margin: { left: MARGINE, right: MARGINE },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, valign: 'top', lineColor: 190 },
    headStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: 'bold' },
    head: [COLONNE_REGISTRO.map((c) => c.etichetta)],
    body: righe.map((r) => COLONNE_REGISTRO.map((c) => r[c.chiave] || '')),
  })

  return doc.lastAutoTable.finalY + 10
}

// Disegna la griglia con l'immagine del brevetto di ogni partecipante
// (nome e cognome ripetuti sopra), passando pagina quando serve.
async function scrivigrigliaBrevetti(doc, partecipanti, y) {
  const gap = 6
  const larghezzaCella = (LARGHEZZA_UTILE - gap * (PER_RIGA - 1)) / PER_RIGA
  const altezzaCella = 7 + ALTEZZA_IMMAGINE + 6

  for (let indice = 0; indice < partecipanti.length; indice++) {
    const p = partecipanti[indice]
    const colonna = indice % PER_RIGA

    if (colonna === 0 && y + altezzaCella > ALTEZZA_PAGINA - MARGINE) {
      doc.addPage('a4', 'landscape')
      y = MARGINE
    }

    const x = MARGINE + colonna * (larghezzaCella + gap)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`${p.cognome || ''} ${p.nome || ''}`.trim(), x, y + 5)

    const immagine = await caricaImmagine(p.immagine_url)
    const yImgBox = y + 9

    if (immagine) {
      const scala = Math.min(larghezzaCella / immagine.larghezza, ALTEZZA_IMMAGINE / immagine.altezza)
      const larghezzaFinale = immagine.larghezza * scala
      const altezzaFinale = immagine.altezza * scala
      const xImg = x + (larghezzaCella - larghezzaFinale) / 2
      const yImg = yImgBox + (ALTEZZA_IMMAGINE - altezzaFinale) / 2
      doc.addImage(immagine.dataUrl, formatoDa(immagine.dataUrl), xImg, yImg, larghezzaFinale, altezzaFinale)
    } else {
      // Nessuna immagine disponibile: spazio vuoto, nessun riquadro né
      // scritta, per non appesantire la pagina.
    }

    if (colonna === PER_RIGA - 1 || indice === partecipanti.length - 1) {
      y += altezzaCella
    }
  }

  return y
}

function aggiungiPiePagina(doc) {
  const totalePagine = doc.internal.getNumberOfPages()
  for (let pagina = 1; pagina <= totalePagine; pagina++) {
    doc.setPage(pagina)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(130)
    doc.text(`Pag. ${pagina} di ${totalePagine}`, LARGHEZZA_PAGINA / 2, ALTEZZA_PAGINA - 8, { align: 'center' })
    doc.setTextColor(0)
  }
}

function nomeFileSicuro(testo) {
  return (testo || 'registro').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

// Cerca nel catalogo istruttori la didattica e il numero di brevetto per un
// nome già risolto (come quello mostrato nel registro). Se l'istruttore è
// stato scritto a mano (non in catalogo) non si trova nulla: il campo
// resta vuoto invece di bloccare l'esportazione.
export async function cercaInfoIstruttore(supabase, nomeIstruttore) {
  if (!nomeIstruttore) return null
  const { data } = await supabase
    .from('istruttori')
    .select('didattica, numero_brevetto_istruttore')
    .eq('nome', nomeIstruttore)
    .maybeSingle()
  return data || null
}

export async function generaPdfRegistroUscita(riga, partecipanti, istruttoreInfo) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  let y = scriviTitolo(doc, `${riga.localita || 'Uscita'} — ${formattaData(riga.data)}`)

  y = scriviTabellaRiepilogo(doc, y, righeRegistro(comuniUscita(riga, istruttoreInfo), partecipanti))

  y = scriviIntestazioneSezione(doc, 'Brevetti dei partecipanti', y)
  await scrivigrigliaBrevetti(doc, partecipanti, y)

  aggiungiPiePagina(doc)
  doc.save(`registro-${nomeFileSicuro(riga.localita)}-${riga.data}.pdf`)
}

export async function generaPdfRegistroPreEvento(attivita, iscritti, extra = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  let y = scriviTitolo(doc, `${attivita.nome || 'Attività'} — ${formattaData(attivita.data)}`)

  y = scriviTabellaRiepilogo(doc, y, righeRegistro(comuniPreEvento(attivita, extra), iscritti))

  y = scriviIntestazioneSezione(doc, 'Brevetti dei partecipanti', y)
  await scrivigrigliaBrevetti(doc, iscritti, y)

  aggiungiPiePagina(doc)
  doc.save(`registro-pre-evento-${nomeFileSicuro(attivita.nome)}-${attivita.data}.pdf`)
}
