# Logo-Formate für dynamische Einfärbung - Guide

## 🎨 **Optimale Logo-Formate**

### 1. **SVG (Beste Option) 🏆**

#### **Inline SVG mit CSS-Variablen:**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Verwende CSS-Variablen für dynamische Farben -->
  <circle cx="50" cy="50" r="40" fill="var(--color-primary)" />
  <text x="50" y="55" text-anchor="middle" fill="var(--color-secondary)" 
        font-family="Arial" font-size="20" font-weight="bold">DT</text>
</svg>
```

#### **SVG mit currentColor:**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- currentColor nimmt die Textfarbe des Parent-Elements -->
  <path d="M10,10 L90,50 L10,90 Z" fill="currentColor" />
</svg>
```

### 2. **CSS Mask (für bestehende PNGs/JPGs)**
```vue
<template>
  <div class="logo-masked" :style="{ backgroundColor: primaryColor }"></div>
</template>

<style>
.logo-masked {
  mask: url('/logo.png') no-repeat center / contain;
  -webkit-mask: url('/logo.png') no-repeat center / contain;
  width: 100px;
  height: 100px;
}
</style>
```

### 3. **Icon Fonts**
```css
@font-face {
  font-family: 'CustomLogo';
  src: url('/fonts/logo.woff2') format('woff2');
}

.logo-icon {
  font-family: 'CustomLogo';
  color: var(--color-primary);
  font-size: 2rem;
}
```

## 🛠️ **Verwendung der TenantLogo-Komponente**

### **Basis-Verwendung:**
```vue
<template>
  <!-- Automatische Erkennung des Logo-Typs -->
  <TenantLogo 
    :logo-url="tenant.logo_url"
    size="md"
    variant="standard"
    alt-text="Meine Fahrschule Logo"
  />
</template>
```

### **SVG-Logo mit dynamischen Farben:**
```vue
<template>
  <TenantLogo 
    :svg-content="logoSvg"
    logo-type="svg"
    size="lg"
    variant="wide"
    :primary-color="tenant.primary_color"
    :secondary-color="tenant.secondary_color"
  />
</template>

<script setup>
const logoSvg = `
  <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="60" rx="8" fill="var(--color-primary)" />
    <text x="100" y="35" text-anchor="middle" fill="var(--color-secondary)" 
          font-size="20" font-weight="bold">FAHRSCHULE</text>
  </svg>
`
</script>
```

### **Maskiertes Logo (PNG mit Farbüberlagerung):**
```vue
<template>
  <TenantLogo 
    logo-url="/logo.png"
    logo-type="masked"
    size="md"
    :primary-color="tenant.primary_color"
  />
</template>
```

### **Fallback-Logo (Text):**
```vue
<template>
  <TenantLogo 
    logo-type="fallback"
    fallback-text="FS"
    size="sm"
    variant="square"
    :primary-color="tenant.primary_color"
  />
</template>
```

## 📏 **Verfügbare Größen und Varianten**

### **Größen:**
- `xs` - 1.5rem (24px) - Für kleine Icons
- `sm` - 2rem (32px) - Für Sidebar/Navigation
- `md` - 3rem (48px) - Standard-Größe
- `lg` - 4rem (64px) - Für Login/Header
- `xl` - 6rem (96px) - Für Hero-Bereiche
- `custom` - Eigene Größe via CSS

### **Varianten:**
- `square` - 1:1 Verhältnis (für Favicons, Profile)
- `wide` - 3:1 Verhältnis (für Header, Banner)
- `standard` - Natürliche Proportionen

## 🎯 **Verwendung in verschiedenen Kontexten**

### **Header-Logo:**
```vue
<TenantLogo 
  :logo-url="getLogo('header')"
  size="lg"
  variant="wide"
  container-class="header-logo"
/>
```

### **Sidebar-Logo:**
```vue
<TenantLogo 
  :logo-url="getLogo('square')"
  size="sm"
  variant="square"
  container-class="sidebar-logo"
/>
```

### **Login-Seite:**
```vue
<TenantLogo 
  :logo-url="getLogo('header')"
  size="xl"
  variant="standard"
  :primary-color="primaryColor"
  container-class="login-logo"
/>
```

### **Favicon (programmatisch):**
```typescript
// utils/faviconUtils.ts
export function updateFavicon(logoUrl: string, primaryColor: string) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 32
  canvas.height = 32
  
  // Zeichne Logo mit Farbe
  ctx.fillStyle = primaryColor
  ctx.fillRect(0, 0, 32, 32)
  
  // Konvertiere zu Data URL und setze als Favicon
  const dataUrl = canvas.toDataURL()
  const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement
  if (link) {
    link.href = dataUrl
  }
}
```

## 🔧 **Logo-Konvertierung**

### **PNG/JPG zu SVG konvertieren:**
```typescript
import { convertToColoredSvg } from '~/utils/logoUtils'

const coloredSvg = convertToColoredSvg(
  '/logo.png',
  tenant.primary_color,
  200, // width
  60   // height
)
```

### **Text zu SVG-Logo:**
```typescript
import { generateTextLogo } from '~/utils/logoUtils'

const textLogo = generateTextLogo(
  'FS', // Text
  tenant.primary_color,
  'white', // Text-Farbe
  100 // Größe
)
```

## 📱 **Responsive Logo-System**

```vue
<template>
  <div class="logo-responsive">
    <!-- Desktop: Breites Logo -->
    <TenantLogo 
      v-if="!isMobile"
      :logo-url="getLogo('wide')"
      size="lg"
      variant="wide"
    />
    
    <!-- Mobile: Quadratisches Logo -->
    <TenantLogo 
      v-else
      :logo-url="getLogo('square')"
      size="md"
      variant="square"
    />
  </div>
</template>

<script setup>
const { isMobile } = useDevice()
const { getLogo } = useTenantBranding()
</script>
```

## 🎨 **CSS-Variablen für Logo-Styling**

```css
/* In tenant-branding.css bereits definiert */
:root {
  --logo-primary-color: var(--color-primary);
  --logo-secondary-color: var(--color-secondary);
  --logo-size-xs: 1.5rem;
  --logo-size-sm: 2rem;
  --logo-size-md: 3rem;
  --logo-size-lg: 4rem;
  --logo-size-xl: 6rem;
}

/* Verwende in SVGs */
.dynamic-logo svg {
  width: var(--logo-size-md);
  height: var(--logo-size-md);
}

.dynamic-logo svg path {
  fill: var(--logo-primary-color);
  stroke: var(--logo-secondary-color);
}
```

## 🚀 **Best Practices**

1. **SVG bevorzugen** - Beste Qualität und Flexibilität
2. **CSS-Variablen verwenden** - Für automatische Farbaktualisierung
3. **Fallback definieren** - Immer Text-Alternative bereitstellen
4. **Kontrast prüfen** - Lesbarkeit auf verschiedenen Hintergründen
5. **Performance beachten** - SVGs inline nur wenn nötig
6. **Accessibility** - Alt-Texte und ARIA-Labels verwenden

## 📊 **Logo-Format Vergleich**

| Format | Einfärbung | Qualität | Performance | Komplexität |
|--------|------------|----------|-------------|-------------|
| SVG | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| CSS Mask | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Icon Font | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| PNG/JPG | ⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |

**Empfehlung:** SVG mit CSS-Variablen für die beste Flexibilität und Qualität!












