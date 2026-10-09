import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useIsAssistente } from '../lib/membroContext'
import { scaricaCSV } from '../lib/csv'
import {
  COLONNE_ELENCO,
  caricaElencoIscritti,
  righeElencoCsv,
  generaPdfElencoIscritti,
  nomeFileElenco,
} from '../lib/elencoIscritti'
import BottoneDrive from './BottoneDrive'
import '../pages/RegistroImmersioni.css'

/**
 * Esporta l'elenco degli iscritti a un'attività (PDF con foto, CSV, Drive).
 * Contiene dati personali: non è disponibile per gli assistenti istruttori.
 */
export default function EsportaIscritti({ attivita, soloAzioni = false }) {
  const assistente = useIsAssistente()
  const [aperto, setAperto] = useState(soloAzioni)
  const [lavoro, setLavoro] = useState(null) // 'pdf' | 'csv' | null
  const [errore, setErrore] = useState(null)

  if (assistente) return null

  async function esegui(tipo) {
    setLavoro(tipo)
    setErrore(null)
    try {
      const elenco = await caricaElencoIscritti(supabase, attivita.id)
      if (tipo === 'pdf') await generaPdfElencoIscritti(attivita, elenco)
      else scaricaCSV(nomeFileElenco(attivita, 'csv'), COLONNE_ELENCO, righeElencoCsv(elenco))
    } catch (e) {
      setErrore(e.message)
    }
    setLavoro(null)
  }

  return (
    <span className="esporta-iscritti">
      {!soloAzioni && (
        <button className="btn-secondary" onClick={() => setAperto(!aperto)}>
          Esporta iscritti
        </button>
      )}
      {aperto && (
        <span className="esporta-iscritti-azioni">
          <button className="btn-secondary" onClick={() => esegui('pdf')} disabled={!!lavoro}>
            {lavoro === 'pdf' ? 'Preparo il PDF…' : 'PDF con foto'}
          </button>
          <button className="btn-secondary" onClick={() => esegui('csv')} disabled={!!lavoro}>
            {lavoro === 'csv' ? 'Preparo il CSV…' : 'CSV'}
          </button>
          <BottoneDrive
            nomeFile={nomeFileElenco(attivita, 'csv')}
            colonne={COLONNE_ELENCO}
            preparaRighe={async () => righeElencoCsv(await caricaElencoIscritti(supabase, attivita.id))}
            disabled={!!lavoro}
          />
          {errore && <span className="modelli-error">{errore}</span>}
        </span>
      )}
    </span>
  )
}
