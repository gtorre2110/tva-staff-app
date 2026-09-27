// Ordina per didattica (alfabetico) e poi per livello crescente.
// I brevetti senza livello numerico (testo libero) finiscono in fondo al proprio gruppo didattica.
export function ordinaBrevetti(lista) {
  return [...lista].sort((a, b) => {
    const didA = (a.tipi_brevetto?.didattica || a.didattica_libera || '').toUpperCase()
    const didB = (b.tipi_brevetto?.didattica || b.didattica_libera || '').toUpperCase()
    if (didA !== didB) return didA.localeCompare(didB)

    const livA = a.tipi_brevetto?.livello
    const livB = b.tipi_brevetto?.livello
    if (livA == null && livB == null) return 0
    if (livA == null) return 1
    if (livB == null) return -1
    return livA - livB
  })
}
