// Striscia rossa "VERSIONE BETA": visibile solo quando la variabile
// d'ambiente VITE_APP_ENV vale "beta" (impostata su Vercel solo per il
// deployment del branch beta). In produzione (main) resta invisibile.
export default function BetaBanner() {
  if (import.meta.env.VITE_APP_ENV !== 'beta') return null
  return <div className="beta-banner">VERSIONE BETA — dati e funzioni di prova</div>
}
