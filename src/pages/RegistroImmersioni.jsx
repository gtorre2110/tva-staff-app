import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { scaricaCSV } from '../lib/csv'
import BottoneDrive from '../components/BottoneDrive'
import { formattaData, formattaOra } from '../lib/attivita'
import { generaPdfRegistroUscita, generaPdfRegistroPreEvento } from '../lib/generaPdfRegistro'
import './Cataloghi.css'
import './RegistroImmersioni.css'

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

  const colonneCSV = [
    { chiave: 'data', etichetta: 'Data' },
    { chiave: 'ora_inizio', etichetta: 'Orario inizio' },
    { chiave: 'ora_fine', etichetta: 'Orario fine' },
    { chiave: 'localita', etichetta: 'Località' },
    { chiave: 'centro_immersione', etichetta: 'Centro di immersione' },
    { chiave: 'istruttore', etichetta: 'Istruttore' },
    { chiave: 'partecipanti', etichetta: 'Partecipanti' },
    { chiave: 'brevetti', etichetta: 'Brevetti' },
    { chiave: 'profondita_massima_raggiunta', etichetta: 'Profondità massima raggiunta (m)' },
    { chiave: 'autorespiratori', etichetta: 'Autorespiratore/i' },
    { chiave: 'miscele', etichetta: 'Miscela/e' },
  ]

  function esporta() {
    scaricaCSV('registro-immersioni-post-evento.csv', colonneCSV, righe)
  }

  async function esportaPdf(r, i) {
    setGenerandoPdf(i)
    setError(null)
    try {
      const { data: partecipanti, error: rpcError } = await supabase.rpc('registro_immersioni_partecipanti', {
        p_data: r.data,
        p_ora_inizio: r.ora_inizio,
        p_ora_fine: r.ora_fine,
        p_localita: r.localita,
        p_centro: r.centro_immersione,
        p_istruttore: r.istruttore,
      })
      if (rpcError) throw rpcError
      await generaPdfRegistroUscita(r, partecipanti || [])
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
          <button className="btn-primary" onClick={esporta} disabled={righe.length === 0}>
            Esporta CSV
          </button>
          <BottoneDrive
            nomeFile="registro-immersioni-post-evento.csv"
            colonne={colonneCSV}
            righe={righe}
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
      .select('id, nome, data, ora_inizio, ora_fine')
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
      const { data: brevetti, error: e2 } = await supabase
        .from('brevetti')
        .select(
          'cliente_id, immagine_url, brevetto_riferimento, didattica_libera, tipo_brevetto_libero, livello_libero, tipi_brevetto(tipo_brevetto, didattica, livello, immagine_url)'
        )
        .in('cliente_id', clienteIds)

      if (e2) {
        setError(e2.message)
      } else {
        for (const b of brevetti || []) {
          const didattica = b.tipi_brevetto?.didattica || b.didattica_libera
          const tipo = b.tipi_brevetto?.tipo_brevetto || b.tipo_brevetto_libero
          const livelloNumerico =
            typeof b.tipi_brevetto?.livello === 'number' ? b.tipi_brevetto.livello : null
          const info = {
            livello: livelloNumerico,
            descrizione:
              [didattica, tipo].filter(Boolean).join(' — ') +
              (livelloNumerico !== null ? ` (liv. ${livelloNumerico})` : ''),
            immagine_url: b.immagine_url || b.tipi_brevetto?.immagine_url || null,
          }

          // Il brevetto marcato dal cliente come "principale" vince sempre,
          // a prescindere dal livello; altrimenti si prende quello col
          // livello numerico più alto (comportamento precedente).
          if (b.brevetto_riferimento) {
            brevettiPerCliente.set(b.cliente_id, { ...info, riferimento: true })
            continue
          }
          const attuale = brevettiPerCliente.get(b.cliente_id)
          if (attuale?.riferimento) continue
          if (info.livello !== null && (!attuale || info.livello > attuale.livello)) {
            brevettiPerCliente.set(b.cliente_id, info)
          }
        }
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
      }
    })

    // Ordine per brevetto (livello decrescente), a parità per cognome —
    // stesso criterio del registro post-evento.
    elenco.sort((a, b) => {
      const livelloA = a.livello ?? -Infinity
      const livelloB = b.livello ?? -Infinity
      if (livelloB !== livelloA) return livelloB - livelloA
      return (a.cognome || '').localeCompare(b.cognome || '')
    })

    setIscritti(elenco)
    setLoadingIscritti(false)
  }

  const attivitaSelezionata = occorrenze.find((o) => o.id === selezionata)

  const colonneCSV = [
    { chiave: 'cognome', etichetta: 'Cognome' },
    { chiave: 'nome', etichetta: 'Nome' },
    { chiave: 'brevetto_descrizione', etichetta: 'Brevetto più alto' },
  ]

  function esporta() {
    if (!attivitaSelezionata) return
    scaricaCSV(`registro-pre-evento-${attivitaSelezionata.data}.csv`, colonneCSV, iscritti)
  }

  async function esportaPdf() {
    if (!attivitaSelezionata) return
    setGenerandoPdf(true)
    setError(null)
    try {
      await generaPdfRegistroPreEvento(attivitaSelezionata, iscritti)
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
                colonne={colonneCSV}
                righe={iscritti}
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
