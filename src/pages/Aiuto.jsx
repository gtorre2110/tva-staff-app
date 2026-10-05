import './Aiuto.css'

export default function Aiuto() {
  return (
    <div className="aiuto-page">
      <h1>Aiuto</h1>
      <p className="categorie-sub">Guida rapida alle funzioni dell'app Staff.</p>

      <section>
        <h2>Clienti</h2>
        <p>Elenco a schede di tutti i clienti. Da una scheda puoi modificare i dati, gestire gli ingressi, le categorie, i dati anagrafici estesi, i brevetti, il logbook e la foto profilo. Ogni modifica al saldo ingressi passa da un movimento, così resta uno storico: nel modulo "Ingressi" puoi indicare la data esatta del movimento (anche passata) e scegliere un'attività tra i modelli e le attività una tantum, che compila il motivo. Nei brevetti, "Vedi immagine" apre l'immagine del brevetto (quella caricata dal cliente o, se manca, quella standard) e "Elimina immagine" toglie quella del cliente. Il pulsante "Elimina cliente" è irreversibile e cancella anche tutti i dati collegati.</p>
      </section>

      <section>
        <h2>Modelli e Attività</h2>
        <p>I "Modelli" sono le attività ricorrenti: da un modello generi le "occorrenze" concrete su un intervallo di date scelto. La pagina "Attività" mostra tutte le occorrenze, filtrabili per macrocategoria con le schede in alto; puoi crearne una una tantum, modificarla (nome, data, orari, posti, apertura e chiusura prenotazioni, località e centro di immersione), annullarla/riattivarla o assegnarle delle categorie. Gli orari di apertura e chiusura delle prenotazioni sono in ora italiana. Dopo la chiusura il cliente può comunque registrare una prenotazione "tardiva": è confermata se ci sono posti, altrimenti va in fondo alla lista d'attesa, e va verificata al check-in. Modifica e annullamento non sono disponibili agli assistenti istruttori.</p>
      </section>

      <section>
        <h2>Categorie</h2>
        <p>Limitano quali attività un cliente può vedere e prenotare. Possono avere sottocategorie (solo per organizzarle): cliccando una macrocategoria applichi la stessa scelta a tutte le sue sottocategorie insieme. Tre colori nello stato di un cliente: neutro (non assegnata), azzurro chiaro (richiesta dal cliente, da confermare), blu (confermata).</p>
      </section>

      <section>
        <h2>Cataloghi</h2>
        <p>Elenchi di riferimento riusabili: Tipi di brevetto (con livello numerico, immagine standard e la casella "Brevetto da istruttore", che nei registri mette per primi chi lo possiede), Istruttori, Località di immersione, Centri di immersione. Se un cliente non trova la voce che cerca, può comunque scrivere a mano.</p>
      </section>

      <section>
        <h2>Codici invito</h2>
        <p>Codici che i clienti usano per registrarsi da soli. Puoi collegare delle categorie a un codice: verranno assegnate automaticamente (già confermate) a chi si registra con quel codice.</p>
      </section>

      <section>
        <h2>Check-in</h2>
        <p>Scegli una data, vedi le attività (filtrabili per macrocategoria) con i posti occupati. Apri un'attività per cercare/aggiungere un cliente, spuntare la presenza (scala l'ingresso in automatico), o annullare una prenotazione — anche dopo che la presenza è stata registrata, a differenza del cliente. Le prenotazioni fatte dopo la chiusura sono segnalate come "TARDIVA": decidi tu chi è presente.</p>
      </section>

      <section>
        <h2>Registro immersioni</h2>
        <p>Per gli adempimenti della Legge 70/2006: la scheda "Post-evento" raggruppa automaticamente i logbook per uscita; "Pre-evento" mostra chi è iscritto a un'attività col suo brevetto principale (quello scelto dal cliente, altrimenti il più alto). Ogni scheda si esporta in PDF, CSV o su Google Drive con la stessa struttura: una riga per partecipante, con i dati comuni ripetuti, gli istruttori per primi e le immagini dei brevetti in fondo al PDF. Nel Pre-evento puoi scrivere località e centro di immersione prima di esportare.</p>
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
        <h2>Assistenti istruttori</h2>
        <p>Possono consultare, aggiungere e confermare, ma non cancellare né modificare: su Cataloghi, Modelli, Attività e Categorie possono solo aggiungere, e non possono aprire la scheda dei clienti, né vedere Codici invito, Staff e Log modifiche.</p>
      </section>

      <section>
        <h2>Segnalare un'anomalia</h2>
        <p>Scrivi a apneatreviso@gmail.com con oggetto "anomalia app staff", indicando cosa stavi facendo, dispositivo e browser e, se puoi, uno screenshot.</p>
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
