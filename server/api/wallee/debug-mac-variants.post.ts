// server/api/wallee/debug-mac-variants.post.ts
// 🔍 TESTE VERSCHIEDENE MAC-STRING VARIANTEN

import { createHmac } from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔍 TESTE VERSCHIEDENE MAC-STRING VARIANTEN')
    
    // Environment Variables
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Wallee configuration'
      })
    }

    const macVersion = '1'
    const macUserId = walleeApplicationUserId
    const macTimestamp = Math.floor(Date.now() / 1000).toString()
    const httpMethod = 'POST'

    // ✅ TESTE VERSCHIEDENE PATH VARIANTEN
    const pathVariants = [
      // Variante 1: Nur der Path ohne Query String
      '/api/transaction/create',
      
      // Variante 2: Path mit Query String (wie wir es gemacht haben)
      `/api/transaction/create?spaceId=${walleeSpaceId}`,
      
      // Variante 3: Vollständige URL
      `https://app-wallee.com/api/transaction/create?spaceId=${walleeSpaceId}`,
      
      // Variante 4: Nur der Transaction Service Teil
      '/api/transaction/create',
      
      // Variante 5: Mit Encoding der Query Parameter
      `/api/transaction/create?spaceId%3D${walleeSpaceId}`
    ]

    console.log('🔧 Base Parameters:', {
      macVersion,
      macUserId,
      macTimestamp,
      httpMethod,
      secretKeyPreview: `${walleeSecretKey.substring(0, 10)}...`
    })

    const results = []

    for (let i = 0; i < pathVariants.length; i++) {
      const requestPath = pathVariants[i]
      
      // MAC String zusammenstellen
      const macString = [
        macVersion,
        macUserId,
        macTimestamp,
        httpMethod,
        requestPath
      ].join('|')

      // HMAC-SHA512 berechnen
      const hmac = createHmac('sha512', walleeSecretKey)
      hmac.update(macString)
      const macValue = hmac.digest('base64')

      const variant = {
        variantNumber: i + 1,
        description: `Variante ${i + 1}: ${requestPath}`,
        requestPath,
        macString,
        macValue,
        headers: {
          'x-mac-version': macVersion,
          'x-mac-userid': macUserId,
          'x-mac-timestamp': macTimestamp,
          'x-mac-value': macValue,
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json'
        }
      }

      results.push(variant)

      console.log(`\n🔍 VARIANTE ${i + 1}:`)
      console.log(`Path: ${requestPath}`)
      console.log(`MAC String: ${macString}`)
      console.log(`MAC Value: ${macValue}`)
    }

    // ✅ TESTE JEDE VARIANTE MIT EINFACHEM SPACE API CALL
    console.log('\n🚀 TESTE JEDE VARIANTE MIT SPACE API CALL...')
    
    for (const variant of results) {
      console.log(`\n🔄 Teste ${variant.description}...`)
      
      try {
        // Teste mit Space API (einfacher als Transaction API)
        const spaceUrl = `https://app-wallee.com/api/space/read?spaceId=${walleeSpaceId}&id=${walleeSpaceId}`
        
        // Berechne MAC für Space API
        const spaceMethod = 'GET'
        const spacePath = `/api/space/read?spaceId=${walleeSpaceId}&id=${walleeSpaceId}`
        
        const spaceMacString = [
          macVersion,
          macUserId,
          macTimestamp,
          spaceMethod,
          spacePath
        ].join('|')
        
        const spaceHmac = createHmac('sha512', walleeSecretKey)
        spaceHmac.update(spaceMacString)
        const spaceMacValue = spaceHmac.digest('base64')
        
        const spaceHeaders = {
          'x-mac-version': macVersion,
          'x-mac-userid': macUserId,
          'x-mac-timestamp': macTimestamp,
          'x-mac-value': spaceMacValue,
          'Accept': 'application/json'
        }
        
        console.log(`Space MAC String: ${spaceMacString}`)
        console.log(`Space MAC Value: ${spaceMacValue}`)
        
        const response = await fetch(spaceUrl, {
          method: spaceMethod,
          headers: spaceHeaders
        })
        
        const status = response.status
        const responseText = await response.text()
        
        console.log(`✅ Status: ${status}`)
        if (status === 200) {
          console.log(`🎉 ERFOLG! Variante funktioniert!`)
          variant.success = true
        } else {
          console.log(`❌ Fehler: ${responseText}`)
          variant.success = false
          variant.error = responseText
        }
        
      } catch (error: any) {
        console.log(`❌ Network Error: ${error.message}`)
        variant.success = false
        variant.error = error.message
      }
    }

    return {
      success: true,
      message: 'MAC Varianten getestet',
      timestamp: macTimestamp,
      variants: results
    }

  } catch (error: any) {
    console.error('❌ Debug Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
})
