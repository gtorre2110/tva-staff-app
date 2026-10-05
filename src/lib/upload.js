import { supabase } from '../supabaseClient'

export async function caricaImmagine(bucket, percorso, file) {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(percorso, file, { upsert: true })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage.from(bucket).getPublicUrl(percorso)
  return { url: data.publicUrl, error: null }
}

// Ricava il percorso nel bucket da un URL pubblico di Supabase Storage
// (ignora l'eventuale parametro ?v= usato per aggirare la cache).
export function percorsoDaUrl(bucket, urlPubblico) {
  if (!urlPubblico) return null
  const marcatore = `/${bucket}/`
  const posizione = urlPubblico.indexOf(marcatore)
  if (posizione === -1) return null
  return decodeURIComponent(urlPubblico.slice(posizione + marcatore.length).split('?')[0])
}

// Cancella dal bucket il file a cui punta un URL pubblico. Se l'URL non
// appartiene al bucket non fa nulla.
export async function eliminaImmagine(bucket, urlPubblico) {
  const percorso = percorsoDaUrl(bucket, urlPubblico)
  if (!percorso) return { error: null }
  const { error } = await supabase.storage.from(bucket).remove([percorso])
  return { error }
}
