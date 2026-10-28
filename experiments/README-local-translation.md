# Esperimento traduzione locale WebAssembly

## Obiettivo
Verificare una traduzione neurale nel browser, senza Python, Docker o API di traduzione a consumo, prima di integrarla nel lettore PDF in produzione.

## Implementazione
`experiments/local-translation-browser.html` carica Transformers.js 2.17.2 dal CDN jsDelivr e i modelli `Xenova/opus-mt-it-en` e `Xenova/opus-mt-en-it` da Hugging Face. L'inferenza avviene tramite ONNX Runtime Web (WebAssembly). Modelli e codice possono essere memorizzati nella cache browser.

## Prova manuale
1. Aprire il file HTML tramite un server HTTPS di test, non nel pannello sorgenti GitHub.
2. Selezionare IT→EN, avviare e attendere il primo download del modello.
3. Ripetere EN→IT; verificare l'effettiva traduzione.
4. Ripetere su Chrome, Firefox, Safari desktop e iOS; verificare console, tempi, memoria e download.
5. Verificare la cache con una seconda traduzione e il comportamento con rete assente dopo il primo avvio.

## Limiti e gate prima della produzione
- Non è ancora collegato agli overlay del PDF Reader, né testato nei browser reali.
- Il primo download può essere grande e lento; memoria e prestazioni dipendono dal dispositivo.
- Le richieste a CDN/Hugging Face trasmettono metadati tecnici (non il testo da tradurre); per la produzione valutare self-hosting di asset e modelli, licenze e integrità delle dipendenze.
- Nessun costo a carattere o quota di traduzione, ma hosting/banda e risorse locali non sono gratuiti in senso assoluto.
- La copertura delle lingue e la qualità dei modelli vanno validate separatamente.
- Integrare solo dopo aver superato il test funzionale e di compatibilità; mantenere il motore remoto opzionale come fallback.
