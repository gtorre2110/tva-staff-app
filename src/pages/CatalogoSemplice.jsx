import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { leggiBozza, scriviBozza, dimenticaBozza } from '../lib/useBozza'

/**
 * Gestione generica di un catalogo semplice: elenco + aggiungi/modifica/elimina,
 * per qualsiasi tabella con un insieme di campi testuali. Pensato per essere
 * riusato per nuovi cataloghi futuri senza scrivere una pagina da zero ogni volta.
 *
 * props:
 *  - tabella: nome della tabella Supabase
 *  - campi: [{ chiave, etichetta, obbligatorio }]
 *  - ordinaPer: colonna per l'ordinamento
 *  - formatoRiga(item): testo da mostrare nell'elenco per una riga
 *  - messaggioElimina(item): testo di conferma per l'eliminazione
 */
export default function CatalogoSemplice({ tabella, campi, ordinaPer, formatoRiga, messaggioElimina, soloAggiungi }) {
  const [righe, setRighe] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null)
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    carica()
  }, [tabella])

  useEffect(() => {
    if (form) scriviBozza(`${tabella}-${form.id || 'nuovo'}`, form)
  }, [form])

  function vuoto() {
    return Object.fromEntries(campi.map((c) => [c.chiave, '']))
  }

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase.from(tabella).select('*').order(ordinaPer)
    if (fetchError) setError(fetchError.message)
    else setRighe(data || [])
    setLoading(false)
  }

  async function salva(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = Object.fromEntries(
      campi.map((c) => [c.chiave, (form[c.chiave] || '').trim() || null])
    )

    const opError = form.id
      ? (await supabase.from(tabella).update(payload).eq('id', form.id)).error
      : (await supabase.from(tabella).insert(payload)).error

    setSalvataggio(false)

    if (opError) setError(opError.message)
    else {
      dimenticaBozza(`${tabella}-${form.id || 'nuovo'}`)
      setForm(null)
      carica()
    }
  }

  async function elimina(riga) {
    if (!confirm(messaggioElimina ? messaggioElimina(riga) : 'Eliminare questo elemento?')) return
    const { error: deleteError } = await supabase.from(tabella).delete().eq('id', riga.id)
    if (deleteError) setError(deleteError.message)
    else carica()
  }

  return (
    <div>
      <div className="catalogo-sezione-header">
        <div />
        <button className="btn-primary" onClick={() => setForm(leggiBozza(`${tabella}-nuovo`) || vuoto())}>
          + Aggiungi
        </button>
      </div>

      {error && <p className="modelli-error">{error}</p>}

      {loading ? (
        <p className="modelli-hint">Caricamento…</p>
      ) : righe.length === 0 ? (
        <p className="modelli-hint">Nessun elemento ancora.</p>
      ) : (
        <ul className="catalogo-list">
          {righe.map((r) => (
            <li key={r.id}>
              <span>{formatoRiga ? formatoRiga(r) : r[campi[0].chiave]}</span>
              {!soloAggiungi && (
                <span className="catalogo-azioni">
                  <button
                    className="btn-secondary"
                    onClick={() => setForm(leggiBozza(`${tabella}-${r.id}`) || { ...r })}
                  >
                    Modifica
                  </button>
                  <button className="btn-secondary" onClick={() => elimina(r)}>
                    Elimina
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="modale-overlay" onClick={() => setForm(null)}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Modifica' : 'Nuovo elemento'}</h2>
            <form onSubmit={salva} className="modello-form">
              {campi.map((c) => (
                <div className="form-field" key={c.chiave}>
                  <label>{c.etichetta}</label>
                  <input
                    value={form[c.chiave] || ''}
                    onChange={(e) => setForm((p) => ({ ...p, [c.chiave]: e.target.value }))}
                    required={c.obbligatorio}
                  />
                </div>
              ))}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
                  Annulla
                </button>
                <button type="submit" className="btn-primary" disabled={salvataggio}>
                  {salvataggio ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
