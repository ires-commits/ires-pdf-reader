# Changelog

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
