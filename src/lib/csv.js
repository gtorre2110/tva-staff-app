export function scaricaCSV(nomeFile, colonne, righe) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }

  const header = colonne.map((c) => escapeCsv(c.etichetta)).join(',')
  const corpo = righe.map((r) => colonne.map((c) => escapeCsv(r[c.chiave])).join(',')).join('\n')
  const csv = '\uFEFF' + header + '\n' + corpo

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
