import './Aiuto.css'

export default function Aiuto() {
  return (
    <div className="aiuto-page">
      <h1>Aiuto</h1>
      <p className="categorie-sub">Guida rapida alle funzioni dell'app Staff.</p>

      <section>
        <h2>Clienti</h2>
        <p>Elenco a schede di tutti i clienti. Da una scheda puoi modificare i dati, gestire gli ingressi (ogni modifica al saldo passa da un movimento, così resta uno storico), le categorie, i dati anagrafici estesi, i brevetti, il logbook e la foto profilo. Il pulsante "Elimina cliente" è irreversibile e cancella anche tutti i dati collegati.</p>
      </section>

      <section>
        <h2>Modelli e Attività</h2>
        <p>I "Modelli" sono le attività ricorrenti: da un modello generi le "occorrenze" concrete su un intervallo di date scelto. La pagina "Attività" mostra tutte le occorrenze, filtrabili per macrocategoria con le schede in alto; puoi crearne una una tantum, annullarla/riattivarla o assegnarle delle categorie.</p>
      </section>

      <section>
        <h2>Categorie</h2>
        <p>Limitano quali attività un cliente può vedere e prenotare. Possono avere sottocategorie (solo per organizzarle): cliccando una macrocategoria applichi la stessa scelta a tutte le sue sottocategorie insieme. Tre colori nello stato di un cliente: neutro (non assegnata), azzurro chiaro (richiesta dal cliente, da confermare), blu (confermata).</p>
      </section>

      <section>
        <h2>Cataloghi</h2>
        <p>Elenchi di riferimento riusabili: Tipi di brevetto (con livello numerico e immagine standard), Istruttori, Località di immersione, Centri di immersione. Se un cliente non trova la voce che cerca, può comunque scrivere a mano.</p>
      </section>

      <section>
        <h2>Codici invito</h2>
        <p>Codici che i clienti usano per registrarsi da soli. Puoi collegare delle categorie a un codice: verranno assegnate automaticamente (già confermate) a chi si registra con quel codice.</p>
      </section>

      <section>
        <h2>Check-in</h2>
        <p>Scegli una data, vedi le attività (filtrabili per macrocategoria) con i posti occupati. Apri un'attività per cercare/aggiungere un cliente, spuntare la presenza (scala l'ingresso in automatico), o annullare una prenotazione — anche dopo che la presenza è stata registrata, a differenza del cliente.</p>
      </section>

      <section>
        <h2>Registro immersioni</h2>
        <p>Per gli adempimenti della Legge 70/2006: la scheda "Post-evento" raggruppa automaticamente i logbook per uscita; "Pre-evento" mostra chi è iscritto a un'attività col suo brevetto di livello più alto. Entrambe esportabili in CSV.</p>
      </section>

      <section>
        <h2>Da fare</h2>
        <p>Raccoglie in un unico posto le cose in sospeso: categorie richieste dai clienti, logbook da confermare e, solo per gli amministratori, richieste di accesso staff. Un numero rosso nel menu ti avvisa quando c'è qualcosa.</p>
      </section>

      <section>
        <h2>Info</h2>
        <p>Quello che i clienti trovano nella loro pagina "Info", in due schede. "Informazioni": testi che scrivi qui (legge del mare, regole di sicurezza…), con generazione automatica di un PDF scaricabile. "Documenti": PDF che carichi già pronti, da scaricare o compilare (es. un modulo vergine). Le freccette ordinano l'elenco di ciascuna scheda, "Nascondi"/"Pubblica" decide cosa è visibile ai clienti.</p>
      </section>

      <section>
        <h2>Staff</h2>
        <p>Visibile solo agli amministratori. Approva le richieste di accesso, disattiva o elimina membri dello staff. Gli amministratori si creano solo da database, mai da qui.</p>
      </section>

      <section>
        <h2>Suggerimenti pratici</h2>
        <ul>
          <li>Se cambi app o il telefono blocca lo schermo prima di salvare, le modifiche restano in bozza e le ritrovi al ritorno.</li>
          <li>Su smartphone il menu si apre dal pulsante rotondo in basso a destra.</li>
          <li>Tutti i testi vengono salvati in maiuscolo automaticamente, per uniformità.</li>
        </ul>
      </section>
    </div>
  )
}
