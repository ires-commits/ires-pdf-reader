## 2.11.2
- Pannello condiviso degli aggiornamenti IRES con versioni e note delle release.
- Controllo congiunto e aggiornamento sequenziale di entrambi i plugin quando necessario.

# Changelog

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
