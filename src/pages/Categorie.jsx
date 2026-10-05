import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useBozza, leggiBozza, scriviBozza, dimenticaBozza } from '../lib/useBozza'
import { useIsAssistente } from '../lib/membroContext'
import './Categorie.css'

const VUOTO = { nome: '', categoria_padre_id: '' }

export default function Categorie() {
  const soloAggiungi = useIsAssistente()
  const [categorie, setCategorie] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nuova, setNuova, pulisciNuova] = useBozza('categoria-nuova', VUOTO)
  const [modifica, setModifica] = useState(null)
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    carica()
  }, [])

  useEffect(() => {
    if (modifica) scriviBozza(`categoria-${modifica.id}`, modifica)
  }, [modifica])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('categorie')
      .select('*')
      .order('nome', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else setCategorie(data)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nuova.nome.trim()) return

    setSalvataggio(true)
    setError(null)
    const { error: insertError } = await supabase.from('categorie').insert({
      nome: nuova.nome.trim(),
      categoria_padre_id: nuova.categoria_padre_id || null,
    })

    setSalvataggio(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      pulisciNuova()
      carica()
    }
  }

  async function salvaModifica(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('categorie')
      .update({
        nome: modifica.nome.trim(),
        categoria_padre_id: modifica.categoria_padre_id || null,
        data_scadenza: modifica.data_scadenza || null,
      })
      .eq('id', modifica.id)

    setSalvataggio(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      dimenticaBozza(`categoria-${modifica.id}`)
      setModifica(null)
      carica()
    }
  }

  function apriModifica(c) {
    setModifica(
      leggiBozza(`categoria-${c.id}`) || {
        ...c,
        categoria_padre_id: c.categoria_padre_id || '',
        data_scadenza: c.data_scadenza || '',
      }
    )
  }

  async function elimina(categoria) {
    if (!confirm(`Eliminare la categoria "${categoria.nome}"? Verrà rimossa anche da clienti e attività collegate.`)) return

    const { error: deleteError } = await supabase
      .from('categorie')
      .delete()
      .eq('id', categoria.id)

    if (deleteError) setError(deleteError.message)
    else carica()
  }

  const principali = categorie.filter((c) => !c.categoria_padre_id)
  const figlieDi = (padreId) => categorie.filter((c) => c.categoria_padre_id === padreId)
  // Opzioni per "categoria padre": solo le categorie principali, per tenere la gerarchia a due livelli
  const opzioniPadre = (idEscluso) => principali.filter((c) => c.id !== idEscluso)

  return (
    <div className="categorie-page">
      <h1>Categorie</h1>
      <p className="categorie-sub">
        Usale per limitare quali attività un cliente può vedere e prenotare (es. "Adulti",
        "Under 14"). Un'attività senza categorie resta visibile a tutti. Le sottocategorie
        servono solo per organizzarle: assegnare la categoria padre a un cliente non gli dà
        automaticamente accesso alle sottocategorie, vanno confermate separatamente.
      </p>

      <form className="categoria-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nome nuova categoria"
          value={nuova.nome}
          onChange={(e) => {
            const next = { ...nuova, nome: e.target.value }
            setNuova(next)
          }}
        />
        <select
          value={nuova.categoria_padre_id}
          onChange={(e) => setNuova({ ...nuova, categoria_padre_id: e.target.value })}
        >
          <option value="">Categoria principale</option>
          {principali.map((c) => (
            <option key={c.id} value={c.id}>
              Sottocategoria di: {c.nome}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary" disabled={salvataggio}>
          {salvataggio ? 'Aggiungo…' : '+ Aggiungi'}
        </button>
      </form>

      {error && <p className="modelli-error">{error}</p>}
      {loading && <p className="modelli-hint">Caricamento…</p>}
      {!loading && categorie.length === 0 && (
        <p className="modelli-hint">Nessuna categoria creata.</p>
      )}

      <ul className="categorie-list">
        {principali.map((c) => (
          <>
            <li key={c.id}>
              <span>
                {c.nome}
                {c.data_scadenza && (
                  <span className="field-hint"> — ingressi in scadenza il {new Date(c.data_scadenza).toLocaleDateString('it-IT')}</span>
                )}
              </span>
              {!soloAggiungi && (
                <span className="catalogo-azioni">
                  <button className="btn-secondary" onClick={() => apriModifica(c)}>
                    Modifica
                  </button>
                  <button className="btn-secondary" onClick={() => elimina(c)}>
                    Elimina
                  </button>
                </span>
              )}
            </li>
            {figlieDi(c.id).map((figlia) => (
              <li key={figlia.id} className="categorie-figlia">
                <span>↳ {figlia.nome}</span>
                {!soloAggiungi && (
                  <span className="catalogo-azioni">
                    <button className="btn-secondary" onClick={() => apriModifica(figlia)}>
                      Modifica
                    </button>
                    <button className="btn-secondary" onClick={() => elimina(figlia)}>
                      Elimina
                    </button>
                  </span>
                )}
              </li>
            ))}
          </>
        ))}
      </ul>

      {modifica && (
        <div className="modale-overlay" onClick={() => setModifica(null)}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h2>Modifica categoria</h2>
            <form onSubmit={salvaModifica} className="modello-form">
              <div className="form-field">
                <label>Nome</label>
                <input
                  value={modifica.nome}
                  onChange={(e) => setModifica((p) => ({ ...p, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label>Categoria padre</label>
                {figlieDi(modifica.id).length > 0 ? (
                  <p className="field-hint">
                    Non assegnabile: questa categoria ha già delle sottocategorie.
                  </p>
                ) : (
                  <select
                    value={modifica.categoria_padre_id || ''}
                    onChange={(e) => setModifica((p) => ({ ...p, categoria_padre_id: e.target.value }))}
                  >
                    <option value="">Categoria principale</option>
                    {opzioniPadre(modifica.id).map((c) => (
                      <option key={c.id} value={c.id}>
                        Sottocategoria di: {c.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-field">
                <label>Scadenza ingressi</label>
                <input
                  type="date"
                  value={modifica.data_scadenza || ''}
                  onChange={(e) => setModifica((p) => ({ ...p, data_scadenza: e.target.value }))}
                />
                <span className="field-hint">
                  Facoltativa. Mostrata accanto a "Ingressi disponibili" solo ai clienti con
                  questa categoria confermata (pensata per "Allenamenti").
                </span>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setModifica(null)}>
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
