// Integrazione Google Drive per l'esportazione di file (CSV, ecc.), senza
// bisogno di un server: usa Google Identity Services per ottenere, nel
// browser, un permesso limitato ai soli file creati da questa app
// (scope "drive.file": non può leggere né vedere altri file del Drive
// dell'utente). Il permesso va rinnovato ad ogni sessione/scadenza,
// non viene salvato da nessuna parte.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/drive.file'

let tokenClient = null
let accessToken = null
let scadenzaToken = 0

function caricaScriptGoogle() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const esistente = document.querySelector('script[data-google-identity]')
    if (esistente) {
      esistente.addEventListener('load', () => resolve())
      esistente.addEventListener('error', () => reject(new Error('Impossibile caricare Google Identity Services')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Impossibile caricare Google Identity Services'))
    document.head.appendChild(script)
  })
}

async function ottieniToken() {
  if (!CLIENT_ID) {
    throw new Error(
      'Esportazione su Google Drive non configurata (manca VITE_GOOGLE_CLIENT_ID nelle variabili d\'ambiente).'
    )
  }

  if (accessToken && Date.now() < scadenzaToken) {
    return accessToken
  }

  await caricaScriptGoogle()

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: () => {}, // sovrascritto ad ogni chiamata, vedi sotto
      })
    }

    tokenClient.callback = (risposta) => {
      if (risposta.error) {
        reject(new Error(`Accesso a Google Drive negato o annullato (${risposta.error})`))
        return
      }
      accessToken = risposta.access_token
      scadenzaToken = Date.now() + (risposta.expires_in - 60) * 1000
      resolve(accessToken)
    }

    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' })
  })
}

/**
 * Carica un file di testo (tipicamente un CSV) sul Google Drive
 * dell'utente attualmente collegato in staff-app. La prima volta per
 * sessione compare il popup di accesso Google; le volte successive,
 * finché il permesso resta valido, il file parte subito.
 *
 * @param {string} nomeFile - es. "registro-immersioni.csv"
 * @param {string} contenuto - contenuto testuale del file
 * @param {string} mimeType - default "text/csv"
 * @returns {Promise<{id: string, webViewLink?: string}>}
 */
export async function caricaSuDrive(nomeFile, contenuto, mimeType = 'text/csv') {
  const token = await ottieniToken()

  const confine = 'tva_confine_' + Date.now()
  const metadata = { name: nomeFile, mimeType }

  const corpo =
    `--${confine}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${confine}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    contenuto +
    `\r\n--${confine}--`

  const risposta = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${confine}`,
      },
      body: corpo,
    }
  )

  if (!risposta.ok) {
    const testo = await risposta.text().catch(() => '')
    throw new Error(`Google Drive ha risposto con un errore (${risposta.status}): ${testo}`)
  }

  return risposta.json()
}

export function driveConfigurato() {
  return !!CLIENT_ID
}
