import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { caricaImmagine } from '../lib/upload'

export default function FotoCliente({ cliente, onAggiornata }) {
  const [caricando, setCaricando] = useState(false)
  const [error, setError] = useState(null)

  async function cambiaFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setCaricando(true)
    setError(null)

    const estensione = file.name.split('.').pop()
    const { url, error: uploadError } = await caricaImmagine(
      'foto-clienti',
      `${cliente.id}/foto.${estensione}`,
      file
    )

    if (uploadError) {
      setError(uploadError.message)
    } else {
      await supabase.from('clienti').update({ foto_url: url }).eq('id', cliente.id)
      onAggiornata?.(url)
    }
    setCaricando(false)
  }

  return (
    <div className="foto-cliente-wrap">
      {cliente.foto_url ? (
        <img src={cliente.foto_url} alt="Foto cliente" className="foto-cliente-img" />
      ) : (
        <div className="foto-cliente-img foto-cliente-vuota">
          {cliente.nome?.[0]}
          {cliente.cognome?.[0]}
        </div>
      )}
      <label className="btn-secondary foto-cliente-btn">
        {caricando ? 'Carico…' : 'Cambia foto'}
        <input type="file" accept="image/*" onChange={cambiaFoto} disabled={caricando} hidden />
      </label>
      {error && <p className="modelli-error">{error}</p>}
    </div>
  )
}
