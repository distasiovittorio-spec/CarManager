# CarManager – guida per pubblicare e installare l'app

CarManager è un'app web (PWA): la pubblichi gratis su GitHub e la installi sull'iPhone come una vera app.
Non serve nessun account Apple a pagamento, nessun server, nessun abbonamento.

## Cosa contiene la cartella

- `index.html`, `styles.css`, `app.js`: il programma
- `manifest.webmanifest`, `sw.js`: servono per installarla e farla funzionare anche senza connessione
- `icons/`: il logo (file SVG e immagini PNG)

Non rinominare e non spostare i file: devono restare tutti insieme, con la cartella `icons`.

## Parte 1 – Pubblicare su GitHub (una volta sola)

1. Accedi a **github.com** con il tuo account.
2. Clicca **+** in alto a destra, poi **New repository**.
3. Nome: `carmanager`. Scegli **Public** (GitHub Pages gratuito richiede un repository pubblico). Clicca **Create repository**.
4. Nella pagina del repository clicca **uploading an existing file**.
5. Apri la cartella `carmanager` (dopo aver decompresso lo ZIP) e **trascina dentro tutti i file e la cartella `icons`**. Aspetta che finisca il caricamento.
6. In basso clicca **Commit changes**.
7. Vai in **Settings → Pages**. Sotto *Build and deployment* scegli **Deploy from a branch**, branch **main**, cartella **/ (root)**, poi **Save**.
8. Dopo 1–2 minuti la pagina mostra l'indirizzo dell'app:
   `https://IL-TUO-NOME-UTENTE.github.io/carmanager/`

La privacy resta intatta: sul repository pubblico c'è solo il programma. **I tuoi dati non vengono mai inviati a GitHub**, restano nella memoria dell'iPhone.

## Parte 2 – Installare sull'iPhone

1. Apri l'indirizzo dell'app con **Safari** (deve essere Safari, non altri browser).
2. Tocca il pulsante **Condividi** (quadrato con la freccia in alto).
3. Scorri e tocca **Aggiungi alla schermata Home**, poi **Aggiungi**.
4. Da ora usa l'app **solo dall'icona sulla Home**.

Importante: i dati inseriti dentro Safari e quelli inseriti nell'app installata sono separati. Installa subito l'app e usa solo quella.

## Parte 3 – Come si usa

- **Veicoli**: aggiungi più auto. Toccando un veicolo trovi le schede Riepilogo, Spese, Km, Acquisto, Scadenze.
- **Spese**: registra data, voce di costo, importo e, se vuoi, km e litri. Le voci predefinite sono carburante, assicurazione, bollo, tagliando, ecc.
- **Nuove voci di costo**: Impostazioni → Voci di costo → scrivi il nome → Aggiungi.
- **Km**: per ogni anno inserisci km a inizio e fine anno e il consumo medio (km/l). Se lasci vuoto il consumo, viene stimato dai litri dei rifornimenti.
- **Acquisto**: prezzo, anticipo, numero e importo rate, saldo finale. Il pulsante *Segna rata pagata* aggiorna l'avanzamento.
- **Scadenze**: bollo, assicurazione, revisione, tagliando. Dentro una scadenza trovi *Fatto* (aggiorna la data se si ripete e propone di registrare la spesa) e *Aggiungi al calendario* (così l'iPhone ti avvisa con una notifica).
- **Grafici**: spese per mese, per anno, per categoria e confronto tra veicoli.
- **Esportazione**: Impostazioni → backup completo (file JSON) oppure spese in CSV per Excel.

## Backup: da fare ogni tanto

Se cancelli i dati di Safari o disinstalli l'app, i dati spariscono. Fai un backup (Impostazioni → Esporta backup completo) e salvalo in **File** o su iCloud Drive.
Con lo stesso file puoi anche portare i dati su un altro dispositivo (Importa backup).

## Aggiornare l'app in futuro

Sostituisci i file su GitHub (Add file → Upload files). Se cambi `app.js`, `styles.css` o `index.html`, apri `sw.js` e aumenta il numero in `carmanager-v1` (diventa `carmanager-v2`), così l'iPhone scarica la versione nuova. I dati non si perdono.
