import { useEffect, useState } from 'react'

const PREFISSO = 'bozza:'

function leggi(chiave) {
  try {
    const salvato = localStorage.getItem(PREFISSO + chiave)
    return salvato ? JSON.parse(salvato) : null
  } catch {
    return null
  }
}

/**
 * Come useState, ma salva automaticamente il valore in localStorage
 * e lo ripristina se il componente viene rimontato (es. cambio app,
 * schermo bloccato, chiusura accidentale della scheda) prima del salvataggio.
 *
 * `valoreIniziale` è usato solo se non esiste già una bozza salvata.
 * Chiama `pulisci()` dopo un salvataggio riuscito per cancellare la bozza.
 */
export function useBozza(chiave, valoreIniziale) {
  const [valore, setValore] = useState(() => leggi(chiave) ?? valoreIniziale)

  // Se il componente resta montato ma la chiave cambia (es. si passa da un
  // record all'altro senza smontare la pagina), ricarica la bozza giusta.
  useEffect(() => {
    setValore(leggi(chiave) ?? valoreIniziale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave])

  useEffect(() => {
    try {
      localStorage.setItem(PREFISSO + chiave, JSON.stringify(valore))
    } catch {
      // storage pieno o non disponibile: non blocchiamo l'uso del form
    }
  }, [chiave, valore])

  function pulisci() {
    try {
      localStorage.removeItem(PREFISSO + chiave)
    } catch {
      // ignorato
    }
    setValore(valoreIniziale)
  }

  return [valore, setValore, pulisci]
}

export function esisteBozza(chiave) {
  return leggi(chiave) !== null
}

/**
 * Lettura/scrittura dirette (senza hook), per i form dove apertura/chiusura del
 * modale già usano una logica propria (es. `form` null = chiuso) e non conviene
 * ristrutturare attorno a useBozza. Stesso meccanismo, uso manuale.
 */
export function leggiBozza(chiave) {
  return leggi(chiave)
}

export function scriviBozza(chiave, valore) {
  try {
    localStorage.setItem(PREFISSO + chiave, JSON.stringify(valore))
  } catch {
    // ignorato
  }
}

/**
 * Rimuove solo la bozza salvata, senza svuotare il valore attuale in memoria.
 * Da usare nei form che modificano un record già esistente (dopo un salvataggio
 * riuscito i valori a video restano quelli corretti, non vanno azzerati) —
 * diversamente dalla `pulisci()` restituita da useBozza, pensata per i form
 * "nuovo elemento" che dopo il salvataggio devono tornare vuoti.
 */
export function dimenticaBozza(chiave) {
  try {
    localStorage.removeItem(PREFISSO + chiave)
  } catch {
    // ignorato
  }
}
