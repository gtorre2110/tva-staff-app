import { useState } from 'react'
import { generaCSV } from '../lib/csv'
import { caricaSuDrive, driveConfigurato } from '../lib/googleDrive'

/**
 * Pulsante "Esporta su Google Drive" riusabile: genera lo stesso CSV
 * già usato per "Esporta CSV" e lo carica direttamente nel Drive
 * dell'utente collegato (senza passare dal download del browser).
 */
export default function BottoneDrive({ nomeFile, colonne, righe, preparaRighe, disabled }) {
  const [stato, setStato] = useState('inattivo') // inattivo | caricamento | fatto | errore
  const [messaggio, setMessaggio] = useState('')

  if (!driveConfigurato()) return null

  async function esporta() {
    setStato('caricamento')
    setMessaggio('')
    try {
      // `preparaRighe` (facoltativa): funzione asincrona che costruisce le righe
      // al momento del click (quando servono letture dal database).
      const csv = generaCSV(colonne, preparaRighe ? await preparaRighe() : righe)
      const risultato = await caricaSuDrive(nomeFile, csv)
      setStato('fatto')
      setMessaggio(risultato.webViewLink ? 'Caricato su Drive.' : 'Caricato su Drive.')
    } catch (err) {
      setStato('errore')
      setMessaggio(err.message)
    }
  }

  return (
    <span className="bottone-drive">
      <button className="btn-secondary" onClick={esporta} disabled={disabled || stato === 'caricamento'}>
        {stato === 'caricamento' ? 'Carico su Drive…' : 'Esporta su Google Drive'}
      </button>
      {stato === 'fatto' && <span className="bottone-drive-esito ok">✓ {messaggio}</span>}
      {stato === 'errore' && <span className="bottone-drive-esito errore">{messaggio}</span>}
    </span>
  )
}
