import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ConfermaModal from '../components/ConfermaModal'
import './Categorie.css'

export default function Staff() {
  const [membri, setMembri] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [daEliminare, setDaEliminare] = useState(null)
  const [eliminazione, setEliminazione] = useState(false)

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('membri_staff')
      .select('*')
      .order('creato_il', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else setMembri(data)
    setLoading(false)
  }

  async function cambiaStato(membro, attivo) {
    const { error: updateError } = await supabase
      .from('membri_staff')
      .update({ attivo })
      .eq('id', membro.id)

    if (updateError) setError(updateError.message)
    else carica()
  }

  async function confermaElimina() {
    setEliminazione(true)
    const { error: deleteError } = await supabase
      .from('membri_staff')
      .delete()
      .eq('id', daEliminare.id)

    setEliminazione(false)
    setDaEliminare(null)

    if (deleteError) setError(deleteError.message)
    else carica()
  }

  const inAttesa = membri.filter((m) => !m.attivo)
  const attivi = membri.filter((m) => m.attivo)

  return (
    <div className="categorie-page">
      <h1>Staff</h1>
      <p className="categorie-sub">
        Gli amministratori si creano solo da database. Da qui approvi, disattivi o elimini i
        membri dello staff che si sono registrati.
      </p>

      {error && <p className="modelli-error">{error}</p>}
      {loading && <p className="modelli-hint">Caricamento…</p>}

      {!loading && inAttesa.length > 0 && (
        <>
          <h2 className="staff-sezione-titolo">In attesa di approvazione</h2>
          <ul className="categorie-list">
            {inAttesa.map((m) => (
              <li key={m.id}>
                <span>
                  {m.cognome} {m.nome}
                </span>
                <span className="catalogo-azioni">
                  <button className="btn-primary" onClick={() => cambiaStato(m, true)}>
                    Approva
                  </button>
                  <button className="btn-secondary btn-elimina" onClick={() => setDaEliminare(m)}>
                    Elimina
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {!loading && (
        <>
          <h2 className="staff-sezione-titolo">Staff attivo</h2>
          {attivi.length === 0 ? (
            <p className="modelli-hint">Nessun membro attivo.</p>
          ) : (
            <ul className="categorie-list">
              {attivi.map((m) => (
                <li key={m.id}>
                  <span>
                    {m.cognome} {m.nome}
                    <span className={'badge ' + (m.ruolo === 'amministratore' ? 'badge-ok' : 'badge-neutro')} style={{ marginLeft: '0.6rem' }}>
                      {m.ruolo}
                    </span>
                  </span>
                  {m.ruolo !== 'amministratore' && (
                    <span className="catalogo-azioni">
                      <button className="btn-secondary" onClick={() => cambiaStato(m, false)}>
                        Disattiva
                      </button>
                      <button className="btn-secondary btn-elimina" onClick={() => setDaEliminare(m)}>
                        Elimina
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {daEliminare && (
        <ConfermaModal
          titolo="Eliminare questo membro dello staff?"
          testo={`Stai eliminando in modo irrecuperabile ${daEliminare.nome} ${daEliminare.cognome} dallo staff. L'account di accesso resta ma perde ogni permesso. Confermi?`}
          confermando={eliminazione}
          onAnnulla={() => setDaEliminare(null)}
          onConferma={confermaElimina}
        />
      )}
    </div>
  )
}
