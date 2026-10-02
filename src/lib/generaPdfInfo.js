// Genera un PDF "di testo" (non un'immagine) a partire da titolo + corpo
// scritto nella app staff per una pagina Info. A differenza del logbook
// (dove ogni scheda è un layout fisso), qui serve solo un documento
// scorrevole su più pagine con testo selezionabile e leggero: jsPDF con
// splitTextToSize basta, senza bisogno di html2canvas.

import jsPDF from 'jspdf'

const MARGINE_MM = 18

export function generaPdfInfo(titolo, contenuto) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const larghezzaUtile = doc.internal.pageSize.getWidth() - 2 * MARGINE_MM
  const altezzaPagina = doc.internal.pageSize.getHeight()
  let y = MARGINE_MM

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  const righeTitolo = doc.splitTextToSize(titolo || 'Senza titolo', larghezzaUtile)
  doc.text(righeTitolo, MARGINE_MM, y)
  y += righeTitolo.length * 7 + 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const paragrafi = (contenuto || '').split(/\n{2,}/)

  for (const paragrafo of paragrafi) {
    const righe = doc.splitTextToSize(paragrafo.trim(), larghezzaUtile)
    for (const riga of righe) {
      if (y > altezzaPagina - MARGINE_MM) {
        doc.addPage()
        y = MARGINE_MM
      }
      doc.text(riga, MARGINE_MM, y)
      y += 5.6
    }
    y += 4.5 // spazio tra un paragrafo e il successivo
  }

  return doc.output('blob')
}
