import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { GIORNI_SETTIMANA, formattaOra, formattaData } from '../lib/attivita'
import { leggiBozza, scriviBozza, dimenticaBozza } from '../lib/useBozza'
import SelettoreCategorie from './SelettoreCategorie'
import './Modelli.css'

const VUOTO = {
  nome: '',
  giorno_settimana: 1,
  ora_inizio: '',
  ora_fine: '',
  posti_massimi: 10,
  anticipo_apertura_ore: 168,
  anticipo_chiusura_ore: 1,
  data_inizio_validita: '',
  data_fine_validita: '',
  attivo: true,
}

export default function Modelli() {
  const [modelli, setModelli] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [form, setForm] = useState(null) // null = form chiuso, oggetto = form aperto (nuovo o modifica)
  const [salvataggio, setSalvataggio] = useState(false)

  const [generazione, setGenerazione] = useState(null) // { modelloId, dataInizio, dataFine }
  const [generazioneStato, setGenerazioneStato] = useState(null) // { loading, messaggio, errore }
  const [sincronizzando, setSincronizzando] = useState(false)
  const [sincronizzaEsito, setSincronizzaEsito] = useState(null)

  useEffect(() => {
    caricaModelli()
  }, [])

  async function caricaModelli() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('attivita_modello')
      .select('*')
      .order('giorno_settimana', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else setModelli(data)
    setLoading(false)
  }

  function apriNuovo() {
    setForm(leggiBozza('modello-nuovo') || { ...VUOTO })
    setSincronizzaEsito(null)
  }

  function apriModifica(modello) {
    setForm(leggiBozza(`modello-${modello.id}`) || { ...modello })
    setSincronizzaEsito(null)
  }

  function aggiorna(campo, valore) {
    setForm((prev) => {
      const next = { ...prev, [campo]: valore }
      scriviBozza(`modello-${next.id || 'nuovo'}`, next)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = {
      nome: (form.nome || '').trim(),
      giorno_settimana: Number(form.giorno_settimana),
      ora_inizio: form.ora_inizio,
      ora_fine: form.ora_fine,
      posti_massimi: Number(form.posti_massimi),
      anticipo_apertura_ore: Number(form.anticipo_apertura_ore),
      anticipo_chiusura_ore: Number(form.anticipo_chiusura_ore),
      data_inizio_validita: form.data_inizio_validita || null,
      data_fine_validita: form.data_fine_validita || null,
      attivo: form.attivo,
    }

    const opError = form.id
      ? (await supabase.from('attivita_modello').update(payload).eq('id', form.id)).error
      : (await supabase.from('attivita_modello').insert(payload)).error

    setSalvataggio(false)

    if (opError) {
      setError(opError.message)
    } else {
      dimenticaBozza(`modello-${form.id || 'nuovo'}`)
      setForm(null)
      caricaModelli()
    }
  }

  async function sincronizzaCategorie(modelloId) {
    setSincronizzando(true)
    setSincronizzaEsito(null)

    const { error: rpcError } = await supabase.rpc('sincronizza_categorie_modello', {
      p_modello_id: modelloId,
    })

    setSincronizzando(false)

    if (rpcError) setError(rpcError.message)
    else setSincronizzaEsito('Fatto: categorie applicate alle occorrenze future.')
  }

  function apriGenerazione(modelloId) {
    setGenerazione({ modelloId, dataInizio: '', dataFine: '' })
    setGenerazioneStato(null)
  }

  async function handleGenera(e) {
    e.preventDefault()
    setGenerazioneStato({ loading: true })

    const { data, error: rpcError } = await supabase.rpc('genera_occorrenze', {
      p_modello_id: generazione.modelloId,
      p_data_inizio: generazione.dataInizio,
      p_data_fine: generazione.dataFine,
    })

    if (rpcError) {
      setGenerazioneStato({ loading: false, errore: rpcError.message })
    } else {
      setGenerazioneStato({
        loading: false,
        messaggio: `${data.length} occorrenze generate.`,
      })
    }
  }

  return (
    <div className="modelli-page">
      <div className="modelli-header">
        <h1>Modelli attività</h1>
        <button className="btn-primary" onClick={apriNuovo}>
          + Nuovo modello
        </button>
      </div>
      <p className="modelli-sub">
        Le attività ricorrenti (stesso giorno ogni settimana). Da qui generi poi le
        occorrenze concrete su un intervallo di date.
      </p>

      {error && <p className="modelli-error">Errore: {error}</p>}
      {loading && <p className="modelli-hint">Caricamento…</p>}

      <div className="modelli-list">
        {modelli.map((m) => (
          <div className="modello-card" key={m.id}>
            <div className="modello-card-top">
              <div>
                <h2>{m.nome}</h2>
                <p className="modello-card-sub">
                  {GIORNI_SETTIMANA[m.giorno_settimana]} · {formattaOra(m.ora_inizio)}–
                  {formattaOra(m.ora_fine)} · {m.posti_massimi} posti
                </p>
              </div>
              {!m.attivo && <span className="badge badge-alert">Non attivo</span>}
            </div>

            <p className="modello-card-validita">
              Valido: {formattaData(m.data_inizio_validita)} → {formattaData(m.data_fine_validita)}
            </p>

            <div className="modello-card-actions">
              <button className="btn-secondary" onClick={() => apriModifica(m)}>
                Modifica
              </button>
              <button className="btn-secondary" onClick={() => apriGenerazione(m.id)}>
                Genera occorrenze
              </button>
            </div>

            {generazione?.modelloId === m.id && (
              <form className="genera-form" onSubmit={handleGenera}>
                <div className="genera-form-row">
                  <label>
                    Dal
                    <input
                      type="date"
                      required
                      value={generazione.dataInizio}
                      onChange={(e) =>
                        setGenerazione((prev) => ({ ...prev, dataInizio: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Al
                    <input
                      type="date"
                      required
                      value={generazione.dataFine}
                      onChange={(e) =>
                        setGenerazione((prev) => ({ ...prev, dataFine: e.target.value }))
                      }
                    />
                  </label>
                  <button type="submit" className="btn-primary" disabled={generazioneStato?.loading}>
                    {generazioneStato?.loading ? 'Genero…' : 'Genera'}
                  </button>
                </div>
                {generazioneStato?.messaggio && (
                  <p className="genera-esito ok">{generazioneStato.messaggio}</p>
                )}
                {generazioneStato?.errore && (
                  <p className="genera-esito errore">{generazioneStato.errore}</p>
                )}
              </form>
            )}
          </div>
        ))}
      </div>

      {form && (
        <div className="modale-overlay" onClick={() => setForm(null)}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Modifica modello' : 'Nuovo modello'}</h2>
            <form onSubmit={handleSubmit} className="modello-form">
              <div className="form-field">
                <label>Nome</label>
                <input
                  value={form.nome}
                  onChange={(e) => aggiorna('nome', e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Giorno della settimana</label>
                  <select
                    value={form.giorno_settimana}
                    onChange={(e) => aggiorna('giorno_settimana', e.target.value)}
                  >
                    {GIORNI_SETTIMANA.map((nome, idx) => (
                      <option key={idx} value={idx}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Posti massimi</label>
                  <input
                    type="number"
                    min="1"
                    value={form.posti_massimi}
                    onChange={(e) => aggiorna('posti_massimi', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Ora inizio</label>
                  <input
                    type="time"
                    value={form.ora_inizio}
                    onChange={(e) => aggiorna('ora_inizio', e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Ora fine</label>
                  <input
                    type="time"
                    value={form.ora_fine}
                    onChange={(e) => aggiorna('ora_fine', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Anticipo apertura (ore)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.anticipo_apertura_ore}
                    onChange={(e) => aggiorna('anticipo_apertura_ore', e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Anticipo chiusura (ore)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.anticipo_chiusura_ore}
                    onChange={(e) => aggiorna('anticipo_chiusura_ore', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Valido dal</label>
                  <input
                    type="date"
                    value={form.data_inizio_validita || ''}
                    onChange={(e) => aggiorna('data_inizio_validita', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Valido fino al</label>
                  <input
                    type="date"
                    value={form.data_fine_validita || ''}
                    onChange={(e) => aggiorna('data_fine_validita', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={form.attivo}
                    onChange={(e) => aggiorna('attivo', e.target.checked)}
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
              <>
                <SelettoreCategorie
                  entityId={form.id}
                  joinTable="attivita_modello_categorie"
                  entityColumn="modello_id"
                  hint="Le occorrenze generate da questo modello erediteranno queste categorie."
                />
                <button
                  type="button"
                  className="btn-secondary sincronizza-btn"
                  disabled={sincronizzando}
                  onClick={() => sincronizzaCategorie(form.id)}
                >
                  {sincronizzando ? 'Sincronizzo…' : 'Applica alle occorrenze future già generate'}
                </button>
                {sincronizzaEsito && <p className="genera-esito ok">{sincronizzaEsito}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
