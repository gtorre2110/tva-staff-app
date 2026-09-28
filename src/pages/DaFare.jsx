import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { formattaData } from '../lib/attivita'
import './Cataloghi.css'
import './DaFare.css'

export default function DaFare({ membro }) {
  const isAdmin = membro?.ruolo === 'amministratore'
  const isAssistente = membro?.ruolo === 'assistente_istruttore'
  const [staffInAttesa, setStaffInAttesa] = useState([])
  const [categorieRichieste, setCategorieRichieste] = useState([])
  const [logbookDaConfermare, setLogbookDaConfermare] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    setError(null)

    const queries = [
      supabase
        .from('clienti_categorie')
        .select('cliente_id, categoria_id, clienti(nome, cognome), categorie(nome)')
        .eq('confermata', false),
      supabase
        .from('logbook')
        .select('id, data, luogo, cliente_id, clienti(nome, cognome), localita_immersione(nome)')
        .eq('confermato_da_istruttore', false)
        .order('data', { ascending: false }),
    ]
    if (isAdmin) {
      queries.push(supabase.from('membri_staff').select('*').eq('attivo', false))
    }

    const risultati = await Promise.all(queries)
    const erroreTrovato = risultati.find((r) => r.error)
    if (erroreTrovato) setError(erroreTrovato.error.message)

    setCategorieRichieste(risultati[0].data || [])
    setLogbookDaConfermare(risultati[1].data || [])
    setStaffInAttesa(isAdmin ? risultati[2].data || [] : [])
    setLoading(false)
  }

  async function approvaStaff(membro) {
    const { error: updateError } = await supabase
      .from('membri_staff')
      .update({ attivo: true })
      .eq('id', membro.id)
    if (updateError) setError(updateError.message)
    else carica()
  }

  async function confermaCategoria(riga) {
    const { error: updateError } = await supabase
      .from('clienti_categorie')
      .update({ confermata: true })
      .eq('cliente_id', riga.cliente_id)
      .eq('categoria_id', riga.categoria_id)
    if (updateError) setError(updateError.message)
    else carica()
  }

  async function rifiutaCategoria(riga) {
    const { error: deleteError } = await supabase
      .from('clienti_categorie')
      .delete()
      .eq('cliente_id', riga.cliente_id)
      .eq('categoria_id', riga.categoria_id)
    if (deleteError) setError(deleteError.message)
    else carica()
  }

  async function confermaLogbook(voce) {
    const { error: updateError } = await supabase
      .from('logbook')
      .update({ confermato_da_istruttore: true })
      .eq('id', voce.id)
    if (updateError) setError(updateError.message)
    else carica()
  }

  const totale = staffInAttesa.length + categorieRichieste.length + logbookDaConfermare.length

  return (
    <div className="cataloghi-page">
      <h1>Da fare</h1>
      <p className="categorie-sub">Tutte le cose in sospeso che aspettano un'azione dello staff.</p>

      {error && <p className="modelli-error">{error}</p>}
      {loading && <p className="modelli-hint">Caricamento…</p>}
      {!loading && totale === 0 && <p className="modelli-hint">Tutto a posto, niente in sospeso. 🎉</p>}

      {!loading && staffInAttesa.length > 0 && (
        <section className="catalogo-sezione">
          <h2 className="staff-sezione-titolo">Richieste di accesso staff ({staffInAttesa.length})</h2>
          <ul className="catalogo-list">
            {staffInAttesa.map((m) => (
              <li key={m.id}>
                <span>{m.cognome} {m.nome}</span>
                <span className="catalogo-azioni">
                  <button className="btn-primary" onClick={() => approvaStaff(m)}>
                    Approva
                  </button>
                  <Link to="/staff" className="btn-secondary">
                    Vai a Staff
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && categorieRichieste.length > 0 && (
        <section className="catalogo-sezione">
          <h2 className="staff-sezione-titolo">Categorie richieste dai clienti ({categorieRichieste.length})</h2>
          <ul className="catalogo-list">
            {categorieRichieste.map((r) => (
              <li key={`${r.cliente_id}-${r.categoria_id}`}>
                <span>
                  {isAssistente ? (
                    <strong>{r.clienti?.cognome} {r.clienti?.nome}</strong>
                  ) : (
                    <Link to={`/clienti/${r.cliente_id}`}>
                      {r.clienti?.cognome} {r.clienti?.nome}
                    </Link>
                  )}
                  {' → '}
                  {r.categorie?.nome}
                </span>
                <span className="catalogo-azioni">
                  <button className="btn-primary" onClick={() => confermaCategoria(r)}>
                    Conferma
                  </button>
                  <button className="btn-secondary" onClick={() => rifiutaCategoria(r)}>
                    Rifiuta
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && logbookDaConfermare.length > 0 && (
        <section className="catalogo-sezione">
          <h2 className="staff-sezione-titolo">Logbook da confermare ({logbookDaConfermare.length})</h2>
          <ul className="catalogo-list">
            {logbookDaConfermare.map((v) => (
              <li key={v.id}>
                <span>
                  {isAssistente ? (
                    <strong>{v.clienti?.cognome} {v.clienti?.nome}</strong>
                  ) : (
                    <Link to={`/clienti/${v.cliente_id}`}>
                      {v.clienti?.cognome} {v.clienti?.nome}
                    </Link>
                  )}
                  {' — '}
                  {formattaData(v.data)}
                  {(v.localita_immersione?.nome || v.luogo) && ` · ${v.localita_immersione?.nome || v.luogo}`}
                </span>
                <span className="catalogo-azioni">
                  <button className="btn-primary" onClick={() => confermaLogbook(v)}>
                    Conferma
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
