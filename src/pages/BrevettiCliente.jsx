import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useBozza } from '../lib/useBozza'
import { formattaData } from '../lib/attivita'
import { ordinaBrevetti } from '../lib/brevetti'
import { eliminaImmagine } from '../lib/upload'
import { useIsAssistente } from '../lib/membroContext'

const VUOTO = {
  tipo_brevetto_id: '', didattica_libera: '', tipo_brevetto_libero: '', livello_libero: '',
  istruttore_id: '', istruttore_nome_libero: '', numero_brevetto: '', data_emissione: '', scadenza: '',
}

export default function BrevettiCliente({ clienteId }) {
  const isAssistente = useIsAssistente()
  const [brevetti, setBrevetti] = useState([])
  const [tipi, setTipi] = useState([])
  const [istruttori, setIstruttori] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formAperto, setFormAperto] = useState(false)
  const [form, setForm, pulisciBozza] = useBozza(`brevetto-staff-nuovo-${clienteId}`, VUOTO)
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    carica()
  }, [clienteId])

  async function carica() {
    setLoading(true)
    setError(null)
    const [{ data: mieB, error: e1 }, { data: tipiData }, { data: istrData }] = await Promise.all([
      supabase
        .from('brevetti')
        .select('*, tipi_brevetto(didattica, tipo_brevetto, livello, immagine_url), istruttori(nome)')
        .eq('cliente_id', clienteId)
        .order('data_emissione', { ascending: false }),
      supabase.from('tipi_brevetto').select('*').order('didattica').order('tipo_brevetto'),
      supabase.from('istruttori').select('*').order('nome'),
    ])
    if (e1) setError(e1.message)
    setBrevetti(ordinaBrevetti(mieB || []))
    setTipi(tipiData || [])
    setIstruttori(istrData || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const usaCatalogoTipo = !!form.tipo_brevetto_id
    const usaCatalogoIstruttore = !!form.istruttore_id

    const payload = {
      cliente_id: clienteId,
      tipo_brevetto_id: usaCatalogoTipo ? form.tipo_brevetto_id : null,
      didattica_libera: usaCatalogoTipo ? null : form.didattica_libera.trim() || null,
      tipo_brevetto_libero: usaCatalogoTipo ? null : form.tipo_brevetto_libero.trim() || null,
      livello_libero: usaCatalogoTipo ? null : form.livello_libero.trim() || null,
      istruttore_id: usaCatalogoIstruttore ? form.istruttore_id : null,
      istruttore_nome_libero: usaCatalogoIstruttore ? null : form.istruttore_nome_libero.trim() || null,
      numero_brevetto: form.numero_brevetto.trim() || null,
      data_emissione: form.data_emissione || null,
      scadenza: form.scadenza || null,
    }

    const { error: insertError } = await supabase.from('brevetti').insert(payload)
    setSalvataggio(false)
    if (insertError) setError(insertError.message)
    else {
      pulisciBozza()
      setFormAperto(false)
      carica()
    }
  }

  async function elimina(b) {
    if (!confirm('Eliminare questo brevetto?')) return
    const { error: deleteError } = await supabase.from('brevetti').delete().eq('id', b.id)
    if (deleteError) setError(deleteError.message)
    else carica()
  }

  // Toglie la foto del brevetto caricata dal cliente (es. foto sbagliata):
  // il cliente potrà caricarne un'altra, e se il tipo ha un'immagine
  // standard in catalogo tornerà a vedere quella.
  async function eliminaImmagineBrevetto(b) {
    if (!confirm("Eliminare l'immagine di questo brevetto? Il cliente potrà caricarne un'altra.")) return
    setError(null)
    const { error: rimozioneError } = await eliminaImmagine('immagini-brevetti', b.immagine_url)
    if (rimozioneError) {
      setError(rimozioneError.message)
      return
    }
    const { error: updateError } = await supabase.from('brevetti').update({ immagine_url: null }).eq('id', b.id)
    if (updateError) setError(updateError.message)
    else carica()
  }

  return (
    <div className="movimenti-box">
      <h2>Brevetti</h2>

      {error && <p className="modelli-error">{error}</p>}
      {loading ? (
        <p className="modelli-hint">Caricamento…</p>
      ) : brevetti.length === 0 ? (
        <p className="modelli-hint">Nessun brevetto registrato.</p>
      ) : (
        <ul className="prenotazioni-list">
          {brevetti.map((b) => {
            const didattica = b.tipi_brevetto?.didattica || b.didattica_libera
            const tipo = b.tipi_brevetto?.tipo_brevetto || b.tipo_brevetto_libero
            const istruttore = b.istruttori?.nome || b.istruttore_nome_libero
            return (
              <li key={b.id}>
                <span className="prenotazione-nome">
                  {[didattica, tipo].filter(Boolean).join(' — ')}
                  {b.numero_brevetto ? ` · n. ${b.numero_brevetto}` : ''}
                  {istruttore ? ` · ${istruttore}` : ''}
                  {b.data_emissione ? ` · emesso ${formattaData(b.data_emissione)}` : ''}
                </span>
                <span className="catalogo-azioni">
                  {(b.immagine_url || b.tipi_brevetto?.immagine_url) && (
                    <a
                      className="btn-secondary"
                      href={b.immagine_url || b.tipi_brevetto?.immagine_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Vedi immagine
                    </a>
                  )}
                  {b.immagine_url && !isAssistente && (
                    <button className="btn-secondary" onClick={() => eliminaImmagineBrevetto(b)}>
                      Elimina immagine
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => elimina(b)}>
                    Elimina
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {!formAperto ? (
        <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setFormAperto(true)}>
          + Aggiungi brevetto
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="cliente-form" style={{ padding: 0, border: 'none', marginTop: '1rem' }}>
          <div className="form-field">
            <label>Tipo di brevetto (dal catalogo)</label>
            <select
              value={form.tipo_brevetto_id}
              onChange={(e) => setForm((p) => ({ ...p, tipo_brevetto_id: e.target.value }))}
            >
              <option value="">Non in elenco / testo libero</option>
              {tipi.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.didattica} — {t.tipo_brevetto} {t.livello ? `(${t.livello})` : ''}
                </option>
              ))}
            </select>
          </div>

          {!form.tipo_brevetto_id && (
            <div className="form-row">
              <div className="form-field">
                <label>Didattica</label>
                <input
                  value={form.didattica_libera}
                  onChange={(e) => setForm((p) => ({ ...p, didattica_libera: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Tipo / livello</label>
                <input
                  value={form.tipo_brevetto_libero}
                  onChange={(e) => setForm((p) => ({ ...p, tipo_brevetto_libero: e.target.value }))}
                />
              </div>
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
                <option key={i.id} value={i.id}>
                  {i.nome} ({i.didattica})
                </option>
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

          <div className="form-row">
            <div className="form-field">
              <label>Numero brevetto</label>
              <input
                value={form.numero_brevetto}
                onChange={(e) => setForm((p) => ({ ...p, numero_brevetto: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Data emissione</label>
              <input
                type="date"
                value={form.data_emissione}
                onChange={(e) => setForm((p) => ({ ...p, data_emissione: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Scadenza (se prevista)</label>
            <input
              type="date"
              value={form.scadenza}
              onChange={(e) => setForm((p) => ({ ...p, scadenza: e.target.value }))}
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
