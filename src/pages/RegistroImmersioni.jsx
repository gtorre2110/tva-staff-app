import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { scaricaCSV } from '../lib/csv'
import BottoneDrive from '../components/BottoneDrive'
import { formattaData, formattaOra } from '../lib/attivita'
import { COLONNE_REGISTRO, righeRegistro, comuniUscita, comuniPreEvento } from '../lib/registroRighe'
import { generaPdfRegistroUscita, generaPdfRegistroPreEvento, cercaInfoIstruttore } from '../lib/generaPdfRegistro'
import { selezionaBrevettoPrincipale, ordinaPartecipanti } from '../lib/brevetti'
import './Cataloghi.css'
import './RegistroImmersioni.css'

const SELEZIONE_BREVETTI =
  'cliente_id, immagine_url, brevetto_riferimento, didattica_libera, tipo_brevetto_libero, livello_libero, tipi_brevetto(tipo_brevetto, didattica, livello, immagine_url, istruttore)'

// Per una lista di cliente_id, restituisce una Map cliente_id -> brevetto
// "principale" (vedi selezionaBrevettoPrincipale): usata sia dal registro
// pre-evento sia dal post-evento, così il criterio è identico nei due.
async function caricaBrevettoPrincipalePerClienti(clienteIds) {
  const mappa = new Map()
  if (clienteIds.length === 0) return mappa

  const { data: brevetti, error } = await supabase
    .from('brevetti')
    .select(SELEZIONE_BREVETTI)
    .in('cliente_id', clienteIds)

  if (error) throw error

  const perCliente = new Map()
  for (const b of brevetti || []) {
    if (!perCliente.has(b.cliente_id)) perCliente.set(b.cliente_id, [])
    perCliente.get(b.cliente_id).push(b)
  }
  for (const [clienteId, lista] of perCliente) {
    mappa.set(clienteId, selezionaBrevettoPrincipale(lista))
  }
  return mappa
}

// Partecipanti di una uscita del post-evento, con il brevetto principale,
// già nell'ordine dei registri (istruttori per primi, poi livello e cognome).
async function caricaPartecipantiUscita(r) {
  const { data: partecipantiGrezzi, error: rpcError } = await supabase.rpc('registro_immersioni_partecipanti', {
    p_data: r.data,
    p_ora_inizio: r.ora_inizio,
    p_ora_fine: r.ora_fine,
    p_localita: r.localita,
    p_centro: r.centro_immersione,
    p_istruttore: r.istruttore,
  })
  if (rpcError) throw rpcError

  const clienteIds = (partecipantiGrezzi || []).map((p) => p.cliente_id)
  const brevettoPerCliente = await caricaBrevettoPrincipalePerClienti(clienteIds)

  return ordinaPartecipanti(
    (partecipantiGrezzi || []).map((p) => {
      const brevetto = brevettoPerCliente.get(p.cliente_id)
      return {
        cliente_id: p.cliente_id,
        nome: p.nome,
        cognome: p.cognome,
        brevetto_descrizione: brevetto?.descrizione || 'Nessun brevetto registrato',
        immagine_url: brevetto?.immagine_url || null,
        livello: brevetto?.livello ?? null,
        haIstruttore: !!brevetto?.haIstruttore,
      }
    })
  )
}

const SCHEDE = [
  { id: 'pre', label: 'Pre-evento (dalle prenotazioni)' },
  { id: 'post', label: 'Post-evento (dai logbook)' },
]

export default function RegistroImmersioni() {
  const [scheda, setScheda] = useState('pre')

  return (
    <div className="cataloghi-page">
      <h1>Registro immersioni</h1>
      <p className="categorie-sub">
        Due viste pensate per gli adempimenti della Legge 70/2006: il registro post-evento
        raggruppa le voci di logbook per uscita; quello pre-evento mostra chi è iscritto a
        un'attività e il suo brevetto più alto.
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

      {scheda === 'post' && <RegistroPostEvento />}
      {scheda === 'pre' && <RegistroPreEvento />}
    </div>
  )
}

function RegistroPostEvento() {
  const [righe, setRighe] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generandoPdf, setGenerandoPdf] = useState(null)
  const [generandoCsv, setGenerandoCsv] = useState(false)

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('registro_immersioni')
      .select('*')
      .order('data', { ascending: false })
    if (fetchError) setError(fetchError.message)
    else setRighe(data || [])
    setLoading(false)
  }

  // Tutte le uscite, una riga per partecipante, stesse colonne del PDF.
  async function preparaRighePost() {
    const cacheIstruttori = new Map()
    const risultato = []
    for (const r of righe) {
      const partecipanti = await caricaPartecipantiUscita(r)
      if (r.istruttore && !cacheIstruttori.has(r.istruttore)) {
        cacheIstruttori.set(r.istruttore, await cercaInfoIstruttore(supabase, r.istruttore))
      }
      risultato.push(...righeRegistro(comuniUscita(r, cacheIstruttori.get(r.istruttore)), partecipanti))
    }
    return risultato
  }

  async function esporta() {
    setGenerandoCsv(true)
    setError(null)
    try {
      scaricaCSV('registro-immersioni-post-evento.csv', COLONNE_REGISTRO, await preparaRighePost())
    } catch (err) {
      setError('Errore nella generazione del CSV: ' + err.message)
    }
    setGenerandoCsv(false)
  }

  async function esportaPdf(r, i) {
    setGenerandoPdf(i)
    setError(null)
    try {
      const partecipanti = await caricaPartecipantiUscita(r)
      const istruttoreInfo = await cercaInfoIstruttore(supabase, r.istruttore)
      await generaPdfRegistroUscita(r, partecipanti, istruttoreInfo)
    } catch (err) {
      setError('Errore nella generazione del PDF: ' + err.message)
    }
    setGenerandoPdf(null)
  }

  return (
    <div>
      <div className="catalogo-sezione-header">
        <div />
        <span className="catalogo-azioni">
          <button className="btn-primary" onClick={esporta} disabled={righe.length === 0 || generandoCsv}>
            {generandoCsv ? 'Preparo il CSV…' : 'Esporta CSV'}
          </button>
          <BottoneDrive
            nomeFile="registro-immersioni-post-evento.csv"
            colonne={COLONNE_REGISTRO}
            preparaRighe={preparaRighePost}
            disabled={righe.length === 0}
          />
        </span>
      </div>

      {error && <p className="modelli-error">{error}</p>}
      {loading && <p className="modelli-hint">Caricamento…</p>}
      {!loading && righe.length === 0 && <p className="modelli-hint">Nessuna uscita registrata ancora.</p>}

      <div className="registro-tabella">
        {righe.map((r, i) => (
          <div className="registro-riga" key={i}>
            <div className="registro-riga-data">
              <strong>{formattaData(r.data)}</strong>
              <span>{formattaOra(r.ora_inizio)}–{formattaOra(r.ora_fine)}</span>
              <button
                className="btn-secondary registro-riga-pdf"
                onClick={() => esportaPdf(r, i)}
                disabled={generandoPdf === i}
              >
                {generandoPdf === i ? 'Preparo il PDF…' : 'Esporta PDF'}
              </button>
            </div>
            <div className="registro-riga-dettagli">
              <p><strong>Partecipanti:</strong> {r.partecipanti || '—'}</p>
              {r.localita && <p><strong>Località:</strong> {r.localita}</p>}
              {r.centro_immersione && <p><strong>Centro:</strong> {r.centro_immersione}</p>}
              {r.istruttore && <p><strong>Istruttore:</strong> {r.istruttore}</p>}
              {r.brevetti && <p><strong>Brevetti:</strong> {r.brevetti}</p>}
              {r.profondita_massima_raggiunta && <p><strong>Profondità massima:</strong> {r.profondita_massima_raggiunta} m</p>}
              {(r.autorespiratori || r.miscele) && (
                <p>
                  {r.autorespiratori && <><strong>Autorespiratore:</strong> {r.autorespiratori} </>}
                  {r.miscele && <><strong>Miscela:</strong> {r.miscele}</>}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RegistroPreEvento() {
  const [occorrenze, setOccorrenze] = useState([])
  const [selezionata, setSelezionata] = useState('')
  const [iscritti, setIscritti] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingIscritti, setLoadingIscritti] = useState(false)
  const [error, setError] = useState(null)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [datiExport, setDatiExport] = useState({ localita: '', centro: '' })

  useEffect(() => {
    caricaOccorrenze()
  }, [])

  useEffect(() => {
    if (selezionata) caricaIscritti(selezionata)
    else setIscritti([])
  }, [selezionata])

  async function caricaOccorrenze() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('attivita')
      .select('id, nome, data, ora_inizio, ora_fine, localita, centro_immersione')
      .order('data', { ascending: false })
      .limit(100)
    if (fetchError) setError(fetchError.message)
    else setOccorrenze(data || [])
    setLoading(false)
  }

  async function caricaIscritti(attivitaId) {
    setLoadingIscritti(true)
    setError(null)

    const { data: prenotazioni, error: e1 } = await supabase
      .from('prenotazioni')
      .select('cliente_id, clienti(nome, cognome)')
      .eq('attivita_id', attivitaId)
      .eq('stato', 'confermata')

    if (e1) {
      setError(e1.message)
      setLoadingIscritti(false)
      return
    }

    const clienteIds = (prenotazioni || []).map((p) => p.cliente_id)
    let brevettiPerCliente = new Map()

    if (clienteIds.length > 0) {
      try {
        brevettiPerCliente = await caricaBrevettoPrincipalePerClienti(clienteIds)
      } catch (err) {
        setError(err.message)
      }
    }

    const elenco = (prenotazioni || []).map((p) => {
      const brevetto = brevettiPerCliente.get(p.cliente_id)
      return {
        cliente_id: p.cliente_id,
        nome: p.clienti?.nome,
        cognome: p.clienti?.cognome,
        brevetto_descrizione: brevetto?.descrizione || 'Nessun brevetto registrato',
        immagine_url: brevetto?.immagine_url || null,
        livello: brevetto?.livello ?? null,
        haIstruttore: !!brevetto?.haIstruttore,
      }
    })

    // Prima chi ha un brevetto da istruttore, poi livello decrescente e
    // cognome — stesso criterio del registro post-evento.
    setIscritti(ordinaPartecipanti(elenco))
    setLoadingIscritti(false)
  }

  const attivitaSelezionata = occorrenze.find((o) => o.id === selezionata)

  // Località e centro: partono dai valori salvati sull'attività e si possono
  // correggere qui; valgono per PDF, CSV e Drive, così i documenti sono congruenti.
  useEffect(() => {
    setDatiExport({
      localita: attivitaSelezionata?.localita || '',
      centro: attivitaSelezionata?.centro_immersione || '',
    })
  }, [selezionata, occorrenze])

  const righeExport = attivitaSelezionata
    ? righeRegistro(
        comuniPreEvento(attivitaSelezionata, {
          localita: datiExport.localita.trim(),
          centro: datiExport.centro.trim(),
        }),
        iscritti
      )
    : []

  function esporta() {
    if (!attivitaSelezionata) return
    scaricaCSV(`registro-pre-evento-${attivitaSelezionata.data}.csv`, COLONNE_REGISTRO, righeExport)
  }

  async function esportaPdf() {
    if (!attivitaSelezionata) return
    setGenerandoPdf(true)
    setError(null)
    try {
      await generaPdfRegistroPreEvento(attivitaSelezionata, iscritti, {
        localita: datiExport.localita.trim(),
        centro: datiExport.centro.trim(),
      })
    } catch (err) {
      setError('Errore nella generazione del PDF: ' + err.message)
    }
    setGenerandoPdf(false)
  }

  return (
    <div>
      {error && <p className="modelli-error">{error}</p>}

      <div className="form-field registro-select">
        <label>Scegli un'attività</label>
        {loading ? (
          <p className="modelli-hint">Caricamento…</p>
        ) : (
          <select value={selezionata} onChange={(e) => setSelezionata(e.target.value)}>
            <option value="">Seleziona…</option>
            {occorrenze.map((o) => (
              <option key={o.id} value={o.id}>
                {formattaData(o.data)} — {o.nome} ({formattaOra(o.ora_inizio)})
              </option>
            ))}
          </select>
        )}
      </div>

      {selezionata && (
        <>
          <div className="form-row">
            <div className="form-field">
              <label>Località (per il documento)</label>
              <input
                value={datiExport.localita}
                onChange={(e) => setDatiExport((p) => ({ ...p, localita: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Centro di immersione (per il documento)</label>
              <input
                value={datiExport.centro}
                onChange={(e) => setDatiExport((p) => ({ ...p, centro: e.target.value }))}
              />
            </div>
          </div>
          <p className="modelli-hint">
            Partono dai valori dell'attività e valgono per PDF, CSV e Drive di questa esportazione.
            Per salvarli in modo stabile: Attività → Modifica.
          </p>
          <div className="catalogo-sezione-header">
            <div />
            <span className="catalogo-azioni">
              <button className="btn-primary" onClick={esporta} disabled={iscritti.length === 0}>
                Esporta CSV
              </button>
              <button className="btn-secondary" onClick={esportaPdf} disabled={iscritti.length === 0 || generandoPdf}>
                {generandoPdf ? 'Preparo il PDF…' : 'Esporta PDF'}
              </button>
              <BottoneDrive
                nomeFile={attivitaSelezionata ? `registro-pre-evento-${attivitaSelezionata.data}.csv` : 'registro-pre-evento.csv'}
                colonne={COLONNE_REGISTRO}
                righe={righeExport}
                disabled={iscritti.length === 0}
              />
            </span>
          </div>

          {loadingIscritti ? (
            <p className="modelli-hint">Caricamento…</p>
          ) : iscritti.length === 0 ? (
            <p className="modelli-hint">Nessun iscritto confermato per questa attività.</p>
          ) : (
            <ul className="catalogo-list">
              {iscritti.map((i) => (
                <li key={i.cliente_id}>
                  <span>
                    <strong>{i.cognome} {i.nome}</strong> — {i.brevetto_descrizione}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
