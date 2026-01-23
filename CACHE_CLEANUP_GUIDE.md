# Cache Cleanup Guide - Vor Neustart

## Was wird automatisch gelöscht bei Neustart?
- ✅ RAM (Speicher)
- ✅ Temp Files in `/tmp/`
- ✅ Browser-Tabs und Sessions

## Was BLEIBT und sollte manuell gelöscht werden?

### 1. 🔴 KRITISCH - Node Caches (Dev Server)
```bash
# Lösche node_modules cache
rm -rf node_modules/.cache

# Lösche npm cache
npm cache clean --force

# Lösche yarn cache (falls verwendet)
yarn cache clean

# Lösche Next.js cache (falls verwendet)
rm -rf .next
```

**Warum**: Development Server cached Builds, kann zu Problemen führen

---

### 2. 🟡 WICHTIG - Browser Caches
```bash
# Chrome/Brave Cache
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Cache
rm -rf ~/Library/Application\ Support/Brave-Browser/Default/Cache

# Safari Cache
rm -rf ~/Library/Safari/History.db
rm -rf ~/Library/Safari/TopSites.db

# Firefox Cache
rm -rf ~/Library/Firefox/Profiles/*/cache2
```

**Warum**: Old API responses können gecacht sein

---

### 3. 🟡 WICHTIG - Project-Spezifische Caches
```bash
# Gehe in dein Projekt
cd /Users/pascalkilchenmann/driving-team-app

# Lösche lokale Caches
rm -rf .nuxt          # Nuxt cache
rm -rf dist           # Build output
rm -rf .turbo         # Turbo cache
```

**Warum**: Build-Artefakte können alt sein

---

### 4. 🟢 OPTIONAL - System Caches
```bash
# macOS cache
rm -rf ~/Library/Caches

# DNS cache löschen
sudo dscacheutil -flushcache

# Terminal-History (optional)
rm ~/.bash_history
rm ~/.zsh_history
```

**Vorsicht**: Kann andere Apps beeinflussen

---

## 📋 Checklist: Sauberer Start

### Vor dem Restart (5 Minuten)

```bash
# 1. Projekt-Caches löschen
cd /Users/pascalkilchenmann/driving-team-app
rm -rf .nuxt node_modules/.cache dist

# 2. npm Cache leeren
npm cache clean --force

# 3. Optional: node_modules neu installieren
rm -rf node_modules package-lock.json
npm install

# 4. Git status prüfen (alles committed?)
git status
# Expected: "nothing to commit, working tree clean"
```

### Nach dem Restart

```bash
# 1. Projekt öffnen
cd /Users/pascalkilchenmann/driving-team-app

# 2. Dependencies frisch installieren
npm install

# 3. Dev Server starten
npm run dev
# Sollte clean booten ohne Errors

# 4. Browser öffnen und harte Refresh
# Chrome: Cmd+Shift+R (oder Cmd+Option+R)
# Safari: Cmd+Option+R
# Firefox: Cmd+Shift+R
```

---

## 🎯 Mein Empfehlung für deinen Fall

Da du gerade neue Migrations deployed hast, würde ich folgendes machen:

```bash
# Nur das Nötigste löschen:
cd /Users/pascalkilchenmann/driving-team-app

# 1. Next.js / Nuxt Cache
rm -rf .nuxt dist

# 2. Node Cache
npm cache clean --force

# 3. Dann NEUSTART des MacBook

# Nach Restart:
npm install
npm run dev

# Browser: Harte Refresh (Cmd+Shift+R)
```

**Warum minimal**: 
- Deine Datenbank ist in der Cloud (Supabase), wird nicht gecacht
- Node modules sind nicht das Problem
- Nur Build-Caches können stale sein

---

## ⚡ Schnelle Variante (< 2 Min)

Wenn du ungeduldig bist 😄

```bash
cd /Users/pascalkilchenmann/driving-team-app
rm -rf .nuxt dist
npm cache clean --force
# Neustart
```

Dann direkt:
```bash
npm run dev
```

---

## ❌ NICHT löschen (Vorsicht!)

```
❌ Nicht: rm -rf node_modules
   (dauert 5+ Min zum reinstallieren)

❌ Nicht: rm -rf ~/Library/Caches
   (kann andere Apps brechen)

❌ Nicht: sudo rm -rf /tmp/*
   (könnte System beeinflussen)
```

---

## 📊 Zusammenfassung

| Cache | Automatisch gelöscht? | Manuell löschen? |
|-------|----------------------|------------------|
| RAM | ✅ Ja | - |
| `/tmp/` | ✅ Ja | - |
| Browser-Sessions | ✅ Ja | ⚠️ Optional |
| Node Caches | ❌ Nein | ✅ **JA** |
| Build Artefakte | ❌ Nein | ✅ **JA** |
| npm Cache | ❌ Nein | ✅ **JA** |
| Supabase Daten | - | - (In der Cloud!) |

---

## 🚀 Final Checklist

```bash
# VOR Restart
cd /Users/pascalkilchenmann/driving-team-app
rm -rf .nuxt dist
npm cache clean --force
git status  # Alles committed?

# Neustart MacBook

# NACH Restart
cd /Users/pascalkilchenmann/driving-team-app
npm install
npm run dev

# Browser
# Harte Refresh: Cmd+Shift+R

# Test
# Go to Admin → Courses → Enrollments
# Sollte Daten von VIEW laden ✅
```

---

**Alles klar? Dann: Neustart! 🎉**

Melde dich nach dem Restart wenn du Testing starten willst!

