import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { leggiBozza, scriviBozza, dimenticaBozza } from '../lib/useBozza'
import SelettoreCategorie from './SelettoreCategorie'
import ConfermaModal from '../components/ConfermaModal'
import './Cataloghi.css'

const VUOTO = { codice: '', utilizzi_massimi: '', attivo: true }

export default function CodiciInvito() {
  const [codici, setCodici] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null)
  const [salvataggio, setSalvataggio] = useState(false)
  const [daEliminare, setDaEliminare] = useState(null)
  const [eliminazione, setEliminazione] = useState(false)

  useEffect(() => {
    carica()
  }, [])

  useEffect(() => {
    if (form) scriviBozza(`codice-invito-${form.id || 'nuovo'}`, form)
  }, [form])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('codici_invito')
      .select('*')
      .order('creato_il', { ascending: false })
    if (fetchError) setError(fetchError.message)
    else setCodici(data || [])
    setLoading(false)
  }

  async function salva(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = {
      codice: (form.codice || '').trim(),
      utilizzi_massimi: form.utilizzi_massimi === '' ? null : Number(form.utilizzi_massimi),
      attivo: form.attivo,
    }

    const opError = form.id
      ? (await supabase.from('codici_invito').update(payload).eq('id', form.id)).error
      : (await supabase.from('codici_invito').insert(payload)).error

    setSalvataggio(false)
    if (opError) setError(opError.message)
    else {
      dimenticaBozza(`codice-invito-${form.id || 'nuovo'}`)
      setForm(null)
      carica()
    }
  }

  async function confermaElimina() {
    setEliminazione(true)
    const { error: deleteError } = await supabase.from('codici_invito').delete().eq('id', daEliminare.id)
    setEliminazione(false)
    setDaEliminare(null)
    if (deleteError) setError(deleteError.message)
    else carica()
  }

  return (
    <div className="cataloghi-page">
      <div className="catalogo-sezione-header">
        <h1>Codici invito</h1>
        <button className="btn-primary" onClick={() => setForm(leggiBozza('codice-invito-nuovo') || { ...VUOTO })}>
          + Nuovo codice
        </button>
      </div>
      <p className="categorie-sub">
        Un codice può assegnare automaticamente una o più categorie al cliente che lo usa per
        registrarsi (già confermate, senza bisogno di approvarle dopo).
      </p>

      {error && <p className="modelli-error">{error}</p>}
      {loading ? (
        <p className="modelli-hint">Caricamento…</p>
      ) : codici.length === 0 ? (
        <p className="modelli-hint">Nessun codice creato ancora.</p>
      ) : (
        <ul className="catalogo-list">
          {codici.map((c) => (
            <li key={c.id}>
              <span>
                <strong>{c.codice}</strong>
                {!c.attivo && <span className="badge badge-alert" style={{ marginLeft: '0.5rem' }}>Disattivato</span>}
                {' — '}
                {c.utilizzi_effettuati} utilizz{c.utilizzi_effettuati === 1 ? 'o' : 'i'}
                {c.utilizzi_massimi !== null && ` / ${c.utilizzi_massimi}`}
              </span>
              <span className="catalogo-azioni">
                <button className="btn-secondary" onClick={() => setForm(leggiBozza(`codice-invito-${c.id}`) || { ...c })}>
                  Modifica
                </button>
                <button className="btn-secondary btn-elimina" onClick={() => setDaEliminare(c)}>
                  Elimina
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="modale-overlay" onClick={() => setForm(null)}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Modifica codice invito' : 'Nuovo codice invito'}</h2>
            <form onSubmit={salva} className="modello-form">
              <div className="form-field">
                <label>Codice</label>
                <input
                  value={form.codice}
                  onChange={(e) => setForm((p) => ({ ...p, codice: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label>Utilizzi massimi (vuoto = illimitati)</label>
                <input
                  type="number"
                  min="1"
                  value={form.utilizzi_massimi}
                  onChange={(e) => setForm((p) => ({ ...p, utilizzi_massimi: e.target.value }))}
                />
              </div>
              <div className="form-field-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={form.attivo}
                    onChange={(e) => setForm((p) => ({ ...p, attivo: e.target.checked }))}
                  />
                  Attivo
                </label>
              </div>

              {error && <p className="modelli-error">{error}</p>}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
                  Annulla
                </button>
                <button type="submit" className="btn-primary" disabled={salvataggio}>
                  {salvataggio ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </form>

            {form.id && (
              <SelettoreCategorie
                entityId={form.id}
                joinTable="codici_invito_categorie"
                entityColumn="codice_id"
                hint="Categorie assegnate automaticamente (già confermate) a chi si registra con questo codice."
              />
            )}
          </div>
        </div>
      )}

      {daEliminare && (
        <ConfermaModal
          titolo="Eliminare questo codice invito?"
          testo={`Stai eliminando in modo irrecuperabile il codice "${daEliminare.codice}". Chi non si è ancora registrato non potrà più usarlo. Confermi?`}
          confermando={eliminazione}
          onAnnulla={() => setDaEliminare(null)}
          onConferma={confermaElimina}
        />
      )}
    </div>
  )
}
