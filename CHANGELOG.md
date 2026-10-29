## 2.12.4 — 28 ottobre 2026
- Riallineato il versioning alla 2.12.3 già installata, evitando la regressione introdotta dalla numerazione 2.11.3.
- Conservate le correzioni del pannello aggiornamenti condiviso e quelle alla traduzione presenti nel ramo principale.

## 2.11.3
- Rimossa la diagnostica aggiornamenti ridondante dalla pagina impostazioni; rimane il pannello aggiornamenti condiviso.
- Corretto Aggiorna singolarmente con handler condiviso e selezione del plugin; note di rilascio richiudibili.

## 2.11.2

## 2.12.2
- Aggiornamenti GitHub: ritorno alla pagina di provenienza per aggiornamenti singoli e congiunti; origine validata e conservata nelle richieste amministrative.

- Pannello condiviso degli aggiornamenti IRES con versioni e note delle release.
- Controllo congiunto e aggiornamento sequenziale di entrambi i plugin quando necessario.

# Changelog

## 2.13.8
- Protezione conservativa per pagine con tabelle: rilevamento preliminare di righe con colonne numeriche ripetute; overlay tradotti disattivati sulle pagine riconosciute per non alterare la relazione tra etichette e valori.
- Avviso Glass non invasivo nella lingua dell'interfaccia (IT, EN, FR, DE, ES, PT); il PDF originale rimane leggibile.
- La traduzione automatica di celle e tabelle non è ancora implementata: richiederà ricostruzione geometrica e verifica della corrispondenza dati.
- Riconoscimento euristico da validare su PDF diversi, incluse tabelle senza colonne numeriche.


## 2.13.7
- Indicatore di traduzione montato direttamente nel contenitore visibile del lettore, non più nel flusso delle pagine PDF.
- Posizionamento flottante fisso nella parte inferiore della vista, visibile anche scorrendo il PDF o la lettura tradotta; supporto safe-area su iPhone.
- Percentuale e barra di progresso mantenute, con messaggi nella lingua dell'interfaccia.
- Correzione da verificare visivamente su desktop e iOS.


## 2.13.5
- Indicatore di traduzione ancorato al lettore, sempre visibile durante lo scorrimento del PDF e nella lettura ottimizzata.
- Barra di avanzamento sottile in stile Glass, percentuale e messaggi nella lingua dell'interfaccia.
- Gli errori e il pulsante Riprova rimangono accessibili nell'indicatore flottante.


## 2.13.4
- Messaggio esplicativo elegante al primo passaggio automatico alla lettura ottimizzata, con scelta reversibile.
- Testi della modalità tradotta localizzati in italiano, inglese, francese, tedesco, spagnolo e portoghese secondo la lingua dell'interfaccia utente.
- Se l'utente torna al PDF, la modalità ottimizzata non viene riattivata automaticamente durante la stessa sessione di traduzione.
- Indicazione permanente che la struttura della versione tradotta può differire dal PDF originale.


## 2.13.3
- Indici tradotti come righe separate, con numeri di pagina allineati a destra e separatori discreti.
- Corrette le sequenze di newline letterali e la ricomposizione delle righe dell'indice; i numeri di pagina non sono inviati al traduttore.
- Nuova versione delle chiavi cache per evitare il riutilizzo di vecchie traduzioni con layout errato.
- Richiesta verifica visiva in browser prima di avviare la pretraduzione massiva.


## 2.13.2
- Correzione degli indici e delle pagine a struttura complessa: passaggio automatico alla modalità Lettura tradotta, evitando riquadri sovrapposti e testi troncati.
- Pulizia dei separatori di paragrafo e delle sequenze puntinate nella visualizzazione fluida.
- Ripristinato il collegamento effettivo alla cache condivisa WordPress, prima della traduzione e al completamento della pagina.
- L'overlay sul PDF rimane per le pagine semplici; serve ulteriore test visuale su iOS e desktop.


## 2.13.1
- Overlay Glass più uniforme, con sfocatura delicata, bordi ridotti e caratteri più leggibili.
- Nuova modalità Lettura tradotta: pagina editoriale fluida, testo senza ritagli e pulsante per tornare al PDF.
- Migliore gestione dei separatori di paragrafo nella modalità di lettura.
- Le traduzioni continuano a usare cache locale e condivisa introdotte nella 2.13.0.


## 2.13.0
- Overlay tradotto Glass: sfondo chiaro satinato, sfocatura moderata del PDF sottostante, tipografia di sistema, contrasto e fallback per ridotta trasparenza.
- Cache condivisa delle traduzioni per pagina in MySQL WordPress: chiave con fingerprint PDF, pagina, lingua e hash del testo; recupero prima di avviare il modello neurale.
- Lettura pubblica della cache; pubblicazione delle traduzioni condivise limitata agli amministratori autenticati per evitare avvelenamento dei risultati da parte di visitatori anonimi. I visitatori mantengono la cache locale IndexedDB.
- Scorrimento: annulla il lavoro Web Worker della pagina precedente e dà priorità alla nuova pagina visibile.
- Restano da completare: distribuzione self-hosted dei modelli e delle librerie WebAssembly (attualmente caricati da CDN/Hugging Face), benchmarking su dispositivi e procedura di validazione delle traduzioni prima della pubblicazione condivisa.


## 2.12.3
- Ridotto il numero massimo di token generati dal motore locale in proporzione alla lunghezza del testo: evita che titoli brevi dell'indice inneschino decodifiche molto lunghe.
- Segmenti fino a 450 byte e watchdog di 25 secondi per richiesta; eventuali errori restano visibili con pulsante Riprova.
- Correzione mirata al caso indice PDF con avanzamento fermo al 25%; comportamento reale ancora da verificare nel browser dell'utente.


## 2.12.1
- Watchdog di 45 secondi per ogni richiesta al motore neurale: un'elaborazione bloccata viene interrotta e il Web Worker ricreato, anziché lasciare la percentuale congelata indefinitamente.
- Segmenti di traduzione ridotti a 1200 byte per limitare il carico di inferenza per richiesta.
- Ripristinato l'aggiornamento del pannello di traduzione quando una pagina viene caricata dalla cache persistente.
- Il progresso continua a misurare i blocchi completati: durante la prima inizializzazione del modello può rimanere fermo finché il blocco in corso non termina.


## 2.12.0
- Indicatore "Translating" esclusivamente sulla pagina attiva, selezionata dal centro dell'area di lettura; nessun indicatore sulle altre pagine.
- Avanzamento percentuale reale per blocchi tradotti nella pagina (0–100%), senza stime artificiali durante il caricamento iniziale del modello.
- Cache persistente IndexedDB nel browser per pagina e lingua, con chiave basata su fingerprint PDF e hash SHA-256 del testo originale: riapertura senza ritradurre la pagina già completata sullo stesso browser.
- La cache conserva i blocchi e le coordinate dell'overlay, non solo il testo.
- Scorrimento: elimina le pagine obsolete dalla coda e non memorizza traduzioni incomplete.
- Limite attuale: la cache è per browser/dispositivo, non condivisa fra visitatori; una cache condivisa WordPress richiede controlli di integrità e sicurezza separati.


## 2.11.1
- Risolto il blocco dell'interfaccia durante la traduzione neurale: download, inizializzazione e inferenza del modello vengono eseguiti in un Web Worker separato dal thread del lettore PDF.
- La coda traduce esclusivamente la pagina attualmente al centro dell'area visibile, senza precaricare pagine adiacenti; interrompe l'elaborazione dei blocchi successivi se cambia pagina.
- Mantiene la cache delle pagine già tradotte e l'opzione di fallback remoto.
- Nota: il primo download del modello può essere lungo; la compatibilità con Safari/iOS resta da collaudare su dispositivo.


## 2.11.0
- Primo motore neurale locale OPUS-MT per la traduzione italiano → inglese negli overlay del PDF Reader, via Transformers.js e ONNX Runtime Web (WebAssembly).
- Traduzione senza chiave API né quota di caratteri per questa coppia linguistica; download iniziale di librerie e modello da CDN/Hugging Face, con cache browser.
- Provider remoto configurato resta fallback facoltativo quando la traduzione locale non funziona.
- Limiti: qualità, compatibilità Safari/iOS e prestazioni ancora da verificare sul sito; le altre lingue richiedono modelli aggiuntivi; non è ancora una soluzione interamente self-hosted.


## 2.10.3
- Retry automatico con attesa progressiva per le pagine la cui traduzione fallisce temporaneamente.
- Cache lato server per ridurre richieste ripetute al provider e l'incidenza dei limiti orari.
- Gli errori di traduzione non bloccano più definitivamente una pagina durante la sessione.



## 2.10.0
- Traduzione automatica per tutte le pagine visibili, con indicatori localizzati per pagina durante l'elaborazione.
- Invito alla traduzione per browser in inglese, francese, tedesco, spagnolo e portoghese; nessuna trasmissione automatica del testo prima del consenso.
- Localizzazione iniziale dei comandi principali del lettore secondo la lingua del browser, con inglese come fallback.
- Correzione della gestione della coda e delle pagine già tradotte, limitazione degli overlay alle pagine visibili.
- Adeguamento della soglia oraria delle richieste di traduzione server per documenti multipagina.



## 1.2.0
- Lettore PDF con visualizzazione in overlay e pagina dedicata.
- Integrazione automatica sperimentale con il tipo contenuto `pubblicazione`.
- Controllo aggiornamenti tramite release pubbliche GitHub.
- Pipeline GitHub Actions per creare lo ZIP delle release.
