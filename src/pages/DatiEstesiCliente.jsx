import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { leggiBozza, scriviBozza, esisteBozza, dimenticaBozza } from '../lib/useBozza'

const VUOTO = {
  via: '', cap: '', citta: '', data_nascita: '', citta_nascita: '',
  codice_fiscale: '', partita_iva: '', ragione_sociale: '',
}

export default function DatiEstesiCliente({ clienteId }) {
  const bozzaKey = `dati-estesi-${clienteId}`
  const [form, setForm] = useState(() => leggiBozza(bozzaKey) || VUOTO)
  const [loading, setLoading] = useState(true)
  const [salvataggio, setSalvataggio] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    carica()
  }, [clienteId])

  async function carica() {
    setLoading(true)
    const { data } = await supabase
      .from('clienti_dati_estesi')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()
    if (data && !esisteBozza(bozzaKey)) setForm({ ...VUOTO, ...data })
    setLoading(false)
  }

  function aggiorna(campo, valore) {
    setForm((prev) => {
      const next = { ...prev, [campo]: valore }
      scriviBozza(bozzaKey, next)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = {
      cliente_id: clienteId,
      via: (form.via || '').trim() || null,
      cap: (form.cap || '').trim() || null,
      citta: (form.citta || '').trim() || null,
      data_nascita: form.data_nascita || null,
      citta_nascita: (form.citta_nascita || '').trim() || null,
      codice_fiscale: (form.codice_fiscale || '').trim() || null,
      partita_iva: (form.partita_iva || '').trim() || null,
      ragione_sociale: (form.ragione_sociale || '').trim() || null,
    }

    const { error: upsertError } = await supabase
      .from('clienti_dati_estesi')
      .upsert(payload, { onConflict: 'cliente_id' })

    setSalvataggio(false)
    if (upsertError) setError(upsertError.message)
    else dimenticaBozza(bozzaKey)
  }

  if (loading) return null

  return (
    <div className="movimenti-box">
      <h2>Dati anagrafici estesi</h2>
      <form onSubmit={handleSubmit} className="cliente-form" style={{ padding: 0, border: 'none' }}>
        <div className="form-field">
          <label>Via</label>
          <input value={form.via || ''} onChange={(e) => aggiorna('via', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>CAP</label>
            <input value={form.cap || ''} onChange={(e) => aggiorna('cap', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Città</label>
            <input value={form.citta || ''} onChange={(e) => aggiorna('citta', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Data di nascita</label>
            <input
              type="date"
              value={form.data_nascita || ''}
              onChange={(e) => aggiorna('data_nascita', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Città di nascita</label>
            <input
              value={form.citta_nascita || ''}
              onChange={(e) => aggiorna('citta_nascita', e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label>Codice fiscale</label>
          <input
            value={form.codice_fiscale || ''}
            onChange={(e) => aggiorna('codice_fiscale', e.target.value)}
          />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Partita IVA</label>
            <input
              value={form.partita_iva || ''}
              onChange={(e) => aggiorna('partita_iva', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Ragione sociale</label>
            <input
              value={form.ragione_sociale || ''}
              onChange={(e) => aggiorna('ragione_sociale', e.target.value)}
            />
          </div>
        </div>

        {error && <p className="modelli-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={salvataggio}>
            {salvataggio ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </form>
    </div>
  )
}
