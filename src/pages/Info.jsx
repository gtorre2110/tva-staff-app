import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { leggiBozza, scriviBozza, dimenticaBozza } from '../lib/useBozza'
import { caricaImmagine } from '../lib/upload'
import { generaPdfInfo } from '../lib/generaPdfInfo'
import { useIsAssistente } from '../lib/membroContext'
import './Info.css'

const VUOTO = { titolo: '', tipo: 'testo', contenuto: '', pdf_url: null, ordine: 0, pubblicata: true }

export default function Info() {
  const soloAggiungi = useIsAssistente()
  const [pagine, setPagine] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null)
  const [salvataggio, setSalvataggio] = useState(false)
  const [elaborandoFile, setElaborandoFile] = useState(false)

  useEffect(() => {
    carica()
  }, [])

  useEffect(() => {
    if (form) scriviBozza(`info-${form.id || 'nuovo'}`, form)
  }, [form])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('info_pagine')
      .select('*')
      .order('ordine')
      .order('titolo')
    if (fetchError) setError(fetchError.message)
    else setPagine(data || [])
    setLoading(false)
  }

  function apriNuovo() {
    const bozza = leggiBozza('info-nuovo')
    setForm(bozza || { ...VUOTO, id: crypto.randomUUID(), ordine: pagine.length })
  }

  function apriModifica(p) {
    setForm(leggiBozza(`info-${p.id}`) || { ...p })
  }

  async function salva(e) {
    e.preventDefault()
    setError(null)

    const titolo = (form.titolo || '').trim()
    if (!titolo) {
      setError('Il titolo è obbligatorio.')
      return
    }
    if (form.tipo === 'testo' && !(form.contenuto || '').trim()) {
      setError('Scrivi il testo, oppure genera prima il PDF se vuoi lasciarlo vuoto.')
      return
    }
    if (form.tipo === 'pdf' && !form.pdf_url) {
      setError('Carica un file PDF prima di salvare.')
      return
    }

    setSalvataggio(true)
    const payload = {
      id: form.id,
      titolo,
      tipo: form.tipo,
      contenuto: form.tipo === 'testo' ? form.contenuto : null,
      pdf_url: form.pdf_url || null,
      ordine: Number(form.ordine) || 0,
      pubblicata: !!form.pubblicata,
    }

    const { error: saveError } = await supabase.from('info_pagine').upsert(payload)

    setSalvataggio(false)
    if (saveError) {
      setError(saveError.message)
    } else {
      dimenticaBozza(`info-${form.id}`)
      setForm(null)
      carica()
    }
  }

  async function caricaPdf(e) {
    const file = e.target.files[0]
    if (!file) return
    setElaborandoFile(true)
    setError(null)
    const { url, error: uploadError } = await caricaImmagine('documenti-info', `${form.id}.pdf`, file)
    setElaborandoFile(false)
    if (uploadError) setError(uploadError.message)
    else setForm((p) => ({ ...p, pdf_url: url }))
  }

  async function generaPdf() {
    if (!(form.contenuto || '').trim()) {
      setError('Scrivi prima il testo da trasformare in PDF.')
      return
    }
    setElaborandoFile(true)
    setError(null)
    try {
      const blob = generaPdfInfo(form.titolo, form.contenuto)
      const file = new File([blob], `${form.id}.pdf`, { type: 'application/pdf' })
      const { url, error: uploadError } = await caricaImmagine('documenti-info', `${form.id}.pdf`, file)
      if (uploadError) setError(uploadError.message)
      else setForm((p) => ({ ...p, pdf_url: url }))
    } catch (err) {
      setError('Errore nella generazione del PDF: ' + err.message)
    }
    setElaborandoFile(false)
  }

  async function elimina(p) {
    if (!confirm(`Eliminare "${p.titolo}"? Non sarà più visibile ai clienti.`)) return
    const { error: deleteError } = await supabase.from('info_pagine').delete().eq('id', p.id)
    if (deleteError) setError(deleteError.message)
    else carica()
  }

  async function spostaOrdine(p, direzione) {
    const indice = pagine.findIndex((x) => x.id === p.id)
    const vicino = pagine[indice + direzione]
    if (!vicino) return
    const { error: updateError } = await supabase.from('info_pagine').upsert([
      { ...p, ordine: vicino.ordine },
      { ...vicino, ordine: p.ordine },
    ])
    if (updateError) setError(updateError.message)
    else carica()
  }

  async function cambiaPubblicazione(p) {
    const { error: updateError } = await supabase
      .from('info_pagine')
      .update({ pubblicata: !p.pubblicata })
      .eq('id', p.id)
    if (updateError) setError(updateError.message)
    else carica()
  }

  return (
    <div className="info-page">
      <div className="catalogo-sezione-header">
        <div>
          <h1>Info</h1>
          <p className="info-sub">
            Documenti informativi mostrati ai clienti nella pagina "Info" della loro app (es.
            legge del mare, attrezzatura richiesta, regole di sicurezza). Scrivi il testo qui
            (viene generato anche un PDF scaricabile) oppure carica direttamente un PDF già pronto.
          </p>
        </div>
        <button className="btn-primary" onClick={apriNuovo}>
          + Nuovo documento
        </button>
      </div>

      {error && <p className="modelli-error">{error}</p>}

      {loading ? (
        <p className="modelli-hint">Caricamento…</p>
      ) : pagine.length === 0 ? (
        <p className="modelli-hint">Nessun documento ancora. Aggiungine uno con "+ Nuovo documento".</p>
      ) : (
        <ul className="catalogo-list info-list">
          {pagine.map((p, i) => (
            <li key={p.id}>
              <span className="info-riga-titolo">
                <strong>{p.titolo}</strong>
                <span className={'badge ' + (p.tipo === 'testo' ? 'badge-testo' : 'badge-pdf')}>
                  {p.tipo === 'testo' ? 'Testo' : 'PDF'}
                </span>
                {!p.pubblicata && <span className="badge badge-nascosta">Non pubblicata</span>}
              </span>
              <span className="catalogo-azioni">
                {!soloAggiungi && (
                  <>
                    <button className="btn-secondary" disabled={i === 0} onClick={() => spostaOrdine(p, -1)} title="Sposta su">
                      ↑
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={i === pagine.length - 1}
                      onClick={() => spostaOrdine(p, 1)}
                      title="Sposta giù"
                    >
                      ↓
                    </button>
                    <button className="btn-secondary" onClick={() => cambiaPubblicazione(p)}>
                      {p.pubblicata ? 'Nascondi' : 'Pubblica'}
                    </button>
                    <button className="btn-secondary" onClick={() => apriModifica(p)}>
                      Modifica
                    </button>
                    <button className="btn-secondary" onClick={() => elimina(p)}>
                      Elimina
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="modale-overlay" onClick={() => setForm(null)}>
          <div className="modale modale-larga" onClick={(e) => e.stopPropagation()}>
            <h2>{pagine.some((p) => p.id === form.id) ? 'Modifica documento' : 'Nuovo documento'}</h2>
            <form onSubmit={salva} className="modello-form">
              <div className="form-field">
                <label>Titolo</label>
                <input
                  value={form.titolo}
                  onChange={(e) => setForm((p) => ({ ...p, titolo: e.target.value }))}
                  required
                />
              </div>

              <div className="form-field">
                <label>Tipo di documento</label>
                <div className="info-tipo-scelta">
                  <label>
                    <input
                      type="radio"
                      name="tipo"
                      checked={form.tipo === 'testo'}
                      onChange={() => setForm((p) => ({ ...p, tipo: 'testo' }))}
                    />{' '}
                    Scrivi il testo qui (genera anche un PDF)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="tipo"
                      checked={form.tipo === 'pdf'}
                      onChange={() => setForm((p) => ({ ...p, tipo: 'pdf' }))}
                    />{' '}
                    Carica un PDF già pronto
                  </label>
                </div>
              </div>

              {form.tipo === 'testo' ? (
                <>
                  <div className="form-field">
                    <label>Testo (una riga vuota separa i paragrafi)</label>
                    <textarea
                      rows={12}
                      value={form.contenuto || ''}
                      onChange={(e) => setForm((p) => ({ ...p, contenuto: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <button type="button" className="btn-secondary" onClick={generaPdf} disabled={elaborandoFile}>
                      {elaborandoFile ? 'Genero…' : form.pdf_url ? 'Rigenera PDF da questo testo' : 'Genera PDF da questo testo'}
                    </button>
                    {form.pdf_url && (
                      <a href={form.pdf_url} target="_blank" rel="noreferrer" className="field-hint">
                        {' '}Apri l'ultimo PDF generato
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="form-field">
                  <label>File PDF</label>
                  <input type="file" accept="application/pdf" onChange={caricaPdf} disabled={elaborandoFile} />
                  {elaborandoFile && <span className="field-hint">Carico…</span>}
                  {form.pdf_url && (
                    <a href={form.pdf_url} target="_blank" rel="noreferrer" className="field-hint">
                      Apri il PDF caricato
                    </a>
                  )}
                </div>
              )}

              <div className="form-field">
                <label>
                  <input
                    type="checkbox"
                    checked={!!form.pubblicata}
                    onChange={(e) => setForm((p) => ({ ...p, pubblicata: e.target.checked }))}
                  />{' '}
                  Pubblicata (visibile ai clienti)
                </label>
              </div>

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
