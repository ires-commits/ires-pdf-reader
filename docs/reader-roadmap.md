# IRES PDF Reader — roadmap aggiornata

## Versione 2.1: annotazioni personali
- Evidenziatore con quattro colori, note modificabili e cancellabili.
- Pannello Note con collegamenti alla pagina annotata.
- Salvataggio locale nel browser, esportazione/importazione JSON per lo stesso URL PDF.
- Prima implementazione basata sul testo selezionato: per frasi ripetute nella stessa pagina viene evidenziata la prima occorrenza; da migliorare con ancoraggio posizionale.
- Da collaudare su smartphone e PDF con testo suddiviso in molti elementi.

## Prossime versioni
1. 2.3: traduzione multilingue di selezione e pagina; valutare servizio locale/esterno e privacy.
2. 2.4: confronto affiancato tra documenti.
3. 2.5: esportazione tabelle con anteprima e CSV/Excel.
4. 3.0: assistente AI con fonti e riferimenti verificabili.


L'OCR non è nella roadmap principale: i PDF previsti sono prevalentemente testuali. Rimane un'eventuale estensione futura, solo se emerge un bisogno concreto.

## Compatibilità
Mantenere il sistema di aggiornamento GitHub esistente, testare su WordPress e mobile, non modificare il PDF originale. Le note restano nel browser: non sono sincronizzate tra dispositivi senza esportazione/importazione.

## Versione 2.3.0 — Lettura vocale
- Sintesi vocale del testo selezionato o della pagina corrente, con avanzamento automatico sulle pagine successive.
- Comandi Ascolta, Pausa/Riprendi, Stop e velocità 0,75–2×.
- Funzione Web Speech API del browser; disponibilità e voci dipendono dal sistema, non richiede chiavi API.
- Non modifica il PDF. La qualità della lettura dipende dall'ordine testuale estratto dal PDF e dalla disponibilità di voci sul dispositivo.
- La traduzione è il prossimo modulo previsto.
