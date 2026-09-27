import './ConfermaModal.css'

export default function ConfermaModal({ titolo, testo, onConferma, onAnnulla, confermando }) {
  return (
    <div className="modale-overlay" onClick={onAnnulla}>
      <div className="modale conferma-modale" onClick={(e) => e.stopPropagation()}>
        <h2>{titolo}</h2>
        <p className="conferma-testo">{testo}</p>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onAnnulla} disabled={confermando}>
            Annulla
          </button>
          <button type="button" className="btn-elimina-conferma" onClick={onConferma} disabled={confermando}>
            {confermando ? 'Elimino…' : 'Sì, elimina definitivamente'}
          </button>
        </div>
      </div>
    </div>
  )
}
