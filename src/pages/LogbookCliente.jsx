import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useBozza } from '../lib/useBozza'
import { formattaData } from '../lib/attivita'

const VUOTO = {
  data: '', ora_inizio: '', ora_fine: '',
  localita_id: '', luogo: '',
  centro_immersione_id: '', centro_immersione_libero: '',
  istruttore_id: '', istruttore_nome_libero: '',
  brevetto_id: '',
  tipo_autorespiratore: '', miscela_utilizzata: '',
  profondita_programmata: '', profondita_raggiunta: '',
  corso: '', note: '',
}

export default function LogbookCliente({ clienteId }) {
  const [voci, setVoci] = useState([])
  const [istruttori, setIstruttori] = useState([])
  const [localita, setLocalita] = useState([])
  const [centri, setCentri] = useState([])
  const [brevetti, setBrevetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formAperto, setFormAperto] = useState(false)
  const [form, setForm, pulisciBozza] = useBozza(`logbook-staff-nuovo-${clienteId}`, VUOTO)
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    carica()
  }, [clienteId])

  async function carica() {
    setLoading(true)
    setError(null)
    const [
      { data: mieVoci, error: e1 },
      { data: istrData },
      { data: locData },
      { data: centriData },
      { data: brevettiData },
    ] = await Promise.all([
      supabase
        .from('logbook')
        .select('*, istruttori(nome), localita_immersione(nome), centri_immersione(nome), brevetti(numero_brevetto, tipi_brevetto(didattica, tipo_brevetto), tipo_brevetto_libero, didattica_libera)')
        .eq('cliente_id', clienteId)
        .order('data', { ascending: false }),
      supabase.from('istruttori').select('*').order('nome'),
      supabase.from('localita_immersione').select('*').order('nome'),
      supabase.from('centri_immersione').select('*').order('nome'),
      supabase.from('brevetti').select('*, tipi_brevetto(didattica, tipo_brevetto)').eq('cliente_id', clienteId),
    ])
    if (e1) setError(e1.message)
    setVoci(mieVoci || [])
    setIstruttori(istrData || [])
    setLocalita(locData || [])
    setCentri(centriData || [])
    setBrevetti(brevettiData || [])
    setLoading(false)
  }

  function descrizioneBrevetto(b) {
    const didattica = b.tipi_brevetto?.didattica || b.didattica_libera
    const tipo = b.tipi_brevetto?.tipo_brevetto || b.tipo_brevetto_libero
    return [didattica, tipo].filter(Boolean).join(' — ') || 'Brevetto'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const usaCatalogoIstruttore = !!form.istruttore_id
    const usaCatalogoLocalita = !!form.localita_id
    const usaCatalogoCentro = !!form.centro_immersione_id

    const payload = {
      cliente_id: clienteId,
      data: form.data,
      ora_inizio: form.ora_inizio || null,
      ora_fine: form.ora_fine || null,
      localita_id: usaCatalogoLocalita ? form.localita_id : null,
      luogo: usaCatalogoLocalita ? null : form.luogo.trim() || null,
      centro_immersione_id: usaCatalogoCentro ? form.centro_immersione_id : null,
      centro_immersione_libero: usaCatalogoCentro ? null : form.centro_immersione_libero.trim() || null,
      istruttore_id: usaCatalogoIstruttore ? form.istruttore_id : null,
      istruttore_nome_libero: usaCatalogoIstruttore ? null : form.istruttore_nome_libero.trim() || null,
      brevetto_id: form.brevetto_id || null,
      tipo_autorespiratore: form.tipo_autorespiratore.trim() || null,
      miscela_utilizzata: form.miscela_utilizzata.trim() || null,
      profondita_programmata: form.profondita_programmata === '' ? null : Number(form.profondita_programmata),
      profondita_raggiunta: form.profondita_raggiunta === '' ? null : Number(form.profondita_raggiunta),
      corso: form.corso.trim() || null,
      note: form.note.trim() || null,
    }

    const { error: insertError } = await supabase.from('logbook').insert(payload)
    setSalvataggio(false)
    if (insertError) setError(insertError.message)
    else {
      pulisciBozza()
      setFormAperto(false)
      carica()
    }
  }

  async function toggleConferma(v) {
    const { error: updateError } = await supabase
      .from('logbook')
      .update({ confermato_da_istruttore: !v.confermato_da_istruttore })
      .eq('id', v.id)
    if (updateError) setError(updateError.message)
    else carica()
  }

  async function elimina(v) {
    if (!confirm('Eliminare questa voce di logbook?')) return
    const { error: deleteError } = await supabase.from('logbook').delete().eq('id', v.id)
    if (deleteError) setError(deleteError.message)
    else carica()
  }

  return (
    <div className="movimenti-box">
      <h2>Logbook</h2>

      {error && <p className="modelli-error">{error}</p>}
      {loading ? (
        <p className="modelli-hint">Caricamento…</p>
      ) : voci.length === 0 ? (
        <p className="modelli-hint">Nessuna voce registrata.</p>
      ) : (
        <ul className="prenotazioni-list">
          {voci.map((v) => (
            <li key={v.id}>
              <label className="prenotazione-checkin">
                <input
                  type="checkbox"
                  checked={v.confermato_da_istruttore}
                  onChange={() => toggleConferma(v)}
                  title="Confermata dall'istruttore"
                />
              </label>
              <span className="prenotazione-nome">
                {formattaData(v.data)}
                {(v.ora_inizio) ? ` ${v.ora_inizio.slice(0, 5)}` : ''}
                {(v.localita_immersione?.nome || v.luogo) ? ` · ${v.localita_immersione?.nome || v.luogo}` : ''}
                {(v.centri_immersione?.nome || v.centro_immersione_libero) ? ` · ${v.centri_immersione?.nome || v.centro_immersione_libero}` : ''}
                {(v.istruttori?.nome || v.istruttore_nome_libero) &&
                  ` · ${v.istruttori?.nome || v.istruttore_nome_libero}`}
                {v.brevetti ? ` · ${descrizioneBrevetto(v.brevetti)}` : ''}
                {v.profondita_raggiunta ? ` · ${v.profondita_raggiunta}m` : ''}
                {v.corso ? ` · ${v.corso}` : ''}
              </span>
              <button className="btn-secondary" onClick={() => elimina(v)}>
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}

      {!formAperto ? (
        <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setFormAperto(true)}>
          + Aggiungi voce
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="cliente-form" style={{ padding: 0, border: 'none', marginTop: '1rem' }}>
          <div className="form-row">
            <div className="form-field">
              <label>Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label>Orario inizio / fine</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="time"
                  value={form.ora_inizio}
                  onChange={(e) => setForm((p) => ({ ...p, ora_inizio: e.target.value }))}
                />
                <input
                  type="time"
                  value={form.ora_fine}
                  onChange={(e) => setForm((p) => ({ ...p, ora_fine: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Località (dal catalogo)</label>
              <select
                value={form.localita_id}
                onChange={(e) => setForm((p) => ({ ...p, localita_id: e.target.value }))}
              >
                <option value="">Non in elenco / testo libero</option>
                {localita.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Centro di immersione (dal catalogo)</label>
              <select
                value={form.centro_immersione_id}
                onChange={(e) => setForm((p) => ({ ...p, centro_immersione_id: e.target.value }))}
              >
                <option value="">Non in elenco / testo libero</option>
                {centri.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {(!form.localita_id || !form.centro_immersione_id) && (
            <div className="form-row">
              {!form.localita_id && (
                <div className="form-field">
                  <label>Luogo</label>
                  <input
                    value={form.luogo}
                    onChange={(e) => setForm((p) => ({ ...p, luogo: e.target.value }))}
                  />
                </div>
              )}
              {!form.centro_immersione_id && (
                <div className="form-field">
                  <label>Nome centro</label>
                  <input
                    value={form.centro_immersione_libero}
                    onChange={(e) => setForm((p) => ({ ...p, centro_immersione_libero: e.target.value }))}
                  />
                </div>
              )}
            </div>
          )}

          <div className="form-field">
            <label>Istruttore (dal catalogo)</label>
            <select
              value={form.istruttore_id}
              onChange={(e) => setForm((p) => ({ ...p, istruttore_id: e.target.value }))}
            >
              <option value="">Non in elenco / testo libero</option>
              {istruttori.map((i) => (
                <option key={i.id} value={i.id}>{i.nome} ({i.didattica})</option>
              ))}
            </select>
          </div>
          {!form.istruttore_id && (
            <div className="form-field">
              <label>Nome istruttore</label>
              <input
                value={form.istruttore_nome_libero}
                onChange={(e) => setForm((p) => ({ ...p, istruttore_nome_libero: e.target.value }))}
              />
            </div>
          )}

          <div className="form-field">
            <label>Brevetto posseduto (tra quelli del cliente)</label>
            <select
              value={form.brevetto_id}
              onChange={(e) => setForm((p) => ({ ...p, brevetto_id: e.target.value }))}
            >
              <option value="">Non specificato</option>
              {brevetti.map((b) => (
                <option key={b.id} value={b.id}>{descrizioneBrevetto(b)}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Tipo di autorespiratore</label>
              <input
                value={form.tipo_autorespiratore}
                onChange={(e) => setForm((p) => ({ ...p, tipo_autorespiratore: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Miscela utilizzata</label>
              <input
                value={form.miscela_utilizzata}
                onChange={(e) => setForm((p) => ({ ...p, miscela_utilizzata: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Profondità programmata (m)</label>
              <input
                type="number"
                step="0.1"
                value={form.profondita_programmata}
                onChange={(e) => setForm((p) => ({ ...p, profondita_programmata: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Profondità raggiunta (m)</label>
              <input
                type="number"
                step="0.1"
                value={form.profondita_raggiunta}
                onChange={(e) => setForm((p) => ({ ...p, profondita_raggiunta: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Corso</label>
            <input
              value={form.corso}
              onChange={(e) => setForm((p) => ({ ...p, corso: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label>Note</label>
            <input
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setFormAperto(false)}>
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={salvataggio}>
              {salvataggio ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
