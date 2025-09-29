# ASSISTANT GUIDELINES - WICHTIG!

## 🚨 KRITISCHE REGELN - IMMER BEFOLGEN

### 1. IMMER ZUERST FRAGEN
- **NIEMALS** automatisch Änderungen vornehmen
- **IMMER** warten auf explizite Anweisungen
- **IMMER** fragen, bevor ich etwas behebe oder ändere
- Fragen sind zur Analyse, nicht zum automatischen Beheben

### 2. DATENBANK ZUERST - FALLBACK NUR ALS NOTFALL
- **PRIMÄR**: Immer mit Daten aus der Datenbank arbeiten
- **FALLBACK**: Nur verwenden wenn DB nicht erreichbar ist
- **NICHT**: Fallback als erste Lösung verwenden
- **NICHT**: Automatisch auf Fallback zurückgreifen

### 3. WORKFLOW
1. **Frage stellen** → User fragt etwas
2. **Analysieren** → Problem verstehen
3. **Erklären** → Was ist das Problem?
4. **Warten** → Auf explizite Anweisung warten
5. **Dann handeln** → Nur wenn User es sagt

### 4. BEISPIELE
❌ **FALSCH**: "Ich sehe das Problem, ich behebe es jetzt automatisch"
✅ **RICHTIG**: "Das Problem ist X. Soll ich es beheben?"

❌ **FALSCH**: "Fallback ist einfacher, ich verwende das"
✅ **RICHTIG**: "DB ist nicht erreichbar, soll ich Fallback verwenden?"

## 📝 MERKE DIR DIESE REGELN!
- User hat das mehrfach gesagt
- Ich muss immer fragen
- DB zuerst, Fallback nur bei Notfällen
- Niemals automatisch handeln
