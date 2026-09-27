import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { leggiBozza, scriviBozza, dimenticaBozza } from '../lib/useBozza'
import { caricaImmagine } from '../lib/upload'
import CatalogoSemplice from './CatalogoSemplice'
import './Cataloghi.css'

const TIPO_VUOTO = { didattica: '', tipo_brevetto: '', livello: '', note: '' }
const ISTRUTTORE_VUOTO = { nome: '', didattica: '', numero_brevetto_istruttore: '' }

const SCHEDE = [
  { id: 'brevetti', label: 'Tipi di brevetto' },
  { id: 'istruttori', label: 'Istruttori' },
  { id: 'localita', label: 'Località di immersione' },
  { id: 'centri', label: 'Centri di immersione' },
]

export default function Cataloghi() {
  const [scheda, setScheda] = useState('brevetti')

  return (
    <div className="cataloghi-page">
      <h1>Cataloghi</h1>
      <p className="categorie-sub">
        Elenchi di riferimento usati nei brevetti e nel logbook. Clienti e staff possono
        scegliere da qui invece di scrivere a mano ogni volta; se manca qualcosa, i clienti
        possono comunque inserirlo come testo libero.
      </p>

      <div className="cataloghi-tabs">
        {SCHEDE.map((s) => (
          <button
            key={s.id}
            className={'cataloghi-tab' + (scheda === s.id ? ' active' : '')}
            onClick={() => setScheda(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {scheda === 'brevetti' && <TipiBrevettoTab />}
      {scheda === 'istruttori' && <IstruttoriTab />}
      {scheda === 'localita' && (
        <CatalogoSemplice
          tabella="localita_immersione"
          ordinaPer="nome"
          campi={[
            { chiave: 'nome', etichetta: 'Nome località', obbligatorio: true },
            { chiave: 'note', etichetta: 'Note (facoltative)', obbligatorio: false },
          ]}
          formatoRiga={(r) => (
            <>
              <strong>{r.nome}</strong>
              {r.note && ` — ${r.note}`}
            </>
          )}
          messaggioElimina={(r) => `Eliminare "${r.nome}"? Le voci di logbook che la usano resteranno, ma senza il collegamento al catalogo.`}
        />
      )}
      {scheda === 'centri' && (
        <CatalogoSemplice
          tabella="centri_immersione"
          ordinaPer="nome"
          campi={[
            { chiave: 'nome', etichetta: 'Nome centro', obbligatorio: true },
            { chiave: 'note', etichetta: 'Note (facoltative)', obbligatorio: false },
          ]}
          formatoRiga={(r) => (
            <>
              <strong>{r.nome}</strong>
              {r.note && ` — ${r.note}`}
            </>
          )}
          messaggioElimina={(r) => `Eliminare "${r.nome}"? Le voci di logbook che lo usano resteranno, ma senza il collegamento al catalogo.`}
        />
      )}
    </div>
  )
}

function TipiBrevettoTab() {
  const [tipi, setTipi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null)
  const [salvataggio, setSalvataggio] = useState(false)
  const [caricandoImmagine, setCaricandoImmagine] = useState(false)

  async function cambiaImmagine(e) {
    const file = e.target.files[0]
    if (!file || !form?.id) return
    setCaricandoImmagine(true)
    setError(null)

    const estensione = file.name.split('.').pop()
    const { url, error: uploadError } = await caricaImmagine(
      'immagini-brevetti',
      `catalogo/${form.id}.${estensione}`,
      file
    )

    if (uploadError) {
      setError(uploadError.message)
    } else {
      await supabase.from('tipi_brevetto').update({ immagine_url: url }).eq('id', form.id)
      setForm((p) => ({ ...p, immagine_url: url }))
    }
    setCaricandoImmagine(false)
  }

  useEffect(() => {
    carica()
  }, [])

  useEffect(() => {
    if (form) scriviBozza(`tipo-brevetto-${form.id || 'nuovo'}`, form)
  }, [form])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('tipi_brevetto')
      .select('*')
      .order('didattica')
      .order('tipo_brevetto')
    if (fetchError) setError(fetchError.message)
    else setTipi(data || [])
    setLoading(false)
  }

  async function salva(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = {
      didattica: (form.didattica || '').trim(),
      tipo_brevetto: (form.tipo_brevetto || '').trim(),
      livello: form.livello === '' ? null : Number(form.livello),
      note: (form.note || '').trim() || null,
    }

    const opError = form.id
      ? (await supabase.from('tipi_brevetto').update(payload).eq('id', form.id)).error
      : (await supabase.from('tipi_brevetto').insert(payload)).error

    setSalvataggio(false)
    if (opError) setError(opError.message)
    else {
      dimenticaBozza(`tipo-brevetto-${form.id || 'nuovo'}`)
      setForm(null)
      carica()
    }
  }

  async function elimina(t) {
    if (!confirm(`Eliminare "${t.didattica} — ${t.tipo_brevetto}"? I brevetti dei clienti che lo usano resteranno, ma senza il collegamento al catalogo.`)) return
    const { error: deleteError } = await supabase.from('tipi_brevetto').delete().eq('id', t.id)
    if (deleteError) setError(deleteError.message)
    else carica()
  }

  return (
    <div>
      <div className="catalogo-sezione-header">
        <div />
        <button className="btn-primary" onClick={() => setForm(leggiBozza('tipo-brevetto-nuovo') || { ...TIPO_VUOTO })}>
          + Aggiungi
        </button>
      </div>

      {error && <p className="modelli-error">{error}</p>}
      {loading ? (
        <p className="modelli-hint">Caricamento…</p>
      ) : (
        <ul className="catalogo-list">
          {tipi.map((t) => (
            <li key={t.id}>
              <span>
                <strong>{t.didattica}</strong> — {t.tipo_brevetto}
                {t.livello && ` (${t.livello})`}
              </span>
              <span className="catalogo-azioni">
                <button className="btn-secondary" onClick={() => setForm(leggiBozza(`tipo-brevetto-${t.id}`) || { ...t })}>
                  Modifica
                </button>
                <button className="btn-secondary" onClick={() => elimina(t)}>
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
            <h2>{form.id ? 'Modifica tipo di brevetto' : 'Nuovo tipo di brevetto'}</h2>
            <form onSubmit={salva} className="modello-form">
              <div className="form-field">
                <label>Didattica</label>
                <input
                  value={form.didattica}
                  onChange={(e) => setForm((p) => ({ ...p, didattica: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label>Tipo di brevetto</label>
                <input
                  value={form.tipo_brevetto}
                  onChange={(e) => setForm((p) => ({ ...p, tipo_brevetto: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label>Livello (solo numero, es. 1, 2, 3)</label>
                <input
                  type="number"
                  value={form.livello === null ? '' : form.livello}
                  onChange={(e) => setForm((p) => ({ ...p, livello: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Note (facoltative)</label>
                <input
                  value={form.note || ''}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                />
              </div>

              {form.id && (
                <div className="form-field">
                  <label>Immagine standard (mostrata ai clienti che non caricano la propria)</label>
                  {form.immagine_url && (
                    <img src={form.immagine_url} alt="" style={{ width: '4rem', marginBottom: '0.5rem', borderRadius: '6px' }} />
                  )}
                  <input type="file" accept="image/*" onChange={cambiaImmagine} disabled={caricandoImmagine} />
                  {caricandoImmagine && <span className="field-hint">Carico…</span>}
                </div>
              )}

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

function IstruttoriTab() {
  const [istruttori, setIstruttori] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null)
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    carica()
  }, [])

  useEffect(() => {
    if (form) scriviBozza(`istruttore-${form.id || 'nuovo'}`, form)
  }, [form])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase.from('istruttori').select('*').order('nome')
    if (fetchError) setError(fetchError.message)
    else setIstruttori(data || [])
    setLoading(false)
  }

  async function salva(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = {
      nome: (form.nome || '').trim(),
      didattica: (form.didattica || '').trim(),
      numero_brevetto_istruttore: (form.numero_brevetto_istruttore || '').trim() || null,
    }

    const opError = form.id
      ? (await supabase.from('istruttori').update(payload).eq('id', form.id)).error
      : (await supabase.from('istruttori').insert(payload)).error

    setSalvataggio(false)
    if (opError) setError(opError.message)
    else {
      dimenticaBozza(`istruttore-${form.id || 'nuovo'}`)
      setForm(null)
      carica()
    }
  }

  async function elimina(i) {
    if (!confirm(`Eliminare l'istruttore "${i.nome}"? I brevetti/logbook che lo usano resteranno, ma senza il collegamento.`)) return
    const { error: deleteError } = await supabase.from('istruttori').delete().eq('id', i.id)
    if (deleteError) setError(deleteError.message)
    else carica()
  }

  return (
    <div>
      <div className="catalogo-sezione-header">
        <div />
        <button className="btn-primary" onClick={() => setForm(leggiBozza('istruttore-nuovo') || { ...ISTRUTTORE_VUOTO })}>
          + Aggiungi
        </button>
      </div>

      {error && <p className="modelli-error">{error}</p>}
      {loading ? (
        <p className="modelli-hint">Caricamento…</p>
      ) : (
        <ul className="catalogo-list">
          {istruttori.map((i) => (
            <li key={i.id}>
              <span>
                <strong>{i.nome}</strong> — {i.didattica}
                {i.numero_brevetto_istruttore && ` · n. ${i.numero_brevetto_istruttore}`}
              </span>
              <span className="catalogo-azioni">
                <button className="btn-secondary" onClick={() => setForm(leggiBozza(`istruttore-${i.id}`) || { ...i })}>
                  Modifica
                </button>
                <button className="btn-secondary" onClick={() => elimina(i)}>
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
            <h2>{form.id ? 'Modifica istruttore' : 'Nuovo istruttore'}</h2>
            <form onSubmit={salva} className="modello-form">
              <div className="form-field">
                <label>Nome</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label>Didattica</label>
                <input
                  value={form.didattica}
                  onChange={(e) => setForm((p) => ({ ...p, didattica: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label>Numero brevetto istruttore</label>
                <input
                  value={form.numero_brevetto_istruttore || ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, numero_brevetto_istruttore: e.target.value }))
                  }
                />
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
