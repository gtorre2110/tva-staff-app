import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './CategorieClienteStato.css'

export default function CategorieClienteStato({ clienteId }) {
  const [tutte, setTutte] = useState([])
  const [collegate, setCollegate] = useState([]) // [{categoria_id, confermata}]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    carica()
  }, [clienteId])

  async function carica() {
    setLoading(true)
    setError(null)
    const [{ data: categorie, error: e1 }, { data: righe, error: e2 }] = await Promise.all([
      supabase.from('categorie').select('*').order('nome'),
      supabase.from('clienti_categorie').select('categoria_id, confermata').eq('cliente_id', clienteId),
    ])
    if (e1 || e2) setError((e1 || e2).message)
    else {
      setTutte(categorie)
      setCollegate(righe)
    }
    setLoading(false)
  }

  function statoDi(categoriaId) {
    const riga = collegate.find((c) => c.categoria_id === categoriaId)
    if (!riga) return 'neutro'
    return riga.confermata ? 'confermata' : 'richiesta'
  }

  async function assegna(categoriaId) {
    const esiste = collegate.find((c) => c.categoria_id === categoriaId)
    if (esiste) {
      return supabase
        .from('clienti_categorie')
        .update({ confermata: true })
        .eq('cliente_id', clienteId)
        .eq('categoria_id', categoriaId)
    }
    return supabase
      .from('clienti_categorie')
      .insert({ cliente_id: clienteId, categoria_id: categoriaId, confermata: true })
  }

  function rimuoviQuery(categoriaId) {
    return supabase
      .from('clienti_categorie')
      .delete()
      .eq('cliente_id', clienteId)
      .eq('categoria_id', categoriaId)
  }

  async function toggleSingola(categoriaId, stato) {
    setError(null)
    const { error: opError } = stato === 'confermata' ? await rimuoviQuery(categoriaId) : await assegna(categoriaId)
    if (opError) setError(opError.message)
    else carica()
  }

  async function conferma(categoriaId) {
    setError(null)
    const { error: opError } = await supabase
      .from('clienti_categorie')
      .update({ confermata: true })
      .eq('cliente_id', clienteId)
      .eq('categoria_id', categoriaId)
    if (opError) setError(opError.message)
    else carica()
  }

  async function rifiuta(categoriaId) {
    setError(null)
    const { error: opError } = await rimuoviQuery(categoriaId)
    if (opError) setError(opError.message)
    else carica()
  }

  // Cliccando la macrocategoria: applica lo stesso stato (assegna/rimuovi) anche a tutte le figlie
  async function toggleMacro(padre, figlie) {
    setError(null)
    const statoPadre = statoDi(padre.id)
    const tutteLeOperazioni = statoPadre === 'confermata'
      ? [rimuoviQuery(padre.id), ...figlie.map((f) => rimuoviQuery(f.id))]
      : [assegna(padre.id), ...figlie.map((f) => assegna(f.id))]

    const risultati = await Promise.all(tutteLeOperazioni)
    const erroreTrovato = risultati.find((r) => r.error)
    if (erroreTrovato) setError(erroreTrovato.error.message)
    carica()
  }

  if (loading) return null

  return (
    <div className="categorie-cliente-box">
      <h2>Categorie</h2>
      <p className="categorie-cliente-hint">
        Determinano quali attività questo cliente può vedere e prenotare. Azzurro chiaro =
        richiesta dal cliente, in attesa di conferma. Blu = confermata. Cliccando una
        macrocategoria applichi la stessa scelta anche a tutte le sue sottocategorie insieme.
      </p>

      {error && <p className="modelli-error">{error}</p>}

      {tutte.length === 0 ? (
        <p className="categorie-cliente-hint">
          Nessuna categoria creata ancora (sezione "Categorie" nel menu).
        </p>
      ) : (
        <div className="categorie-cliente-gruppi">
          {tutte
            .filter((c) => !c.categoria_padre_id)
            .map((padre) => {
              const figlie = tutte.filter((c) => c.categoria_padre_id === padre.id)
              const statoPadre = statoDi(padre.id)
              return (
                <div className="categorie-cliente-gruppo" key={padre.id}>
                  <span className={'chip-stato chip-stato-' + statoPadre}>
                    {statoPadre === 'richiesta' ? (
                      <>
                        <span className="chip-stato-nome">{padre.nome}</span>
                        <button type="button" className="chip-stato-azione" title="Conferma" onClick={() => conferma(padre.id)}>
                          ✓
                        </button>
                        <button type="button" className="chip-stato-azione" title="Rifiuta" onClick={() => rifiuta(padre.id)}>
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="chip-stato-nome chip-stato-toggle"
                        onClick={() => toggleMacro(padre, figlie)}
                      >
                        {padre.nome}
                      </button>
                    )}
                  </span>
                  {figlie.map((f) => {
                    const statoFiglia = statoDi(f.id)
                    return (
                      <span key={f.id} className={'chip-stato chip-stato-' + statoFiglia}>
                        {statoFiglia === 'richiesta' ? (
                          <>
                            <span className="chip-stato-nome">{f.nome}</span>
                            <button type="button" className="chip-stato-azione" title="Conferma" onClick={() => conferma(f.id)}>
                              ✓
                            </button>
                            <button type="button" className="chip-stato-azione" title="Rifiuta" onClick={() => rifiuta(f.id)}>
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="chip-stato-nome chip-stato-toggle"
                            onClick={() => toggleSingola(f.id, statoFiglia)}
                          >
                            {f.nome}
                          </button>
                        )}
                      </span>
                    )
                  })}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
