# IRES PDF Reader — roadmap dopo 2.0.0

## Disponibile nel codice 2.0.0 (da collaudare)
- Segnalibri personali per pagina, conservati solo nel localStorage del browser.
- Link alla pagina e al testo selezionato con parametri URL hash (il testo deve essere estraibile).
- Copia citazione essenziale con titolo, pagina e URL. Autori/anno non vengono inventati: metadati bibliografici completi richiedono una successiva integrazione.
- Conservati gli aggiornamenti GitHub del plugin.

## Iterazioni pianificate
1. 2.1: annotazioni ed evidenziatore persistenti con ancoraggio al testo, esportazione/importazione, privacy locale e fallback per PDF senza testo.
2. 2.2: lettura vocale con Web Speech API, controlli pausa/velocità, verifica supporto browser e accessibilità.
3. 2.3: confronto affiancato di due documenti, sincronizzazione opzionale, gestione memoria e mobile.
4. 2.4: estrazione tabelle con anteprima e CSV; accuratezza da verificare su tabelle complesse, nessuna esportazione silenziosa di dati errati.
5. 2.5: OCR di scansioni, scelta fra browser e server, limiti di elaborazione, informativa privacy.
6. 3.0: assistente AI con fonti, pagine cliccabili, distinzione tra evidenza e inferenza, protezioni dati e controllo costi.

## Gate di qualità
Per ogni release: validazione PHP/JS, prove su PDF testuali e scansionati, documenti lunghi, responsive, accessibilità tastiera, backup e verifica dell'aggiornamento senza disattivazione. Le funzionalità future non sono ancora implementate.
