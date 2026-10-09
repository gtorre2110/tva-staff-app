// Elenco degli iscritti a un'attività (foto, cognome, nome, telefono, email),
// per preparare il documento dei partecipanti di un corso o di un'uscita.
//
// Una riga per cliente (nessun duplicato). Due gruppi:
//  - "confermati": prenotazione confermata e non tardiva
//  - "da confermare": lista d'attesa e prenotazioni tardive (sezione separata)
// Le prenotazioni annullate non compaiono mai.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formattaData, formattaOra } from './attivita'
import { caricaImmagine } from './generaPdfRegistro'

export const COLONNE_ELENCO = [
  { chiave: 'cognome', etichetta: 'Cognome' },
  { chiave: 'nome', etichetta: 'Nome' },
  { chiave: 'telefono', etichetta: 'Telefono' },
  { chiave: 'email', etichetta: 'Email' },
  { chiave: 'stato', etichetta: 'Stato' },
  { chiave: 'foto', etichetta: 'Foto (link)' },
]

const PRIORITA = { confermato: 0, tardiva: 1, in_coda: 2 }

function statoElenco(p) {
  if (p.stato === 'in_coda') return 'in_coda'
  return p.tardiva ? 'tardiva' : 'confermato'
}

export const ETICHETTA_STATO = {
  confermato: 'Confermato',
  tardiva: 'Tardiva, da confermare',
  in_coda: 'Lista d\'attesa',
}

export async function caricaElencoIscritti(supabase, attivitaId) {
  const { data, error } = await supabase
    .from('prenotazioni')
    .select('cliente_id, stato, tardiva, clienti(nome, cognome, telefono, email, foto_url)')
    .eq('attivita_id', attivitaId)
    .in('stato', ['confermata', 'in_coda'])
  if (error) throw new Error(error.message)

  // Un solo record per cliente: se compare più volte vale lo stato migliore.
  const perCliente = new Map()
  for (const p of data || []) {
    const stato = statoElenco(p)
    const chiave = p.cliente_id || `${p.clienti?.cognome}|${p.clienti?.nome}`
    const esistente = perCliente.get(chiave)
    if (esistente && PRIORITA[esistente.stato] <= PRIORITA[stato]) continue
    perCliente.set(chiave, {
      stato,
      cognome: p.clienti?.cognome || '',
      nome: p.clienti?.nome || '',
      telefono: p.clienti?.telefono || '',
      email: p.clienti?.email || '',
      foto_url: p.clienti?.foto_url || '',
    })
  }

  const ordina = (a, b) =>
    a.cognome.localeCompare(b.cognome, 'it') || a.nome.localeCompare(b.nome, 'it')
  const tutti = [...perCliente.values()].sort(ordina)
  return {
    confermati: tutti.filter((r) => r.stato === 'confermato'),
    daConfermare: tutti.filter((r) => r.stato !== 'confermato'),
  }
}

// Righe per il CSV (e per Drive): prima i confermati, poi gli altri, con
// la colonna "Stato" a distinguerli.
export function righeElencoCsv({ confermati, daConfermare }) {
  return [...confermati, ...daConfermare].map((r) => ({
    cognome: r.cognome,
    nome: r.nome,
    telefono: r.telefono,
    email: r.email,
    stato: ETICHETTA_STATO[r.stato],
    foto: r.foto_url,
  }))
}

const MARGINE = 14
const LARGHEZZA_FOTO = 18
const ALTEZZA_RIGA = 20

function formatoDa(dataUrl) {
  const tipo = (/^data:image\/(\w+);/.exec(dataUrl || '') || [])[1]?.toLowerCase()
  return tipo === 'png' ? 'PNG' : tipo === 'webp' ? 'WEBP' : 'JPEG'
}

function inizialiDi(r) {
  return `${(r.nome || '').charAt(0)}${(r.cognome || '').charAt(0)}`.toUpperCase()
}

async function tabellaConFoto(doc, y, righe, conStato) {
  const immagini = await Promise.all(righe.map((r) => caricaImmagine(r.foto_url)))
  const head = ['Foto', 'Cognome', 'Nome', 'Telefono', 'Email', ...(conStato ? ['Stato'] : [])]
  autoTable(doc, {
    startY: y,
    margin: { left: MARGINE, right: MARGINE },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, valign: 'middle', lineColor: 190, minCellHeight: ALTEZZA_RIGA },
    headStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: 'bold', minCellHeight: 8 },
    columnStyles: { 0: { cellWidth: LARGHEZZA_FOTO + 4 } },
    head: [head],
    body: righe.map((r) => [
      '',
      r.cognome,
      r.nome,
      r.telefono || '',
      r.email || '',
      ...(conStato ? [ETICHETTA_STATO[r.stato]] : []),
    ]),
    didDrawCell: (d) => {
      if (d.section !== 'body' || d.column.index !== 0) return
      const riga = righe[d.row.index]
      const img = immagini[d.row.index]
      const box = ALTEZZA_RIGA - 4
      const x0 = d.cell.x + (d.cell.width - LARGHEZZA_FOTO) / 2
      const y0 = d.cell.y + 2
      if (img) {
        const scala = Math.min(LARGHEZZA_FOTO / img.larghezza, box / img.altezza)
        const w = img.larghezza * scala
        const h = img.altezza * scala
        doc.addImage(img.dataUrl, formatoDa(img.dataUrl), x0 + (LARGHEZZA_FOTO - w) / 2, y0 + (box - h) / 2, w, h)
      } else {
        // Nessuna foto: riquadro grigio con le iniziali.
        doc.setFillColor(230, 230, 230)
        doc.rect(x0, y0, LARGHEZZA_FOTO, box, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(120)
        doc.text(inizialiDi(riga), x0 + LARGHEZZA_FOTO / 2, y0 + box / 2 + 1.5, { align: 'center' })
        doc.setTextColor(0)
      }
    },
  })
  return doc.lastAutoTable.finalY + 8
}

function nomeFileSicuro(testo) {
  return (testo || 'attivita').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function nomeFileElenco(attivita, estensione) {
  return `iscritti-${nomeFileSicuro(attivita.nome)}-${attivita.data}.${estensione}`
}

export async function generaPdfElencoIscritti(attivita, elenco) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const larghezzaUtile = 210 - 2 * MARGINE

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  const titolo = doc.splitTextToSize(`Elenco partecipanti — ${attivita.nome || 'Attività'}`, larghezzaUtile)
  doc.text(titolo, MARGINE, 16)
  let y = 16 + titolo.length * 7

  const dettagli = [
    formattaData(attivita.data),
    attivita.ora_inizio ? `${formattaOra(attivita.ora_inizio)}–${formattaOra(attivita.ora_fine)}` : '',
    attivita.localita,
    attivita.centro_immersione,
  ].filter(Boolean).join(' · ')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(dettagli, MARGINE, y)
  y += 6
  doc.text(`Partecipanti confermati: ${elenco.confermati.length}`, MARGINE, y)
  y += 6

  if (elenco.confermati.length > 0) {
    y = await tabellaConFoto(doc, y, elenco.confermati, false)
  } else {
    doc.text('Nessun partecipante confermato.', MARGINE, y + 4)
    y += 12
  }

  if (elenco.daConfermare.length > 0) {
    if (y > 297 - 50) { doc.addPage('a4', 'portrait'); y = 16 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`Da confermare: lista d'attesa e prenotazioni tardive (${elenco.daConfermare.length})`, MARGINE, y)
    y = await tabellaConFoto(doc, y + 3, elenco.daConfermare, true)
  }

  const totale = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totale; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(130)
    doc.text(`Pag. ${p} di ${totale}`, 105, 290, { align: 'center' })
    doc.setTextColor(0)
  }
  doc.save(nomeFileElenco(attivita, 'pdf'))
}
