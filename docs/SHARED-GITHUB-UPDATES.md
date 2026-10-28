# Coordinamento: pagina unica aggiornamenti GitHub

## Decisione condivisa (28 ottobre 2026)
La pagina WordPress di riferimento sarà **Pubblicazioni → Aggiornamenti GitHub**, già prevista dal plugin IRES Produzione Scientifica.

Deve mostrare due righe/schede:
1. IRES Produzione Scientifica
2. IRES PDF Reader

Per ogni plugin: versione installata, ultima release, stato, data ultimo controllo, changelog della release e pulsanti **Verifica aggiornamenti** / **Aggiorna ora**. Aggiungere **Aggiorna entrambi** solo con controlli di autorizzazione, nonce, sequenza e gestione errori indipendente per ogni plugin.

## Contratto d'integrazione
- Il plugin Produzione Scientifica ospita la pagina comune e funge da orchestratore; non deve duplicare la logica di verifica/download del PDF Reader.
- Il PDF Reader espone un'interfaccia PHP stabile, autorizzata e riutilizzabile per diagnostica, controllo e aggiornamento; non eseguire operazioni amministrative da endpoint REST pubblici.
- Se uno dei due plugin è disattivato, la pagina comune deve indicarlo senza errori fatali.
- Nessun token GitHub su WordPress: usare release ZIP pubbliche dal repository di distribuzione; il repository sorgente può rimanere privato.
- Ogni aggiornamento deve mantenere changelog e documentazione tecnica aggiornati.
- La pagina Impostazioni → IRES PDF Reader potrà rimandare alla pagina comune, conservando un fallback diagnostico se il plugin Produzione Scientifica non è presente.
- Mostrare le note della release da fonte attendibile con escaping WordPress; non rendere HTML remoto arbitrario.
- Verificare gli aggiornamenti separatamente; non installare automaticamente entrambi senza un'azione esplicita dell'amministratore.

## Criteri di accettazione
1. Entrambe le versioni sono rilevate correttamente.
2. I due changelog sono visibili prima dell'installazione.
3. Funzionano aggiornamento singolo e aggiornamento congiunto.
4. Nessuna regressione nel GitHub updater esistente.
5. Nessun caricamento ZIP manuale, nessuna credenziale GitHub nel sito.
6. Test con un plugin disattivato e con release non disponibile.

Documento di coordinamento: aggiornare nei rispettivi repository prima dell'implementazione.
