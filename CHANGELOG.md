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
