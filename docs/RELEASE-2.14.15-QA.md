# Reader 2.14.15: associazione del PDF e consegna al laboratorio OCR

Il testo inglese salvato e un overlay nel layout originale sono due stati distinti. Questa versione collega il Reader al laboratorio `ires-ps-ocr-overlay` e impedisce che l'azione per una traduzione già salvata rigeneri i blocchi con un'altra chiamata AI.

## Comportamento

Il Reader risolve l'ID tramite l'URL del PDF principale. I candidati provenienti da shortcode, pagina dedicata o contesto WordPress sono verificati sul server; i vecchi link senza ID possono essere risolti tramite una ricerca esatta dell'allegato `pdf_principale`, solo con risultato univoco. Non viene usato il titolo.

Il server calcola l'hash del file corrente. Prima di usare le traduzioni, il Reader controlla lo stesso SHA-256 sui byte realmente caricati da PDF.js, una sola volta per documento aperto. Gli endpoint di testo, geometria e OCR sono accettati solo per la stessa pubblicazione, pagina, lingua e impronta. Un file sostituito o una copia obsoleta nella cache lascia visibile l'originale.

Il testo salvato non viene suddiviso arbitrariamente in riquadri. Se è approvata solo una parte dei riquadri, lo stato indica «layout parziale» con il conteggio sul totale; la vista di lettura conserva comunque tutto il testo inglese salvato. Il Reader mostra gli overlay revisionati già disponibili; per le altre pagine l'amministratore trova «Prepara layout OCR», con pubblicazione e pagina precompilate. Il link apre una seconda scheda. Tornando al Reader vengono rilette le disponibilità, comprese le disattivazioni degli overlay. Il controllo manuale «Leggi testo inglese salvato» rimane disponibile.

Il parametro di sola lettura blocca i motori locali e remoti nel browser e blocca l'endpoint di traduzione server prima di accedere alle chiavi o chiamare un provider. Le cache già presenti per i PDF generici restano leggibili.

## Verifiche riproducibili

```sh
node --check ires-pdf-reader/assets/reader.js
node tests/scientific-stored-translation-contract.cjs
node tests/ocr-reviewed-mask-contract.cjs
php tests/scientific-publication-binding.php
python tests/browser_ocr_integration.py --output ocr-browser-qa
```

I test Node eseguono le funzioni reali con fetch e provider simulati: ID/URL errato, query URL differente, hash o pagina errati, riuso senza chiamate, mancato allineamento, autorizzazione dei comandi amministrativi e opzione di sola lettura. Il test PHP esegue le classi reali con un database simulato: associazioni canoniche, ambiguità, file corrente, collegamenti e blocco del provider. Nessuna chiamata AI e nessuna modifica WordPress.

La verifica browser esercita parser e renderer reali su canvas deterministici, con 4 livelli di zoom e viewport desktop/mobile; controlla maschere, colori, numeri e righe delle tabelle. È eseguita dal workflow sulle PR. Il lancio Chromium nell'ambiente locale è stato impedito dal divieto di socket del sandbox; gli esiti della CI costituiscono quindi la verifica browser di questa modifica.

Queste prove non costituiscono una verifica sul WordPress di produzione, né un'approvazione visiva di tutte le pagine del catalogo. I file PDF, le traduzioni salvate e i record OCR attivi non vengono modificati dall'aggiornamento del Reader.
