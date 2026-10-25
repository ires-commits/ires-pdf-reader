# IRES PDF Reader — roadmap aggiornata

## Versione 2.1: annotazioni personali
- Evidenziatore con quattro colori, note modificabili e cancellabili.
- Pannello Note con collegamenti alla pagina annotata.
- Salvataggio locale nel browser, esportazione/importazione JSON per lo stesso URL PDF.
- Prima implementazione basata sul testo selezionato: per frasi ripetute nella stessa pagina viene evidenziata la prima occorrenza; da migliorare con ancoraggio posizionale.
- Da collaudare su smartphone e PDF con testo suddiviso in molti elementi.

## Prossime versioni
1. 2.2: lettura vocale, velocità, pausa/ripresa, accessibilità.
2. 2.3: traduzione multilingue di selezione e pagina; valutare servizio locale/esterno e privacy.
3. 2.4: confronto affiancato tra documenti.
4. 2.5: esportazione tabelle con anteprima e CSV/Excel.
5. 3.0: assistente AI con fonti e riferimenti verificabili.

L'OCR non è nella roadmap principale: i PDF previsti sono prevalentemente testuali. Rimane un'eventuale estensione futura, solo se emerge un bisogno concreto.

## Compatibilità
Mantenere il sistema di aggiornamento GitHub esistente, testare su WordPress e mobile, non modificare il PDF originale. Le note restano nel browser: non sono sincronizzate tra dispositivi senza esportazione/importazione.
