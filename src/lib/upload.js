import { supabase } from '../supabaseClient'

export async function caricaImmagine(bucket, percorso, file) {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(percorso, file, { upsert: true })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage.from(bucket).getPublicUrl(percorso)
  return { url: data.publicUrl, error: null }
}
