<template>
  <div class="tenant-branding-demo p-md">
    <!-- Header mit Tenant-Logo und -Farben -->
    <div class="demo-header bg-primary text-white p-lg rounded mb-md">
      <div class="flex items-center gap-md">
        <img 
          v-if="logo" 
          :src="logo" 
          :alt="`${brandName} Logo`"
          class="h-12 w-auto"
        >
        <div>
          <h1 class="text-2xl font-heading font-bold mb-xs">{{ brandName }}</h1>
          <p v-if="tagline" class="text-sm opacity-90">{{ tagline }}</p>
        </div>
      </div>
    </div>

    <!-- Farbpalette Demonstration -->
    <div class="demo-colors mb-lg">
      <h2 class="text-lg font-heading font-semibold mb-md text-text">Farbpalette</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-sm">
        <div class="color-swatch">
          <div class="bg-primary h-16 rounded mb-xs"></div>
          <span class="text-sm text-text-secondary">Primary</span>
        </div>
        <div class="color-swatch">
          <div class="bg-secondary h-16 rounded mb-xs"></div>
          <span class="text-sm text-text-secondary">Secondary</span>
        </div>
        <div class="color-swatch">
          <div class="bg-accent h-16 rounded mb-xs"></div>
          <span class="text-sm text-text-secondary">Accent</span>
        </div>
        <div class="color-swatch">
          <div class="bg-success h-16 rounded mb-xs"></div>
          <span class="text-sm text-text-secondary">Success</span>
        </div>
        <div class="color-swatch">
          <div class="bg-warning h-16 rounded mb-xs"></div>
          <span class="text-sm text-text-secondary">Warning</span>
        </div>
        <div class="color-swatch">
          <div class="bg-error h-16 rounded mb-xs"></div>
          <span class="text-sm text-text-secondary">Error</span>
        </div>
        <div class="color-swatch">
          <div class="bg-info h-16 rounded mb-xs"></div>
          <span class="text-sm text-text-secondary">Info</span>
        </div>
        <div class="color-swatch">
          <div class="bg-surface h-16 rounded mb-xs border"></div>
          <span class="text-sm text-text-secondary">Surface</span>
        </div>
      </div>
    </div>

    <!-- Button-Styles Demonstration -->
    <div class="demo-buttons mb-lg">
      <h2 class="text-lg font-heading font-semibold mb-md text-text">Buttons</h2>
      <div class="flex flex-wrap gap-sm">
        <button class="btn-primary px-md py-sm rounded">Primary Button</button>
        <button class="btn-secondary px-md py-sm rounded">Secondary Button</button>
        <button class="btn-outline-primary px-md py-sm rounded">Outline Button</button>
        <button class="bg-success text-white px-md py-sm rounded">Success Button</button>
        <button class="bg-warning text-white px-md py-sm rounded">Warning Button</button>
        <button class="bg-error text-white px-md py-sm rounded">Error Button</button>
      </div>
    </div>

    <!-- Form-Styles Demonstration -->
    <div class="demo-forms mb-lg">
      <h2 class="text-lg font-heading font-semibold mb-md text-text">Form Elements</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div>
          <label class="block text-sm font-medium text-text mb-xs">Text Input</label>
          <input 
            type="text" 
            class="form-control w-full px-sm py-xs rounded border border-gray-300 bg-surface text-text"
            placeholder="Eingabe..."
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-xs">Select</label>
          <select class="form-control w-full px-sm py-xs rounded border border-gray-300 bg-surface text-text">
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </select>
        </div>
      </div>
      <div class="mt-md">
        <label class="flex items-center gap-xs">
          <input type="checkbox" class="form-check-input">
          <span class="text-sm text-text">Checkbox mit Tenant-Farben</span>
        </label>
      </div>
    </div>

    <!-- Card-Styles Demonstration -->
    <div class="demo-cards mb-lg">
      <h2 class="text-lg font-heading font-semibold mb-md text-text">Cards & Surfaces</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div class="card p-md">
          <h3 class="font-heading font-semibold text-text mb-xs">Standard Card</h3>
          <p class="text-sm text-text-secondary">Eine einfache Karte mit Standard-Schatten.</p>
        </div>
        <div class="card-elevated p-md">
          <h3 class="font-heading font-semibold text-text mb-xs">Elevated Card</h3>
          <p class="text-sm text-text-secondary">Eine Karte mit erhöhtem Schatten-Effekt.</p>
        </div>
        <div class="card p-md border-l-4 border-primary">
          <h3 class="font-heading font-semibold text-text mb-xs">Accent Card</h3>
          <p class="text-sm text-text-secondary">Eine Karte mit Tenant-Primärfarbe als Akzent.</p>
        </div>
      </div>
    </div>

    <!-- Typography Demonstration -->
    <div class="demo-typography mb-lg">
      <h2 class="text-lg font-heading font-semibold mb-md text-text">Typografie</h2>
      <div class="space-y-sm">
        <h1 class="text-3xl font-heading font-bold text-text">Heading 1 - {{ currentBranding?.typography.headingFontFamily }}</h1>
        <h2 class="text-2xl font-heading font-semibold text-text">Heading 2</h2>
        <h3 class="text-xl font-heading font-medium text-text">Heading 3</h3>
        <p class="font-base text-text">
          Fließtext mit der Basis-Schriftart: {{ currentBranding?.typography.fontFamily }}. 
          Die Schriftgröße beträgt {{ currentBranding?.typography.fontSizeBase }}px.
        </p>
        <p class="text-sm text-text-secondary">Sekundärer Text in kleinerer Schrift.</p>
      </div>
    </div>

    <!-- Spacing Demonstration -->
    <div class="demo-spacing mb-lg">
      <h2 class="text-lg font-heading font-semibold mb-md text-text">Spacing System</h2>
      <div class="space-y-xs">
        <div class="bg-primary-100 p-xs rounded">XS Spacing ({{ currentBranding?.layout.spacingUnit }}px)</div>
        <div class="bg-primary-100 p-sm rounded">SM Spacing ({{ currentBranding?.layout.spacingUnit * 2 }}px)</div>
        <div class="bg-primary-100 p-md rounded">MD Spacing ({{ currentBranding?.layout.spacingUnit * 4 }}px)</div>
        <div class="bg-primary-100 p-lg rounded">LG Spacing ({{ currentBranding?.layout.spacingUnit * 6 }}px)</div>
        <div class="bg-primary-100 p-xl rounded">XL Spacing ({{ currentBranding?.layout.spacingUnit * 8 }}px)</div>
      </div>
    </div>

    <!-- Theme Toggle -->
    <div class="demo-theme mb-lg" v-if="canSwitchTheme">
      <h2 class="text-lg font-heading font-semibold mb-md text-text">Theme Control</h2>
      <div class="flex items-center gap-md">
        <button 
          @click="toggleTheme"
          class="btn-outline-primary px-md py-sm rounded flex items-center gap-xs"
        >
          <span v-if="effectiveTheme === 'light'">🌞</span>
          <span v-else>🌙</span>
          {{ effectiveTheme === 'light' ? 'Light Mode' : 'Dark Mode' }}
        </button>
        <span class="text-sm text-text-secondary">
          Aktuelles Theme: {{ theme }} (effektiv: {{ effectiveTheme }})
        </span>
      </div>
    </div>

    <!-- Branding Info -->
    <div class="demo-info">
      <h2 class="text-lg font-heading font-semibold mb-md text-text">Branding Information</h2>
      <div class="card p-md">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-md text-sm">
          <div>
            <strong class="text-text">Tenant:</strong> {{ currentBranding?.name || 'Loading...' }}
          </div>
          <div>
            <strong class="text-text">Slug:</strong> {{ currentBranding?.slug || 'Loading...' }}
          </div>
          <div>
            <strong class="text-text">Primary Color:</strong> 
            <span class="inline-block w-4 h-4 rounded ml-xs" :style="{ backgroundColor: primaryColor }"></span>
            {{ primaryColor }}
          </div>
          <div>
            <strong class="text-text">Border Radius:</strong> {{ currentBranding?.layout.borderRadius }}px
          </div>
          <div>
            <strong class="text-text">Font Family:</strong> {{ currentBranding?.typography.fontFamily }}
          </div>
          <div>
            <strong class="text-text">Theme Switch:</strong> {{ currentBranding?.allowThemeSwitch ? 'Enabled' : 'Disabled' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { 
  currentTenantBranding: currentBranding, 
  brandName, 
  primaryColor,
  getLogo 
} = useTenantBranding()

const { 
  theme, 
  effectiveTheme, 
  canSwitchTheme, 
  toggleTheme 
} = useUIStore()

const logo = computed(() => getLogo('header'))
const tagline = computed(() => currentBranding.value?.meta.tagline)
</script>

<style scoped>
/* Component-spezifische Styles */
.tenant-branding-demo {
  font-family: var(--font-family);
}

.color-swatch {
  text-align: center;
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .demo-header {
    text-align: center;
  }
  
  .demo-header .flex {
    flex-direction: column;
  }
}
</style>
