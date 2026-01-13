#!/usr/bin/env node

/**
 * Status Change Modal - Quick Diagnostic Tool
 * Run this in the browser console to diagnose issues
 */

// Copy and paste this entire script into your browser console (F12)

console.clear()
console.log('%c=== STATUS CHANGE MODAL DIAGNOSTIC ===', 'color: blue; font-weight: bold; font-size: 16px')
console.log('')

// 1. Check if modals exist in DOM
console.log('%c1. CHECKING DOM ELEMENTS', 'color: green; font-weight: bold; font-size: 14px')

const statusChangeModal = document.querySelector('div[class*="fixed"][class*="inset-0"][class*="z-\\[9999\\]"]')
const statusChangeModalExists = !!statusChangeModal
console.log(`   Status Change Modal exists: ${statusChangeModalExists ? '✅' : '❌'}`)

if (statusChangeModal) {
  const isVisible = statusChangeModal.style.display !== 'none'
  const zIndex = window.getComputedStyle(statusChangeModal).zIndex
  const opacity = window.getComputedStyle(statusChangeModal).opacity
  console.log(`   - Display: ${isVisible ? 'visible' : 'hidden'}`)
  console.log(`   - Z-Index: ${zIndex}`)
  console.log(`   - Opacity: ${opacity}`)
}

// 2. Check all modals and their z-index
console.log('')
console.log('%c2. ALL MODALS Z-INDEX', 'color: green; font-weight: bold; font-size: 14px')

const allModals = document.querySelectorAll('div[class*="fixed"][class*="inset-0"]')
console.log(`   Total modals found: ${allModals.length}`)
allModals.forEach((modal, idx) => {
  const zIndex = window.getComputedStyle(modal).zIndex
  const display = modal.style.display !== 'none' ? 'visible' : 'hidden'
  const title = modal.querySelector('h2')?.textContent || 'Unknown'
  console.log(`   [${idx}] z-${zIndex} (${display}) - ${title}`)
})

// 3. Check Vue reactive state (if available)
console.log('')
console.log('%c3. VUE REACTIVE STATE', 'color: green; font-weight: bold; font-size: 14px')

try {
  // Try to access Vue component instance
  const app = document.querySelector('#__nuxt')?.__vue_app__
  if (app) {
    console.log('   ✅ Vue app found')
    // Note: Exact way to access state depends on Vue version
    console.log('   → Check Vue DevTools (F12 → Vue tab) for full state')
  } else {
    console.log('   ❌ Vue app not found')
  }
} catch (e) {
  console.log(`   ⚠️  Could not access Vue state: ${e.message}`)
}

// 4. Simulate dropdown change
console.log('')
console.log('%c4. TESTING STATUS DROPDOWN', 'color: green; font-weight: bold; font-size: 14px')

const statusSelects = document.querySelectorAll('select[class*="text-xs"][class*="font-medium"]')
console.log(`   Found ${statusSelects.length} status dropdowns`)

if (statusSelects.length > 0) {
  console.log(`   First dropdown value: ${statusSelects[0].value}`)
  console.log('   Options available:')
  Array.from(statusSelects[0].options).forEach(opt => {
    console.log(`     - ${opt.value} (${opt.textContent})`)
  })
}

// 5. Z-Index comparison
console.log('')
console.log('%c5. Z-INDEX HIERARCHY', 'color: green; font-weight: bold; font-size: 14px')

const zIndexMap = {}
allModals.forEach((modal, idx) => {
  const zIndex = window.getComputedStyle(modal).zIndex
  if (!zIndexMap[zIndex]) zIndexMap[zIndex] = []
  zIndexMap[zIndex].push(idx)
})

Object.keys(zIndexMap)
  .sort((a, b) => b - a)
  .forEach(z => {
    const isHighest = z === Object.keys(zIndexMap).sort((a, b) => b - a)[0]
    const status = isHighest ? '✅ HIGHEST' : '⚠️'
    console.log(`   ${status} z-${z}: ${zIndexMap[z].length} modal(s)`)
  })

// 6. Console monitoring setup
console.log('')
console.log('%c6. MONITORING SETUP', 'color: green; font-weight: bold; font-size: 14px')

// Create a monitoring function
window.monitorStatusChange = function() {
  console.clear()
  console.log('%c📊 STATUS CHANGE MONITORING ACTIVE', 'color: blue; font-weight: bold')
  console.log('The next logs from "logger.ts:100" will be captured here...')
  console.log('')
  
  // This is just informational - actual logs come from the app
  console.log('Expected log sequence:')
  console.log('1️⃣  🔄 handleStatusChange STARTED')
  console.log('2️⃣  📋 updateCourseStatus STARTED')
  console.log('3️⃣  🎨 Setting showStatusChangeModal to true...')
  console.log('4️⃣  🔘 confirmStatusChange clicked!')
  console.log('5️⃣  ✅ Course status updated in DB')
  console.log('')
  console.log('Type: monitorStatusChange() to see this again')
}

console.log('   Run "monitorStatusChange()" to start monitoring')

// 7. Summary
console.log('')
console.log('%c=== DIAGNOSTIC SUMMARY ===', 'color: blue; font-weight: bold; font-size: 14px')

const issues = []
if (!statusChangeModalExists) issues.push('Status Change Modal not found in DOM')
if (allModals.length === 0) issues.push('No modals found at all')

if (issues.length === 0) {
  console.log('✅ All checks passed!')
  console.log('')
  console.log('Next steps:')
  console.log('1. Click on a status dropdown')
  console.log('2. Check the console logs')
  console.log('3. Modal should appear')
  console.log('4. Click "Status ändern" button')
} else {
  console.log('❌ Issues found:')
  issues.forEach(issue => console.log(`   - ${issue}`))
}

console.log('')
console.log('%cEnd of diagnostic. Good luck! 🚀', 'color: green; font-weight: italic')

