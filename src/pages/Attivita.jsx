import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formattaData, formattaOra, formattaDataOra, inputLocaleAIso, isoAInputLocale } from '../lib/attivita'
import { leggiBozza, scriviBozza, dimenticaBozza } from '../lib/useBozza'
import SelettoreCategorie from './SelettoreCategorie'
import { useIsAssistente } from '../lib/membroContext'
import './Attivita.css'
import './Cataloghi.css'

const VUOTO = {
  nome: '',
  data: '',
  ora_inizio: '',
  ora_fine: '',
  posti_massimi: 10,
  apertura_prenotazioni: '',
  chiusura_prenotazioni: '',
}

export default function Attivita() {
  const soloAggiungi = useIsAssistente()
  const [occorrenze, setOccorrenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mostraPassate, setMostraPassate] = useState(false)
  const [macrocategorie, setMacrocategorie] = useState([])
  const [macroPerAttivita, setMacroPerAttivita] = useState(new Map())
  const [schedaMacro, setSchedaMacro] = useState('tutte')

  const [form, setForm] = useState(null)
  const [salvataggio, setSalvataggio] = useState(false)
  const [categorieAperte, setCategorieAperte] = useState(null)

  useEffect(() => {
    carica()
  }, [mostraPassate])

  async function carica() {
    setLoading(true)
    setError(null)

    let query = supabase.from('attivita').select('*').order('data', { ascending: true })
    if (!mostraPassate) {
      query = query.gte('data', new Date().toISOString().slice(0, 10))
    }

    const { data, error: fetchError } = await query
    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }
    setOccorrenze(data)

    if (data.length > 0) {
      const [{ data: categorie }, { data: collegamenti }] = await Promise.all([
        supabase.from('categorie').select('*'),
        supabase.from('attivita_categorie').select('attivita_id, categoria_id').in('attivita_id', data.map((a) => a.id)),
      ])

      const categoriePerId = new Map((categorie || []).map((c) => [c.id, c]))
      const risolviMacro = (categoriaId) => {
        const c = categoriePerId.get(categoriaId)
        if (!c) return null
        return c.categoria_padre_id || c.id
      }

      const mappa = new Map()
      for (const riga of collegamenti || []) {
        const macroId = risolviMacro(riga.categoria_id)
        if (!macroId) continue
        if (!mappa.has(riga.attivita_id)) mappa.set(riga.attivita_id, new Set())
        mappa.get(riga.attivita_id).add(macroId)
      }
      setMacroPerAttivita(mappa)
      setMacrocategorie((categorie || []).filter((c) => !c.categoria_padre_id).sort((a, b) => a.nome.localeCompare(b.nome)))
    } else {
      setMacroPerAttivita(new Map())
    }

    setLoading(false)
  }

  const occorrenzeFiltrate = occorrenze.filter((a) => {
    if (schedaMacro === 'tutte') return true
    const macroSet = macroPerAttivita.get(a.id)
    if (schedaMacro === 'senza-categoria') return !macroSet || macroSet.size === 0
    return macroSet && macroSet.has(schedaMacro)
  })

  function apriNuova() {
    setForm(leggiBozza('attivita-nuova') || { ...VUOTO })
  }

  function apriModifica(a) {
    setError(null)
    setForm({
      id: a.id,
      nome: a.nome || '',
      data: a.data || '',
      ora_inizio: (a.ora_inizio || '').slice(0, 5),
      ora_fine: (a.ora_fine || '').slice(0, 5),
      posti_massimi: a.posti_massimi,
      apertura_prenotazioni: isoAInputLocale(a.apertura_prenotazioni),
      chiusura_prenotazioni: isoAInputLocale(a.chiusura_prenotazioni),
    })
  }

  function aggiorna(campo, valore) {
    setForm((prev) => {
      const next = { ...prev, [campo]: valore }
      if (!prev.id) scriviBozza('attivita-nuova', next)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = {
      nome: (form.nome || '').trim(),
      data: form.data,
      ora_inizio: form.ora_inizio,
      ora_fine: form.ora_fine,
      posti_massimi: Number(form.posti_massimi),
      apertura_prenotazioni: inputLocaleAIso(form.apertura_prenotazioni),
      chiusura_prenotazioni: inputLocaleAIso(form.chiusura_prenotazioni),
    }

    const { error: salvaError } = form.id
      ? await supabase.from('attivita').update(payload).eq('id', form.id)
      : await supabase.from('attivita').insert({ ...payload, modello_id: null })
    setSalvataggio(false)

    if (salvaError) {
      setError(salvaError.message)
    } else {
      if (!form.id) dimenticaBozza('attivita-nuova')
      setForm(null)
      carica()
    }
  }

  async function toggleAnnullata(occorrenza) {
    const { error: updateError } = await supabase
      .from('attivita')
      .update({ annullata: !occorrenza.annullata })
      .eq('id', occorrenza.id)

    if (updateError) setError(updateError.message)
    else carica()
  }

  return (
    <div className="attivita-page">
      <div className="attivita-header">
        <h1>Attività</h1>
        <button className="btn-primary" onClick={apriNuova}>
          + Attività una tantum
        </button>
      </div>

      <label className="attivita-toggle">
        <input
          type="checkbox"
          checked={mostraPassate}
          onChange={(e) => setMostraPassate(e.target.checked)}
        />
        Mostra anche le date passate
      </label>

      <div className="cataloghi-tabs">
        <button
          className={'cataloghi-tab' + (schedaMacro === 'tutte' ? ' active' : '')}
          onClick={() => setSchedaMacro('tutte')}
        >
          Tutte
        </button>
        {macrocategorie.map((m) => (
          <button
            key={m.id}
            className={'cataloghi-tab' + (schedaMacro === m.id ? ' active' : '')}
            onClick={() => setSchedaMacro(m.id)}
          >
            {m.nome}
          </button>
        ))}
        <button
          className={'cataloghi-tab' + (schedaMacro === 'senza-categoria' ? ' active' : '')}
          onClick={() => setSchedaMacro('senza-categoria')}
        >
          Senza categoria
        </button>
      </div>

      {error && <p className="modelli-error">Errore: {error}</p>}
      {loading && <p className="modelli-hint">Caricamento…</p>}
      {!loading && occorrenzeFiltrate.length === 0 && (
        <p className="modelli-hint">Nessuna attività trovata.</p>
      )}

      <div className="attivita-list">
        {occorrenzeFiltrate.map((a) => (
          <div key={a.id} className="attivita-row-wrap">
            <div className={'attivita-row' + (a.annullata ? ' annullata' : '')}>
              <div className="attivita-row-data">
                <span className="attivita-row-giorno">{formattaData(a.data)}</span>
                <span className="attivita-row-ora">
                  {formattaOra(a.ora_inizio)}–{formattaOra(a.ora_fine)}
                </span>
              </div>

              <div className="attivita-row-info">
                <span className="attivita-row-nome">
                  {a.nome}
                  {a.annullata && <span className="badge badge-alert">Annullata</span>}
                  {!a.modello_id && <span className="badge badge-neutro">Una tantum</span>}
                </span>
                <span className="attivita-row-dettagli">
                  {a.posti_massimi} posti · prenotabile {formattaDataOra(a.apertura_prenotazioni)} →{' '}
                  {formattaDataOra(a.chiusura_prenotazioni)}
                </span>
              </div>

              <button
                className="btn-secondary"
                onClick={() => setCategorieAperte(categorieAperte === a.id ? null : a.id)}
              >
                Categorie
              </button>
              {!soloAggiungi && (
                <button className="btn-secondary" onClick={() => apriModifica(a)}>
                  Modifica
                </button>
              )}
              {!soloAggiungi && (
                <button className="btn-secondary" onClick={() => toggleAnnullata(a)}>
                  {a.annullata ? 'Riattiva' : 'Annulla'}
                </button>
              )}
            </div>

            {categorieAperte === a.id && (
              <SelettoreCategorie
                entityId={a.id}
                joinTable="attivita_categorie"
                entityColumn="attivita_id"
                hint="Se nessuna categoria è selezionata, l'attività resta visibile a tutti i clienti."
              />
            )}
          </div>
        ))}
      </div>

      {form && (
        <div className="modale-overlay" onClick={() => setForm(null)}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Modifica attività' : 'Nuova attività una tantum'}</h2>
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
                  <label>Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => aggiorna('data', e.target.value)}
                    required
                  />
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
                  <label>Apertura prenotazioni</label>
                  <input
                    type="datetime-local"
                    value={form.apertura_prenotazioni}
                    onChange={(e) => aggiorna('apertura_prenotazioni', e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Chiusura prenotazioni</label>
                  <input
                    type="datetime-local"
                    value={form.chiusura_prenotazioni}
                    onChange={(e) => aggiorna('chiusura_prenotazioni', e.target.value)}
                    required
                  />
                </div>
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
          </div>
        </div>
      )}
    </div>
  )
}
