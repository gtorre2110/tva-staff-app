import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './CategorieCliente.css'

/**
 * Selettore a chip per collegare categorie a un'entità tramite una tabella ponte
 * molti-a-molti (clienti_categorie, attivita_modello_categorie, attivita_categorie).
 *
 * soloAggiungi (assistente istruttore): le categorie già collegate non si
 * possono togliere. Lo stesso divieto è applicato nel database (migrazione
 * 20261020_assistente_categorie_attivita_solo_aggiungi.sql): togliere tutte
 * le categorie renderebbe l'attività visibile e prenotabile da tutti i clienti.
 */
export default function SelettoreCategorie({ entityId, joinTable, entityColumn, titolo, hint, soloAggiungi = false }) {
  const [tutte, setTutte] = useState([])
  const [assegnate, setAssegnate] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    carica()
  }, [entityId, joinTable])

  async function carica() {
    setLoading(true)
    setError(null)

    const [{ data: categorie, error: errCategorie }, { data: collegate, error: errCollegate }] =
      await Promise.all([
        supabase.from('categorie').select('*').order('nome'),
        supabase.from(joinTable).select('categoria_id').eq(entityColumn, entityId),
      ])

    if (errCategorie || errCollegate) {
      setError((errCategorie || errCollegate).message)
    } else {
      setTutte(categorie)
      setAssegnate(new Set(collegate.map((c) => c.categoria_id)))
    }
    setLoading(false)
  }

  async function toggle(categoriaId) {
    const attiva = assegnate.has(categoriaId)
    if (attiva && soloAggiungi) return
    setError(null)

    const opError = attiva
      ? (
          await supabase
            .from(joinTable)
            .delete()
            .eq(entityColumn, entityId)
            .eq('categoria_id', categoriaId)
        ).error
      : (
          await supabase
            .from(joinTable)
            .insert({ [entityColumn]: entityId, categoria_id: categoriaId })
        ).error

    if (opError) {
      setError(opError.message)
      return
    }

    setAssegnate((prev) => {
      const next = new Set(prev)
      attiva ? next.delete(categoriaId) : next.add(categoriaId)
      return next
    })
  }

  if (loading) return null

  return (
    <div className="categorie-cliente-box">
      <h2>{titolo || 'Categorie'}</h2>
      {hint && <p className="categorie-cliente-hint">{hint}</p>}
      {soloAggiungi && (
        <p className="categorie-cliente-hint">
          Puoi aggiungere categorie ma non toglierle: per una correzione rivolgiti a uno staff o a un
          amministratore.
        </p>
      )}

      {error && <p className="modelli-error">{error}</p>}

      {tutte.length === 0 ? (
        <p className="categorie-cliente-hint">
          Nessuna categoria creata ancora (sezione "Categorie" nel menu).
        </p>
      ) : (
        <div className="categorie-cliente-chips">
          {tutte.map((c) => (
            <button
              key={c.id}
              type="button"
              className={'chip' + (assegnate.has(c.id) ? ' chip-attivo' : '')}
              disabled={soloAggiungi && assegnate.has(c.id)}
              onClick={() => toggle(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
