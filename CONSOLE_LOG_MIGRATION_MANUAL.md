# Manual Console.log Migration Guide

## 🎯 Use VSCode Find & Replace for Console.log Migration

This is the **simplest and safest** approach for 4300+ console.log statements.

### Step 1: Use Find & Replace in VSCode

**Press:** `Cmd+H` (or `Ctrl+H` on Windows/Linux)

### Step 2: Replace console.log with logger.debug

**Find:** `console\.log\(`
**Replace:** `logger.debug(`

**Make sure:**
- ✅ "Use Regular Expression" is enabled (regex button `.*`)
- ✅ "Match Whole Word" is DISABLED
- ✅ Start with a small replacement first (click "Replace", not "Replace All")

### Step 3: Replace console.error - BUT KEEP IT!

**DO NOT replace console.error or console.warn!**
Those are important for production debugging.

Just skip them - click the down arrow to go to next match.

### Step 4: Manual Pass for Imports

After replacing all console.log:

```
Find: "logger\.debug\("
Search in: "."

For each file shown:
1. Click the file
2. Add at the top:
   import { logger } from '~/utils/logger'
3. Move to next file

Or use Find+Replace to add import in each file:
Find: ^import
Replace: import { logger } from '~/utils/logger'\nimport

This adds the import before the first import statement
```

### Step 5: Run Linter

```bash
npm run lint
```

This will catch any:
- Missing imports
- Syntax errors from replacements
- Duplicate imports

### Step 6: Fix Linter Errors

Most will be:
- `logger is not defined` → Add missing import
- `Duplicate import statement` → Remove duplicate

VSCode can auto-fix many of these:
```bash
npm run lint -- --fix
```

### Step 7: Test

```bash
npm run dev
```

Open DevTools Console:
- Should see 🔍 debug logs (colored blue)
- No red errors about "logger is not defined"
- Normal app functionality

---

## 📊 Expected Results

| Before | After |
|--------|-------|
| 4,328 console.log() | 4,328 logger.debug() |
| 100+ console.error() | 100+ console.error() (KEPT!) |
| Debug logs in Prod | Debug logs HIDDEN in Prod |
| Messy DevTools | Clean DevTools |

---

## ⚠️ Common Issues & Fixes

### "Cannot find module 'logger'"
**Solution:** Add missing import to that file
```typescript
import { logger } from '~/utils/logger'
```

### "logger is already defined"
**Solution:** You have duplicate imports, remove one

### Some console.log still there?
**Solution:** The regex didn't match that specific format
- Maybe it's `console. log(` with space (rare)
- Or `console["log"](` (very rare)
- Just fix those manually

### Too many replacements happened?
**Solution:** Undo with `Cmd+Z` and be more careful with regex

### Replaced in strings by mistake?
**Solution:** That's OK if it's in error messages like:
```typescript
"Error: console.log() is deprecated"
// vs
logger.debug("Error: console.log() is deprecated") // This is fine!
```

---

## 🎬 Quick Summary

1. Open VSCode → `Cmd+H` (Find & Replace)
2. Find: `console\.log\(` 
3. Replace: `logger.debug(`
4. Enable Regex Mode (.*) button
5. Click "Replace All"
6. Manually add imports to each file that uses logger.debug
7. Run `npm run lint --fix`
8. Run `npm run dev` and test
9. Done! 🎉

---

## 📝 Actual VSCode Steps with Screenshots

If confused, here's EXACT what to do:

1. Press `Cmd+H` - Find & Replace opens
2. Type in "Find" field: `console\.log\(`
3. Type in "Replace" field: `logger.debug(`
4. Click `.* icon` (toggle regex) - it should be highlighted
5. Click `Replace All` button (the icon with two boxes)
6. Wait for completion message

Then:
7. Press `Cmd+Shift+F` - Open "Search" tab
8. Search for: `logger\.debug\(`
9. Go through each file and add `import { logger } from '~/utils/logger'` at the top
10. Run: `npm run lint --fix`
11. Run: `npm run dev`
12. Check DevTools - should have no errors

---

## ✅ When You're Done

- [ ] All console.log → logger.debug
- [ ] All files with logger.debug have imports
- [ ] npm run lint passes
- [ ] npm run dev starts without errors
- [ ] Browser console looks clean (no red errors)
- [ ] Ready for production!

Ready to proceed? Start with VSCode Find & Replace!

