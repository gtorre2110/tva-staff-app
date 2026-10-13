import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useBozza } from '../lib/useBozza'
import { formattaData } from '../lib/attivita'
import { useMembro } from '../lib/membroContext'

const VUOTO = {
  data: '', ora_inizio: '', ora_fine: '',
  localita_id: '', luogo: '',
  centro_immersione_id: '', centro_immersione_libero: '',
  istruttore_id: '', istruttore_nome_libero: '',
  brevetto_id: '',
  profondita_programmata: '', profondita_raggiunta: '',
  corso: '', note: '',
  numero_uscita: '', specchio_acqua: '',
  coordinate_lat: '', coordinate_long: '',
  compagno_immersione: '',
  condizioni_cielo: '', condizioni_superficie: '', visibilita: '',
  temperatura_acqua: '', temperatura_aria: '',
  numero_tuffi: '', tempo_max_immersione: '', profondita_min_raggiunta: '',
  assetto: '',
  muta_giacca_mm: '', muta_pantaloni_mm: '', muta_bermuda_mm: '',
  guanti_mm: '', calzari_mm: '', zavorra_kg: '', pinne: '',
  usa_computer_orologio: false, usa_coltello_tagliasagole: false,
}

export default function LogbookCliente({ clienteId }) {
  const membro = useMembro()
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
        .select('*, istruttori(nome), localita_immersione(nome), centri_immersione(nome), brevetti(numero_brevetto, tipi_brevetto(didattica, tipo_brevetto), tipo_brevetto_libero, didattica_libera), confermato_da:membri_staff!confermato_da_membro_id(nome, cognome)')
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
      profondita_programmata: form.profondita_programmata === '' ? null : Number(form.profondita_programmata),
      profondita_raggiunta: form.profondita_raggiunta === '' ? null : Number(form.profondita_raggiunta),
      corso: form.corso.trim() || null,
      note: form.note.trim() || null,
      numero_uscita: form.numero_uscita === '' ? null : Number(form.numero_uscita),
      specchio_acqua: form.specchio_acqua || null,
      coordinate_lat: form.coordinate_lat.trim() || null,
      coordinate_long: form.coordinate_long.trim() || null,
      compagno_immersione: form.compagno_immersione.trim() || null,
      condizioni_cielo: form.condizioni_cielo || null,
      condizioni_superficie: form.condizioni_superficie || null,
      visibilita: form.visibilita || null,
      temperatura_acqua: form.temperatura_acqua === '' ? null : Number(form.temperatura_acqua),
      temperatura_aria: form.temperatura_aria === '' ? null : Number(form.temperatura_aria),
      numero_tuffi: form.numero_tuffi === '' ? null : Number(form.numero_tuffi),
      tempo_max_immersione: form.tempo_max_immersione.trim() || null,
      profondita_min_raggiunta: form.profondita_min_raggiunta === '' ? null : Number(form.profondita_min_raggiunta),
      assetto: form.assetto || null,
      muta_giacca_mm: form.muta_giacca_mm === '' ? null : Number(form.muta_giacca_mm),
      muta_pantaloni_mm: form.muta_pantaloni_mm === '' ? null : Number(form.muta_pantaloni_mm),
      muta_bermuda_mm: form.muta_bermuda_mm === '' ? null : Number(form.muta_bermuda_mm),
      guanti_mm: form.guanti_mm === '' ? null : Number(form.guanti_mm),
      calzari_mm: form.calzari_mm === '' ? null : Number(form.calzari_mm),
      zavorra_kg: form.zavorra_kg === '' ? null : Number(form.zavorra_kg),
      pinne: form.pinne.trim() || null,
      usa_computer_orologio: !!form.usa_computer_orologio,
      usa_coltello_tagliasagole: !!form.usa_coltello_tagliasagole,
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

  function puoTogliereConferma(v) {
    if (membro?.ruolo === 'amministratore') return true
    return !!v.confermato_da_membro_id && v.confermato_da_membro_id === membro?.id
  }

  async function toggleConferma(v) {
    if (v.confermato_da_istruttore && !puoTogliereConferma(v)) {
      setError(
        "Solo l'istruttore che ha confermato questa voce o un amministratore può togliere la conferma."
      )
      return
    }
    setError(null)
    const nuovaConferma = !v.confermato_da_istruttore
    const { error: updateError } = await supabase
      .from('logbook')
      .update({
        confermato_da_istruttore: nuovaConferma,
        confermato_da_membro_id: nuovaConferma ? membro?.id : null,
      })
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
        <ul className="prenotazioni-list logbook-voci-list">
          {voci.map((v) => {
            const puoTogliere = puoTogliereConferma(v)
            const nomeConferma = v.confermato_da
              ? `${v.confermato_da.nome} ${v.confermato_da.cognome}`
              : null
            return (
              <li key={v.id} className="logbook-voce">
                <div className="logbook-voce-riga">
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
                </div>

                <div className="logbook-voce-azioni">
                  <span className={'badge ' + (v.confermato_da_istruttore ? 'badge-ok' : 'badge-neutro')}>
                    {v.confermato_da_istruttore
                      ? `Confermato${nomeConferma ? ` da ${nomeConferma}` : ''}`
                      : 'Da confermare'}
                  </span>

                  {!v.confermato_da_istruttore ? (
                    <button className="btn-secondary" onClick={() => toggleConferma(v)}>
                      Conferma
                    </button>
                  ) : (
                    <button
                      className="btn-secondary"
                      disabled={!puoTogliere}
                      title={puoTogliere ? '' : "Solo chi l'ha confermata o un amministratore può togliere la conferma"}
                      onClick={() => toggleConferma(v)}
                    >
                      Togli conferma
                    </button>
                  )}

                  <button className="btn-secondary" onClick={() => elimina(v)}>
                    Elimina
                  </button>
                </div>
                {v.confermato_da_istruttore && !puoTogliere && (
                  <p className="logbook-voce-nota">
                    Solo {nomeConferma || "chi l'ha confermata"} o un amministratore può togliere la conferma.
                  </p>
                )}
              </li>
            )
          })}
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

          <div className="form-row">
            <div className="form-field">
              <label>N° Uscita</label>
              <input
                type="number"
                value={form.numero_uscita}
                onChange={(e) => setForm((p) => ({ ...p, numero_uscita: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Lago o mare</label>
              <select
                value={form.specchio_acqua}
                onChange={(e) => setForm((p) => ({ ...p, specchio_acqua: e.target.value }))}
              >
                <option value="">Non specificato</option>
                <option value="lago">Lago</option>
                <option value="mare">Mare</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Coordinate Lat.</label>
              <input
                value={form.coordinate_lat}
                onChange={(e) => setForm((p) => ({ ...p, coordinate_lat: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Coordinate Long.</label>
              <input
                value={form.coordinate_long}
                onChange={(e) => setForm((p) => ({ ...p, coordinate_long: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Compagno/Guida/Istruttore</label>
            <input
              value={form.compagno_immersione}
              onChange={(e) => setForm((p) => ({ ...p, compagno_immersione: e.target.value }))}
            />
          </div>

          <h3>Condizioni ambientali</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Cielo</label>
              <select
                value={form.condizioni_cielo}
                onChange={(e) => setForm((p) => ({ ...p, condizioni_cielo: e.target.value }))}
              >
                <option value="">Non specificato</option>
                <option value="sereno">Sereno</option>
                <option value="velato">Velato</option>
                <option value="coperto">Coperto</option>
                <option value="pioggia">Pioggia</option>
              </select>
            </div>
            <div className="form-field">
              <label>Superficie</label>
              <select
                value={form.condizioni_superficie}
                onChange={(e) => setForm((p) => ({ ...p, condizioni_superficie: e.target.value }))}
              >
                <option value="">Non specificato</option>
                <option value="calma">Calma</option>
                <option value="quasi_calma">Quasi calma</option>
                <option value="mossa">Mossa</option>
                <option value="molto_mossa">Molto mossa</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Visibilità</label>
              <select
                value={form.visibilita}
                onChange={(e) => setForm((p) => ({ ...p, visibilita: e.target.value }))}
              >
                <option value="">Non specificato</option>
                <option value="buona">Buona</option>
                <option value="sufficiente">Sufficiente</option>
                <option value="scarsa">Scarsa</option>
              </select>
            </div>
            <div className="form-field">
              <label>Temp. acqua (°C)</label>
              <input
                type="number"
                step="0.1"
                value={form.temperatura_acqua}
                onChange={(e) => setForm((p) => ({ ...p, temperatura_acqua: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Temp. aria (°C)</label>
              <input
                type="number"
                step="0.1"
                value={form.temperatura_aria}
                onChange={(e) => setForm((p) => ({ ...p, temperatura_aria: e.target.value }))}
              />
            </div>
          </div>

          <h3>Attività svolta</h3>
          <div className="form-row">
            <div className="form-field">
              <label>N. Tuffi svolti</label>
              <input
                type="number"
                value={form.numero_tuffi}
                onChange={(e) => setForm((p) => ({ ...p, numero_tuffi: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Tempo max d'immersione</label>
              <input
                placeholder="es. 2:30"
                value={form.tempo_max_immersione}
                onChange={(e) => setForm((p) => ({ ...p, tempo_max_immersione: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Min profondità raggiunta (m)</label>
              <input
                type="number"
                step="0.1"
                value={form.profondita_min_raggiunta}
                onChange={(e) => setForm((p) => ({ ...p, profondita_min_raggiunta: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Assetto</label>
              <select
                value={form.assetto}
                onChange={(e) => setForm((p) => ({ ...p, assetto: e.target.value }))}
              >
                <option value="">Non specificato</option>
                <option value="costante">Assetto costante</option>
                <option value="variabile">Assetto variabile</option>
                <option value="no_limits">No limits</option>
              </select>
            </div>
          </div>

          <h3>Attrezzatura utilizzata</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Giacca muta (mm)</label>
              <input
                type="number"
                value={form.muta_giacca_mm}
                onChange={(e) => setForm((p) => ({ ...p, muta_giacca_mm: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Pantaloni muta (mm)</label>
              <input
                type="number"
                value={form.muta_pantaloni_mm}
                onChange={(e) => setForm((p) => ({ ...p, muta_pantaloni_mm: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Bermuda (mm)</label>
              <input
                type="number"
                value={form.muta_bermuda_mm}
                onChange={(e) => setForm((p) => ({ ...p, muta_bermuda_mm: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Guanti (mm)</label>
              <input
                type="number"
                value={form.guanti_mm}
                onChange={(e) => setForm((p) => ({ ...p, guanti_mm: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Calzari (mm)</label>
              <input
                type="number"
                value={form.calzari_mm}
                onChange={(e) => setForm((p) => ({ ...p, calzari_mm: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Zavorra (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.zavorra_kg}
                onChange={(e) => setForm((p) => ({ ...p, zavorra_kg: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Pinne</label>
              <input
                value={form.pinne}
                onChange={(e) => setForm((p) => ({ ...p, pinne: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row form-field-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.usa_computer_orologio}
                onChange={(e) => setForm((p) => ({ ...p, usa_computer_orologio: e.target.checked }))}
              />
              Computer/Orologio
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.usa_coltello_tagliasagole}
                onChange={(e) => setForm((p) => ({ ...p, usa_coltello_tagliasagole: e.target.checked }))}
              />
              Coltello/Tagliasagole
            </label>
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
