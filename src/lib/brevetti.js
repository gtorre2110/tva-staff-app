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
