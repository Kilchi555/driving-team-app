# Projektdokumentation

Erstellt am: Mon Jul 14 06:54:01 CEST 2025

## Projektstruktur

```
.
├── .env
├── .gitignore
├── .nuxt
│   ├── app.config.mjs
│   ├── components.d.ts
│   ├── dev
│   │   ├── index.mjs
│   │   └── index.mjs.map
│   ├── eslint.config.d.mts
│   ├── eslint.config.mjs
│   ├── imports.d.ts
│   ├── manifest
│   │   ├── latest.json
│   │   └── meta
│   │       ├── 1ef295b4-8892-432b-ac1e-b88c529cc2cf.json
│   │       └── dev.json
│   ├── nitro.json
│   ├── nuxt-icon-client-bundle.mjs
│   ├── nuxt-icon-server-bundle.mjs
│   ├── nuxt.d.ts
│   ├── nuxt.json
│   ├── nuxtui-tailwind.config.mjs
│   ├── schema
│   │   ├── nuxt.schema.d.ts
│   │   └── nuxt.schema.json
│   ├── tailwind
│   │   ├── expose
│   │   │   └── index.mjs
│   │   └── postcss.mjs
│   ├── tsconfig.json
│   ├── tsconfig.server.json
│   ├── types
│   │   ├── app-defaults.d.ts
│   │   ├── app.config.d.ts
│   │   ├── build.d.ts
│   │   ├── builder-env.d.ts
│   │   ├── imports.d.ts
│   │   ├── layouts.d.ts
│   │   ├── middleware.d.ts
│   │   ├── nitro-config.d.ts
│   │   ├── nitro-imports.d.ts
│   │   ├── nitro-middleware.d.ts
│   │   ├── nitro-nuxt.d.ts
│   │   ├── nitro-routes.d.ts
│   │   ├── nitro.d.ts
│   │   ├── plugins.d.ts
│   │   ├── schema.d.ts
│   │   ├── tailwind.config.d.ts
│   │   └── vue-shim.d.ts
│   ├── ui.colors.d.ts
│   └── ui.colors.mjs
├── README.md
├── app.vue
├── assets
├── components
│   ├── AddStudentModal.vue
│   ├── CalendarComponent.vue
│   ├── CategorySelector.vue
│   ├── ConfirmationDialog.vue
│   ├── CustomerDashboard.vue
│   ├── DurationSelector.vue
│   ├── EnhancedStudentModal.vue
│   ├── EvaluationModal.vue
│   ├── EventModal.vue
│   ├── EventTypeSelector.vue
│   ├── LocationSelector.vue
│   ├── MoveAppointmentModal.vue
│   ├── PaymentComponent.vue
│   ├── PaymentModal.vue
│   ├── PendenzenModal.vue
│   ├── PriceDisplay.vue
│   ├── ProfileSetup.vue
│   ├── StaffDurationSettings.vue
│   ├── StaffSettings.vue
│   ├── StudentDetailModal.vue
│   └── StudentSelector.vue
├── composables
│   ├── useAppointmentStatus.ts
│   ├── useCategoryData.ts
│   ├── useCurrentUser.ts
│   ├── useDurationManager.ts
│   ├── useEventModalForm.ts
│   ├── useEventModalHandlers.ts
│   ├── useEventModalWatchers.ts
│   ├── usePayments.ts
│   ├── usePendingTasks.ts
│   ├── useStaffCategoryDurations.ts
│   ├── useStaffDurations.ts
│   ├── useStudents.ts
│   ├── useUsers.ts
│   └── useWallee.ts
├── eslint.config.mjs
├── layouts
│   ├── default.vue
│   └── minimal.vue
├── middleware
│   └── auth-check.ts
├── nuxt.config.ts
├── package-lock.json
├── package.json
├── pages
│   ├── AdminEventTypes.vue
│   ├── customer-dashboard.vue
│   ├── customers.vue
│   ├── dashboard.vue
│   ├── debug-auth.vue
│   ├── debug-login.vue
│   ├── index.vue
│   ├── payment
│   │   ├── failed.vue
│   │   └── success.vue
│   ├── register.vue
│   └── reset-password.vue
├── plugins
│   └── wallee.client.ts
├── projekt_dokumentation.md
├── public
│   ├── favicon.ico
│   ├── images
│   │   └── Driving_Team_ch.jpg
│   └── robots.txt
├── server
│   └── api
│       ├── payments
│       │   └── receipt.post.ts
│       └── wallee
│           ├── create-transaction.post.ts
│           ├── debug-credentials.get.ts
│           ├── test-auth.post.ts
│           ├── test-connection.get.ts
│           └── transaction-debug.post.ts
├── stores
│   └── auth.ts
├── tailwind.config.js
├── tsconfig.json
├── types
│   ├── UserProfile.ts
│   ├── eventType.ts
│   ├── h3.d.ts
│   ├── index.ts
│   ├── supabase.ts
│   └── wallee.ts
└── utils
    ├── dateUtils.ts
    ├── supabase.ts
    └── walleeService.ts

26 directories, 121 files
```

## Dateien und Inhalte

### ./.env

```
# Supabase
SUPABASE_URL=https://unyjaetebnaexaflpyoc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCltDWCGQ-WD3DHyrJdXVzhtyxgogrc3mA

# Wallee Configuration
WALLEE_SPACE_ID=428533
WALLEE_APPLICATION_USER_ID=140525 
WALLEE_SECRET_KEY=q77ibPsnOwEb7DrqeGXGGEe1q8YPYFRFm2MwcCAl+3c=
```

### ./.nuxt/app.config.mjs

```

import { _replaceAppConfig } from '#app/config'
import { defuFn } from 'defu'

const inlineConfig = {
  "nuxt": {},
  "icon": {
    "provider": "server",
    "class": "",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "mode": "css",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "dashicons",
      "devicon",
      "devicon-plain",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fad",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "logos",
      "ls",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "pixelarticons",
      "prime",
      "ps",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "si-glyph",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "streamline",
      "streamline-emojis",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 1500
  },
  "ui": {
    "primary": "green",
    "gray": "cool",
    "colors": [
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "green",
      "emerald",
      "teal",
      "cyan",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
      "rose",
      "primary"
    ],
    "strategy": "merge"
  }
}

// Vite - webpack is handled directly in #app/config
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    _replaceAppConfig(newModule.default)
  })
}



export default /*@__PURE__*/ defuFn(inlineConfig)

```

### ./.nuxt/components.d.ts

```

import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T extends DefineComponent> = T & DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>>
type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = (T & DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }>)
interface _GlobalComponents {
      'AddStudentModal': typeof import("../components/AddStudentModal.vue")['default']
    'CalendarComponent': typeof import("../components/CalendarComponent.vue")['default']
    'CategorySelector': typeof import("../components/CategorySelector.vue")['default']
    'ConfirmationDialog': typeof import("../components/ConfirmationDialog.vue")['default']
    'CustomerDashboard': typeof import("../components/CustomerDashboard.vue")['default']
    'DurationSelector': typeof import("../components/DurationSelector.vue")['default']
    'EnhancedStudentModal': typeof import("../components/EnhancedStudentModal.vue")['default']
    'EvaluationModal': typeof import("../components/EvaluationModal.vue")['default']
    'EventModal': typeof import("../components/EventModal.vue")['default']
    'EventTypeSelector': typeof import("../components/EventTypeSelector.vue")['default']
    'LocationSelector': typeof import("../components/LocationSelector.vue")['default']
    'MoveAppointmentModal': typeof import("../components/MoveAppointmentModal.vue")['default']
    'PaymentComponent': typeof import("../components/PaymentComponent.vue")['default']
    'PaymentModal': typeof import("../components/PaymentModal.vue")['default']
    'PendenzenModal': typeof import("../components/PendenzenModal.vue")['default']
    'PriceDisplay': typeof import("../components/PriceDisplay.vue")['default']
    'ProfileSetup': typeof import("../components/ProfileSetup.vue")['default']
    'StaffDurationSettings': typeof import("../components/StaffDurationSettings.vue")['default']
    'StaffSettings': typeof import("../components/StaffSettings.vue")['default']
    'StudentDetailModal': typeof import("../components/StudentDetailModal.vue")['default']
    'StudentSelector': typeof import("../components/StudentSelector.vue")['default']
    'UAccordion': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Accordion.vue")['default']
    'UAlert': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Alert.vue")['default']
    'UAvatar': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Avatar.vue")['default']
    'UAvatarGroup': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/AvatarGroup")['default']
    'UBadge': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Badge.vue")['default']
    'UButton': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Button.vue")['default']
    'UButtonGroup': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/ButtonGroup")['default']
    'UCarousel': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Carousel.vue")['default']
    'UChip': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Chip.vue")['default']
    'UDropdown': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Dropdown.vue")['default']
    'UIcon': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Icon.vue")['default']
    'UKbd': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Kbd.vue")['default']
    'ULink': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Link.vue")['default']
    'UMeter': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Meter.vue")['default']
    'UMeterGroup': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/MeterGroup")['default']
    'UProgress': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Progress.vue")['default']
    'UCheckbox': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Checkbox.vue")['default']
    'UForm': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Form.vue")['default']
    'UFormGroup': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/FormGroup.vue")['default']
    'UInput': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Input.vue")['default']
    'UInputMenu': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/InputMenu.vue")['default']
    'URadio': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Radio.vue")['default']
    'URadioGroup': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/RadioGroup.vue")['default']
    'URange': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Range.vue")['default']
    'USelect': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Select.vue")['default']
    'USelectMenu': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/SelectMenu.vue")['default']
    'UTextarea': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Textarea.vue")['default']
    'UToggle': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Toggle.vue")['default']
    'UTable': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/data/Table.vue")['default']
    'UCard': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Card.vue")['default']
    'UContainer': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Container.vue")['default']
    'UDivider': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Divider.vue")['default']
    'USkeleton': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Skeleton.vue")['default']
    'UBreadcrumb': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Breadcrumb.vue")['default']
    'UCommandPalette': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/CommandPalette.vue")['default']
    'UCommandPaletteGroup': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/CommandPaletteGroup.vue")['default']
    'UHorizontalNavigation': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/HorizontalNavigation.vue")['default']
    'UPagination': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Pagination.vue")['default']
    'UTabs': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Tabs.vue")['default']
    'UVerticalNavigation': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/VerticalNavigation.vue")['default']
    'UContextMenu': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/ContextMenu.vue")['default']
    'UModal': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Modal.vue")['default']
    'UModals': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Modals.client.vue")['default']
    'UNotification': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Notification.vue")['default']
    'UNotifications': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Notifications.vue")['default']
    'UPopover': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Popover.vue")['default']
    'USlideover': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Slideover.vue")['default']
    'USlideovers': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Slideovers.client.vue")['default']
    'UTooltip': typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Tooltip.vue")['default']
    'NuxtWelcome': typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
    'NuxtLayout': typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
    'NuxtErrorBoundary': typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
    'ClientOnly': typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
    'DevOnly': typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
    'ServerPlaceholder': typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
    'NuxtLink': typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
    'NuxtLoadingIndicator': typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
    'NuxtTime': typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
    'NuxtRouteAnnouncer': typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
    'NuxtImg': typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
    'NuxtPicture': typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
    'Icon': typeof import("../node_modules/@nuxt/icon/dist/runtime/components/index")['default']
    'ColorScheme': typeof import("../node_modules/@nuxtjs/color-mode/dist/runtime/component.vue3.vue")['default']
    'NuxtPage': typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
    'NoScript': typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
    'Link': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
    'Base': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
    'Title': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
    'Meta': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
    'Style': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
    'Head': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
    'Html': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
    'Body': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
    'NuxtIsland': typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
    'UModals': IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
    'USlideovers': IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
    'NuxtRouteAnnouncer': IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
      'LazyAddStudentModal': LazyComponent<typeof import("../components/AddStudentModal.vue")['default']>
    'LazyCalendarComponent': LazyComponent<typeof import("../components/CalendarComponent.vue")['default']>
    'LazyCategorySelector': LazyComponent<typeof import("../components/CategorySelector.vue")['default']>
    'LazyConfirmationDialog': LazyComponent<typeof import("../components/ConfirmationDialog.vue")['default']>
    'LazyCustomerDashboard': LazyComponent<typeof import("../components/CustomerDashboard.vue")['default']>
    'LazyDurationSelector': LazyComponent<typeof import("../components/DurationSelector.vue")['default']>
    'LazyEnhancedStudentModal': LazyComponent<typeof import("../components/EnhancedStudentModal.vue")['default']>
    'LazyEvaluationModal': LazyComponent<typeof import("../components/EvaluationModal.vue")['default']>
    'LazyEventModal': LazyComponent<typeof import("../components/EventModal.vue")['default']>
    'LazyEventTypeSelector': LazyComponent<typeof import("../components/EventTypeSelector.vue")['default']>
    'LazyLocationSelector': LazyComponent<typeof import("../components/LocationSelector.vue")['default']>
    'LazyMoveAppointmentModal': LazyComponent<typeof import("../components/MoveAppointmentModal.vue")['default']>
    'LazyPaymentComponent': LazyComponent<typeof import("../components/PaymentComponent.vue")['default']>
    'LazyPaymentModal': LazyComponent<typeof import("../components/PaymentModal.vue")['default']>
    'LazyPendenzenModal': LazyComponent<typeof import("../components/PendenzenModal.vue")['default']>
    'LazyPriceDisplay': LazyComponent<typeof import("../components/PriceDisplay.vue")['default']>
    'LazyProfileSetup': LazyComponent<typeof import("../components/ProfileSetup.vue")['default']>
    'LazyStaffDurationSettings': LazyComponent<typeof import("../components/StaffDurationSettings.vue")['default']>
    'LazyStaffSettings': LazyComponent<typeof import("../components/StaffSettings.vue")['default']>
    'LazyStudentDetailModal': LazyComponent<typeof import("../components/StudentDetailModal.vue")['default']>
    'LazyStudentSelector': LazyComponent<typeof import("../components/StudentSelector.vue")['default']>
    'LazyUAccordion': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Accordion.vue")['default']>
    'LazyUAlert': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Alert.vue")['default']>
    'LazyUAvatar': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Avatar.vue")['default']>
    'LazyUAvatarGroup': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/AvatarGroup")['default']>
    'LazyUBadge': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Badge.vue")['default']>
    'LazyUButton': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Button.vue")['default']>
    'LazyUButtonGroup': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/ButtonGroup")['default']>
    'LazyUCarousel': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Carousel.vue")['default']>
    'LazyUChip': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Chip.vue")['default']>
    'LazyUDropdown': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Dropdown.vue")['default']>
    'LazyUIcon': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Icon.vue")['default']>
    'LazyUKbd': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Kbd.vue")['default']>
    'LazyULink': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Link.vue")['default']>
    'LazyUMeter': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Meter.vue")['default']>
    'LazyUMeterGroup': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/MeterGroup")['default']>
    'LazyUProgress': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Progress.vue")['default']>
    'LazyUCheckbox': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Checkbox.vue")['default']>
    'LazyUForm': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Form.vue")['default']>
    'LazyUFormGroup': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/FormGroup.vue")['default']>
    'LazyUInput': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Input.vue")['default']>
    'LazyUInputMenu': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/InputMenu.vue")['default']>
    'LazyURadio': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Radio.vue")['default']>
    'LazyURadioGroup': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/RadioGroup.vue")['default']>
    'LazyURange': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Range.vue")['default']>
    'LazyUSelect': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Select.vue")['default']>
    'LazyUSelectMenu': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/SelectMenu.vue")['default']>
    'LazyUTextarea': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Textarea.vue")['default']>
    'LazyUToggle': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Toggle.vue")['default']>
    'LazyUTable': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/data/Table.vue")['default']>
    'LazyUCard': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Card.vue")['default']>
    'LazyUContainer': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Container.vue")['default']>
    'LazyUDivider': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Divider.vue")['default']>
    'LazyUSkeleton': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Skeleton.vue")['default']>
    'LazyUBreadcrumb': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Breadcrumb.vue")['default']>
    'LazyUCommandPalette': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/CommandPalette.vue")['default']>
    'LazyUCommandPaletteGroup': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/CommandPaletteGroup.vue")['default']>
    'LazyUHorizontalNavigation': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/HorizontalNavigation.vue")['default']>
    'LazyUPagination': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Pagination.vue")['default']>
    'LazyUTabs': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Tabs.vue")['default']>
    'LazyUVerticalNavigation': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/VerticalNavigation.vue")['default']>
    'LazyUContextMenu': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/ContextMenu.vue")['default']>
    'LazyUModal': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Modal.vue")['default']>
    'LazyUModals': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Modals.client.vue")['default']>
    'LazyUNotification': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Notification.vue")['default']>
    'LazyUNotifications': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Notifications.vue")['default']>
    'LazyUPopover': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Popover.vue")['default']>
    'LazyUSlideover': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Slideover.vue")['default']>
    'LazyUSlideovers': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Slideovers.client.vue")['default']>
    'LazyUTooltip': LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Tooltip.vue")['default']>
    'LazyNuxtWelcome': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
    'LazyNuxtLayout': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
    'LazyNuxtErrorBoundary': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
    'LazyClientOnly': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
    'LazyDevOnly': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
    'LazyServerPlaceholder': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
    'LazyNuxtLink': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
    'LazyNuxtLoadingIndicator': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
    'LazyNuxtTime': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
    'LazyNuxtRouteAnnouncer': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
    'LazyNuxtImg': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
    'LazyNuxtPicture': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
    'LazyIcon': LazyComponent<typeof import("../node_modules/@nuxt/icon/dist/runtime/components/index")['default']>
    'LazyColorScheme': LazyComponent<typeof import("../node_modules/@nuxtjs/color-mode/dist/runtime/component.vue3.vue")['default']>
    'LazyNuxtPage': LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
    'LazyNoScript': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
    'LazyLink': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
    'LazyBase': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
    'LazyTitle': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
    'LazyMeta': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
    'LazyStyle': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
    'LazyHead': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
    'LazyHtml': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
    'LazyBody': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
    'LazyNuxtIsland': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
    'LazyUModals': LazyComponent<IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>>
    'LazyUSlideovers': LazyComponent<IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>>
    'LazyNuxtRouteAnnouncer': LazyComponent<IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export const AddStudentModal: typeof import("../components/AddStudentModal.vue")['default']
export const CalendarComponent: typeof import("../components/CalendarComponent.vue")['default']
export const CategorySelector: typeof import("../components/CategorySelector.vue")['default']
export const ConfirmationDialog: typeof import("../components/ConfirmationDialog.vue")['default']
export const CustomerDashboard: typeof import("../components/CustomerDashboard.vue")['default']
export const DurationSelector: typeof import("../components/DurationSelector.vue")['default']
export const EnhancedStudentModal: typeof import("../components/EnhancedStudentModal.vue")['default']
export const EvaluationModal: typeof import("../components/EvaluationModal.vue")['default']
export const EventModal: typeof import("../components/EventModal.vue")['default']
export const EventTypeSelector: typeof import("../components/EventTypeSelector.vue")['default']
export const LocationSelector: typeof import("../components/LocationSelector.vue")['default']
export const MoveAppointmentModal: typeof import("../components/MoveAppointmentModal.vue")['default']
export const PaymentComponent: typeof import("../components/PaymentComponent.vue")['default']
export const PaymentModal: typeof import("../components/PaymentModal.vue")['default']
export const PendenzenModal: typeof import("../components/PendenzenModal.vue")['default']
export const PriceDisplay: typeof import("../components/PriceDisplay.vue")['default']
export const ProfileSetup: typeof import("../components/ProfileSetup.vue")['default']
export const StaffDurationSettings: typeof import("../components/StaffDurationSettings.vue")['default']
export const StaffSettings: typeof import("../components/StaffSettings.vue")['default']
export const StudentDetailModal: typeof import("../components/StudentDetailModal.vue")['default']
export const StudentSelector: typeof import("../components/StudentSelector.vue")['default']
export const UAccordion: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Accordion.vue")['default']
export const UAlert: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Alert.vue")['default']
export const UAvatar: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Avatar.vue")['default']
export const UAvatarGroup: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/AvatarGroup")['default']
export const UBadge: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Badge.vue")['default']
export const UButton: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Button.vue")['default']
export const UButtonGroup: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/ButtonGroup")['default']
export const UCarousel: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Carousel.vue")['default']
export const UChip: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Chip.vue")['default']
export const UDropdown: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Dropdown.vue")['default']
export const UIcon: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Icon.vue")['default']
export const UKbd: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Kbd.vue")['default']
export const ULink: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Link.vue")['default']
export const UMeter: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Meter.vue")['default']
export const UMeterGroup: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/MeterGroup")['default']
export const UProgress: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Progress.vue")['default']
export const UCheckbox: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Checkbox.vue")['default']
export const UForm: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Form.vue")['default']
export const UFormGroup: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/FormGroup.vue")['default']
export const UInput: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Input.vue")['default']
export const UInputMenu: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/InputMenu.vue")['default']
export const URadio: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Radio.vue")['default']
export const URadioGroup: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/RadioGroup.vue")['default']
export const URange: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Range.vue")['default']
export const USelect: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Select.vue")['default']
export const USelectMenu: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/SelectMenu.vue")['default']
export const UTextarea: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Textarea.vue")['default']
export const UToggle: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Toggle.vue")['default']
export const UTable: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/data/Table.vue")['default']
export const UCard: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Card.vue")['default']
export const UContainer: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Container.vue")['default']
export const UDivider: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Divider.vue")['default']
export const USkeleton: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Skeleton.vue")['default']
export const UBreadcrumb: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Breadcrumb.vue")['default']
export const UCommandPalette: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/CommandPalette.vue")['default']
export const UCommandPaletteGroup: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/CommandPaletteGroup.vue")['default']
export const UHorizontalNavigation: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/HorizontalNavigation.vue")['default']
export const UPagination: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Pagination.vue")['default']
export const UTabs: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Tabs.vue")['default']
export const UVerticalNavigation: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/VerticalNavigation.vue")['default']
export const UContextMenu: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/ContextMenu.vue")['default']
export const UModal: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Modal.vue")['default']
export const UModals: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Modals.client.vue")['default']
export const UNotification: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Notification.vue")['default']
export const UNotifications: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Notifications.vue")['default']
export const UPopover: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Popover.vue")['default']
export const USlideover: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Slideover.vue")['default']
export const USlideovers: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Slideovers.client.vue")['default']
export const UTooltip: typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Tooltip.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const Icon: typeof import("../node_modules/@nuxt/icon/dist/runtime/components/index")['default']
export const ColorScheme: typeof import("../node_modules/@nuxtjs/color-mode/dist/runtime/component.vue3.vue")['default']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const UModals: IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const USlideovers: IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const NuxtRouteAnnouncer: IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyAddStudentModal: LazyComponent<typeof import("../components/AddStudentModal.vue")['default']>
export const LazyCalendarComponent: LazyComponent<typeof import("../components/CalendarComponent.vue")['default']>
export const LazyCategorySelector: LazyComponent<typeof import("../components/CategorySelector.vue")['default']>
export const LazyConfirmationDialog: LazyComponent<typeof import("../components/ConfirmationDialog.vue")['default']>
export const LazyCustomerDashboard: LazyComponent<typeof import("../components/CustomerDashboard.vue")['default']>
export const LazyDurationSelector: LazyComponent<typeof import("../components/DurationSelector.vue")['default']>
export const LazyEnhancedStudentModal: LazyComponent<typeof import("../components/EnhancedStudentModal.vue")['default']>
export const LazyEvaluationModal: LazyComponent<typeof import("../components/EvaluationModal.vue")['default']>
export const LazyEventModal: LazyComponent<typeof import("../components/EventModal.vue")['default']>
export const LazyEventTypeSelector: LazyComponent<typeof import("../components/EventTypeSelector.vue")['default']>
export const LazyLocationSelector: LazyComponent<typeof import("../components/LocationSelector.vue")['default']>
export const LazyMoveAppointmentModal: LazyComponent<typeof import("../components/MoveAppointmentModal.vue")['default']>
export const LazyPaymentComponent: LazyComponent<typeof import("../components/PaymentComponent.vue")['default']>
export const LazyPaymentModal: LazyComponent<typeof import("../components/PaymentModal.vue")['default']>
export const LazyPendenzenModal: LazyComponent<typeof import("../components/PendenzenModal.vue")['default']>
export const LazyPriceDisplay: LazyComponent<typeof import("../components/PriceDisplay.vue")['default']>
export const LazyProfileSetup: LazyComponent<typeof import("../components/ProfileSetup.vue")['default']>
export const LazyStaffDurationSettings: LazyComponent<typeof import("../components/StaffDurationSettings.vue")['default']>
export const LazyStaffSettings: LazyComponent<typeof import("../components/StaffSettings.vue")['default']>
export const LazyStudentDetailModal: LazyComponent<typeof import("../components/StudentDetailModal.vue")['default']>
export const LazyStudentSelector: LazyComponent<typeof import("../components/StudentSelector.vue")['default']>
export const LazyUAccordion: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Accordion.vue")['default']>
export const LazyUAlert: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Alert.vue")['default']>
export const LazyUAvatar: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Avatar.vue")['default']>
export const LazyUAvatarGroup: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/AvatarGroup")['default']>
export const LazyUBadge: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Badge.vue")['default']>
export const LazyUButton: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Button.vue")['default']>
export const LazyUButtonGroup: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/ButtonGroup")['default']>
export const LazyUCarousel: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Carousel.vue")['default']>
export const LazyUChip: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Chip.vue")['default']>
export const LazyUDropdown: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Dropdown.vue")['default']>
export const LazyUIcon: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Icon.vue")['default']>
export const LazyUKbd: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Kbd.vue")['default']>
export const LazyULink: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Link.vue")['default']>
export const LazyUMeter: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Meter.vue")['default']>
export const LazyUMeterGroup: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/MeterGroup")['default']>
export const LazyUProgress: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/elements/Progress.vue")['default']>
export const LazyUCheckbox: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Checkbox.vue")['default']>
export const LazyUForm: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Form.vue")['default']>
export const LazyUFormGroup: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/FormGroup.vue")['default']>
export const LazyUInput: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Input.vue")['default']>
export const LazyUInputMenu: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/InputMenu.vue")['default']>
export const LazyURadio: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Radio.vue")['default']>
export const LazyURadioGroup: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/RadioGroup.vue")['default']>
export const LazyURange: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Range.vue")['default']>
export const LazyUSelect: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Select.vue")['default']>
export const LazyUSelectMenu: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/SelectMenu.vue")['default']>
export const LazyUTextarea: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Textarea.vue")['default']>
export const LazyUToggle: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/forms/Toggle.vue")['default']>
export const LazyUTable: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/data/Table.vue")['default']>
export const LazyUCard: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Card.vue")['default']>
export const LazyUContainer: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Container.vue")['default']>
export const LazyUDivider: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Divider.vue")['default']>
export const LazyUSkeleton: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/layout/Skeleton.vue")['default']>
export const LazyUBreadcrumb: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Breadcrumb.vue")['default']>
export const LazyUCommandPalette: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/CommandPalette.vue")['default']>
export const LazyUCommandPaletteGroup: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/CommandPaletteGroup.vue")['default']>
export const LazyUHorizontalNavigation: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/HorizontalNavigation.vue")['default']>
export const LazyUPagination: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Pagination.vue")['default']>
export const LazyUTabs: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/Tabs.vue")['default']>
export const LazyUVerticalNavigation: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/navigation/VerticalNavigation.vue")['default']>
export const LazyUContextMenu: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/ContextMenu.vue")['default']>
export const LazyUModal: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Modal.vue")['default']>
export const LazyUModals: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Modals.client.vue")['default']>
export const LazyUNotification: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Notification.vue")['default']>
export const LazyUNotifications: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Notifications.vue")['default']>
export const LazyUPopover: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Popover.vue")['default']>
export const LazyUSlideover: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Slideover.vue")['default']>
export const LazyUSlideovers: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Slideovers.client.vue")['default']>
export const LazyUTooltip: LazyComponent<typeof import("../node_modules/@nuxt/ui/dist/runtime/components/overlays/Tooltip.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyIcon: LazyComponent<typeof import("../node_modules/@nuxt/icon/dist/runtime/components/index")['default']>
export const LazyColorScheme: LazyComponent<typeof import("../node_modules/@nuxtjs/color-mode/dist/runtime/component.vue3.vue")['default']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
export const LazyUModals: LazyComponent<IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>>
export const LazyUSlideovers: LazyComponent<IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>>
export const LazyNuxtRouteAnnouncer: LazyComponent<IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>>

export const componentNames: string[]

```

### ./.nuxt/eslint.config.d.mts

```
import type { FlatConfigComposer } from "eslint-flat-config-utils"
import { defineFlatConfigs } from "@nuxt/eslint-config/flat"
import type { NuxtESLintConfigOptionsResolved } from "@nuxt/eslint-config/flat"

declare const configs: FlatConfigComposer
declare const options: NuxtESLintConfigOptionsResolved
declare const withNuxt: typeof defineFlatConfigs
export default withNuxt
export { withNuxt, defineFlatConfigs, configs, options }
```

### ./.nuxt/eslint.config.mjs

```
// ESLint config generated by Nuxt
/// <reference path="./eslint-typegen.d.ts" />
/* eslint-disable */
// @ts-nocheck

import typegen from '../node_modules/eslint-typegen/dist/index.mjs';
import { createConfigForNuxt, defineFlatConfigs, resolveOptions } from '../node_modules/@nuxt/eslint-config/dist/flat.mjs';
import { fileURLToPath } from 'url';

const r = (...args) => fileURLToPath(new URL(...args, import.meta.url))

export { defineFlatConfigs }

export const options = resolveOptions({
  features: {
  "standalone": true
},
  dirs: {
    pages: ["pages"],
    composables: ["composables", "utils"],
    components: ["components"],
    componentsPrefixed: [],
    layouts: ["layouts"],
    plugins: ["plugins"],
    middleware: ["middleware"],
    modules: ["modules"],
    servers: [],
    root: [r("..")],
    src: [""],
}
})

export const configs = createConfigForNuxt(options)

configs.append(
// Set globals from imports registry
{
  name: 'nuxt/import-globals',
  languageOptions: {
    globals: Object.fromEntries(["useScriptTriggerConsent","useScriptEventPage","useScriptTriggerElement","useScript","useScriptGoogleAnalytics","useScriptPlausibleAnalytics","useScriptCrisp","useScriptClarity","useScriptCloudflareWebAnalytics","useScriptFathomAnalytics","useScriptMatomoAnalytics","useScriptGoogleTagManager","useScriptGoogleAdsense","useScriptSegment","useScriptMetaPixel","useScriptXPixel","useScriptIntercom","useScriptHotjar","useScriptStripe","useScriptLemonSqueezy","useScriptVimeoPlayer","useScriptYouTubePlayer","useScriptGoogleMaps","useScriptNpm","useScriptUmamiAnalytics","useScriptSnapchatPixel","useScriptRybbitAnalytics","isVue2","isVue3","defineNuxtLink","useNuxtApp","tryUseNuxtApp","defineNuxtPlugin","definePayloadPlugin","useRuntimeConfig","defineAppConfig","useAppConfig","updateAppConfig","defineNuxtComponent","useAsyncData","useLazyAsyncData","useNuxtData","refreshNuxtData","clearNuxtData","useHydration","callOnce","useState","clearNuxtState","clearError","createError","isNuxtError","showError","useError","useFetch","useLazyFetch","useCookie","refreshCookie","onPrehydrate","prerenderRoutes","useRequestHeader","useRequestHeaders","useResponseHeader","useRequestEvent","useRequestFetch","setResponseStatus","onNuxtReady","preloadComponents","prefetchComponents","preloadRouteComponents","abortNavigation","addRouteMiddleware","defineNuxtRouteMiddleware","setPageLayout","navigateTo","useRoute","useRouter","isPrerendered","loadPayload","preloadPayload","definePayloadReducer","definePayloadReviver","useLoadingIndicator","getAppManifest","getRouteRules","reloadNuxtApp","useRequestURL","usePreviewMode","useRouteAnnouncer","useRuntimeHook","useHead","useHeadSafe","useServerHeadSafe","useServerHead","useSeoMeta","useServerSeoMeta","injectHead","onBeforeRouteLeave","onBeforeRouteUpdate","withCtx","withDirectives","withKeys","withMemo","withModifiers","withScopeId","onActivated","onBeforeMount","onBeforeUnmount","onBeforeUpdate","onDeactivated","onErrorCaptured","onMounted","onRenderTracked","onRenderTriggered","onServerPrefetch","onUnmounted","onUpdated","computed","customRef","isProxy","isReactive","isReadonly","isRef","markRaw","proxyRefs","reactive","readonly","ref","shallowReactive","shallowReadonly","shallowRef","toRaw","toRef","toRefs","triggerRef","unref","watch","watchEffect","watchPostEffect","watchSyncEffect","isShallow","effect","effectScope","getCurrentScope","onScopeDispose","defineComponent","defineAsyncComponent","resolveComponent","getCurrentInstance","h","inject","hasInjectionContext","nextTick","provide","mergeModels","toValue","useModel","useAttrs","useCssModule","useCssVars","useSlots","useTransitionState","useId","useTemplateRef","useShadowRoot","Component","ComponentPublicInstance","ComputedRef","DirectiveBinding","ExtractDefaultPropTypes","ExtractPropTypes","ExtractPublicPropTypes","InjectionKey","PropType","Ref","MaybeRef","MaybeRefOrGetter","VNode","WritableComputedRef","requestIdleCallback","cancelIdleCallback","setInterval","useAppointmentStatus","useCategoryData","useCurrentUser","useDurationManager","useEventModalForm","useEventModalHandlers","useEventModalWatchers","usePayments","usePendingTasks","CriteriaEvaluationData","useStaffCategoryDurations","useStaffDurations","useStudents","useUsers","useWallee","formatDate","formatTime","formatDateTime","formatDateShort","formatTimeShort","supabase","getSupabase","WalleeService","WalleeService","defineShortcuts","useProvideButtonGroup","useInjectButtonGroup","useCarouselScroll","useCopyToClipboard","useFormGroup","modalInjectionKey","useModal","createPopper","usePopper","_useShortcuts","useShortcuts","slidOverInjectionKey","useSlideover","useTimer","useToast","useUI","useAuthStore","useColorMode","defineStore","acceptHMRUpdate","usePinia","storeToRefs","definePageMeta","useLink","useNitroApp","useRuntimeConfig","useAppConfig","defineNitroPlugin","nitroPlugin","defineCachedFunction","defineCachedEventHandler","cachedFunction","cachedEventHandler","useStorage","defineRenderHandler","defineRouteMeta","getRouteRules","useEvent","defineTask","runTask","defineNitroErrorHandler","appendCorsHeaders","appendCorsPreflightHeaders","appendHeader","appendHeaders","appendResponseHeader","appendResponseHeaders","assertMethod","callNodeListener","clearResponseHeaders","clearSession","createApp","createAppEventHandler","createError","createEvent","createEventStream","createRouter","defaultContentType","defineEventHandler","defineLazyEventHandler","defineNodeListener","defineNodeMiddleware","defineRequestMiddleware","defineResponseMiddleware","defineWebSocket","defineWebSocketHandler","deleteCookie","dynamicEventHandler","eventHandler","fetchWithEvent","fromNodeMiddleware","fromPlainHandler","fromWebHandler","getCookie","getHeader","getHeaders","getMethod","getProxyRequestHeaders","getQuery","getRequestFingerprint","getRequestHeader","getRequestHeaders","getRequestHost","getRequestIP","getRequestPath","getRequestProtocol","getRequestURL","getRequestWebStream","getResponseHeader","getResponseHeaders","getResponseStatus","getResponseStatusText","getRouterParam","getRouterParams","getSession","getValidatedQuery","getValidatedRouterParams","handleCacheHeaders","handleCors","isCorsOriginAllowed","isError","isEvent","isEventHandler","isMethod","isPreflightRequest","isStream","isWebResponse","lazyEventHandler","parseCookies","promisifyNodeListener","proxyRequest","readBody","readFormData","readMultipartFormData","readRawBody","readValidatedBody","removeResponseHeader","sanitizeStatusCode","sanitizeStatusMessage","sealSession","send","sendError","sendIterable","sendNoContent","sendProxy","sendRedirect","sendStream","sendWebResponse","serveStatic","setCookie","setHeader","setHeaders","setResponseHeader","setResponseHeaders","setResponseStatus","splitCookiesString","toEventHandler","toNodeListener","toPlainHandler","toWebHandler","toWebRequest","unsealSession","updateSession","useBase","useSession","writeEarlyHints","__buildAssetsURL","__publicAssetsURL","defineAppConfig"].map(i => [i, 'readonly'])),
  },
}
)

export function withNuxt(...customs) {
  return configs
    .clone()
    .append(...customs)
    .onResolved(configs => typegen(configs, { dtsPath: r("./eslint-typegen.d.ts"), augmentFlatConfigUtils: true }))
}

export default withNuxt
```

### ./.nuxt/imports.d.ts

```
export { useScriptTriggerConsent, useScriptEventPage, useScriptTriggerElement, useScript, useScriptGoogleAnalytics, useScriptPlausibleAnalytics, useScriptCrisp, useScriptClarity, useScriptCloudflareWebAnalytics, useScriptFathomAnalytics, useScriptMatomoAnalytics, useScriptGoogleTagManager, useScriptGoogleAdsense, useScriptSegment, useScriptMetaPixel, useScriptXPixel, useScriptIntercom, useScriptHotjar, useScriptStripe, useScriptLemonSqueezy, useScriptVimeoPlayer, useScriptYouTubePlayer, useScriptGoogleMaps, useScriptNpm, useScriptUmamiAnalytics, useScriptSnapchatPixel, useScriptRybbitAnalytics } from '#app/composables/script-stubs';
export { isVue2, isVue3 } from 'vue-demi';
export { defineNuxtLink } from '#app/components/nuxt-link';
export { useNuxtApp, tryUseNuxtApp, defineNuxtPlugin, definePayloadPlugin, useRuntimeConfig, defineAppConfig } from '#app/nuxt';
export { useAppConfig, updateAppConfig } from '#app/config';
export { defineNuxtComponent } from '#app/composables/component';
export { useAsyncData, useLazyAsyncData, useNuxtData, refreshNuxtData, clearNuxtData } from '#app/composables/asyncData';
export { useHydration } from '#app/composables/hydrate';
export { callOnce } from '#app/composables/once';
export { useState, clearNuxtState } from '#app/composables/state';
export { clearError, createError, isNuxtError, showError, useError } from '#app/composables/error';
export { useFetch, useLazyFetch } from '#app/composables/fetch';
export { useCookie, refreshCookie } from '#app/composables/cookie';
export { onPrehydrate, prerenderRoutes, useRequestHeader, useRequestHeaders, useResponseHeader, useRequestEvent, useRequestFetch, setResponseStatus } from '#app/composables/ssr';
export { onNuxtReady } from '#app/composables/ready';
export { preloadComponents, prefetchComponents, preloadRouteComponents } from '#app/composables/preload';
export { abortNavigation, addRouteMiddleware, defineNuxtRouteMiddleware, setPageLayout, navigateTo, useRoute, useRouter } from '#app/composables/router';
export { isPrerendered, loadPayload, preloadPayload, definePayloadReducer, definePayloadReviver } from '#app/composables/payload';
export { useLoadingIndicator } from '#app/composables/loading-indicator';
export { getAppManifest, getRouteRules } from '#app/composables/manifest';
export { reloadNuxtApp } from '#app/composables/chunk';
export { useRequestURL } from '#app/composables/url';
export { usePreviewMode } from '#app/composables/preview';
export { useRouteAnnouncer } from '#app/composables/route-announcer';
export { useRuntimeHook } from '#app/composables/runtime-hook';
export { useHead, useHeadSafe, useServerHeadSafe, useServerHead, useSeoMeta, useServerSeoMeta, injectHead } from '#app/composables/head';
export { onBeforeRouteLeave, onBeforeRouteUpdate, useLink } from 'vue-router';
export { withCtx, withDirectives, withKeys, withMemo, withModifiers, withScopeId, onActivated, onBeforeMount, onBeforeUnmount, onBeforeUpdate, onDeactivated, onErrorCaptured, onMounted, onRenderTracked, onRenderTriggered, onServerPrefetch, onUnmounted, onUpdated, computed, customRef, isProxy, isReactive, isReadonly, isRef, markRaw, proxyRefs, reactive, readonly, ref, shallowReactive, shallowReadonly, shallowRef, toRaw, toRef, toRefs, triggerRef, unref, watch, watchEffect, watchPostEffect, watchSyncEffect, isShallow, effect, effectScope, getCurrentScope, onScopeDispose, defineComponent, defineAsyncComponent, resolveComponent, getCurrentInstance, h, inject, hasInjectionContext, nextTick, provide, mergeModels, toValue, useModel, useAttrs, useCssModule, useCssVars, useSlots, useTransitionState, useId, useTemplateRef, useShadowRoot, Component, ComponentPublicInstance, ComputedRef, DirectiveBinding, ExtractDefaultPropTypes, ExtractPropTypes, ExtractPublicPropTypes, InjectionKey, PropType, Ref, MaybeRef, MaybeRefOrGetter, VNode, WritableComputedRef } from 'vue';
export { requestIdleCallback, cancelIdleCallback } from '#app/compat/idle-callback';
export { setInterval } from '#app/compat/interval';
export { useAppointmentStatus } from '../composables/useAppointmentStatus';
export { useCategoryData } from '../composables/useCategoryData';
export { useCurrentUser } from '../composables/useCurrentUser';
export { useDurationManager } from '../composables/useDurationManager';
export { useEventModalForm } from '../composables/useEventModalForm';
export { useEventModalHandlers } from '../composables/useEventModalHandlers';
export { useEventModalWatchers } from '../composables/useEventModalWatchers';
export { usePayments } from '../composables/usePayments';
export { usePendingTasks, CriteriaEvaluationData } from '../composables/usePendingTasks';
export { useStaffCategoryDurations } from '../composables/useStaffCategoryDurations';
export { useStaffDurations } from '../composables/useStaffDurations';
export { useStudents } from '../composables/useStudents';
export { useUsers } from '../composables/useUsers';
export { useWallee } from '../composables/useWallee';
export { formatDate, formatTime, formatDateTime, formatDateShort, formatTimeShort } from '../utils/dateUtils';
export { default as supabase, getSupabase } from '../utils/supabase';
export { WalleeService, WalleeService } from '../utils/walleeService';
export { defineShortcuts } from '../node_modules/@nuxt/ui/dist/runtime/composables/defineShortcuts';
export { useProvideButtonGroup, useInjectButtonGroup } from '../node_modules/@nuxt/ui/dist/runtime/composables/useButtonGroup';
export { useCarouselScroll } from '../node_modules/@nuxt/ui/dist/runtime/composables/useCarouselScroll';
export { useCopyToClipboard } from '../node_modules/@nuxt/ui/dist/runtime/composables/useCopyToClipboard';
export { useFormGroup } from '../node_modules/@nuxt/ui/dist/runtime/composables/useFormGroup';
export { modalInjectionKey, useModal } from '../node_modules/@nuxt/ui/dist/runtime/composables/useModal';
export { createPopper, usePopper } from '../node_modules/@nuxt/ui/dist/runtime/composables/usePopper';
export { _useShortcuts, useShortcuts } from '../node_modules/@nuxt/ui/dist/runtime/composables/useShortcuts';
export { slidOverInjectionKey, useSlideover } from '../node_modules/@nuxt/ui/dist/runtime/composables/useSlideover';
export { useTimer } from '../node_modules/@nuxt/ui/dist/runtime/composables/useTimer';
export { useToast } from '../node_modules/@nuxt/ui/dist/runtime/composables/useToast';
export { useUI } from '../node_modules/@nuxt/ui/dist/runtime/composables/useUI';
export { useAuthStore } from '../stores/auth';
export { useColorMode } from '../node_modules/@nuxtjs/color-mode/dist/runtime/composables';
export { defineStore, acceptHMRUpdate, usePinia, storeToRefs } from '../node_modules/@pinia/nuxt/dist/runtime/composables';
export { definePageMeta } from '../node_modules/nuxt/dist/pages/runtime/composables';
```

### ./.nuxt/manifest/latest.json

```
{"id":"dev","timestamp":1752431247789}
```

### ./.nuxt/manifest/meta/1ef295b4-8892-432b-ac1e-b88c529cc2cf.json

```
{}
```

### ./.nuxt/manifest/meta/dev.json

```
{"id":"dev","timestamp":1752431247789,"matcher":{"static":{},"wildcard":{},"dynamic":{}},"prerendered":[]}
```

### ./.nuxt/nitro.json

```
{
  "date": "2025-07-13T18:27:32.684Z",
  "preset": "nitro-dev",
  "framework": {
    "name": "nuxt",
    "version": "3.17.6"
  },
  "versions": {
    "nitro": "2.11.13"
  },
  "dev": {
    "pid": 91408,
    "workerAddress": {
      "socketPath": "/var/folders/17/0s9y1kjs3sz6m1ssfs0h5k2c0000gn/T/nitro-worker-91408-2-1-3259.sock"
    }
  }
}
```

### ./.nuxt/nuxt.d.ts

```
/// <reference types="@nuxt/ui" />
/// <reference types="@pinia/nuxt" />
/// <reference types="@nuxt/telemetry" />
/// <reference types="@nuxt/eslint" />
/// <reference path="types/builder-env.d.ts" />
/// <reference types="nuxt" />
/// <reference path="types/app-defaults.d.ts" />
/// <reference path="types/plugins.d.ts" />
/// <reference path="types/build.d.ts" />
/// <reference path="types/schema.d.ts" />
/// <reference path="types/app.config.d.ts" />
/// <reference path="ui.colors.d.ts" />
/// <reference types="@pinia/nuxt" />
/// <reference types="vue-router" />
/// <reference path="types/middleware.d.ts" />
/// <reference path="types/nitro-middleware.d.ts" />
/// <reference path="types/layouts.d.ts" />
/// <reference path="components.d.ts" />
/// <reference path="imports.d.ts" />
/// <reference path="types/imports.d.ts" />
/// <reference path="schema/nuxt.schema.d.ts" />
/// <reference path="types/tailwind.config.d.ts" />
/// <reference path="types/nitro.d.ts" />
/// <reference path="./eslint-typegen.d.ts" />

export {}

```

### ./.nuxt/nuxt.json

```
{
  "_hash": "8VLZeBteQSx_EqXslfI8QYbBfpZUUiZozKLM1dExyaU",
  "project": {
    "rootDir": "/Users/pascalkilchenmann/neues-driving-team-app"
  },
  "versions": {
    "nuxt": "3.17.6"
  }
}
```

### ./.nuxt/nuxtui-tailwind.config.mjs

```

      import { defaultExtractor as createDefaultExtractor } from "tailwindcss/lib/lib/defaultExtractor.js";
      import { customSafelistExtractor, generateSafelist } from "/Users/pascalkilchenmann/neues-driving-team-app/node_modules/@nuxt/ui/dist/runtime/utils/colors";
      import formsPlugin from "@tailwindcss/forms";
      import aspectRatio from "@tailwindcss/aspect-ratio";
      import typography from "@tailwindcss/typography";
      import containerQueries from "@tailwindcss/container-queries";
      import headlessUi from "@headlessui/tailwindcss";

      const defaultExtractor = createDefaultExtractor({ tailwindConfig: { separator: ':' } });

      export default {
        plugins: [
          formsPlugin({ strategy: 'class' }),
          aspectRatio,
          typography,
          containerQueries,
          headlessUi
        ],
        content: {
          files: [
            "/Users/pascalkilchenmann/neues-driving-team-app/node_modules/@nuxt/ui/dist/runtime/components/**/*.{vue,mjs,ts}",
            "/Users/pascalkilchenmann/neues-driving-team-app/node_modules/@nuxt/ui/dist/runtime/ui.config/**/*.{mjs,js,ts}"
          ],
          transform: {
            vue: (content) => {
              return content.replaceAll(/(?:\r\n|\r|\n)/g, ' ')
            }
          },
          extract: {
            vue: (content) => {
              return [
                ...defaultExtractor(content),
                ...customSafelistExtractor("U", content, ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","primary"], ["primary"])
              ]
            }
          }
        },
        safelist: generateSafelist(["primary"], ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","primary"]),
      }
    
```

### ./.nuxt/schema/nuxt.schema.d.ts

```
export interface NuxtCustomSchema {
 appConfig?: {
  /**
   * Nuxt Icon
   * 
   * Configure Nuxt Icon module preferences.
   * 
   * 
   * @studioIcon material-symbols:star
  */
  icon?: {
   /**
    * Icon Size
    * 
    * Set the default icon size.
    * 
    * 
    * @studioIcon material-symbols:format-size-rounded
   */
   size?: string | undefined,

   /**
    * CSS Class
    * 
    * Set the default CSS class.
    * 
    * @default ""
    * 
    * @studioIcon material-symbols:css
   */
   class?: string,

   /**
    * Default Attributes
    * 
    * Attributes applied to every icon component.
    * 
    * @default { "aria-hidden": true }
    * 
    * 
    * @studioIcon material-symbols:settings
   */
   attrs?: Record<string, string | number | boolean>,

   /**
    * Default Rendering Mode
    * 
    * Set the default rendering mode for the icon component
    * 
    * @default "css"
    * 
    * @enum css,svg
    * 
    * @studioIcon material-symbols:move-down-rounded
   */
   mode?: string,

   /**
    * Icon aliases
    * 
    * Define Icon aliases to update them easily without code changes.
    * 
    * 
    * @studioIcon material-symbols:star-rounded
   */
   aliases?: { [alias: string]: string },

   /**
    * CSS Selector Prefix
    * 
    * Set the default CSS selector prefix.
    * 
    * @default "i-"
    * 
    * @studioIcon material-symbols:format-textdirection-l-to-r
   */
   cssSelectorPrefix?: string,

   /**
    * CSS Layer Name
    * 
    * Set the default CSS `@layer` name.
    * 
    * 
    * @studioIcon material-symbols:layers
   */
   cssLayer?: string | undefined,

   /**
    * Use CSS `:where()` Pseudo Selector
    * 
    * Use CSS `:where()` pseudo selector to reduce specificity.
    * 
    * @default true
    * 
    * @studioIcon material-symbols:low-priority
   */
   cssWherePseudo?: boolean,

   /**
    * Icon Collections
    * 
    * List of known icon collections name. Used to resolve collection name ambiguity.
    * e.g. `simple-icons-github` -> `simple-icons:github` instead of `simple:icons-github`
    * 
    * When not provided, will use the full Iconify collection list.
    * 
    * 
    * @studioIcon material-symbols:format-list-bulleted
   */
   collections?: string[] | null,

   /**
    * Custom Icon Collections
    * 
    * 
    * @studioIcon material-symbols:format-list-bulleted
   */
   customCollections?: string[] | null,

   /**
    * Icon Provider
    * 
    * Provider to use for fetching icons
    * 
    * - `server` - Fetch icons with a server handler
    * - `iconify` - Fetch icons with Iconify API, purely client-side
    * - `none` - Do not fetch icons (use client bundle only)
    * 
    * `server` by default; `iconify` when `ssr: false`
    * 
    * 
    * @enum server,iconify,none
    * 
    * @studioIcon material-symbols:cloud
   */
   provider?: "server" | "iconify" | undefined,

   /**
    * Iconify API Endpoint URL
    * 
    * Define a custom Iconify API endpoint URL. Useful if you want to use a self-hosted Iconify API. Learn more: https://iconify.design/docs/api.
    * 
    * @default "https://api.iconify.design"
    * 
    * @studioIcon material-symbols:api
   */
   iconifyApiEndpoint?: string,

   /**
    * Fallback to Iconify API
    * 
    * Fallback to Iconify API if server provider fails to found the collection.
    * 
    * @default true
    * 
    * @enum true,false,server-only,client-only
    * 
    * @studioIcon material-symbols:public
   */
   fallbackToApi?: boolean | "server-only" | "client-only",

   /**
    * Local API Endpoint Path
    * 
    * Define a custom path for the local API endpoint.
    * 
    * @default "/api/_nuxt_icon"
    * 
    * @studioIcon material-symbols:api
   */
   localApiEndpoint?: string,

   /**
    * Fetch Timeout
    * 
    * Set the timeout for fetching icons.
    * 
    * @default 1500
    * 
    * @studioIcon material-symbols:timer
   */
   fetchTimeout?: number,

   /**
    * Customize callback
    * 
    * Customize icon content (replace stroke-width, colors, etc...).
    * 
    * 
    * @studioIcon material-symbols:edit
   */
   customize?: IconifyIconCustomizeCallback,
  },
 },
}
export type CustomAppConfig = Exclude<NuxtCustomSchema['appConfig'], undefined>
type _CustomAppConfig = CustomAppConfig

declare module '@nuxt/schema' {
  interface NuxtConfig extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface NuxtOptions extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface CustomAppConfig extends _CustomAppConfig {}
}

declare module 'nuxt/schema' {
  interface NuxtConfig extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface NuxtOptions extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface CustomAppConfig extends _CustomAppConfig {}
}

```

### ./.nuxt/schema/nuxt.schema.json

```
{
  "id": "#",
  "properties": {
    "appConfig": {
      "id": "#appConfig",
      "properties": {
        "icon": {
          "title": "Nuxt Icon",
          "description": "Configure Nuxt Icon module preferences.",
          "tags": [
            "@studioIcon material-symbols:star"
          ],
          "id": "#appConfig/icon",
          "properties": {
            "size": {
              "title": "Icon Size",
              "description": "Set the default icon size.",
              "tags": [
                "@studioIcon material-symbols:format-size-rounded"
              ],
              "tsType": "string | undefined",
              "id": "#appConfig/icon/size",
              "default": {},
              "type": "any"
            },
            "class": {
              "title": "CSS Class",
              "description": "Set the default CSS class.",
              "tags": [
                "@studioIcon material-symbols:css"
              ],
              "id": "#appConfig/icon/class",
              "default": "",
              "type": "string"
            },
            "attrs": {
              "title": "Default Attributes",
              "description": "Attributes applied to every icon component.\n\n@default { \"aria-hidden\": true }",
              "tags": [
                "@studioIcon material-symbols:settings"
              ],
              "tsType": "Record<string, string | number | boolean>",
              "id": "#appConfig/icon/attrs",
              "default": {
                "aria-hidden": true
              },
              "type": "object"
            },
            "mode": {
              "title": "Default Rendering Mode",
              "description": "Set the default rendering mode for the icon component",
              "enum": [
                "css",
                "svg"
              ],
              "tags": [
                "@studioIcon material-symbols:move-down-rounded"
              ],
              "id": "#appConfig/icon/mode",
              "default": "css",
              "type": "string"
            },
            "aliases": {
              "title": "Icon aliases",
              "description": "Define Icon aliases to update them easily without code changes.",
              "tags": [
                "@studioIcon material-symbols:star-rounded"
              ],
              "tsType": "{ [alias: string]: string }",
              "id": "#appConfig/icon/aliases",
              "default": {},
              "type": "object"
            },
            "cssSelectorPrefix": {
              "title": "CSS Selector Prefix",
              "description": "Set the default CSS selector prefix.",
              "tags": [
                "@studioIcon material-symbols:format-textdirection-l-to-r"
              ],
              "id": "#appConfig/icon/cssSelectorPrefix",
              "default": "i-",
              "type": "string"
            },
            "cssLayer": {
              "title": "CSS Layer Name",
              "description": "Set the default CSS `@layer` name.",
              "tags": [
                "@studioIcon material-symbols:layers"
              ],
              "tsType": "string | undefined",
              "id": "#appConfig/icon/cssLayer",
              "default": {},
              "type": "any"
            },
            "cssWherePseudo": {
              "title": "Use CSS `:where()` Pseudo Selector",
              "description": "Use CSS `:where()` pseudo selector to reduce specificity.",
              "tags": [
                "@studioIcon material-symbols:low-priority"
              ],
              "id": "#appConfig/icon/cssWherePseudo",
              "default": true,
              "type": "boolean"
            },
            "collections": {
              "title": "Icon Collections",
              "description": "List of known icon collections name. Used to resolve collection name ambiguity.\ne.g. `simple-icons-github` -> `simple-icons:github` instead of `simple:icons-github`\n\nWhen not provided, will use the full Iconify collection list.",
              "tags": [
                "@studioIcon material-symbols:format-list-bulleted"
              ],
              "tsType": "string[] | null",
              "id": "#appConfig/icon/collections",
              "default": null,
              "type": "any"
            },
            "customCollections": {
              "title": "Custom Icon Collections",
              "tags": [
                "@studioIcon material-symbols:format-list-bulleted"
              ],
              "tsType": "string[] | null",
              "id": "#appConfig/icon/customCollections",
              "default": null,
              "type": "any"
            },
            "provider": {
              "title": "Icon Provider",
              "description": "Provider to use for fetching icons\n\n- `server` - Fetch icons with a server handler\n- `iconify` - Fetch icons with Iconify API, purely client-side\n- `none` - Do not fetch icons (use client bundle only)\n\n`server` by default; `iconify` when `ssr: false`",
              "enum": [
                "server",
                "iconify",
                "none"
              ],
              "tags": [
                "@studioIcon material-symbols:cloud"
              ],
              "type": "\"server\" | \"iconify\" | undefined",
              "id": "#appConfig/icon/provider"
            },
            "iconifyApiEndpoint": {
              "title": "Iconify API Endpoint URL",
              "description": "Define a custom Iconify API endpoint URL. Useful if you want to use a self-hosted Iconify API. Learn more: https://iconify.design/docs/api.",
              "tags": [
                "@studioIcon material-symbols:api"
              ],
              "id": "#appConfig/icon/iconifyApiEndpoint",
              "default": "https://api.iconify.design",
              "type": "string"
            },
            "fallbackToApi": {
              "title": "Fallback to Iconify API",
              "description": "Fallback to Iconify API if server provider fails to found the collection.",
              "tags": [
                "@studioIcon material-symbols:public"
              ],
              "enum": [
                true,
                false,
                "server-only",
                "client-only"
              ],
              "type": "boolean | \"server-only\" | \"client-only\"",
              "id": "#appConfig/icon/fallbackToApi",
              "default": true
            },
            "localApiEndpoint": {
              "title": "Local API Endpoint Path",
              "description": "Define a custom path for the local API endpoint.",
              "tags": [
                "@studioIcon material-symbols:api"
              ],
              "id": "#appConfig/icon/localApiEndpoint",
              "default": "/api/_nuxt_icon",
              "type": "string"
            },
            "fetchTimeout": {
              "title": "Fetch Timeout",
              "description": "Set the timeout for fetching icons.",
              "tags": [
                "@studioIcon material-symbols:timer"
              ],
              "id": "#appConfig/icon/fetchTimeout",
              "default": 1500,
              "type": "number"
            },
            "customize": {
              "title": "Customize callback",
              "description": "Customize icon content (replace stroke-width, colors, etc...).",
              "tags": [
                "@studioIcon material-symbols:edit"
              ],
              "type": "IconifyIconCustomizeCallback",
              "id": "#appConfig/icon/customize"
            }
          },
          "type": "object",
          "default": {
            "size": {},
            "class": "",
            "attrs": {
              "aria-hidden": true
            },
            "mode": "css",
            "aliases": {},
            "cssSelectorPrefix": "i-",
            "cssLayer": {},
            "cssWherePseudo": true,
            "collections": null,
            "customCollections": null,
            "iconifyApiEndpoint": "https://api.iconify.design",
            "fallbackToApi": true,
            "localApiEndpoint": "/api/_nuxt_icon",
            "fetchTimeout": 1500
          }
        }
      },
      "type": "object",
      "default": {
        "icon": {
          "size": {},
          "class": "",
          "attrs": {
            "aria-hidden": true
          },
          "mode": "css",
          "aliases": {},
          "cssSelectorPrefix": "i-",
          "cssLayer": {},
          "cssWherePseudo": true,
          "collections": null,
          "customCollections": null,
          "iconifyApiEndpoint": "https://api.iconify.design",
          "fallbackToApi": true,
          "localApiEndpoint": "/api/_nuxt_icon",
          "fetchTimeout": 1500
        }
      }
    }
  },
  "type": "object",
  "default": {
    "appConfig": {
      "icon": {
        "size": {},
        "class": "",
        "attrs": {
          "aria-hidden": true
        },
        "mode": "css",
        "aliases": {},
        "cssSelectorPrefix": "i-",
        "cssLayer": {},
        "cssWherePseudo": true,
        "collections": null,
        "customCollections": null,
        "iconifyApiEndpoint": "https://api.iconify.design",
        "fallbackToApi": true,
        "localApiEndpoint": "/api/_nuxt_icon",
        "fetchTimeout": 1500
      }
    }
  }
}
```

### ./.nuxt/tsconfig.json

```
{
  "compilerOptions": {
    "paths": {
      "nitropack/types": [
        "../node_modules/nitropack/types"
      ],
      "nitropack/runtime": [
        "../node_modules/nitropack/runtime"
      ],
      "nitropack": [
        "../node_modules/nitropack"
      ],
      "defu": [
        "../node_modules/defu"
      ],
      "h3": [
        "../node_modules/h3"
      ],
      "consola": [
        "../node_modules/consola"
      ],
      "ofetch": [
        "../node_modules/ofetch"
      ],
      "@unhead/vue": [
        "../node_modules/@unhead/vue"
      ],
      "@nuxt/devtools": [
        "../node_modules/@nuxt/devtools"
      ],
      "vue": [
        "../node_modules/vue"
      ],
      "@vue/runtime-core": [
        "../node_modules/@vue/runtime-core"
      ],
      "@vue/compiler-sfc": [
        "../node_modules/@vue/compiler-sfc"
      ],
      "vue-router": [
        "../node_modules/vue-router"
      ],
      "vue-router/auto-routes": [
        "../node_modules/vue-router/vue-router-auto-routes"
      ],
      "unplugin-vue-router/client": [
        "../node_modules/unplugin-vue-router/client"
      ],
      "@nuxt/schema": [
        "../node_modules/@nuxt/schema"
      ],
      "nuxt": [
        "../node_modules/nuxt"
      ],
      "vite/client": [
        "../node_modules/vite/client"
      ],
      "~": [
        ".."
      ],
      "~/*": [
        "../*"
      ],
      "@": [
        ".."
      ],
      "@/*": [
        "../*"
      ],
      "~~": [
        ".."
      ],
      "~~/*": [
        "../*"
      ],
      "@@": [
        ".."
      ],
      "@@/*": [
        "../*"
      ],
      "#shared": [
        "../shared"
      ],
      "assets": [
        "../assets"
      ],
      "assets/*": [
        "../assets/*"
      ],
      "public": [
        "../public"
      ],
      "public/*": [
        "../public/*"
      ],
      "#app": [
        "../node_modules/nuxt/dist/app"
      ],
      "#app/*": [
        "../node_modules/nuxt/dist/app/*"
      ],
      "vue-demi": [
        "../node_modules/nuxt/dist/app/compat/vue-demi"
      ],
      "#ui": [
        "../node_modules/@nuxt/ui/dist/runtime"
      ],
      "#ui/*": [
        "../node_modules/@nuxt/ui/dist/runtime/*"
      ],
      "#ui-colors": [
        "./ui.colors"
      ],
      "#color-mode-options": [
        "./color-mode-options.mjs"
      ],
      "pinia": [
        "../node_modules/pinia/dist/pinia"
      ],
      "#vue-router": [
        "../node_modules/vue-router"
      ],
      "#unhead/composables": [
        "../node_modules/nuxt/dist/head/runtime/composables/v3"
      ],
      "#imports": [
        "./imports"
      ],
      "#tailwind-config": [
        "./tailwind/expose"
      ],
      "#tailwind-config/*": [
        "./tailwind/expose/*"
      ],
      "#app-manifest": [
        "./manifest/meta/dev"
      ],
      "#components": [
        "./components"
      ],
      "#build": [
        "."
      ],
      "#build/*": [
        "./*"
      ]
    },
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ESNext",
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUncheckedIndexedAccess": false,
    "forceConsistentCasingInFileNames": true,
    "noImplicitOverride": true,
    "module": "preserve",
    "noEmit": true,
    "lib": [
      "ESNext",
      "dom",
      "dom.iterable",
      "webworker"
    ],
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "types": [],
    "moduleResolution": "Bundler",
    "useDefineForClassFields": true,
    "noImplicitThis": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "../**/*",
    "../.config/nuxt.*",
    "./nuxt.d.ts",
    "../node_modules/@nuxt/icon/runtime",
    "../node_modules/@nuxt/icon/dist/runtime",
    "../node_modules/@nuxtjs/color-mode/runtime",
    "../node_modules/@nuxtjs/color-mode/dist/runtime",
    "../node_modules/@nuxtjs/tailwindcss/runtime",
    "../node_modules/@nuxtjs/tailwindcss/dist/runtime",
    "../node_modules/@nuxt/ui/runtime",
    "../node_modules/@nuxt/ui/dist/runtime",
    "../node_modules/@pinia/nuxt/runtime",
    "../node_modules/@pinia/nuxt/dist/runtime",
    "../node_modules/@nuxt/eslint/runtime",
    "../node_modules/@nuxt/eslint/dist/runtime",
    "../node_modules/@nuxt/telemetry/runtime",
    "../node_modules/@nuxt/telemetry/dist/runtime",
    ".."
  ],
  "exclude": [
    "../dist",
    "../.data",
    "../node_modules",
    "../node_modules/nuxt/node_modules",
    "../node_modules/@nuxt/icon/node_modules",
    "../node_modules/@nuxtjs/color-mode/node_modules",
    "../node_modules/@nuxtjs/tailwindcss/node_modules",
    "../node_modules/@nuxt/ui/node_modules",
    "../node_modules/@pinia/nuxt/node_modules",
    "../node_modules/@nuxt/eslint/node_modules",
    "../node_modules/@nuxt/telemetry/node_modules",
    "../node_modules/@nuxt/icon/runtime/server",
    "../node_modules/@nuxt/icon/dist/runtime/server",
    "../node_modules/@nuxtjs/color-mode/runtime/server",
    "../node_modules/@nuxtjs/color-mode/dist/runtime/server",
    "../node_modules/@nuxtjs/tailwindcss/runtime/server",
    "../node_modules/@nuxtjs/tailwindcss/dist/runtime/server",
    "../node_modules/@nuxt/ui/runtime/server",
    "../node_modules/@nuxt/ui/dist/runtime/server",
    "../node_modules/@pinia/nuxt/runtime/server",
    "../node_modules/@pinia/nuxt/dist/runtime/server",
    "../node_modules/@nuxt/eslint/runtime/server",
    "../node_modules/@nuxt/eslint/dist/runtime/server",
    "../node_modules/@nuxt/telemetry/runtime/server",
    "../node_modules/@nuxt/telemetry/dist/runtime/server",
    "dev"
  ]
}
```

### ./.nuxt/tsconfig.server.json

```
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "resolveJsonModule": true,
    "jsx": "preserve",
    "allowSyntheticDefaultImports": true,
    "jsxFactory": "h",
    "jsxFragmentFactory": "Fragment",
    "paths": {
      "#imports": [
        "./types/nitro-imports"
      ],
      "~/*": [
        "../*"
      ],
      "@/*": [
        "../*"
      ],
      "~~/*": [
        "../*"
      ],
      "@@/*": [
        "../*"
      ],
      "nitropack/types": [
        "../node_modules/nitropack/types"
      ],
      "nitropack/runtime": [
        "../node_modules/nitropack/runtime"
      ],
      "nitropack": [
        "../node_modules/nitropack"
      ],
      "defu": [
        "../node_modules/defu"
      ],
      "h3": [
        "../node_modules/h3"
      ],
      "consola": [
        "../node_modules/consola"
      ],
      "ofetch": [
        "../node_modules/ofetch"
      ],
      "@unhead/vue": [
        "../node_modules/@unhead/vue"
      ],
      "@nuxt/devtools": [
        "../node_modules/@nuxt/devtools"
      ],
      "vue": [
        "../node_modules/vue"
      ],
      "@vue/runtime-core": [
        "../node_modules/@vue/runtime-core"
      ],
      "@vue/compiler-sfc": [
        "../node_modules/@vue/compiler-sfc"
      ],
      "vue-router": [
        "../node_modules/vue-router"
      ],
      "vue-router/auto-routes": [
        "../node_modules/vue-router/vue-router-auto-routes"
      ],
      "unplugin-vue-router/client": [
        "../node_modules/unplugin-vue-router/client"
      ],
      "@nuxt/schema": [
        "../node_modules/@nuxt/schema"
      ],
      "nuxt": [
        "../node_modules/nuxt"
      ],
      "vite/client": [
        "../node_modules/vite/client"
      ],
      "#shared": [
        "../shared"
      ],
      "assets": [
        "../assets"
      ],
      "assets/*": [
        "../assets/*"
      ],
      "public": [
        "../public"
      ],
      "public/*": [
        "../public/*"
      ],
      "#build": [
        "./"
      ],
      "#build/*": [
        "./*"
      ],
      "#internal/nuxt/paths": [
        "../node_modules/nuxt/dist/core/runtime/nitro/utils/paths"
      ],
      "#ui": [
        "../node_modules/@nuxt/ui/dist/runtime"
      ],
      "#ui/*": [
        "../node_modules/@nuxt/ui/dist/runtime/*"
      ],
      "#ui-colors": [
        "./ui.colors"
      ],
      "#color-mode-options": [
        "./color-mode-options.mjs"
      ],
      "pinia": [
        "../node_modules/pinia/dist/pinia"
      ],
      "#unhead/composables": [
        "../node_modules/nuxt/dist/head/runtime/composables/v3"
      ],
      "#tailwind-config": [
        "./tailwind/expose"
      ],
      "#tailwind-config/*": [
        "./tailwind/expose/*"
      ],
      "#nuxt-icon-server-bundle": [
        "./nuxt-icon-server-bundle"
      ]
    },
    "lib": [
      "esnext",
      "webworker",
      "dom.iterable"
    ]
  },
  "include": [
    "./types/nitro-nuxt.d.ts",
    "../node_modules/@nuxt/icon/runtime/server",
    "../node_modules/@nuxtjs/color-mode/runtime/server",
    "../node_modules/@nuxtjs/tailwindcss/runtime/server",
    "../node_modules/@nuxt/ui/runtime/server",
    "../node_modules/@pinia/nuxt/runtime/server",
    "../node_modules/@nuxt/eslint/runtime/server",
    "../node_modules/@nuxt/telemetry/runtime/server",
    "./types/nitro.d.ts",
    "../**/*",
    "../server/**/*"
  ],
  "exclude": [
    "../node_modules",
    "../node_modules/nuxt/node_modules",
    "../node_modules/@nuxt/icon/node_modules",
    "../node_modules/@nuxtjs/color-mode/node_modules",
    "../node_modules/@nuxtjs/tailwindcss/node_modules",
    "../node_modules/@nuxt/ui/node_modules",
    "../node_modules/@pinia/nuxt/node_modules",
    "../node_modules/@nuxt/eslint/node_modules",
    "../node_modules/@nuxt/telemetry/node_modules",
    "../dist"
  ]
}
```

### ./.nuxt/types/app-defaults.d.ts

```

declare module 'nuxt/app/defaults' {
  type DefaultAsyncDataErrorValue = null
  type DefaultAsyncDataValue = null
  type DefaultErrorValue = null
  type DedupeOption = boolean | 'cancel' | 'defer'
}
```

### ./.nuxt/types/app.config.d.ts

```

import type { CustomAppConfig } from 'nuxt/schema'
import type { Defu } from 'defu'


declare const inlineConfig = {
  "nuxt": {},
  "icon": {
    "provider": "server",
    "class": "",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "mode": "css",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "dashicons",
      "devicon",
      "devicon-plain",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fad",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "logos",
      "ls",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "pixelarticons",
      "prime",
      "ps",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "si-glyph",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "streamline",
      "streamline-emojis",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 1500
  },
  "ui": {
    "primary": "green",
    "gray": "cool",
    "colors": [
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "green",
      "emerald",
      "teal",
      "cyan",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
      "rose",
      "primary"
    ],
    "strategy": "merge"
  }
}
type ResolvedAppConfig = Defu<typeof inlineConfig, []>
type IsAny<T> = 0 extends 1 & T ? true : false

type MergedAppConfig<Resolved extends Record<string, unknown>, Custom extends Record<string, unknown>> = {
  [K in keyof (Resolved & Custom)]: K extends keyof Custom
    ? unknown extends Custom[K]
      ? Resolved[K]
      : IsAny<Custom[K]> extends true
        ? Resolved[K]
        : Custom[K] extends Record<string, any>
            ? Resolved[K] extends Record<string, any>
              ? MergedAppConfig<Resolved[K], Custom[K]>
              : Exclude<Custom[K], undefined>
            : Exclude<Custom[K], undefined>
    : Resolved[K]
}

declare module 'nuxt/schema' {
  interface AppConfig extends MergedAppConfig<ResolvedAppConfig, CustomAppConfig> { }
}
declare module '@nuxt/schema' {
  interface AppConfig extends MergedAppConfig<ResolvedAppConfig, CustomAppConfig> { }
}

```

### ./.nuxt/types/build.d.ts

```
declare module "#build/app-component.mjs";
declare module "#build/nitro.client.mjs";
declare module "#build/plugins.client.mjs";
declare module "#build/css.mjs";
declare module "#build/fetch.mjs";
declare module "#build/error-component.mjs";
declare module "#build/global-polyfills.mjs";
declare module "#build/layouts.mjs";
declare module "#build/middleware.mjs";
declare module "#build/nuxt.config.mjs";
declare module "#build/paths.mjs";
declare module "#build/root-component.mjs";
declare module "#build/plugins.server.mjs";
declare module "#build/test-component-wrapper.mjs";
declare module "#build/color-mode-options.mjs";
declare module "#build/routes.mjs";
declare module "#build/pages.mjs";
declare module "#build/router.options.mjs";
declare module "#build/unhead-options.mjs";
declare module "#build/unhead.config.mjs";
declare module "#build/components.plugin.mjs";
declare module "#build/component-names.mjs";
declare module "#build/components.islands.mjs";
declare module "#build/component-chunk.mjs";
declare module "#build/tailwind/expose/theme/aspectRatio.mjs";
declare module "#build/tailwind/expose/theme/typography.mjs";
declare module "#build/tailwind/expose/theme/containers.mjs";
declare module "#build/tailwind/expose/theme/accentColor.mjs";
declare module "#build/tailwind/expose/theme/animation.mjs";
declare module "#build/tailwind/expose/theme/aria.mjs";
declare module "#build/tailwind/expose/theme/backdropBlur.mjs";
declare module "#build/tailwind/expose/theme/backdropBrightness.mjs";
declare module "#build/tailwind/expose/theme/backdropContrast.mjs";
declare module "#build/tailwind/expose/theme/backdropGrayscale.mjs";
declare module "#build/tailwind/expose/theme/backdropHueRotate.mjs";
declare module "#build/tailwind/expose/theme/backdropInvert.mjs";
declare module "#build/tailwind/expose/theme/backdropOpacity.mjs";
declare module "#build/tailwind/expose/theme/backdropSaturate.mjs";
declare module "#build/tailwind/expose/theme/backdropSepia.mjs";
declare module "#build/tailwind/expose/theme/backgroundColor.mjs";
declare module "#build/tailwind/expose/theme/backgroundImage.mjs";
declare module "#build/tailwind/expose/theme/backgroundOpacity.mjs";
declare module "#build/tailwind/expose/theme/backgroundPosition.mjs";
declare module "#build/tailwind/expose/theme/backgroundSize.mjs";
declare module "#build/tailwind/expose/theme/blur.mjs";
declare module "#build/tailwind/expose/theme/borderColor.mjs";
declare module "#build/tailwind/expose/theme/borderOpacity.mjs";
declare module "#build/tailwind/expose/theme/borderRadius.mjs";
declare module "#build/tailwind/expose/theme/borderSpacing.mjs";
declare module "#build/tailwind/expose/theme/borderWidth.mjs";
declare module "#build/tailwind/expose/theme/boxShadow.mjs";
declare module "#build/tailwind/expose/theme/boxShadowColor.mjs";
declare module "#build/tailwind/expose/theme/brightness.mjs";
declare module "#build/tailwind/expose/theme/caretColor.mjs";
declare module "#build/tailwind/expose/theme/colors.mjs";
declare module "#build/tailwind/expose/theme/columns.mjs";
declare module "#build/tailwind/expose/theme/container.mjs";
declare module "#build/tailwind/expose/theme/content.mjs";
declare module "#build/tailwind/expose/theme/contrast.mjs";
declare module "#build/tailwind/expose/theme/cursor.mjs";
declare module "#build/tailwind/expose/theme/divideColor.mjs";
declare module "#build/tailwind/expose/theme/divideOpacity.mjs";
declare module "#build/tailwind/expose/theme/divideWidth.mjs";
declare module "#build/tailwind/expose/theme/dropShadow.mjs";
declare module "#build/tailwind/expose/theme/fill.mjs";
declare module "#build/tailwind/expose/theme/flex.mjs";
declare module "#build/tailwind/expose/theme/flexBasis.mjs";
declare module "#build/tailwind/expose/theme/flexGrow.mjs";
declare module "#build/tailwind/expose/theme/flexShrink.mjs";
declare module "#build/tailwind/expose/theme/fontFamily.mjs";
declare module "#build/tailwind/expose/theme/fontSize.mjs";
declare module "#build/tailwind/expose/theme/fontWeight.mjs";
declare module "#build/tailwind/expose/theme/gap.mjs";
declare module "#build/tailwind/expose/theme/gradientColorStops.mjs";
declare module "#build/tailwind/expose/theme/gradientColorStopPositions.mjs";
declare module "#build/tailwind/expose/theme/grayscale.mjs";
declare module "#build/tailwind/expose/theme/gridAutoColumns.mjs";
declare module "#build/tailwind/expose/theme/gridAutoRows.mjs";
declare module "#build/tailwind/expose/theme/gridColumn.mjs";
declare module "#build/tailwind/expose/theme/gridColumnEnd.mjs";
declare module "#build/tailwind/expose/theme/gridColumnStart.mjs";
declare module "#build/tailwind/expose/theme/gridRow.mjs";
declare module "#build/tailwind/expose/theme/gridRowEnd.mjs";
declare module "#build/tailwind/expose/theme/gridRowStart.mjs";
declare module "#build/tailwind/expose/theme/gridTemplateColumns.mjs";
declare module "#build/tailwind/expose/theme/gridTemplateRows.mjs";
declare module "#build/tailwind/expose/theme/height.mjs";
declare module "#build/tailwind/expose/theme/hueRotate.mjs";
declare module "#build/tailwind/expose/theme/inset.mjs";
declare module "#build/tailwind/expose/theme/invert.mjs";
declare module "#build/tailwind/expose/theme/keyframes.mjs";
declare module "#build/tailwind/expose/theme/letterSpacing.mjs";
declare module "#build/tailwind/expose/theme/lineHeight.mjs";
declare module "#build/tailwind/expose/theme/listStyleType.mjs";
declare module "#build/tailwind/expose/theme/listStyleImage.mjs";
declare module "#build/tailwind/expose/theme/margin.mjs";
declare module "#build/tailwind/expose/theme/lineClamp.mjs";
declare module "#build/tailwind/expose/theme/maxHeight.mjs";
declare module "#build/tailwind/expose/theme/maxWidth.mjs";
declare module "#build/tailwind/expose/theme/minHeight.mjs";
declare module "#build/tailwind/expose/theme/minWidth.mjs";
declare module "#build/tailwind/expose/theme/objectPosition.mjs";
declare module "#build/tailwind/expose/theme/opacity.mjs";
declare module "#build/tailwind/expose/theme/order.mjs";
declare module "#build/tailwind/expose/theme/outlineColor.mjs";
declare module "#build/tailwind/expose/theme/outlineOffset.mjs";
declare module "#build/tailwind/expose/theme/outlineWidth.mjs";
declare module "#build/tailwind/expose/theme/padding.mjs";
declare module "#build/tailwind/expose/theme/placeholderColor.mjs";
declare module "#build/tailwind/expose/theme/placeholderOpacity.mjs";
declare module "#build/tailwind/expose/theme/ringColor.mjs";
declare module "#build/tailwind/expose/theme/ringOffsetColor.mjs";
declare module "#build/tailwind/expose/theme/ringOffsetWidth.mjs";
declare module "#build/tailwind/expose/theme/ringOpacity.mjs";
declare module "#build/tailwind/expose/theme/ringWidth.mjs";
declare module "#build/tailwind/expose/theme/rotate.mjs";
declare module "#build/tailwind/expose/theme/saturate.mjs";
declare module "#build/tailwind/expose/theme/scale.mjs";
declare module "#build/tailwind/expose/theme/screens.mjs";
declare module "#build/tailwind/expose/theme/scrollMargin.mjs";
declare module "#build/tailwind/expose/theme/scrollPadding.mjs";
declare module "#build/tailwind/expose/theme/sepia.mjs";
declare module "#build/tailwind/expose/theme/skew.mjs";
declare module "#build/tailwind/expose/theme/space.mjs";
declare module "#build/tailwind/expose/theme/spacing.mjs";
declare module "#build/tailwind/expose/theme/stroke.mjs";
declare module "#build/tailwind/expose/theme/strokeWidth.mjs";
declare module "#build/tailwind/expose/theme/supports.mjs";
declare module "#build/tailwind/expose/theme/data.mjs";
declare module "#build/tailwind/expose/theme/textColor.mjs";
declare module "#build/tailwind/expose/theme/textDecorationColor.mjs";
declare module "#build/tailwind/expose/theme/textDecorationThickness.mjs";
declare module "#build/tailwind/expose/theme/textIndent.mjs";
declare module "#build/tailwind/expose/theme/textOpacity.mjs";
declare module "#build/tailwind/expose/theme/textUnderlineOffset.mjs";
declare module "#build/tailwind/expose/theme/transformOrigin.mjs";
declare module "#build/tailwind/expose/theme/transitionDelay.mjs";
declare module "#build/tailwind/expose/theme/transitionDuration.mjs";
declare module "#build/tailwind/expose/theme/transitionProperty.mjs";
declare module "#build/tailwind/expose/theme/transitionTimingFunction.mjs";
declare module "#build/tailwind/expose/theme/translate.mjs";
declare module "#build/tailwind/expose/theme/size.mjs";
declare module "#build/tailwind/expose/theme/width.mjs";
declare module "#build/tailwind/expose/theme/willChange.mjs";
declare module "#build/tailwind/expose/theme/zIndex.mjs";
declare module "#build/tailwind/expose/theme.mjs";
declare module "#build/tailwind/expose/corePlugins.mjs";
declare module "#build/tailwind/expose/plugins.mjs";
declare module "#build/tailwind/expose/content/relative.mjs";
declare module "#build/tailwind/expose/content/files.mjs";
declare module "#build/tailwind/expose/content/extract.mjs";
declare module "#build/tailwind/expose/content/transform.mjs";
declare module "#build/tailwind/expose/content.mjs";
declare module "#build/tailwind/expose/safelist.mjs";
declare module "#build/tailwind/expose/darkMode.mjs";
declare module "#build/tailwind/expose/variants/aspectRatio.mjs";
declare module "#build/tailwind/expose/variants.mjs";
declare module "#build/tailwind/expose/presets.mjs";
declare module "#build/tailwind/expose/prefix.mjs";
declare module "#build/tailwind/expose/important.mjs";
declare module "#build/tailwind/expose/separator.mjs";
declare module "#build/tailwind/expose/blocklist.mjs";

```

### ./.nuxt/types/builder-env.d.ts

```
import "vite/client";
```

### ./.nuxt/types/imports.d.ts

```
// Generated by auto imports
export {}
declare global {
  const WalleeService: typeof import('../../utils/walleeService')['WalleeService']
  const _useShortcuts: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useShortcuts')['_useShortcuts']
  const abortNavigation: typeof import('../../node_modules/nuxt/dist/app/composables/router')['abortNavigation']
  const acceptHMRUpdate: typeof import('../../node_modules/@pinia/nuxt/dist/runtime/composables')['acceptHMRUpdate']
  const addRouteMiddleware: typeof import('../../node_modules/nuxt/dist/app/composables/router')['addRouteMiddleware']
  const callOnce: typeof import('../../node_modules/nuxt/dist/app/composables/once')['callOnce']
  const cancelIdleCallback: typeof import('../../node_modules/nuxt/dist/app/compat/idle-callback')['cancelIdleCallback']
  const clearError: typeof import('../../node_modules/nuxt/dist/app/composables/error')['clearError']
  const clearNuxtData: typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['clearNuxtData']
  const clearNuxtState: typeof import('../../node_modules/nuxt/dist/app/composables/state')['clearNuxtState']
  const computed: typeof import('../../node_modules/vue')['computed']
  const createError: typeof import('../../node_modules/nuxt/dist/app/composables/error')['createError']
  const createPopper: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/usePopper')['createPopper']
  const customRef: typeof import('../../node_modules/vue')['customRef']
  const defineAppConfig: typeof import('../../node_modules/nuxt/dist/app/nuxt')['defineAppConfig']
  const defineAsyncComponent: typeof import('../../node_modules/vue')['defineAsyncComponent']
  const defineComponent: typeof import('../../node_modules/vue')['defineComponent']
  const defineNuxtComponent: typeof import('../../node_modules/nuxt/dist/app/composables/component')['defineNuxtComponent']
  const defineNuxtLink: typeof import('../../node_modules/nuxt/dist/app/components/nuxt-link')['defineNuxtLink']
  const defineNuxtPlugin: typeof import('../../node_modules/nuxt/dist/app/nuxt')['defineNuxtPlugin']
  const defineNuxtRouteMiddleware: typeof import('../../node_modules/nuxt/dist/app/composables/router')['defineNuxtRouteMiddleware']
  const definePageMeta: typeof import('../../node_modules/nuxt/dist/pages/runtime/composables')['definePageMeta']
  const definePayloadPlugin: typeof import('../../node_modules/nuxt/dist/app/nuxt')['definePayloadPlugin']
  const definePayloadReducer: typeof import('../../node_modules/nuxt/dist/app/composables/payload')['definePayloadReducer']
  const definePayloadReviver: typeof import('../../node_modules/nuxt/dist/app/composables/payload')['definePayloadReviver']
  const defineShortcuts: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/defineShortcuts')['defineShortcuts']
  const defineStore: typeof import('../../node_modules/@pinia/nuxt/dist/runtime/composables')['defineStore']
  const effect: typeof import('../../node_modules/vue')['effect']
  const effectScope: typeof import('../../node_modules/vue')['effectScope']
  const formatDate: typeof import('../../utils/dateUtils')['formatDate']
  const formatDateShort: typeof import('../../utils/dateUtils')['formatDateShort']
  const formatDateTime: typeof import('../../utils/dateUtils')['formatDateTime']
  const formatTime: typeof import('../../utils/dateUtils')['formatTime']
  const formatTimeShort: typeof import('../../utils/dateUtils')['formatTimeShort']
  const getAppManifest: typeof import('../../node_modules/nuxt/dist/app/composables/manifest')['getAppManifest']
  const getCurrentInstance: typeof import('../../node_modules/vue')['getCurrentInstance']
  const getCurrentScope: typeof import('../../node_modules/vue')['getCurrentScope']
  const getRouteRules: typeof import('../../node_modules/nuxt/dist/app/composables/manifest')['getRouteRules']
  const getSupabase: typeof import('../../utils/supabase')['getSupabase']
  const h: typeof import('../../node_modules/vue')['h']
  const hasInjectionContext: typeof import('../../node_modules/vue')['hasInjectionContext']
  const inject: typeof import('../../node_modules/vue')['inject']
  const injectHead: typeof import('../../node_modules/nuxt/dist/app/composables/head')['injectHead']
  const isNuxtError: typeof import('../../node_modules/nuxt/dist/app/composables/error')['isNuxtError']
  const isPrerendered: typeof import('../../node_modules/nuxt/dist/app/composables/payload')['isPrerendered']
  const isProxy: typeof import('../../node_modules/vue')['isProxy']
  const isReactive: typeof import('../../node_modules/vue')['isReactive']
  const isReadonly: typeof import('../../node_modules/vue')['isReadonly']
  const isRef: typeof import('../../node_modules/vue')['isRef']
  const isShallow: typeof import('../../node_modules/vue')['isShallow']
  const isVue2: typeof import('../../node_modules/nuxt/dist/app/compat/vue-demi')['isVue2']
  const isVue3: typeof import('../../node_modules/nuxt/dist/app/compat/vue-demi')['isVue3']
  const loadPayload: typeof import('../../node_modules/nuxt/dist/app/composables/payload')['loadPayload']
  const markRaw: typeof import('../../node_modules/vue')['markRaw']
  const mergeModels: typeof import('../../node_modules/vue')['mergeModels']
  const modalInjectionKey: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useModal')['modalInjectionKey']
  const navigateTo: typeof import('../../node_modules/nuxt/dist/app/composables/router')['navigateTo']
  const nextTick: typeof import('../../node_modules/vue')['nextTick']
  const onActivated: typeof import('../../node_modules/vue')['onActivated']
  const onBeforeMount: typeof import('../../node_modules/vue')['onBeforeMount']
  const onBeforeRouteLeave: typeof import('../../node_modules/vue-router')['onBeforeRouteLeave']
  const onBeforeRouteUpdate: typeof import('../../node_modules/vue-router')['onBeforeRouteUpdate']
  const onBeforeUnmount: typeof import('../../node_modules/vue')['onBeforeUnmount']
  const onBeforeUpdate: typeof import('../../node_modules/vue')['onBeforeUpdate']
  const onDeactivated: typeof import('../../node_modules/vue')['onDeactivated']
  const onErrorCaptured: typeof import('../../node_modules/vue')['onErrorCaptured']
  const onMounted: typeof import('../../node_modules/vue')['onMounted']
  const onNuxtReady: typeof import('../../node_modules/nuxt/dist/app/composables/ready')['onNuxtReady']
  const onPrehydrate: typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['onPrehydrate']
  const onRenderTracked: typeof import('../../node_modules/vue')['onRenderTracked']
  const onRenderTriggered: typeof import('../../node_modules/vue')['onRenderTriggered']
  const onScopeDispose: typeof import('../../node_modules/vue')['onScopeDispose']
  const onServerPrefetch: typeof import('../../node_modules/vue')['onServerPrefetch']
  const onUnmounted: typeof import('../../node_modules/vue')['onUnmounted']
  const onUpdated: typeof import('../../node_modules/vue')['onUpdated']
  const prefetchComponents: typeof import('../../node_modules/nuxt/dist/app/composables/preload')['prefetchComponents']
  const preloadComponents: typeof import('../../node_modules/nuxt/dist/app/composables/preload')['preloadComponents']
  const preloadPayload: typeof import('../../node_modules/nuxt/dist/app/composables/payload')['preloadPayload']
  const preloadRouteComponents: typeof import('../../node_modules/nuxt/dist/app/composables/preload')['preloadRouteComponents']
  const prerenderRoutes: typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['prerenderRoutes']
  const provide: typeof import('../../node_modules/vue')['provide']
  const proxyRefs: typeof import('../../node_modules/vue')['proxyRefs']
  const reactive: typeof import('../../node_modules/vue')['reactive']
  const readonly: typeof import('../../node_modules/vue')['readonly']
  const ref: typeof import('../../node_modules/vue')['ref']
  const refreshCookie: typeof import('../../node_modules/nuxt/dist/app/composables/cookie')['refreshCookie']
  const refreshNuxtData: typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['refreshNuxtData']
  const reloadNuxtApp: typeof import('../../node_modules/nuxt/dist/app/composables/chunk')['reloadNuxtApp']
  const requestIdleCallback: typeof import('../../node_modules/nuxt/dist/app/compat/idle-callback')['requestIdleCallback']
  const resolveComponent: typeof import('../../node_modules/vue')['resolveComponent']
  const setInterval: typeof import('../../node_modules/nuxt/dist/app/compat/interval')['setInterval']
  const setPageLayout: typeof import('../../node_modules/nuxt/dist/app/composables/router')['setPageLayout']
  const setResponseStatus: typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['setResponseStatus']
  const shallowReactive: typeof import('../../node_modules/vue')['shallowReactive']
  const shallowReadonly: typeof import('../../node_modules/vue')['shallowReadonly']
  const shallowRef: typeof import('../../node_modules/vue')['shallowRef']
  const showError: typeof import('../../node_modules/nuxt/dist/app/composables/error')['showError']
  const slidOverInjectionKey: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useSlideover')['slidOverInjectionKey']
  const storeToRefs: typeof import('../../node_modules/@pinia/nuxt/dist/runtime/composables')['storeToRefs']
  const supabase: typeof import('../../utils/supabase')['default']
  const toRaw: typeof import('../../node_modules/vue')['toRaw']
  const toRef: typeof import('../../node_modules/vue')['toRef']
  const toRefs: typeof import('../../node_modules/vue')['toRefs']
  const toValue: typeof import('../../node_modules/vue')['toValue']
  const triggerRef: typeof import('../../node_modules/vue')['triggerRef']
  const tryUseNuxtApp: typeof import('../../node_modules/nuxt/dist/app/nuxt')['tryUseNuxtApp']
  const unref: typeof import('../../node_modules/vue')['unref']
  const updateAppConfig: typeof import('../../node_modules/nuxt/dist/app/config')['updateAppConfig']
  const useAppConfig: typeof import('../../node_modules/nuxt/dist/app/config')['useAppConfig']
  const useAppointmentStatus: typeof import('../../composables/useAppointmentStatus')['useAppointmentStatus']
  const useAsyncData: typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['useAsyncData']
  const useAttrs: typeof import('../../node_modules/vue')['useAttrs']
  const useAuthStore: typeof import('../../stores/auth')['useAuthStore']
  const useCarouselScroll: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useCarouselScroll')['useCarouselScroll']
  const useCategoryData: typeof import('../../composables/useCategoryData')['useCategoryData']
  const useColorMode: typeof import('../../node_modules/@nuxtjs/color-mode/dist/runtime/composables')['useColorMode']
  const useCookie: typeof import('../../node_modules/nuxt/dist/app/composables/cookie')['useCookie']
  const useCopyToClipboard: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useCopyToClipboard')['useCopyToClipboard']
  const useCssModule: typeof import('../../node_modules/vue')['useCssModule']
  const useCssVars: typeof import('../../node_modules/vue')['useCssVars']
  const useCurrentUser: typeof import('../../composables/useCurrentUser')['useCurrentUser']
  const useDurationManager: typeof import('../../composables/useDurationManager')['useDurationManager']
  const useError: typeof import('../../node_modules/nuxt/dist/app/composables/error')['useError']
  const useEventModalForm: typeof import('../../composables/useEventModalForm')['useEventModalForm']
  const useEventModalHandlers: typeof import('../../composables/useEventModalHandlers')['useEventModalHandlers']
  const useEventModalWatchers: typeof import('../../composables/useEventModalWatchers')['useEventModalWatchers']
  const useFetch: typeof import('../../node_modules/nuxt/dist/app/composables/fetch')['useFetch']
  const useFormGroup: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useFormGroup')['useFormGroup']
  const useHead: typeof import('../../node_modules/nuxt/dist/app/composables/head')['useHead']
  const useHeadSafe: typeof import('../../node_modules/nuxt/dist/app/composables/head')['useHeadSafe']
  const useHydration: typeof import('../../node_modules/nuxt/dist/app/composables/hydrate')['useHydration']
  const useId: typeof import('../../node_modules/vue')['useId']
  const useInjectButtonGroup: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useButtonGroup')['useInjectButtonGroup']
  const useLazyAsyncData: typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['useLazyAsyncData']
  const useLazyFetch: typeof import('../../node_modules/nuxt/dist/app/composables/fetch')['useLazyFetch']
  const useLink: typeof import('../../node_modules/vue-router')['useLink']
  const useLoadingIndicator: typeof import('../../node_modules/nuxt/dist/app/composables/loading-indicator')['useLoadingIndicator']
  const useModal: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useModal')['useModal']
  const useModel: typeof import('../../node_modules/vue')['useModel']
  const useNuxtApp: typeof import('../../node_modules/nuxt/dist/app/nuxt')['useNuxtApp']
  const useNuxtData: typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['useNuxtData']
  const usePayments: typeof import('../../composables/usePayments')['usePayments']
  const usePendingTasks: typeof import('../../composables/usePendingTasks')['usePendingTasks']
  const usePinia: typeof import('../../node_modules/@pinia/nuxt/dist/runtime/composables')['usePinia']
  const usePopper: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/usePopper')['usePopper']
  const usePreviewMode: typeof import('../../node_modules/nuxt/dist/app/composables/preview')['usePreviewMode']
  const useProvideButtonGroup: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useButtonGroup')['useProvideButtonGroup']
  const useRequestEvent: typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useRequestEvent']
  const useRequestFetch: typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useRequestFetch']
  const useRequestHeader: typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useRequestHeader']
  const useRequestHeaders: typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useRequestHeaders']
  const useRequestURL: typeof import('../../node_modules/nuxt/dist/app/composables/url')['useRequestURL']
  const useResponseHeader: typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useResponseHeader']
  const useRoute: typeof import('../../node_modules/nuxt/dist/app/composables/router')['useRoute']
  const useRouteAnnouncer: typeof import('../../node_modules/nuxt/dist/app/composables/route-announcer')['useRouteAnnouncer']
  const useRouter: typeof import('../../node_modules/nuxt/dist/app/composables/router')['useRouter']
  const useRuntimeConfig: typeof import('../../node_modules/nuxt/dist/app/nuxt')['useRuntimeConfig']
  const useRuntimeHook: typeof import('../../node_modules/nuxt/dist/app/composables/runtime-hook')['useRuntimeHook']
  const useScript: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScript']
  const useScriptClarity: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptClarity']
  const useScriptCloudflareWebAnalytics: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptCloudflareWebAnalytics']
  const useScriptCrisp: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptCrisp']
  const useScriptEventPage: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptEventPage']
  const useScriptFathomAnalytics: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptFathomAnalytics']
  const useScriptGoogleAdsense: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptGoogleAdsense']
  const useScriptGoogleAnalytics: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptGoogleAnalytics']
  const useScriptGoogleMaps: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptGoogleMaps']
  const useScriptGoogleTagManager: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptGoogleTagManager']
  const useScriptHotjar: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptHotjar']
  const useScriptIntercom: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptIntercom']
  const useScriptLemonSqueezy: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptLemonSqueezy']
  const useScriptMatomoAnalytics: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptMatomoAnalytics']
  const useScriptMetaPixel: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptMetaPixel']
  const useScriptNpm: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptNpm']
  const useScriptPlausibleAnalytics: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptPlausibleAnalytics']
  const useScriptRybbitAnalytics: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptRybbitAnalytics']
  const useScriptSegment: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptSegment']
  const useScriptSnapchatPixel: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptSnapchatPixel']
  const useScriptStripe: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptStripe']
  const useScriptTriggerConsent: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptTriggerConsent']
  const useScriptTriggerElement: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptTriggerElement']
  const useScriptUmamiAnalytics: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptUmamiAnalytics']
  const useScriptVimeoPlayer: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptVimeoPlayer']
  const useScriptXPixel: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptXPixel']
  const useScriptYouTubePlayer: typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptYouTubePlayer']
  const useSeoMeta: typeof import('../../node_modules/nuxt/dist/app/composables/head')['useSeoMeta']
  const useServerHead: typeof import('../../node_modules/nuxt/dist/app/composables/head')['useServerHead']
  const useServerHeadSafe: typeof import('../../node_modules/nuxt/dist/app/composables/head')['useServerHeadSafe']
  const useServerSeoMeta: typeof import('../../node_modules/nuxt/dist/app/composables/head')['useServerSeoMeta']
  const useShadowRoot: typeof import('../../node_modules/vue')['useShadowRoot']
  const useShortcuts: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useShortcuts')['useShortcuts']
  const useSlideover: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useSlideover')['useSlideover']
  const useSlots: typeof import('../../node_modules/vue')['useSlots']
  const useStaffCategoryDurations: typeof import('../../composables/useStaffCategoryDurations')['useStaffCategoryDurations']
  const useStaffDurations: typeof import('../../composables/useStaffDurations')['useStaffDurations']
  const useState: typeof import('../../node_modules/nuxt/dist/app/composables/state')['useState']
  const useStudents: typeof import('../../composables/useStudents')['useStudents']
  const useTemplateRef: typeof import('../../node_modules/vue')['useTemplateRef']
  const useTimer: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useTimer')['useTimer']
  const useToast: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useToast')['useToast']
  const useTransitionState: typeof import('../../node_modules/vue')['useTransitionState']
  const useUI: typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useUI')['useUI']
  const useUsers: typeof import('../../composables/useUsers')['useUsers']
  const useWallee: typeof import('../../composables/useWallee')['useWallee']
  const watch: typeof import('../../node_modules/vue')['watch']
  const watchEffect: typeof import('../../node_modules/vue')['watchEffect']
  const watchPostEffect: typeof import('../../node_modules/vue')['watchPostEffect']
  const watchSyncEffect: typeof import('../../node_modules/vue')['watchSyncEffect']
  const withCtx: typeof import('../../node_modules/vue')['withCtx']
  const withDirectives: typeof import('../../node_modules/vue')['withDirectives']
  const withKeys: typeof import('../../node_modules/vue')['withKeys']
  const withMemo: typeof import('../../node_modules/vue')['withMemo']
  const withModifiers: typeof import('../../node_modules/vue')['withModifiers']
  const withScopeId: typeof import('../../node_modules/vue')['withScopeId']
}
// for type re-export
declare global {
  // @ts-ignore
  export type { Component, ComponentPublicInstance, ComputedRef, DirectiveBinding, ExtractDefaultPropTypes, ExtractPropTypes, ExtractPublicPropTypes, InjectionKey, PropType, Ref, MaybeRef, MaybeRefOrGetter, VNode, WritableComputedRef } from '../../node_modules/vue'
  import('../../node_modules/vue')
  // @ts-ignore
  export type { CriteriaEvaluationData } from '../../composables/usePendingTasks'
  import('../../composables/usePendingTasks')
  // @ts-ignore
  export type { WalleeService } from '../../utils/walleeService'
  import('../../utils/walleeService')
}
// for vue template auto import
import { UnwrapRef } from 'vue'
declare module 'vue' {
  interface ComponentCustomProperties {
    readonly WalleeService: UnwrapRef<typeof import('../../utils/walleeService')['WalleeService']>
    readonly _useShortcuts: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useShortcuts')['_useShortcuts']>
    readonly abortNavigation: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/router')['abortNavigation']>
    readonly acceptHMRUpdate: UnwrapRef<typeof import('../../node_modules/@pinia/nuxt/dist/runtime/composables')['acceptHMRUpdate']>
    readonly addRouteMiddleware: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/router')['addRouteMiddleware']>
    readonly callOnce: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/once')['callOnce']>
    readonly cancelIdleCallback: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/compat/idle-callback')['cancelIdleCallback']>
    readonly clearError: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/error')['clearError']>
    readonly clearNuxtData: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['clearNuxtData']>
    readonly clearNuxtState: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/state')['clearNuxtState']>
    readonly computed: UnwrapRef<typeof import('../../node_modules/vue')['computed']>
    readonly createError: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/error')['createError']>
    readonly createPopper: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/usePopper')['createPopper']>
    readonly customRef: UnwrapRef<typeof import('../../node_modules/vue')['customRef']>
    readonly defineAppConfig: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/nuxt')['defineAppConfig']>
    readonly defineAsyncComponent: UnwrapRef<typeof import('../../node_modules/vue')['defineAsyncComponent']>
    readonly defineComponent: UnwrapRef<typeof import('../../node_modules/vue')['defineComponent']>
    readonly defineNuxtComponent: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/component')['defineNuxtComponent']>
    readonly defineNuxtLink: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/components/nuxt-link')['defineNuxtLink']>
    readonly defineNuxtPlugin: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/nuxt')['defineNuxtPlugin']>
    readonly defineNuxtRouteMiddleware: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/router')['defineNuxtRouteMiddleware']>
    readonly definePageMeta: UnwrapRef<typeof import('../../node_modules/nuxt/dist/pages/runtime/composables')['definePageMeta']>
    readonly definePayloadPlugin: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/nuxt')['definePayloadPlugin']>
    readonly definePayloadReducer: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/payload')['definePayloadReducer']>
    readonly definePayloadReviver: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/payload')['definePayloadReviver']>
    readonly defineShortcuts: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/defineShortcuts')['defineShortcuts']>
    readonly defineStore: UnwrapRef<typeof import('../../node_modules/@pinia/nuxt/dist/runtime/composables')['defineStore']>
    readonly effect: UnwrapRef<typeof import('../../node_modules/vue')['effect']>
    readonly effectScope: UnwrapRef<typeof import('../../node_modules/vue')['effectScope']>
    readonly formatDate: UnwrapRef<typeof import('../../utils/dateUtils')['formatDate']>
    readonly formatDateShort: UnwrapRef<typeof import('../../utils/dateUtils')['formatDateShort']>
    readonly formatDateTime: UnwrapRef<typeof import('../../utils/dateUtils')['formatDateTime']>
    readonly formatTime: UnwrapRef<typeof import('../../utils/dateUtils')['formatTime']>
    readonly formatTimeShort: UnwrapRef<typeof import('../../utils/dateUtils')['formatTimeShort']>
    readonly getAppManifest: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/manifest')['getAppManifest']>
    readonly getCurrentInstance: UnwrapRef<typeof import('../../node_modules/vue')['getCurrentInstance']>
    readonly getCurrentScope: UnwrapRef<typeof import('../../node_modules/vue')['getCurrentScope']>
    readonly getRouteRules: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/manifest')['getRouteRules']>
    readonly getSupabase: UnwrapRef<typeof import('../../utils/supabase')['getSupabase']>
    readonly h: UnwrapRef<typeof import('../../node_modules/vue')['h']>
    readonly hasInjectionContext: UnwrapRef<typeof import('../../node_modules/vue')['hasInjectionContext']>
    readonly inject: UnwrapRef<typeof import('../../node_modules/vue')['inject']>
    readonly injectHead: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/head')['injectHead']>
    readonly isNuxtError: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/error')['isNuxtError']>
    readonly isPrerendered: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/payload')['isPrerendered']>
    readonly isProxy: UnwrapRef<typeof import('../../node_modules/vue')['isProxy']>
    readonly isReactive: UnwrapRef<typeof import('../../node_modules/vue')['isReactive']>
    readonly isReadonly: UnwrapRef<typeof import('../../node_modules/vue')['isReadonly']>
    readonly isRef: UnwrapRef<typeof import('../../node_modules/vue')['isRef']>
    readonly isShallow: UnwrapRef<typeof import('../../node_modules/vue')['isShallow']>
    readonly isVue2: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/compat/vue-demi')['isVue2']>
    readonly isVue3: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/compat/vue-demi')['isVue3']>
    readonly loadPayload: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/payload')['loadPayload']>
    readonly markRaw: UnwrapRef<typeof import('../../node_modules/vue')['markRaw']>
    readonly mergeModels: UnwrapRef<typeof import('../../node_modules/vue')['mergeModels']>
    readonly modalInjectionKey: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useModal')['modalInjectionKey']>
    readonly navigateTo: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/router')['navigateTo']>
    readonly nextTick: UnwrapRef<typeof import('../../node_modules/vue')['nextTick']>
    readonly onActivated: UnwrapRef<typeof import('../../node_modules/vue')['onActivated']>
    readonly onBeforeMount: UnwrapRef<typeof import('../../node_modules/vue')['onBeforeMount']>
    readonly onBeforeRouteLeave: UnwrapRef<typeof import('../../node_modules/vue-router')['onBeforeRouteLeave']>
    readonly onBeforeRouteUpdate: UnwrapRef<typeof import('../../node_modules/vue-router')['onBeforeRouteUpdate']>
    readonly onBeforeUnmount: UnwrapRef<typeof import('../../node_modules/vue')['onBeforeUnmount']>
    readonly onBeforeUpdate: UnwrapRef<typeof import('../../node_modules/vue')['onBeforeUpdate']>
    readonly onDeactivated: UnwrapRef<typeof import('../../node_modules/vue')['onDeactivated']>
    readonly onErrorCaptured: UnwrapRef<typeof import('../../node_modules/vue')['onErrorCaptured']>
    readonly onMounted: UnwrapRef<typeof import('../../node_modules/vue')['onMounted']>
    readonly onNuxtReady: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ready')['onNuxtReady']>
    readonly onPrehydrate: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['onPrehydrate']>
    readonly onRenderTracked: UnwrapRef<typeof import('../../node_modules/vue')['onRenderTracked']>
    readonly onRenderTriggered: UnwrapRef<typeof import('../../node_modules/vue')['onRenderTriggered']>
    readonly onScopeDispose: UnwrapRef<typeof import('../../node_modules/vue')['onScopeDispose']>
    readonly onServerPrefetch: UnwrapRef<typeof import('../../node_modules/vue')['onServerPrefetch']>
    readonly onUnmounted: UnwrapRef<typeof import('../../node_modules/vue')['onUnmounted']>
    readonly onUpdated: UnwrapRef<typeof import('../../node_modules/vue')['onUpdated']>
    readonly prefetchComponents: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/preload')['prefetchComponents']>
    readonly preloadComponents: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/preload')['preloadComponents']>
    readonly preloadPayload: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/payload')['preloadPayload']>
    readonly preloadRouteComponents: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/preload')['preloadRouteComponents']>
    readonly prerenderRoutes: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['prerenderRoutes']>
    readonly provide: UnwrapRef<typeof import('../../node_modules/vue')['provide']>
    readonly proxyRefs: UnwrapRef<typeof import('../../node_modules/vue')['proxyRefs']>
    readonly reactive: UnwrapRef<typeof import('../../node_modules/vue')['reactive']>
    readonly readonly: UnwrapRef<typeof import('../../node_modules/vue')['readonly']>
    readonly ref: UnwrapRef<typeof import('../../node_modules/vue')['ref']>
    readonly refreshCookie: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/cookie')['refreshCookie']>
    readonly refreshNuxtData: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['refreshNuxtData']>
    readonly reloadNuxtApp: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/chunk')['reloadNuxtApp']>
    readonly requestIdleCallback: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/compat/idle-callback')['requestIdleCallback']>
    readonly resolveComponent: UnwrapRef<typeof import('../../node_modules/vue')['resolveComponent']>
    readonly setInterval: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/compat/interval')['setInterval']>
    readonly setPageLayout: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/router')['setPageLayout']>
    readonly setResponseStatus: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['setResponseStatus']>
    readonly shallowReactive: UnwrapRef<typeof import('../../node_modules/vue')['shallowReactive']>
    readonly shallowReadonly: UnwrapRef<typeof import('../../node_modules/vue')['shallowReadonly']>
    readonly shallowRef: UnwrapRef<typeof import('../../node_modules/vue')['shallowRef']>
    readonly showError: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/error')['showError']>
    readonly slidOverInjectionKey: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useSlideover')['slidOverInjectionKey']>
    readonly storeToRefs: UnwrapRef<typeof import('../../node_modules/@pinia/nuxt/dist/runtime/composables')['storeToRefs']>
    readonly supabase: UnwrapRef<typeof import('../../utils/supabase')['default']>
    readonly toRaw: UnwrapRef<typeof import('../../node_modules/vue')['toRaw']>
    readonly toRef: UnwrapRef<typeof import('../../node_modules/vue')['toRef']>
    readonly toRefs: UnwrapRef<typeof import('../../node_modules/vue')['toRefs']>
    readonly toValue: UnwrapRef<typeof import('../../node_modules/vue')['toValue']>
    readonly triggerRef: UnwrapRef<typeof import('../../node_modules/vue')['triggerRef']>
    readonly tryUseNuxtApp: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/nuxt')['tryUseNuxtApp']>
    readonly unref: UnwrapRef<typeof import('../../node_modules/vue')['unref']>
    readonly updateAppConfig: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/config')['updateAppConfig']>
    readonly useAppConfig: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/config')['useAppConfig']>
    readonly useAppointmentStatus: UnwrapRef<typeof import('../../composables/useAppointmentStatus')['useAppointmentStatus']>
    readonly useAsyncData: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['useAsyncData']>
    readonly useAttrs: UnwrapRef<typeof import('../../node_modules/vue')['useAttrs']>
    readonly useAuthStore: UnwrapRef<typeof import('../../stores/auth')['useAuthStore']>
    readonly useCarouselScroll: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useCarouselScroll')['useCarouselScroll']>
    readonly useCategoryData: UnwrapRef<typeof import('../../composables/useCategoryData')['useCategoryData']>
    readonly useColorMode: UnwrapRef<typeof import('../../node_modules/@nuxtjs/color-mode/dist/runtime/composables')['useColorMode']>
    readonly useCookie: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/cookie')['useCookie']>
    readonly useCopyToClipboard: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useCopyToClipboard')['useCopyToClipboard']>
    readonly useCssModule: UnwrapRef<typeof import('../../node_modules/vue')['useCssModule']>
    readonly useCssVars: UnwrapRef<typeof import('../../node_modules/vue')['useCssVars']>
    readonly useCurrentUser: UnwrapRef<typeof import('../../composables/useCurrentUser')['useCurrentUser']>
    readonly useDurationManager: UnwrapRef<typeof import('../../composables/useDurationManager')['useDurationManager']>
    readonly useError: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/error')['useError']>
    readonly useEventModalForm: UnwrapRef<typeof import('../../composables/useEventModalForm')['useEventModalForm']>
    readonly useEventModalHandlers: UnwrapRef<typeof import('../../composables/useEventModalHandlers')['useEventModalHandlers']>
    readonly useEventModalWatchers: UnwrapRef<typeof import('../../composables/useEventModalWatchers')['useEventModalWatchers']>
    readonly useFetch: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/fetch')['useFetch']>
    readonly useFormGroup: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useFormGroup')['useFormGroup']>
    readonly useHead: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/head')['useHead']>
    readonly useHeadSafe: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/head')['useHeadSafe']>
    readonly useHydration: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/hydrate')['useHydration']>
    readonly useId: UnwrapRef<typeof import('../../node_modules/vue')['useId']>
    readonly useInjectButtonGroup: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useButtonGroup')['useInjectButtonGroup']>
    readonly useLazyAsyncData: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['useLazyAsyncData']>
    readonly useLazyFetch: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/fetch')['useLazyFetch']>
    readonly useLink: UnwrapRef<typeof import('../../node_modules/vue-router')['useLink']>
    readonly useLoadingIndicator: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/loading-indicator')['useLoadingIndicator']>
    readonly useModal: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useModal')['useModal']>
    readonly useModel: UnwrapRef<typeof import('../../node_modules/vue')['useModel']>
    readonly useNuxtApp: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/nuxt')['useNuxtApp']>
    readonly useNuxtData: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/asyncData')['useNuxtData']>
    readonly usePayments: UnwrapRef<typeof import('../../composables/usePayments')['usePayments']>
    readonly usePendingTasks: UnwrapRef<typeof import('../../composables/usePendingTasks')['usePendingTasks']>
    readonly usePinia: UnwrapRef<typeof import('../../node_modules/@pinia/nuxt/dist/runtime/composables')['usePinia']>
    readonly usePopper: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/usePopper')['usePopper']>
    readonly usePreviewMode: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/preview')['usePreviewMode']>
    readonly useProvideButtonGroup: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useButtonGroup')['useProvideButtonGroup']>
    readonly useRequestEvent: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useRequestEvent']>
    readonly useRequestFetch: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useRequestFetch']>
    readonly useRequestHeader: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useRequestHeader']>
    readonly useRequestHeaders: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useRequestHeaders']>
    readonly useRequestURL: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/url')['useRequestURL']>
    readonly useResponseHeader: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/ssr')['useResponseHeader']>
    readonly useRoute: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/router')['useRoute']>
    readonly useRouteAnnouncer: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/route-announcer')['useRouteAnnouncer']>
    readonly useRouter: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/router')['useRouter']>
    readonly useRuntimeConfig: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/nuxt')['useRuntimeConfig']>
    readonly useRuntimeHook: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/runtime-hook')['useRuntimeHook']>
    readonly useScript: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScript']>
    readonly useScriptClarity: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptClarity']>
    readonly useScriptCloudflareWebAnalytics: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptCloudflareWebAnalytics']>
    readonly useScriptCrisp: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptCrisp']>
    readonly useScriptEventPage: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptEventPage']>
    readonly useScriptFathomAnalytics: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptFathomAnalytics']>
    readonly useScriptGoogleAdsense: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptGoogleAdsense']>
    readonly useScriptGoogleAnalytics: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptGoogleAnalytics']>
    readonly useScriptGoogleMaps: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptGoogleMaps']>
    readonly useScriptGoogleTagManager: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptGoogleTagManager']>
    readonly useScriptHotjar: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptHotjar']>
    readonly useScriptIntercom: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptIntercom']>
    readonly useScriptLemonSqueezy: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptLemonSqueezy']>
    readonly useScriptMatomoAnalytics: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptMatomoAnalytics']>
    readonly useScriptMetaPixel: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptMetaPixel']>
    readonly useScriptNpm: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptNpm']>
    readonly useScriptPlausibleAnalytics: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptPlausibleAnalytics']>
    readonly useScriptRybbitAnalytics: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptRybbitAnalytics']>
    readonly useScriptSegment: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptSegment']>
    readonly useScriptSnapchatPixel: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptSnapchatPixel']>
    readonly useScriptStripe: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptStripe']>
    readonly useScriptTriggerConsent: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptTriggerConsent']>
    readonly useScriptTriggerElement: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptTriggerElement']>
    readonly useScriptUmamiAnalytics: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptUmamiAnalytics']>
    readonly useScriptVimeoPlayer: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptVimeoPlayer']>
    readonly useScriptXPixel: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptXPixel']>
    readonly useScriptYouTubePlayer: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/script-stubs')['useScriptYouTubePlayer']>
    readonly useSeoMeta: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/head')['useSeoMeta']>
    readonly useServerHead: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/head')['useServerHead']>
    readonly useServerHeadSafe: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/head')['useServerHeadSafe']>
    readonly useServerSeoMeta: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/head')['useServerSeoMeta']>
    readonly useShadowRoot: UnwrapRef<typeof import('../../node_modules/vue')['useShadowRoot']>
    readonly useShortcuts: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useShortcuts')['useShortcuts']>
    readonly useSlideover: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useSlideover')['useSlideover']>
    readonly useSlots: UnwrapRef<typeof import('../../node_modules/vue')['useSlots']>
    readonly useStaffCategoryDurations: UnwrapRef<typeof import('../../composables/useStaffCategoryDurations')['useStaffCategoryDurations']>
    readonly useStaffDurations: UnwrapRef<typeof import('../../composables/useStaffDurations')['useStaffDurations']>
    readonly useState: UnwrapRef<typeof import('../../node_modules/nuxt/dist/app/composables/state')['useState']>
    readonly useStudents: UnwrapRef<typeof import('../../composables/useStudents')['useStudents']>
    readonly useTemplateRef: UnwrapRef<typeof import('../../node_modules/vue')['useTemplateRef']>
    readonly useTimer: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useTimer')['useTimer']>
    readonly useToast: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useToast')['useToast']>
    readonly useTransitionState: UnwrapRef<typeof import('../../node_modules/vue')['useTransitionState']>
    readonly useUI: UnwrapRef<typeof import('../../node_modules/@nuxt/ui/dist/runtime/composables/useUI')['useUI']>
    readonly useUsers: UnwrapRef<typeof import('../../composables/useUsers')['useUsers']>
    readonly useWallee: UnwrapRef<typeof import('../../composables/useWallee')['useWallee']>
    readonly watch: UnwrapRef<typeof import('../../node_modules/vue')['watch']>
    readonly watchEffect: UnwrapRef<typeof import('../../node_modules/vue')['watchEffect']>
    readonly watchPostEffect: UnwrapRef<typeof import('../../node_modules/vue')['watchPostEffect']>
    readonly watchSyncEffect: UnwrapRef<typeof import('../../node_modules/vue')['watchSyncEffect']>
    readonly withCtx: UnwrapRef<typeof import('../../node_modules/vue')['withCtx']>
    readonly withDirectives: UnwrapRef<typeof import('../../node_modules/vue')['withDirectives']>
    readonly withKeys: UnwrapRef<typeof import('../../node_modules/vue')['withKeys']>
    readonly withMemo: UnwrapRef<typeof import('../../node_modules/vue')['withMemo']>
    readonly withModifiers: UnwrapRef<typeof import('../../node_modules/vue')['withModifiers']>
    readonly withScopeId: UnwrapRef<typeof import('../../node_modules/vue')['withScopeId']>
  }
}
```

### ./.nuxt/types/layouts.d.ts

```
import type { ComputedRef, MaybeRef } from 'vue'
export type LayoutKey = "default" | "minimal"
declare module 'nuxt/app' {
  interface PageMeta {
    layout?: MaybeRef<LayoutKey | false> | ComputedRef<LayoutKey | false>
  }
}
```

### ./.nuxt/types/middleware.d.ts

```
import type { NavigationGuard } from 'vue-router'
export type MiddlewareKey = "auth-check"
declare module 'nuxt/app' {
  interface PageMeta {
    middleware?: MiddlewareKey | NavigationGuard | Array<MiddlewareKey | NavigationGuard>
  }
}
```

### ./.nuxt/types/nitro-config.d.ts

```
// Generated by nitro

// App Config
import type { Defu } from 'defu'



type UserAppConfig = Defu<{}, []>

declare module "nitropack/types" {
  interface AppConfig extends UserAppConfig {}

}
export {}
```

### ./.nuxt/types/nitro-imports.d.ts

```
declare global {
  const __buildAssetsURL: typeof import('../../node_modules/nuxt/dist/core/runtime/nitro/utils/paths')['buildAssetsURL']
  const __publicAssetsURL: typeof import('../../node_modules/nuxt/dist/core/runtime/nitro/utils/paths')['publicAssetsURL']
  const appendCorsHeaders: typeof import('../../node_modules/h3')['appendCorsHeaders']
  const appendCorsPreflightHeaders: typeof import('../../node_modules/h3')['appendCorsPreflightHeaders']
  const appendHeader: typeof import('../../node_modules/h3')['appendHeader']
  const appendHeaders: typeof import('../../node_modules/h3')['appendHeaders']
  const appendResponseHeader: typeof import('../../node_modules/h3')['appendResponseHeader']
  const appendResponseHeaders: typeof import('../../node_modules/h3')['appendResponseHeaders']
  const assertMethod: typeof import('../../node_modules/h3')['assertMethod']
  const cachedEventHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache')['cachedEventHandler']
  const cachedFunction: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache')['cachedFunction']
  const callNodeListener: typeof import('../../node_modules/h3')['callNodeListener']
  const clearResponseHeaders: typeof import('../../node_modules/h3')['clearResponseHeaders']
  const clearSession: typeof import('../../node_modules/h3')['clearSession']
  const createApp: typeof import('../../node_modules/h3')['createApp']
  const createAppEventHandler: typeof import('../../node_modules/h3')['createAppEventHandler']
  const createError: typeof import('../../node_modules/h3')['createError']
  const createEvent: typeof import('../../node_modules/h3')['createEvent']
  const createEventStream: typeof import('../../node_modules/h3')['createEventStream']
  const createRouter: typeof import('../../node_modules/h3')['createRouter']
  const defaultContentType: typeof import('../../node_modules/h3')['defaultContentType']
  const defineAppConfig: typeof import('../../node_modules/nuxt/dist/core/runtime/nitro/utils/config')['defineAppConfig']
  const defineCachedEventHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache')['defineCachedEventHandler']
  const defineCachedFunction: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache')['defineCachedFunction']
  const defineEventHandler: typeof import('../../node_modules/h3')['defineEventHandler']
  const defineLazyEventHandler: typeof import('../../node_modules/h3')['defineLazyEventHandler']
  const defineNitroErrorHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/error/utils')['defineNitroErrorHandler']
  const defineNitroPlugin: typeof import('../../node_modules/nitropack/dist/runtime/internal/plugin')['defineNitroPlugin']
  const defineNodeListener: typeof import('../../node_modules/h3')['defineNodeListener']
  const defineNodeMiddleware: typeof import('../../node_modules/h3')['defineNodeMiddleware']
  const defineRenderHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/renderer')['defineRenderHandler']
  const defineRequestMiddleware: typeof import('../../node_modules/h3')['defineRequestMiddleware']
  const defineResponseMiddleware: typeof import('../../node_modules/h3')['defineResponseMiddleware']
  const defineRouteMeta: typeof import('../../node_modules/nitropack/dist/runtime/internal/meta')['defineRouteMeta']
  const defineTask: typeof import('../../node_modules/nitropack/dist/runtime/internal/task')['defineTask']
  const defineWebSocket: typeof import('../../node_modules/h3')['defineWebSocket']
  const defineWebSocketHandler: typeof import('../../node_modules/h3')['defineWebSocketHandler']
  const deleteCookie: typeof import('../../node_modules/h3')['deleteCookie']
  const dynamicEventHandler: typeof import('../../node_modules/h3')['dynamicEventHandler']
  const eventHandler: typeof import('../../node_modules/h3')['eventHandler']
  const fetchWithEvent: typeof import('../../node_modules/h3')['fetchWithEvent']
  const fromNodeMiddleware: typeof import('../../node_modules/h3')['fromNodeMiddleware']
  const fromPlainHandler: typeof import('../../node_modules/h3')['fromPlainHandler']
  const fromWebHandler: typeof import('../../node_modules/h3')['fromWebHandler']
  const getCookie: typeof import('../../node_modules/h3')['getCookie']
  const getHeader: typeof import('../../node_modules/h3')['getHeader']
  const getHeaders: typeof import('../../node_modules/h3')['getHeaders']
  const getMethod: typeof import('../../node_modules/h3')['getMethod']
  const getProxyRequestHeaders: typeof import('../../node_modules/h3')['getProxyRequestHeaders']
  const getQuery: typeof import('../../node_modules/h3')['getQuery']
  const getRequestFingerprint: typeof import('../../node_modules/h3')['getRequestFingerprint']
  const getRequestHeader: typeof import('../../node_modules/h3')['getRequestHeader']
  const getRequestHeaders: typeof import('../../node_modules/h3')['getRequestHeaders']
  const getRequestHost: typeof import('../../node_modules/h3')['getRequestHost']
  const getRequestIP: typeof import('../../node_modules/h3')['getRequestIP']
  const getRequestPath: typeof import('../../node_modules/h3')['getRequestPath']
  const getRequestProtocol: typeof import('../../node_modules/h3')['getRequestProtocol']
  const getRequestURL: typeof import('../../node_modules/h3')['getRequestURL']
  const getRequestWebStream: typeof import('../../node_modules/h3')['getRequestWebStream']
  const getResponseHeader: typeof import('../../node_modules/h3')['getResponseHeader']
  const getResponseHeaders: typeof import('../../node_modules/h3')['getResponseHeaders']
  const getResponseStatus: typeof import('../../node_modules/h3')['getResponseStatus']
  const getResponseStatusText: typeof import('../../node_modules/h3')['getResponseStatusText']
  const getRouteRules: typeof import('../../node_modules/nitropack/dist/runtime/internal/route-rules')['getRouteRules']
  const getRouterParam: typeof import('../../node_modules/h3')['getRouterParam']
  const getRouterParams: typeof import('../../node_modules/h3')['getRouterParams']
  const getSession: typeof import('../../node_modules/h3')['getSession']
  const getValidatedQuery: typeof import('../../node_modules/h3')['getValidatedQuery']
  const getValidatedRouterParams: typeof import('../../node_modules/h3')['getValidatedRouterParams']
  const handleCacheHeaders: typeof import('../../node_modules/h3')['handleCacheHeaders']
  const handleCors: typeof import('../../node_modules/h3')['handleCors']
  const isCorsOriginAllowed: typeof import('../../node_modules/h3')['isCorsOriginAllowed']
  const isError: typeof import('../../node_modules/h3')['isError']
  const isEvent: typeof import('../../node_modules/h3')['isEvent']
  const isEventHandler: typeof import('../../node_modules/h3')['isEventHandler']
  const isMethod: typeof import('../../node_modules/h3')['isMethod']
  const isPreflightRequest: typeof import('../../node_modules/h3')['isPreflightRequest']
  const isStream: typeof import('../../node_modules/h3')['isStream']
  const isWebResponse: typeof import('../../node_modules/h3')['isWebResponse']
  const lazyEventHandler: typeof import('../../node_modules/h3')['lazyEventHandler']
  const nitroPlugin: typeof import('../../node_modules/nitropack/dist/runtime/internal/plugin')['nitroPlugin']
  const parseCookies: typeof import('../../node_modules/h3')['parseCookies']
  const promisifyNodeListener: typeof import('../../node_modules/h3')['promisifyNodeListener']
  const proxyRequest: typeof import('../../node_modules/h3')['proxyRequest']
  const readBody: typeof import('../../node_modules/h3')['readBody']
  const readFormData: typeof import('../../node_modules/h3')['readFormData']
  const readMultipartFormData: typeof import('../../node_modules/h3')['readMultipartFormData']
  const readRawBody: typeof import('../../node_modules/h3')['readRawBody']
  const readValidatedBody: typeof import('../../node_modules/h3')['readValidatedBody']
  const removeResponseHeader: typeof import('../../node_modules/h3')['removeResponseHeader']
  const runTask: typeof import('../../node_modules/nitropack/dist/runtime/internal/task')['runTask']
  const sanitizeStatusCode: typeof import('../../node_modules/h3')['sanitizeStatusCode']
  const sanitizeStatusMessage: typeof import('../../node_modules/h3')['sanitizeStatusMessage']
  const sealSession: typeof import('../../node_modules/h3')['sealSession']
  const send: typeof import('../../node_modules/h3')['send']
  const sendError: typeof import('../../node_modules/h3')['sendError']
  const sendIterable: typeof import('../../node_modules/h3')['sendIterable']
  const sendNoContent: typeof import('../../node_modules/h3')['sendNoContent']
  const sendProxy: typeof import('../../node_modules/h3')['sendProxy']
  const sendRedirect: typeof import('../../node_modules/h3')['sendRedirect']
  const sendStream: typeof import('../../node_modules/h3')['sendStream']
  const sendWebResponse: typeof import('../../node_modules/h3')['sendWebResponse']
  const serveStatic: typeof import('../../node_modules/h3')['serveStatic']
  const setCookie: typeof import('../../node_modules/h3')['setCookie']
  const setHeader: typeof import('../../node_modules/h3')['setHeader']
  const setHeaders: typeof import('../../node_modules/h3')['setHeaders']
  const setResponseHeader: typeof import('../../node_modules/h3')['setResponseHeader']
  const setResponseHeaders: typeof import('../../node_modules/h3')['setResponseHeaders']
  const setResponseStatus: typeof import('../../node_modules/h3')['setResponseStatus']
  const splitCookiesString: typeof import('../../node_modules/h3')['splitCookiesString']
  const toEventHandler: typeof import('../../node_modules/h3')['toEventHandler']
  const toNodeListener: typeof import('../../node_modules/h3')['toNodeListener']
  const toPlainHandler: typeof import('../../node_modules/h3')['toPlainHandler']
  const toWebHandler: typeof import('../../node_modules/h3')['toWebHandler']
  const toWebRequest: typeof import('../../node_modules/h3')['toWebRequest']
  const unsealSession: typeof import('../../node_modules/h3')['unsealSession']
  const updateSession: typeof import('../../node_modules/h3')['updateSession']
  const useAppConfig: typeof import('../../node_modules/nitropack/dist/runtime/internal/config')['useAppConfig']
  const useBase: typeof import('../../node_modules/h3')['useBase']
  const useEvent: typeof import('../../node_modules/nitropack/dist/runtime/internal/context')['useEvent']
  const useNitroApp: typeof import('../../node_modules/nitropack/dist/runtime/internal/app')['useNitroApp']
  const useRuntimeConfig: typeof import('../../node_modules/nitropack/dist/runtime/internal/config')['useRuntimeConfig']
  const useSession: typeof import('../../node_modules/h3')['useSession']
  const useStorage: typeof import('../../node_modules/nitropack/dist/runtime/internal/storage')['useStorage']
  const writeEarlyHints: typeof import('../../node_modules/h3')['writeEarlyHints']
}
export { useNitroApp } from 'nitropack/runtime/internal/app';
export { useRuntimeConfig, useAppConfig } from 'nitropack/runtime/internal/config';
export { defineNitroPlugin, nitroPlugin } from 'nitropack/runtime/internal/plugin';
export { defineCachedFunction, defineCachedEventHandler, cachedFunction, cachedEventHandler } from 'nitropack/runtime/internal/cache';
export { useStorage } from 'nitropack/runtime/internal/storage';
export { defineRenderHandler } from 'nitropack/runtime/internal/renderer';
export { defineRouteMeta } from 'nitropack/runtime/internal/meta';
export { getRouteRules } from 'nitropack/runtime/internal/route-rules';
export { useEvent } from 'nitropack/runtime/internal/context';
export { defineTask, runTask } from 'nitropack/runtime/internal/task';
export { defineNitroErrorHandler } from 'nitropack/runtime/internal/error/utils';
export { appendCorsHeaders, appendCorsPreflightHeaders, appendHeader, appendHeaders, appendResponseHeader, appendResponseHeaders, assertMethod, callNodeListener, clearResponseHeaders, clearSession, createApp, createAppEventHandler, createError, createEvent, createEventStream, createRouter, defaultContentType, defineEventHandler, defineLazyEventHandler, defineNodeListener, defineNodeMiddleware, defineRequestMiddleware, defineResponseMiddleware, defineWebSocket, defineWebSocketHandler, deleteCookie, dynamicEventHandler, eventHandler, fetchWithEvent, fromNodeMiddleware, fromPlainHandler, fromWebHandler, getCookie, getHeader, getHeaders, getMethod, getProxyRequestHeaders, getQuery, getRequestFingerprint, getRequestHeader, getRequestHeaders, getRequestHost, getRequestIP, getRequestPath, getRequestProtocol, getRequestURL, getRequestWebStream, getResponseHeader, getResponseHeaders, getResponseStatus, getResponseStatusText, getRouterParam, getRouterParams, getSession, getValidatedQuery, getValidatedRouterParams, handleCacheHeaders, handleCors, isCorsOriginAllowed, isError, isEvent, isEventHandler, isMethod, isPreflightRequest, isStream, isWebResponse, lazyEventHandler, parseCookies, promisifyNodeListener, proxyRequest, readBody, readFormData, readMultipartFormData, readRawBody, readValidatedBody, removeResponseHeader, sanitizeStatusCode, sanitizeStatusMessage, sealSession, send, sendError, sendIterable, sendNoContent, sendProxy, sendRedirect, sendStream, sendWebResponse, serveStatic, setCookie, setHeader, setHeaders, setResponseHeader, setResponseHeaders, setResponseStatus, splitCookiesString, toEventHandler, toNodeListener, toPlainHandler, toWebHandler, toWebRequest, unsealSession, updateSession, useBase, useSession, writeEarlyHints } from 'h3';
export { buildAssetsURL as __buildAssetsURL, publicAssetsURL as __publicAssetsURL } from '/Users/pascalkilchenmann/neues-driving-team-app/node_modules/nuxt/dist/core/runtime/nitro/utils/paths';
export { defineAppConfig } from '/Users/pascalkilchenmann/neues-driving-team-app/node_modules/nuxt/dist/core/runtime/nitro/utils/config';
```

### ./.nuxt/types/nitro-middleware.d.ts

```
export type MiddlewareKey = "auth-check"
declare module 'nitropack' {
  interface NitroRouteConfig {
    appMiddleware?: MiddlewareKey | MiddlewareKey[] | Record<MiddlewareKey, boolean>
  }
}
```

### ./.nuxt/types/nitro-nuxt.d.ts

```

/// <reference path="nitro-middleware.d.ts" />
/// <reference path="./schema.d.ts" />

import type { RuntimeConfig } from 'nuxt/schema'
import type { H3Event } from 'h3'
import type { LogObject } from 'consola'
import type { NuxtIslandContext, NuxtIslandResponse, NuxtRenderHTMLContext } from 'nuxt/app'

declare module 'nitropack' {
  interface NitroRuntimeConfigApp {
    buildAssetsDir: string
    cdnURL: string
  }
  interface NitroRuntimeConfig extends RuntimeConfig {}
  interface NitroRouteConfig {
    ssr?: boolean
    noScripts?: boolean
    /** @deprecated Use `noScripts` instead */
    experimentalNoScripts?: boolean
  }
  interface NitroRouteRules {
    ssr?: boolean
    noScripts?: boolean
    /** @deprecated Use `noScripts` instead */
    experimentalNoScripts?: boolean
    appMiddleware?: Record<string, boolean>
  }
  interface NitroRuntimeHooks {
    'dev:ssr-logs': (ctx: { logs: LogObject[], path: string }) => void | Promise<void>
    'render:html': (htmlContext: NuxtRenderHTMLContext, context: { event: H3Event }) => void | Promise<void>
    'render:island': (islandResponse: NuxtIslandResponse, context: { event: H3Event, islandContext: NuxtIslandContext }) => void | Promise<void>
  }
}

```

### ./.nuxt/types/nitro-routes.d.ts

```
// Generated by nitro
import type { Serialize, Simplify } from "nitropack/types";
declare module "nitropack/types" {
  type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T
  interface InternalApi {
    '/api/payments/receipt': {
      'post': Simplify<Serialize<Awaited<ReturnType<typeof import('../../server/api/payments/receipt.post').default>>>>
    }
    '/api/wallee/create-transaction': {
      'post': Simplify<Serialize<Awaited<ReturnType<typeof import('../../server/api/wallee/create-transaction.post').default>>>>
    }
    '/api/wallee/debug-credentials': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../server/api/wallee/debug-credentials.get').default>>>>
    }
    '/api/wallee/test-auth': {
      'post': Simplify<Serialize<Awaited<ReturnType<typeof import('../../server/api/wallee/test-auth.post').default>>>>
    }
    '/api/wallee/test-connection': {
      'get': Simplify<Serialize<Awaited<ReturnType<typeof import('../../server/api/wallee/test-connection.get').default>>>>
    }
    '/api/wallee/transaction-debug': {
      'post': Simplify<Serialize<Awaited<ReturnType<typeof import('../../server/api/wallee/transaction-debug.post').default>>>>
    }
    '/__nuxt_error': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/nuxt/dist/core/runtime/nitro/handlers/renderer').default>>>>
    }
    '/api/_nuxt_icon/:collection': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../node_modules/@nuxt/icon/dist/runtime/server/api').default>>>>
    }
    '/__nuxt_island/**': {
      'default': Simplify<Serialize<Awaited<ReturnType<typeof import('../../server/#internal/nuxt/island-renderer').default>>>>
    }
  }
}
export {}
```

### ./.nuxt/types/nitro.d.ts

```
/// <reference path="./nitro-routes.d.ts" />
/// <reference path="./nitro-config.d.ts" />
/// <reference path="./nitro-imports.d.ts" />
```

### ./.nuxt/types/plugins.d.ts

```
// Generated by Nuxt'
import type { Plugin } from '#app'

type Decorate<T extends Record<string, any>> = { [K in keyof T as K extends string ? `$${K}` : never]: T[K] }

type InjectionType<A extends Plugin> = A extends {default: Plugin<infer T>} ? Decorate<T> : unknown

type NuxtAppInjections = 
  InjectionType<typeof import("../../node_modules/nuxt/dist/app/plugins/revive-payload.client.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/head/runtime/plugins/unhead.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/pages/runtime/plugins/router.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/app/plugins/browser-devtools-timing.client.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/app/plugins/navigation-repaint.client.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/app/plugins/check-outdated-build.client.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/app/plugins/revive-payload.server.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/app/plugins/chunk-reload.client.js")> &
  InjectionType<typeof import("../../node_modules/@pinia/nuxt/dist/runtime/plugin.vue3.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/pages/runtime/plugins/prefetch.client.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/pages/runtime/plugins/check-if-page-unused.js")> &
  InjectionType<typeof import("../../node_modules/@nuxt/ui/dist/runtime/plugins/slideovers.js")> &
  InjectionType<typeof import("../../node_modules/@nuxt/ui/dist/runtime/plugins/modals.js")> &
  InjectionType<typeof import("../../node_modules/@nuxt/ui/dist/runtime/plugins/colors.js")> &
  InjectionType<typeof import("../../node_modules/@nuxtjs/color-mode/dist/runtime/plugin.server.js")> &
  InjectionType<typeof import("../../node_modules/@nuxtjs/color-mode/dist/runtime/plugin.client.js")> &
  InjectionType<typeof import("../../node_modules/@nuxt/icon/dist/runtime/plugin.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/app/plugins/dev-server-logs.js")> &
  InjectionType<typeof import("../../node_modules/nuxt/dist/app/plugins/check-if-layout-used.js")> &
  InjectionType<typeof import("../../plugins/wallee.client")>

declare module '#app' {
  interface NuxtApp extends NuxtAppInjections { }

  interface NuxtAppLiterals {
    pluginName: 'nuxt:revive-payload:client' | 'nuxt:head' | 'nuxt:router' | 'nuxt:browser-devtools-timing' | 'nuxt:revive-payload:server' | 'nuxt:chunk-reload' | 'pinia' | 'nuxt:global-components' | 'nuxt:prefetch' | 'nuxt:checkIfPageUnused' | '@nuxt/icon' | 'nuxt:checkIfLayoutUsed'
  }
}

declare module 'vue' {
  interface ComponentCustomProperties extends NuxtAppInjections { }
}

export { }

```

### ./.nuxt/types/schema.d.ts

```
import { NuxtModule, RuntimeConfig } from '@nuxt/schema'
declare module '@nuxt/schema' {
  interface NuxtOptions {
    /**
     * Configuration for `@nuxt/icon`
     */
    ["icon"]: typeof import("@nuxt/icon").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxtjs/color-mode`
     */
    ["colorMode"]: typeof import("@nuxtjs/color-mode").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxtjs/tailwindcss`
     */
    ["tailwindcss"]: typeof import("@nuxtjs/tailwindcss").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxt/ui`
     */
    ["ui"]: typeof import("@nuxt/ui").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@pinia/nuxt`
     */
    ["pinia"]: typeof import("@pinia/nuxt").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxt/eslint`
     */
    ["eslint"]: typeof import("@nuxt/eslint").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxt/telemetry`
     */
    ["telemetry"]: typeof import("@nuxt/telemetry").default extends NuxtModule<infer O> ? O : Record<string, any>
  }
  interface NuxtConfig {
    /**
     * Configuration for `@nuxt/icon`
     */
    ["icon"]?: typeof import("@nuxt/icon").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxtjs/color-mode`
     */
    ["colorMode"]?: typeof import("@nuxtjs/color-mode").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxtjs/tailwindcss`
     */
    ["tailwindcss"]?: typeof import("@nuxtjs/tailwindcss").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxt/ui`
     */
    ["ui"]?: typeof import("@nuxt/ui").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@pinia/nuxt`
     */
    ["pinia"]?: typeof import("@pinia/nuxt").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxt/eslint`
     */
    ["eslint"]?: typeof import("@nuxt/eslint").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxt/telemetry`
     */
    ["telemetry"]?: typeof import("@nuxt/telemetry").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    modules?: (undefined | null | false | NuxtModule<any> | string | [NuxtModule | string, Record<string, any>] | ["@nuxt/icon", Exclude<NuxtConfig["icon"], boolean>] | ["@nuxtjs/color-mode", Exclude<NuxtConfig["colorMode"], boolean>] | ["@nuxtjs/tailwindcss", Exclude<NuxtConfig["tailwindcss"], boolean>] | ["@nuxt/ui", Exclude<NuxtConfig["ui"], boolean>] | ["@pinia/nuxt", Exclude<NuxtConfig["pinia"], boolean>] | ["@nuxt/eslint", Exclude<NuxtConfig["eslint"], boolean>] | ["@nuxt/telemetry", Exclude<NuxtConfig["telemetry"], boolean>])[],
  }
}
declare module 'nuxt/schema' {
  interface NuxtOptions {
    /**
     * Configuration for `@nuxt/icon`
     * @see https://www.npmjs.com/package/@nuxt/icon
     */
    ["icon"]: typeof import("@nuxt/icon").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxtjs/color-mode`
     * @see https://www.npmjs.com/package/@nuxtjs/color-mode
     */
    ["colorMode"]: typeof import("@nuxtjs/color-mode").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxtjs/tailwindcss`
     * @see https://www.npmjs.com/package/@nuxtjs/tailwindcss
     */
    ["tailwindcss"]: typeof import("@nuxtjs/tailwindcss").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxt/ui`
     * @see https://www.npmjs.com/package/@nuxt/ui
     */
    ["ui"]: typeof import("@nuxt/ui").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@pinia/nuxt`
     * @see https://www.npmjs.com/package/@pinia/nuxt
     */
    ["pinia"]: typeof import("@pinia/nuxt").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxt/eslint`
     * @see https://www.npmjs.com/package/@nuxt/eslint
     */
    ["eslint"]: typeof import("@nuxt/eslint").default extends NuxtModule<infer O> ? O : Record<string, any>
    /**
     * Configuration for `@nuxt/telemetry`
     * @see https://www.npmjs.com/package/@nuxt/telemetry
     */
    ["telemetry"]: typeof import("@nuxt/telemetry").default extends NuxtModule<infer O> ? O : Record<string, any>
  }
  interface NuxtConfig {
    /**
     * Configuration for `@nuxt/icon`
     * @see https://www.npmjs.com/package/@nuxt/icon
     */
    ["icon"]?: typeof import("@nuxt/icon").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxtjs/color-mode`
     * @see https://www.npmjs.com/package/@nuxtjs/color-mode
     */
    ["colorMode"]?: typeof import("@nuxtjs/color-mode").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxtjs/tailwindcss`
     * @see https://www.npmjs.com/package/@nuxtjs/tailwindcss
     */
    ["tailwindcss"]?: typeof import("@nuxtjs/tailwindcss").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxt/ui`
     * @see https://www.npmjs.com/package/@nuxt/ui
     */
    ["ui"]?: typeof import("@nuxt/ui").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@pinia/nuxt`
     * @see https://www.npmjs.com/package/@pinia/nuxt
     */
    ["pinia"]?: typeof import("@pinia/nuxt").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxt/eslint`
     * @see https://www.npmjs.com/package/@nuxt/eslint
     */
    ["eslint"]?: typeof import("@nuxt/eslint").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    /**
     * Configuration for `@nuxt/telemetry`
     * @see https://www.npmjs.com/package/@nuxt/telemetry
     */
    ["telemetry"]?: typeof import("@nuxt/telemetry").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
    modules?: (undefined | null | false | NuxtModule<any> | string | [NuxtModule | string, Record<string, any>] | ["@nuxt/icon", Exclude<NuxtConfig["icon"], boolean>] | ["@nuxtjs/color-mode", Exclude<NuxtConfig["colorMode"], boolean>] | ["@nuxtjs/tailwindcss", Exclude<NuxtConfig["tailwindcss"], boolean>] | ["@nuxt/ui", Exclude<NuxtConfig["ui"], boolean>] | ["@pinia/nuxt", Exclude<NuxtConfig["pinia"], boolean>] | ["@nuxt/eslint", Exclude<NuxtConfig["eslint"], boolean>] | ["@nuxt/telemetry", Exclude<NuxtConfig["telemetry"], boolean>])[],
  }
  interface RuntimeConfig {
   app: {
      buildId: string,

      baseURL: string,

      buildAssetsDir: string,

      cdnURL: string,
   },

   walleeSpaceId: string,

   walleeApplicationUserId: string,

   walleeSecretKey: string,

   nitro: {
      envPrefix: string,
   },

   icon: {
      serverKnownCssClasses: Array<any>,
   },
  }
  interface PublicRuntimeConfig {
   googleMapsApiKey: string,

   walleeSpaceId: string,

   walleeUserId: string,
  }
}
declare module 'vue' {
        interface ComponentCustomProperties {
          $config: RuntimeConfig
        }
      }
```

### ./.nuxt/types/vue-shim.d.ts

```

```

### ./.nuxt/ui.colors.d.ts

```
declare module '#ui-colors' { const defaultExport: ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","primary"]; export default defaultExport; }
```

### ./README.md

```
# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

```

### ./composables/useAppointmentStatus.ts

```
// composables/useAppointmentStatus.ts - Status-Workflow Management
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useAppointmentStatus = () => {
  const supabase = getSupabase()
  const isUpdating = ref(false)
  const updateError = ref<string | null>(null)

  /**
   * Update appointments from 'confirmed' to 'completed' after end_time
   * Läuft automatisch und updated alle überfälligen Termine
   */
const updateOverdueAppointments = async () => {
  isUpdating.value = true
  updateError.value = null
  try {
    console.log('🔄 Checking for overdue appointments...')
    
    const now = new Date().toISOString()
    
    // 🆕 ERWEITERT: Finde ALLE Termine die bereits beendet sind
    const { data: overdueAppointments, error: findError } = await supabase
      .from('appointments')
      .select('id, title, start_time, end_time, staff_id, status')
      .in('status', ['confirmed', 'scheduled', 'booked']) // 🆕 Alle relevanten Status
      .lt('end_time', now) // Termine die bereits vorbei sind
    
    if (findError) {
      throw new Error(`Error finding overdue appointments: ${findError.message}`)
    }
    
    if (!overdueAppointments || overdueAppointments.length === 0) {
      console.log('✅ No overdue appointments found')
      return { updated: 0, appointments: [] }
    }
    
    console.log(`📅 Found ${overdueAppointments.length} overdue appointments:`, overdueAppointments)
    
    // Update alle überfälligen Termine auf 'completed'
    const appointmentIds = overdueAppointments.map(apt => apt.id)
    
    const { data: updatedAppointments, error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .in('id', appointmentIds)
      .select('id, title, status')
    
    if (updateError) {
      throw new Error(`Error updating appointments: ${updateError.message}`)
    }
    
    console.log(`✅ Successfully updated ${updatedAppointments?.length || 0} appointments to 'completed'`)
    
    return {
      updated: updatedAppointments?.length || 0,
      appointments: updatedAppointments || []
    }
  } catch (err: any) {
    console.error('❌ Error updating overdue appointments:', err)
    updateError.value = err.message
    throw err
  } finally {
    isUpdating.value = false
  }
}

  /**
   * Update specific appointment to 'completed' status
   * Für manuelles Update einzelner Termine
   */
  const markAppointmentCompleted = async (appointmentId: string) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log(`🔄 Marking appointment ${appointmentId} as completed...`)

      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select('id, title, status')
        .single()

      if (error) {
        throw new Error(`Error updating appointment: ${error.message}`)
      }

      console.log('✅ Appointment marked as completed:', data)
      return data

    } catch (err: any) {
      console.error('❌ Error marking appointment completed:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Update appointment to 'evaluated' status after rating
   * Nach dem Speichern einer Bewertung
   */
  const markAppointmentEvaluated = async (appointmentId: string) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log(`🔄 Marking appointment ${appointmentId} as evaluated...`)

      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'evaluated',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select('id, title, status')
        .single()

      if (error) {
        throw new Error(`Error updating appointment: ${error.message}`)
      }

      console.log('✅ Appointment marked as evaluated:', data)
      return data

    } catch (err: any) {
      console.error('❌ Error marking appointment evaluated:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Get appointment status statistics
   * Für Dashboard/Debugging
   */
  const getStatusStatistics = async (staffId?: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select('status')

      if (staffId) {
        query = query.eq('staff_id', staffId)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = data?.reduce((acc: Record<string, number>, appointment) => {
        const status = appointment.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}) || {}

      console.log('📊 Appointment status statistics:', stats)
      return stats

    } catch (err: any) {
      console.error('❌ Error getting status statistics:', err)
      return {}
    }
  }

  /**
   * Batch status update with filters
   * Erweiterte Update-Funktionen
   */
  const batchUpdateStatus = async (filters: {
    fromStatus: string
    toStatus: string
    staffId?: string
    beforeDate?: string
    afterDate?: string
  }) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log('🔄 Batch updating appointment status...', filters)

      let query = supabase
        .from('appointments')
        .update({ 
          status: filters.toStatus,
          updated_at: new Date().toISOString()
        })
        .eq('status', filters.fromStatus)

      if (filters.staffId) {
        query = query.eq('staff_id', filters.staffId)
      }

      if (filters.beforeDate) {
        query = query.lt('end_time', filters.beforeDate)
      }

      if (filters.afterDate) {
        query = query.gt('start_time', filters.afterDate)
      }

      const { data, error } = await query.select('id, title, status')

      if (error) {
        throw new Error(`Batch update error: ${error.message}`)
      }

      console.log(`✅ Batch updated ${data?.length || 0} appointments from '${filters.fromStatus}' to '${filters.toStatus}'`)
      
      return {
        updated: data?.length || 0,
        appointments: data || []
      }

    } catch (err: any) {
      console.error('❌ Error in batch status update:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  return {
    // State
    isUpdating,
    updateError,
    
    // Core Functions
    updateOverdueAppointments,
    markAppointmentCompleted,
    markAppointmentEvaluated,
    
    // Utility Functions
    getStatusStatistics,
    batchUpdateStatus
  }
}
```

### ./composables/useCategoryData.ts

```
// composables/useCategoryData.ts - Mit Supabase Database

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Category {
  id: number
  created_at: string
  name: string
  description?: string
  code: string
  price_per_lesson: number
  price_unit: string
  lesson_duration: number
  color?: string
  is_active: boolean
  display_order: number
}

// Global shared state
const allCategories = ref<Category[]>([])
const isLoading = ref(false)
const isLoaded = ref(false)

export const useCategoryData = () => {
  const supabase = getSupabase()

  // Fallback data wenn DB nicht verfügbar
  const fallbackCategories: Record<string, Partial<Category>> = {
    'B': { name: 'Autoprüfung Kategorie B', price_per_lesson: 95, color: 'hellgrün' },
    'A1': { name: 'Motorrad A1/A35kW/A', price_per_lesson: 95, color: 'hellgrün' },
    'BE': { name: 'Anhänger BE', price_per_lesson: 120, color: 'orange' },
    'C1': { name: 'LKW C1/D1', price_per_lesson: 150, color: 'gelb' },
    'C': { name: 'LKW C', price_per_lesson: 170, color: 'rot' },
    'CE': { name: 'LKW CE', price_per_lesson: 200, color: 'violett' },
    'D': { name: 'Bus D', price_per_lesson: 200, color: 'türkis' },
    'Motorboot': { name: 'Motorboot', price_per_lesson: 95, color: 'hellblau' },
    'BPT': { name: 'Berufsprüfung Transport', price_per_lesson: 100, color: 'dunkelblau' }
  }

  // Admin Fees aus den Projektunterlagen
  const adminFees: Record<string, number> = {
    'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
    'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
    'Motorboot': 120, 'BPT': 120
  }

  // Kategorien aus Datenbank laden
  const loadCategories = async () => {
    if (isLoaded.value || isLoading.value) return
    
    isLoading.value = true
    
    try {
      console.log('🔄 Loading categories from database...')
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      allCategories.value = data || []
      isLoaded.value = true
      
      console.log('✅ Categories loaded:', data?.length)
      
    } catch (err: any) {
      console.error('❌ Error loading categories:', err)
      // Bei Fehler: Fallback verwenden
      allCategories.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Category by code finden
  const getCategoryByCode = (code: string): Category | null => {
    if (!code) return null
    
    // Aus geladenen Kategorien suchen
    const dbCategory = allCategories.value.find(cat => cat.code === code)
    if (dbCategory) return dbCategory
    
    // Fallback auf statische Daten
    const fallback = fallbackCategories[code]
    if (fallback) {
      return {
        id: 0,
        code,
        name: fallback.name || code,
        price_per_lesson: fallback.price_per_lesson || 95,
        lesson_duration: 45,
        color: fallback.color || 'grau',
        is_active: true,
        display_order: 0,
        price_unit: 'per_lesson',
        created_at: new Date().toISOString()
      } as Category
    }
    
    return null
  }

  // Helper Funktionen
  const getCategoryName = (code: string): string => {
    const category = getCategoryByCode(code)
    return category?.name || code || 'Unbekannte Kategorie'
  }

  const getCategoryPrice = (code: string): number => {
    const category = getCategoryByCode(code)
    return category?.price_per_lesson || 95
  }

  const getCategoryColor = (code: string): string => {
    const category = getCategoryByCode(code)
    return category?.color || 'grau'
  }

  const getAdminFee = (code: string): number => {
    return adminFees[code] || 120
  }

  const getCategoryIcon = (code: string): string => {
    const icons: Record<string, string> = {
      'B': '🚗', 'A1': '🏍️', 'A35kW': '🏍️', 'A': '🏍️',
      'BE': '🚛', 'C1': '🚚', 'D1': '🚌', 'C': '🚚',
      'CE': '🚛', 'D': '🚌', 'Motorboot': '🛥️', 'BPT': '📋'
    }
    return icons[code] || '🚗'
  }

  // Computed properties
  const categoriesLoaded = computed(() => isLoaded.value)
  const categoriesLoading = computed(() => isLoading.value)

  return {
    // State
    allCategories: computed(() => allCategories.value),
    categoriesLoaded,
    categoriesLoading,

    // Methods
    loadCategories,
    getCategoryByCode,
    getCategoryName,
    getCategoryPrice,
    getCategoryColor,
    getCategoryIcon,
    getAdminFee
  }
}
```

### ./composables/useCurrentUser.ts

```
// composables/useCurrentUser.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useCurrentUser = () => {
  const currentUser = ref<any>(null)
  const isLoading = ref(false)
  const userError = ref<string | null>(null)
  const profileExists = ref(false) // 🆕 NEU: Profil-Status

  const fetchCurrentUser = async () => {
    // Skip auf Login-Seite
    if (process.client && window.location.pathname === '/') {
      return
    }

    isLoading.value = true
    userError.value = null
    currentUser.value = null
    profileExists.value = false // 🆕 Reset

    try {
      const supabase = getSupabase()
      
      // 1. Auth-User holen
      const { data: authData, error: authError } = await supabase.auth.getUser()
      const user = authData?.user

      if (authError || !user?.email) {
        userError.value = 'Nicht eingeloggt'
        return
      }

      console.log('Auth-User gefunden:', user.email)

      // 2. Database-User per E-Mail suchen
      const { data: usersData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)

      if (dbError) {
        console.error('Database Error:', dbError)
        userError.value = `Database-Fehler: ${dbError.message}`
        return
      }

      if (!usersData || usersData.length === 0) {
        console.log('Business-User nicht gefunden für:', user.email)
        // 🆕 WICHTIGE ÄNDERUNG: Setze profileExists auf false, aber keinen userError
        profileExists.value = false
        currentUser.value = {
          email: user.email,
          auth_user_id: user.id
        }
        // 🚫 ENTFERNT: userError.value = `Kein Benutzerprofil für ${user.email} gefunden.`
        return
      }

      // ✅ User gefunden
      const userData = usersData[0]
      console.log('✅ Business-User geladen:', userData)
      
      currentUser.value = {
        ...userData,
        auth_user_id: user.id
      }
      profileExists.value = true // 🆕 Profil existiert

    } catch (err: any) {
      console.error('Unerwarteter Fehler:', err)
      userError.value = err?.message || 'Unbekannter Fehler'
    } finally {
      isLoading.value = false
    }
  }

  // 🆕 NEU: Funktion zum Erstellen des User-Profils
  const createUserProfile = async (profileData: { company_name: string, role: string }) => {
    isLoading.value = true
    userError.value = null

    try {
      const supabase = getSupabase()
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user

      if (!user?.email) {
        throw new Error('Kein authentifizierter Benutzer')
      }

      // Erstelle neuen User in der Datenbank
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: user.email,
          auth_user_id: user.id,
          company_name: profileData.company_name,
          role: profileData.role,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ Profil erstellt:', data)
      
      // Update lokaler State
      currentUser.value = {
        ...data,
        auth_user_id: user.id
      }
      profileExists.value = true

      return data

    } catch (err: any) {
      console.error('Fehler beim Erstellen des Profils:', err)
      userError.value = err?.message || 'Fehler beim Erstellen des Profils'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    currentUser,
    isLoading,
    userError,
    profileExists, // 🆕 NEU exportiert
    fetchCurrentUser,
    createUserProfile // 🆕 NEU exportiert
  }
}
```

### ./composables/useDurationManager.ts

```
// composables/useDurationManager.ts - Komplett neue Datei ohne Cache-Probleme
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useDurationManager = () => {
  // State
  const availableDurations = ref<number[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed - formatierte Dauern für UI
  const formattedDurations = computed(() => {
    return availableDurations.value.map(duration => ({
      value: duration,
      label: duration >= 120 
        ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
        : `${duration}min`
    }))
  })

  // Staff-Dauern direkt laden - KEINE Kategorie-Abfrage!
  const loadStaffDurations = async (staffId: string) => {
    console.log('🚀 useDurationManager - Loading staff durations for:', staffId)
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      // NUR Staff Settings laden - KEINE Categories!
      console.log('📋 Querying ONLY staff_settings...')
      const { data: staffSettings, error: staffError } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .maybeSingle()

      console.log('📋 Staff settings result:', { data: staffSettings, error: staffError })

      let finalDurations: number[] = []
      
      if (staffSettings?.preferred_durations) {
        console.log('👤 Raw staff durations:', staffSettings.preferred_durations)
        
        try {
          // Parse different formats
          if (staffSettings.preferred_durations.startsWith('[') && staffSettings.preferred_durations.endsWith(']')) {
            const jsonArray = JSON.parse(staffSettings.preferred_durations)
            
            finalDurations = jsonArray.map((item: any) => {
              const num = typeof item === 'string' ? parseInt(item) : item
              return isNaN(num) ? 0 : num
            }).filter((d: number) => d > 0).sort((a: number, b: number) => a - b)
            
            console.log('✅ Parsed durations:', finalDurations)
          } else if (staffSettings.preferred_durations.includes(',')) {
            // CSV format: "45,60,75,90"
            finalDurations = staffSettings.preferred_durations
              .split(',')
              .map((d: string) => parseInt(d.trim()))
              .filter((d: number) => !isNaN(d) && d > 0)
              .sort((a: number, b: number) => a - b)
            
            console.log('✅ Parsed CSV durations:', finalDurations)
          } else {
            // Single number
            const singleDuration = parseInt(staffSettings.preferred_durations)
            if (!isNaN(singleDuration) && singleDuration > 0) {
              finalDurations = [singleDuration]
              console.log('✅ Parsed single duration:', finalDurations)
            } else {
              console.log('⚠️ Invalid format, using fallback')
              finalDurations = [45]
            }
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError)
          finalDurations = [45]
        }
      } else {
        console.log('⚠️ No staff settings found, using default [45]')
        finalDurations = [45]
      }

      availableDurations.value = finalDurations
      console.log('🎯 Final available durations:', finalDurations)
      return finalDurations

    } catch (err: any) {
      console.error('❌ Error loading staff durations:', err)
      error.value = err.message
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Staff preferred durations in DB updaten
  const updateStaffDurations = async (staffId: string, newDurations: number[]) => {
    console.log('🔄 Updating staff durations in DB:', newDurations)
    
    try {
      const supabase = getSupabase()
      // Als JSON Array speichern um konsistent mit bestehenden Daten zu sein
      const durationsString = JSON.stringify(newDurations.sort((a: number, b: number) => a - b))
      
      const { error: upsertError } = await supabase
        .from('staff_settings')
        .upsert({
          staff_id: staffId,
          preferred_durations: durationsString,
          updated_at: new Date().toISOString()
        })

      if (upsertError) throw upsertError

      console.log('✅ Staff durations updated in DB as JSON:', durationsString)
      
      // State aktualisieren
      availableDurations.value = newDurations.sort((a: number, b: number) => a - b)
      
    } catch (err: any) {
      console.error('❌ Error updating staff durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Standard-Dauern für alle Kategorien aus DB laden (für Settings UI)
  const loadAllPossibleDurations = async () => {
    console.log('🔥 Loading all possible durations')
    
    try {
      // Alle möglichen Dauern sammeln (15min steps von 45-240)
      const allDurations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
      
      return allDurations.map(duration => ({
        value: duration,
        label: duration >= 120 
          ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
          : `${duration}min`,
        // Info für Settings UI
        category: 'all'
      }))

    } catch (err: any) {
      console.error('❌ Error loading possible durations:', err)
      return []
    }
  }

  // Staff-Settings für User laden
  const loadStaffSettings = async (staffId: string) => {
    console.log('🔥 Loading complete staff settings')
    
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('staff_settings')
        .select('*')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (error) throw error
      
      return data
    } catch (err: any) {
      console.error('❌ Error loading staff settings:', err)
      return null
    }
  }

  // Erstes verfügbares Dauer zurückgeben
  const getDefaultDuration = () => {
    return availableDurations.value.length > 0 ? availableDurations.value[0] : 45
  }

  // Check ob Dauer verfügbar ist
  const isDurationAvailable = (duration: number) => {
    return availableDurations.value.includes(duration)
  }

  // Reset state
  const reset = () => {
    availableDurations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    availableDurations: computed(() => availableDurations.value),
    formattedDurations,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Actions
    loadStaffDurations,
    updateStaffDurations,
    loadAllPossibleDurations,
    loadStaffSettings,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}
```

### ./composables/useEventModalForm.ts

```
// composables/useEventModalForm.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types (können später in separates types file)
interface AppointmentData {
  id?: string
  title: string
  description: string
  type: string
  startDate: string
  startTime: string
  endTime: string 
  duration_minutes: number
  user_id: string
  staff_id: string
  location_id: string
  price_per_minute: number
  status: string
  eventType: string 
  selectedSpecialType: string 
  is_paid: boolean 
  discount?: number
  discount_type?: string
  discount_reason?: string
}

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
  preferred_location_id?: string
  preferred_duration?: number 
}

export const useEventModalForm = (currentUser?: any) => {
  
  // ============ STATE ============
  const formData = ref<AppointmentData>({
    title: '',
    description: '',
    type: '',
    startDate: '',
    startTime: '',
    endTime: '',
    duration_minutes: 45,
    user_id: '',
    staff_id: '',
    location_id: '',
    price_per_minute: 0,
    status: 'booked',
    eventType: 'lesson',
    selectedSpecialType: '',
    is_paid: false,
    discount: 0,
    discount_type: 'fixed',
    discount_reason: ''
  })

  const selectedStudent = ref<Student | null>(null)
  const selectedCategory = ref<any>(null)
  const selectedLocation = ref<any>(null)
  const availableDurations = ref<number[]>([45])
  const appointmentNumber = ref<number>(1)
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ============ COMPUTED ============
  const isFormValid = computed(() => {
    const baseValid = formData.value.title && 
                     formData.value.startDate && 
                     formData.value.startTime &&
                     formData.value.endTime

    if (formData.value.eventType === 'lesson') {
      return baseValid && 
             selectedStudent.value && 
             formData.value.type && 
             formData.value.location_id &&
             formData.value.duration_minutes > 0
    } else {
      return baseValid && formData.value.selectedSpecialType
    }
  })

  const computedEndTime = computed(() => {
    if (!formData.value.startTime || !formData.value.duration_minutes) return ''
    
    const [hours, minutes] = formData.value.startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    
    const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
    
    const endHours = String(endDate.getHours()).padStart(2, '0')
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
    
    return `${endHours}:${endMinutes}`
  })

  const totalPrice = computed(() => {
    const pricePerMinute = formData.value.price_per_minute || (95/45)
    const total = pricePerMinute * (formData.value.duration_minutes || 45)
    return total.toFixed(2)
  })

  // ============ FORM ACTIONS ============
  const resetForm = () => {
    console.log('🔄 Resetting form data')
    
    formData.value = {
      title: '',
      description: '',
      type: '',
      startDate: '',
      startTime: '',
      endTime: '',
      duration_minutes: 45,
      user_id: '',
      staff_id: currentUser?.id || '',
      location_id: '',
      price_per_minute: 0,
      status: 'booked',
      eventType: 'lesson',
      selectedSpecialType: '',
      is_paid: false,
      discount: 0,
      discount_type: 'fixed',
      discount_reason: ''
    }
    
    selectedStudent.value = null
    selectedCategory.value = null
    selectedLocation.value = null
    availableDurations.value = [45]
    appointmentNumber.value = 1
    error.value = null
  }

  const populateFormFromAppointment = (appointment: any) => {
    console.log('📝 Populating form from appointment:', appointment?.id)
    
    // Event-Type Detection
    const appointmentType = appointment.extendedProps?.type ||
                           appointment.type ||
                           appointment.extendedProps?.appointment_type ||
                           'lesson'
    
    const otherEventTypes = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
    const isOtherEvent = appointmentType && otherEventTypes.includes(appointmentType.toLowerCase())
    
    // Zeit-Verarbeitung
    const startDateTime = new Date(appointment.start_time || appointment.start)
    const endDateTime = appointment.end_time || appointment.end ? new Date(appointment.end_time || appointment.end) : null
    const startDate = startDateTime.toISOString().split('T')[0]
    const startTime = startDateTime.toTimeString().slice(0, 5)
    const endTime = endDateTime ? endDateTime.toTimeString().slice(0, 5) : ''
    
    let duration = appointment.duration_minutes || appointment.extendedProps?.duration_minutes
    if (!duration && endDateTime) {
      duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
    }
    duration = duration || 45
    
    // Form Data setzen
    formData.value = {
      title: appointment.title || '',
      description: appointment.description || appointment.extendedProps?.description || '',
      type: appointmentType,
      startDate: startDate,
      startTime: startTime,
      endTime: endTime,
      duration_minutes: duration,
      user_id: appointment.user_id || appointment.extendedProps?.user_id || '',
      staff_id: appointment.staff_id || appointment.extendedProps?.staff_id || currentUser?.id || '',
      location_id: appointment.location_id || appointment.extendedProps?.location_id || '',
      price_per_minute: appointment.price_per_minute || appointment.extendedProps?.price_per_minute || 0,
      status: appointment.status || appointment.extendedProps?.status || 'confirmed',
      eventType: isOtherEvent ? 'other' : 'lesson',
      selectedSpecialType: isOtherEvent ? appointmentType : '',
      is_paid: appointment.is_paid || appointment.extendedProps?.is_paid || false
    }
    
    console.log('✅ Form populated with type:', formData.value.type)
  }

  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      formData.value.endTime = computedEndTime.value
      console.log('⏰ End time calculated:', formData.value.endTime)
    }
  }

  // ============ SAVE/DELETE LOGIC ============ 
  const saveAppointment = async (mode: 'create' | 'edit', eventId?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      if (!isFormValid.value) {
        throw new Error('Bitte füllen Sie alle Pflichtfelder aus')
      }
      
      const supabase = getSupabase()
      
      // Auth Check
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (!authData?.user) {
        throw new Error('Nicht authentifiziert')
      }
      
      // User Check
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()
      
      if (!dbUser) {
        throw new Error('User-Profil nicht gefunden')
      }
      
      // Appointment Data
      const appointmentData = {
        title: formData.value.title,
        description: formData.value.description,
        user_id: formData.value.user_id,
        staff_id: formData.value.staff_id || dbUser.id,
        location_id: formData.value.location_id,
        start_time: `${formData.value.startDate}T${formData.value.startTime}:00`,
        end_time: `${formData.value.startDate}T${formData.value.endTime}:00`,
        duration_minutes: formData.value.duration_minutes,
        type: formData.value.type,
        status: formData.value.status,
        price_per_minute: formData.value.price_per_minute,
        is_paid: formData.value.is_paid
      }
      
      console.log('💾 Saving appointment data:', appointmentData)
      
      let result
      if (mode === 'edit' && eventId) {
        // Update
        const { data, error: updateError } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', eventId)
          .select()
          .single()
        
        if (updateError) throw updateError
        result = data
      } else {
        // Create
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single()
        
        if (insertError) throw insertError
        result = data
      }
      
      console.log('✅ Appointment saved:', result.id)
      return result
      
    } catch (err: any) {
      console.error('❌ Save error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteAppointment = async (eventId: string) => {
    isLoading.value = true
    
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
      
      console.log('✅ Appointment deleted:', eventId)
      
    } catch (err: any) {
      console.error('❌ Delete error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ============ UTILS ============
  const getAppointmentNumber = async (userId?: string) => {
    const studentId = userId || formData.value.user_id
    if (!studentId) return 1
    
    try {
      const supabase = getSupabase()
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed'])
      
      if (error) throw error
      return (count || 0) + 1
      
    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      return 1
    }
  }

  return {
    // State
    formData,
    selectedStudent,
    selectedCategory,
    selectedLocation,
    availableDurations,
    appointmentNumber,
    isLoading,
    error,
    
    // Computed
    isFormValid,
    computedEndTime,
    totalPrice,
    
    // Actions
    resetForm,
    populateFormFromAppointment,
    calculateEndTime,
    saveAppointment,
    deleteAppointment,
    getAppointmentNumber
  }
}
```

### ./composables/useEventModalHandlers.ts

```
// composables/useEventModalHandlers.ts
import { ref, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useEventModalHandlers = (formData: any, selectedStudent: any, selectedCategory: any, availableDurations: any, appointmentNumber: any) => {
  
  const supabase = getSupabase()

  // ============ STUDENT HANDLERS ============
  const handleStudentSelected = async (student: any) => {
    console.log('🎯 Student selected:', student.first_name)
    
    selectedStudent.value = student
    
    // Auto-fill form data from student (nur im CREATE mode)
    if (student) {
      await autoFillFromStudent(student)
    }
  }

  const handleStudentCleared = () => {
    console.log('🗑️ Student cleared')
    
    selectedStudent.value = null
    formData.value.title = ''
    formData.value.type = ''
    formData.value.user_id = ''
    formData.value.location_id = ''
    formData.value.price_per_minute = 0
  }

  const autoFillFromStudent = async (student: any) => {
    console.log('🤖 Auto-filling form from student:', student.first_name)
    
    // Set basic data
    formData.value.user_id = student.id
    formData.value.staff_id = student.assigned_staff_id || formData.value.staff_id
    
    // Set category (first category from student's categories)
    if (student.category) {
      formData.value.type = student.category.split(',')[0].trim()
      console.log('📚 Category set to:', formData.value.type)
    }
    
    // Set preferred duration
    formData.value.duration_minutes = student.preferred_duration || 45
    
    // Load last appointment duration (async)
    try {
      const lastDuration = await getLastAppointmentDuration(student.id)
      if (lastDuration) {
        formData.value.duration_minutes = lastDuration
        console.log('⏱️ Updated duration from history:', lastDuration)
      }
    } catch (err) {
      console.log('⚠️ Could not load last duration, using default')
    }
    
    // Set preferred location
    if (student.preferred_location_id) {
      formData.value.location_id = student.preferred_location_id
      console.log('📍 Using student preferred location')
    }
    
    // Update price based on category
    const categoryPricing: Record<string, number> = {
      'A': 95/45, 'B': 95/45, 'BE': 120/45, 'C': 170/45, 
      'CE': 200/45, 'D': 200/45, 'BPT': 100/45, 'BOAT': 95/45
    }
    formData.value.price_per_minute = categoryPricing[formData.value.type] || (95/45)
    
    // Load appointment number for pricing
    try {
      appointmentNumber.value = await getAppointmentNumber(student.id)
      console.log('📈 Appointment number:', appointmentNumber.value)
    } catch (err) {
      console.error('❌ Error loading appointment number:', err)
      appointmentNumber.value = 1
    }
    
    console.log('✅ Auto-fill completed')
  }

  // ============ CATEGORY HANDLERS ============
  const handleCategorySelected = (category: any) => {
    console.log('🎯 Category selected:', category?.code)
    
    selectedCategory.value = category
    
    if (category) {
      // Update price
      formData.value.price_per_minute = category.price_per_lesson / 45
      
      // Update available durations
      if (category.availableDurations?.length > 0) {
        availableDurations.value = category.availableDurations
        formData.value.duration_minutes = category.availableDurations[0]
        console.log('✅ Set duration from category:', category.availableDurations[0])
      }
      
      // Recalculate end time
      calculateEndTime()
    }
  }

  const handlePriceChanged = (pricePerMinute: number) => {
    console.log('💰 Price changed:', pricePerMinute)
    formData.value.price_per_minute = pricePerMinute
  }

 const handleDurationsChanged = (durations: number[]) => {
  console.log('📥 EventModal - handleDurationsChanged received:', durations)
  console.log('📥 EventModal - Will pass to DurationSelector via availableDurations')
  
  availableDurations.value = durations
  
  // If current duration not available, select first available
  if (durations.length > 0 && !durations.includes(formData.value.duration_minutes)) {
    formData.value.duration_minutes = durations[0]
    calculateEndTime()
    console.log('✅ Updated duration to:', durations[0])
  }
}

  // ============ DURATION HANDLERS ============
  const handleDurationChanged = (duration: number) => {
    console.log('⏱️ Duration changed to:', duration)
    formData.value.duration_minutes = duration
    calculateEndTime()
  }

  // ============ LOCATION HANDLERS ============
  const handleLocationSelected = (location: any) => {
    console.log('📍 Location selected:', location?.name)
    
    if (location?.id && !location.id.startsWith('temp_')) {
      formData.value.location_id = location.id
      console.log('✅ Real location ID set:', location.id)
    } else {
      formData.value.location_id = ''
      console.log('⚠️ Temporary location, will save on appointment creation')
    }
  }

  // ============ EVENT TYPE HANDLERS ============
  const handleEventTypeSelected = (eventType: any) => {
    console.log('📋 Event type selected:', eventType?.code)
    
    formData.value.selectedSpecialType = eventType.code
    formData.value.duration_minutes = eventType.default_duration_minutes || 45
    
    // Auto-generate title if enabled
    if (eventType.auto_generate_title) {
      formData.value.title = eventType.name || 'Neuer Termin'
      console.log('📝 Title auto-generated:', formData.value.title)
    }
    
    calculateEndTime()
  }

  const switchToOtherEventType = () => {
    console.log('🔄 Switching to other event type')
    formData.value.eventType = 'other'
    formData.value.selectedSpecialType = ''
    formData.value.title = ''
  }

  const backToStudentSelection = () => {
    console.log('🔙 Back to student selection')
    formData.value.eventType = 'lesson'
    formData.value.selectedSpecialType = ''
    formData.value.title = ''
  }

  // ============ PAYMENT HANDLERS ============
  const handlePaymentSuccess = (data: any) => {
    console.log('✅ Payment successful:', data)
    formData.value.is_paid = true
    
    // Optional: Show success notification
    // You can emit this to parent for toast notifications
  }

  const handlePaymentError = (error: string) => {
    console.error('❌ Payment error:', error)
    
    // Optional: Show error notification
    // You can emit this to parent for toast notifications
  }

  const handleSaveRequired = async (appointmentData: any) => {
    console.log('💾 Save required for payment processing')
    
    // This should trigger the main save function
    // Return promise that parent can await
    return new Promise((resolve, reject) => {
      // Emit to parent that save is required
      // Parent should call the actual save function
      resolve(appointmentData)
    })
  }

  // ============ DISCOUNT HANDLERS ============
  const handleDiscountChanged = (discount: number, discountType: string, reason: string) => {
    console.log('🏷️ Discount changed:', { discount, discountType, reason })
    
    formData.value.discount = discount
    formData.value.discount_type = discountType
    formData.value.discount_reason = reason
  }

  // ============ TEAM HANDLERS ============
  const handleTeamInviteToggle = (staffId: string, invitedStaff: any) => {
    console.log('👥 Team invite toggled:', staffId)
    
    const index = invitedStaff.value.indexOf(staffId)
    if (index > -1) {
      invitedStaff.value.splice(index, 1)
      console.log('➖ Staff removed from invite')
    } else {
      invitedStaff.value.push(staffId)
      console.log('➕ Staff added to invite')
    }
  }

  const clearAllInvites = (invitedStaff: any) => {
    invitedStaff.value = []
    console.log('🗑️ All team invites cleared')
  }

  const inviteAllStaff = (availableStaff: any, invitedStaff: any) => {
    invitedStaff.value = availableStaff.value.map((s: any) => s.id)
    console.log('👥 All staff invited:', invitedStaff.value.length)
  }

  // ============ UTILITY FUNCTIONS ============
  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      const [hours, minutes] = formData.value.startTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0, 0)
      
      const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
      
      const endHours = String(endDate.getHours()).padStart(2, '0')
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
      
      formData.value.endTime = `${endHours}:${endMinutes}`
      console.log('⏰ End time calculated:', formData.value.endTime)
    }
  }

  const getLastAppointmentDuration = async (studentId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('user_id', studentId)
        .eq('status', 'completed')
        .order('end_time', { ascending: false })
        .limit(1)
        .single()
      
      if (error || !data?.duration_minutes) {
        return 45 // Default duration
      }
      
      return data.duration_minutes
    } catch (err) {
      console.log('❌ Error loading last appointment:', err)
      return 45
    }
  }

  const getAppointmentNumber = async (studentId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed'])
      
      if (error) throw error
      return (count || 0) + 1
      
    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      return 1
    }
  }

  const getDefaultTitle = () => {
    // For normal lessons
    if (formData.value.eventType === 'lesson' && selectedStudent.value) {
      const studentName = selectedStudent.value.first_name || 'Schüler'
      return `${studentName}`
    }
    
    // For special event types
    if (formData.value.selectedSpecialType) {
      return getEventTypeName(formData.value.selectedSpecialType)
    }
    
    return 'Neuer Termin'
  }

  const getEventTypeName = (code: string): string => {
    switch (code) {
      case 'meeting': return 'Team-Meeting'
      case 'course': return 'Verkehrskunde'
      case 'other': return 'Sonstiger Termin'
      default: return code || 'Neuer Termin'
    }
  }

  const getAdminFeeForCategory = () => {
    if (!selectedCategory.value) return 0
    
    const adminFees: Record<string, number> = {
      'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
      'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
      'Motorboot': 120, 'BPT': 120
    }
    
    return adminFees[selectedCategory.value.code] || 0
  }

  return {
    // Student Handlers
    handleStudentSelected,
    handleStudentCleared,
    autoFillFromStudent,
    
    // Category Handlers
    handleCategorySelected,
    handlePriceChanged,
    handleDurationsChanged,
    
    // Duration Handlers
    handleDurationChanged,
    
    // Location Handlers
    handleLocationSelected,
    
    // Event Type Handlers
    handleEventTypeSelected,
    switchToOtherEventType,
    backToStudentSelection,
    
    // Payment Handlers
    handlePaymentSuccess,
    handlePaymentError,
    handleSaveRequired,
    
    // Discount Handlers
    handleDiscountChanged,
    
    // Team Handlers
    handleTeamInviteToggle,
    clearAllInvites,
    inviteAllStaff,
    
    // Utilities
    calculateEndTime,
    getLastAppointmentDuration,
    getAppointmentNumber,
    getDefaultTitle,
    getEventTypeName,
    getAdminFeeForCategory
  }
}
```

### ./composables/useEventModalWatchers.ts

```
// composables/useEventModalWatchers.ts
import { watch, nextTick } from 'vue'

export const useEventModalWatchers = (
  props: any,
  formData: any,
  selectedStudent: any,
  availableLocations: any,
  appointmentNumber: any,
  handlers: any,
  actions: any
) => {

  // ============ MODAL LIFECYCLE WATCHER ============
  const setupModalWatcher = () => {
    watch(() => props.isVisible, async (isVisible) => {
      console.log('👀 Modal visibility changed to:', isVisible)
      
      if (isVisible) {
        console.log('🔄 Modal opening - starting initialization...')
        
        try {
          // Mode-based initialization
          if (props.eventData && (props.mode === 'edit' || props.mode === 'view')) {
            console.log('📝 Processing EDIT/VIEW mode...')
            actions.populateFormFromAppointment(props.eventData)
            
            // Handle student selection for edit mode
            if (formData.value.user_id) {
              await handleEditModeStudentSelection()
            }
          } else {
            console.log('📅 Processing CREATE mode...')
            await handleCreateModeInitialization()
          }
          
          console.log('✅ Modal initialization completed')
          
        } catch (error: unknown) {
          console.error('❌ Error during modal initialization:', error)
        }
        
      } else {
        // Modal closed - reset state
        console.log('❌ Modal closed - resetting state')
        actions.resetForm()
      }
    }, { immediate: true })
  }

  // ============ FORM DATA WATCHERS ============
  const setupFormWatchers = () => {
    
    // Title generation watcher
    watch([
      () => selectedStudent.value,
      () => formData.value.location_id,
      () => formData.value.type,
      () => formData.value.eventType,
    ], ([currentStudent, locationId, category, eventType]) => {
      
      // Skip title generation in edit/view mode
      if (props.mode === 'edit' || props.mode === 'view') {
        return
      }
      
      if (eventType === 'lesson' && currentStudent) {
        generateLessonTitle(currentStudent, locationId, category)
      }
    }, { immediate: true })

    // Time calculation watcher
    watch([
      () => formData.value.startTime, 
      () => formData.value.duration_minutes
    ], () => {
      if (formData.value.startTime && formData.value.duration_minutes) {
        handlers.calculateEndTime()
      }
    }, { immediate: true })

    // Event type change watcher
    watch(() => formData.value.eventType, (newType) => {
      console.log('👀 Event type changed to:', newType)
      
      // Reset form when switching types
      if (newType !== 'lesson') {
        formData.value.user_id = ''
        formData.value.type = ''
        selectedStudent.value = null
      }
    })

    // User ID change watcher (for appointment number)
    watch(() => formData.value.user_id, async (newUserId) => {
      // Skip in edit/view mode
      if (props.mode === 'edit' || props.mode === 'view') {
        console.log(`📝 ${props.mode} mode detected - skipping auto-operations`)
        return
      }
      
      if (newUserId && formData.value.eventType === 'lesson') {
        // Load appointment number for pricing
        try {
          console.log('🔢 Loading appointment number for pricing...')
          appointmentNumber.value = await handlers.getAppointmentNumber(newUserId)
          console.log('✅ Appointment number loaded:', appointmentNumber.value)
        } catch (err) {
          console.error('❌ Error loading appointment number:', err)
          appointmentNumber.value = 1
        }
      } else if (!newUserId) {
        appointmentNumber.value = 1
        console.log('🔄 Reset appointment number to 1')
      }
    })

    // Category type watcher
    watch(() => formData.value.type, async (newType) => {
      if (newType && props.mode === 'edit') {
        console.log('👀 Category type changed in edit mode:', newType)
        
        // Force category update in edit mode
        await nextTick()
        
        // You might need to trigger category selection here
        // This depends on how your CategorySelector works
      }
    }, { immediate: true })

    // Duration change watcher
    watch(() => formData.value.duration_minutes, () => {
      handlers.calculateEndTime()
    })
  }

  // ============ DEBUG WATCHERS ============
  const setupDebugWatchers = () => {
    // Location debugging
    watch(() => formData.value.location_id, (newVal, oldVal) => {
      console.log('🔄 location_id changed:', oldVal, '→', newVal)
    })
  }

  // ============ HELPER FUNCTIONS ============
  const handleEditModeStudentSelection = async () => {
    // This would trigger student selection in edit mode
    // Implementation depends on your StudentSelector component
    console.log('📝 Setting up student for edit mode:', formData.value.user_id)
    
    // You might need to emit to parent or call a specific function
    // to select the student in the StudentSelector component
  }

  const handleCreateModeInitialization = async () => {
    // Initialize create mode with default values
    let startDate, startTime
    
    if (props.eventData?.start) {
      const clickedDateTime = new Date(props.eventData.start)
      startDate = clickedDateTime.toISOString().split('T')[0]
      startTime = clickedDateTime.toTimeString().slice(0, 5)
    } else {
      const now = new Date()
      startDate = now.toISOString().split('T')[0]
      startTime = now.toTimeString().slice(0, 5)
    }
    
    formData.value.startDate = startDate
    formData.value.startTime = startTime
    
    console.log('📅 Create mode initialized with date/time:', startDate, startTime)
  }

  const generateLessonTitle = (currentStudent: any, locationId: string, category: string) => {
    const selectedLocation = availableLocations.value?.find((loc: any) => loc.id === locationId)
    const locationName = selectedLocation?.name || ''
    const currentCategory = category || ''
    
    if (locationName && currentCategory) {
      formData.value.title = `${currentStudent.first_name} • ${locationName} (${currentCategory})`
    } else if (locationName) {
      formData.value.title = `${currentStudent.first_name} • ${locationName}`
    } else if (currentCategory) {
      formData.value.title = `${currentStudent.first_name} - ${currentCategory}`
    } else {
      formData.value.title = `${currentStudent.first_name}`
    }
    
    console.log('✏️ Title generated:', formData.value.title)
  }

  // ============ PUBLIC API ============
  const setupAllWatchers = () => {
    setupModalWatcher()
    setupFormWatchers()
    setupDebugWatchers()
    
    console.log('⚡ All watchers initialized')
  }

  return {
    setupAllWatchers,
    setupModalWatcher,
    setupFormWatchers,
    setupDebugWatchers
  }
}
```

### ./composables/usePayments.ts

```
// composables/usePayments.ts - Gemeinsame Payment Logic
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface CalculatedPrice {
  base_price_rappen: number
  admin_fee_rappen: number
  total_rappen: number
  base_price_chf: string
  admin_fee_chf: string
  total_chf: string
  category_code: string
  duration_minutes: number
}

interface PaymentMethod {
  method_code: string
  display_name: string
  description: string
  icon_name: string
  is_active: boolean
  is_online: boolean
  display_order: number
}

interface PaymentData {
  appointment_id: string
  user_id: string
  staff_id?: string
  amount_rappen: number
  admin_fee_rappen: number
  total_amount_rappen: number
  payment_method: string
  payment_status: string
  description: string
  metadata: Record<string, any>
}

export const usePayments = () => {
  const supabase = getSupabase()
  
  // State
  const isLoadingPrice = ref(false)
  const isProcessing = ref(false)
  const calculatedPrice = ref<CalculatedPrice | null>(null)
  const priceError = ref<string>('')

  // Payment Methods (could be loaded from database)
  const availablePaymentMethods = ref<PaymentMethod[]>([
    {
      method_code: 'wallee',
      display_name: 'Online Zahlung',
      description: 'Kreditkarte, Twint, etc.',
      icon_name: 'credit-card',
      is_active: true,
      is_online: true,
      display_order: 1
    },
    {
      method_code: 'cash',
      display_name: 'Bar',
      description: 'Zahlung beim Fahrlehrer',
      icon_name: 'cash',
      is_active: true,
      is_online: false,
      display_order: 2
    },
    {
      method_code: 'invoice',
      display_name: 'Rechnung',
      description: 'Firmenrechnung',
      icon_name: 'document',
      is_active: true,
      is_online: false,
      display_order: 3
    }
  ])

  // Category-specific pricing (from your project data)
  const categoryPricing: Record<string, { base: number, admin: number }> = {
    'B': { base: 95, admin: 120 },
    'A1': { base: 95, admin: 0 },
    'A35kW': { base: 95, admin: 0 },
    'A': { base: 95, admin: 0 },
    'BE': { base: 120, admin: 120 },
    'C1': { base: 150, admin: 200 },
    'D1': { base: 150, admin: 200 },
    'C': { base: 170, admin: 200 },
    'CE': { base: 200, admin: 250 },
    'D': { base: 200, admin: 300 },
    'Motorboot': { base: 95, admin: 120 },
    'BPT': { base: 100, admin: 120 }
  }

  // Get appointment count for a user
  const getAppointmentCount = async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed', 'confirmed'])

      if (error) throw error
      return (count || 0) + 1
    } catch (error) {
      console.error('Error getting appointment count:', error)
      return 1
    }
  }

  // Calculate price based on category, duration, and appointment count
  const calculatePrice = async (
    category: string, 
    duration: number, 
    userId?: string
  ): Promise<CalculatedPrice> => {
    isLoadingPrice.value = true
    priceError.value = ''

    try {
      // Get appointment count if userId provided
      const appointmentCount = userId ? await getAppointmentCount(userId) : 1
      
      // Get category pricing
      const pricing = categoryPricing[category] || categoryPricing['B']
      
      // Calculate base price (per 45min, scaled to duration)
      const basePriceChf = (pricing.base / 45) * duration
      const basePriceRappen = Math.round(basePriceChf * 100)
      
      // Admin fee only from 2nd appointment (except for A1/A35kW/A)
      const adminFeeChf = (appointmentCount > 1 && pricing.admin > 0) ? pricing.admin : 0
      const adminFeeRappen = adminFeeChf * 100
      
      // Total
      const totalRappen = basePriceRappen + adminFeeRappen
      const totalChf = totalRappen / 100

      const result: CalculatedPrice = {
        base_price_rappen: basePriceRappen,
        admin_fee_rappen: adminFeeRappen,
        total_rappen: totalRappen,
        base_price_chf: basePriceChf.toFixed(2),
        admin_fee_chf: adminFeeChf.toFixed(2),
        total_chf: totalChf.toFixed(2),
        category_code: category,
        duration_minutes: duration
      }

      calculatedPrice.value = result
      return result

    } catch (error: any) {
      priceError.value = error.message || 'Fehler bei der Preisberechnung'
      throw error
    } finally {
      isLoadingPrice.value = false
    }
  }

  // Create payment record in database
  const createPaymentRecord = async (data: Partial<PaymentData>): Promise<any> => {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return payment
    } catch (error) {
      console.error('Error creating payment record:', error)
      throw error
    }
  }

  // Handle cash payment
  const processCashPayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: CalculatedPrice
  ) => {
    isProcessing.value = true

    try {
      const paymentData: Partial<PaymentData> = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        amount_rappen: price.base_price_rappen,
        admin_fee_rappen: price.admin_fee_rappen,
        total_amount_rappen: price.total_rappen,
        payment_method: 'cash',
        payment_status: 'completed', // Cash is immediately completed
        description: `Fahrlektion ${price.category_code} - ${price.duration_minutes} Min`,
        metadata: {
          category: price.category_code,
          duration: price.duration_minutes,
          processed_at: new Date().toISOString()
        }
      }

      const payment = await createPaymentRecord(paymentData)

      // Update appointment as paid
      await updateAppointmentPaymentStatus(appointmentId, true, 'cash')

      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Handle invoice payment
  const processInvoicePayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: CalculatedPrice,
    invoiceData: Record<string, any>
  ) => {
    isProcessing.value = true

    try {
      const paymentData: Partial<PaymentData> = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        amount_rappen: price.base_price_rappen,
        admin_fee_rappen: price.admin_fee_rappen,
        total_amount_rappen: price.total_rappen,
        payment_method: 'invoice',
        payment_status: 'pending', // Invoice starts as pending
        description: `Fahrlektion ${price.category_code} - ${price.duration_minutes} Min`,
        metadata: {
          category: price.category_code,
          duration: price.duration_minutes,
          invoice_data: invoiceData,
          created_at: new Date().toISOString()
        }
      }

      const payment = await createPaymentRecord(paymentData)

      // Don't mark appointment as paid yet (wait for invoice payment)
      
      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Update appointment payment status
  const updateAppointmentPaymentStatus = async (
    appointmentId: string,
    isPaid: boolean,
    paymentMethod?: string
  ) => {
    try {
      const updateData: any = { is_paid: isPaid }
      
      if (paymentMethod) {
        updateData.payment_method = paymentMethod
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating appointment payment status:', error)
      throw error
    }
  }

  // Get payment history for appointment
  const getPaymentHistory = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting payment history:', error)
      return []
    }
  }

  // Get payment method icon class
  const getPaymentMethodIconClass = (methodCode: string): string => {
    const classes: Record<string, string> = {
      wallee: 'bg-blue-100 text-blue-600',
      cash: 'bg-yellow-100 text-yellow-600',
      invoice: 'bg-gray-100 text-gray-600',
      card: 'bg-purple-100 text-purple-600',
      twint: 'bg-blue-100 text-blue-600'
    }
    return classes[methodCode] || 'bg-gray-100 text-gray-600'
  }

  // Get payment button text
  const getPaymentButtonText = (methodCode: string): string => {
    const texts: Record<string, string> = {
      wallee: 'Online bezahlen',
      cash: 'Bar bezahlen',
      invoice: 'Rechnung erstellen',
      card: 'Mit Karte bezahlen',
      twint: 'Mit Twint bezahlen'
    }
    return texts[methodCode] || 'Bezahlen'
  }

  return {
    // State
    isLoadingPrice: computed(() => isLoadingPrice.value),
    isProcessing: computed(() => isProcessing.value),
    calculatedPrice: computed(() => calculatedPrice.value),
    priceError: computed(() => priceError.value),
    availablePaymentMethods: computed(() => availablePaymentMethods.value),

    // Methods
    calculatePrice,
    getAppointmentCount,
    createPaymentRecord,
    processCashPayment,
    processInvoicePayment,
    updateAppointmentPaymentStatus,
    getPaymentHistory,

    // Utilities
    getPaymentMethodIconClass,
    getPaymentButtonText,

    // Reset
    clearErrors: () => {
      priceError.value = ''
    }
  }
}
```

### ./composables/usePendingTasks.ts

```
// composables/usePendingTasks.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Typen für bessere Typsicherheit
interface PendingAppointment {
  id: string
  title: string
  start_time: string
  end_time: string
  user_id: string
  status: string
  users: {
    first_name: string
    last_name: string
  }
  // Da wir nur Kriterien-Bewertungen wollen, passen wir den Typ an
  // Die notes Property sollte hier nur die Kriterien-spezifischen Notizen halten
  notes: Array<{
    id: string
    criteria_rating?: number
    criteria_note?: string
    evaluation_criteria_id?: string
  }>
}

// Typ für die Daten, die von saveCriteriaEvaluations erwartet werden
export interface CriteriaEvaluationData {
  criteria_id: string; // evaluation_criteria_id
  rating: number;     // criteria_rating
  note: string;       // criteria_note
}

// SINGLETON PATTERN - Globaler reaktiver State
const globalState = reactive({
  pendingAppointments: [] as PendingAppointment[],
  isLoading: false,
  error: null as string | null
})

// Computed values basierend auf globalem State
const pendingCount = computed(() => globalState.pendingAppointments.length)

const buttonClasses = computed(() =>
  `text-white font-bold px-4 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200
  ${pendingCount.value > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'}`
)

const buttonText = computed(() => 
  `Pendenzen${pendingCount.value > 0 ? `(${pendingCount.value})` : '(0)'}`
)

// Hilfsfunktion für formatierte Anzeige
const getFormattedAppointment = (appointment: PendingAppointment) => {
  const startDate = new Date(appointment.start_time)
  const endDate = new Date(appointment.end_time)
  
  return {
    ...appointment,
    formattedDate: startDate.toLocaleDateString('de-CH'),
    formattedStartTime: startDate.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    formattedEndTime: endDate.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    studentName: `${appointment.users.first_name} ${appointment.users.last_name}`,
    duration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)) // Minuten
  }
}

// Computed für direkt formatierte Appointments
const formattedAppointments = computed(() => {
  return globalState.pendingAppointments.map(appointment => getFormattedAppointment(appointment))
})

// SINGLETON FUNCTIONS - Funktionen operieren auf globalem State
const fetchPendingTasks = async (staffId: string) => {
  console.log('🔥 fetchPendingTasks starting for staff:', staffId)
  globalState.isLoading = true
  globalState.error = null

  try {
    const supabase = getSupabase()
    
    // Vergangene Termine des Fahrlehrers abrufen
    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        user_id,
        status,
        users!appointments_user_id_fkey (
          first_name,
          last_name
        ),
        notes (
          evaluation_criteria_id,
          criteria_rating
        )
      `)
      .eq('staff_id', staffId)
      .lt('end_time', new Date().toISOString()) // Nur vergangene Termine
      .eq('status', 'completed') // Nur abgeschlossene Termine
      .order('start_time', { ascending: false }) // Neueste zuerst

    if (fetchError) throw fetchError

    console.log('🔥 Fetched appointments (raw data):', data?.length)

    // Termine ohne Kriterienbewertung filtern
    const pending: PendingAppointment[] = (data || []).filter((appointment: any) => {
      // Ein Termin ist "pending", wenn er KEINE Kriterien-Bewertung hat.
      // Wir definieren "Kriterien-Bewertung" als einen Note-Eintrag, 
      // bei dem evaluation_criteria_id und criteria_rating gesetzt sind.
      const hasCriteriaEvaluation = appointment.notes && 
        appointment.notes.some((note: any) => 
          note.evaluation_criteria_id !== null && 
          note.criteria_rating !== null
        );

      // Hier ignorieren wir alte staff_rating Einträge komplett für die Pendenzen-Logik
      console.log(`🔥 Appointment ${appointment.id}: hasCriteriaEvaluation=${hasCriteriaEvaluation}`)
      return !hasCriteriaEvaluation; // Pending, wenn keine Kriterien-Bewertung vorhanden ist
    }).map((appointment: any): PendingAppointment => ({
      id: appointment.id,
      title: appointment.title,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      user_id: appointment.user_id,
      status: appointment.status,
      users: appointment.users,
      // Wichtig: Filtere hier die notes, damit nur relevante Kriterien-notes enthalten sind
      notes: appointment.notes.filter((note: any) => note.evaluation_criteria_id !== null)
    }))

    console.log('🔥 Filtered pending appointments:', pending.length)
    
    // WICHTIG: Globalen State komplett ersetzen (nicht mutieren)
    globalState.pendingAppointments.splice(0, globalState.pendingAppointments.length, ...pending)
    console.log('🔥 Global pending state updated, count:', pendingCount.value)
    
  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Laden der Pendenzen'
    console.error('❌ Fehler beim Laden der Pendenzen:', err)
  } finally {
    globalState.isLoading = false
  }
}

// NEUE Funktion zum Speichern der Kriterien-Bewertungen
const saveCriteriaEvaluations = async (
  appointmentId: string,
  evaluations: CriteriaEvaluationData[], // Array von Kriterien-Bewertungen
  currentUserId?: string
) => {
  try {
    const supabase = getSupabase();
    
    // Validierung der übergebenen Daten
    if (!evaluations || evaluations.length === 0) {
      throw new Error('Es müssen Bewertungen für mindestens ein Kriterium angegeben werden.');
    }

    const notesToInsert = evaluations.map(evalData => {
      // Validierung für jede einzelne Kriterienbewertung
      if (evalData.rating < 1 || evalData.rating > 6) {
        throw new Error(`Bewertung für Kriterium ${evalData.criteria_id} muss zwischen 1 und 6 liegen.`);
      }
      if (typeof evalData.note !== 'string') { // Stellen Sie sicher, dass note ein String ist
        evalData.note = String(evalData.note);
      }
      if (evalData.note.trim().length === 0) { // Eine Notiz ist nicht mehr zwingend
        evalData.note = ''; // Sicherstellen, dass es ein leerer String ist
      }

      return {
        appointment_id: appointmentId,
        evaluation_criteria_id: evalData.criteria_id,
        criteria_rating: evalData.rating,
        criteria_note: evalData.note.trim(),
        // staff_rating und staff_note bleiben NULL, da nicht mehr verwendet
        staff_rating: null,
        staff_note: '',
        last_updated_by_user_id: currentUserId || null,
        last_updated_at: new Date().toISOString()
      };
    });

    console.log('Attempting to upsert notes:', notesToInsert);

    // Verwende upsert für mehrere Einträge
    const { error: upsertError } = await supabase
      .from('notes')
      .upsert(notesToInsert, { onConflict: 'appointment_id,evaluation_criteria_id' }); // Conflict auf diesen beiden Spalten
                                                                                        // um Updates zu ermöglichen
    if (upsertError) throw upsertError;

    // Nach erfolgreichem Speichern: Aktualisiere die Pendenzen
    // Ein Termin ist NICHT mehr pending, wenn er mindestens eine Kriterien-Bewertung hat.
    // Die fetchPendingTasks Funktion wird das übernehmen.
    await fetchPendingTasks(currentUserId || ''); // Aktualisiere die Liste nach dem Speichern

    console.log('✅ Kriterien-Bewertungen erfolgreich gespeichert und Pendenzen aktualisiert:', appointmentId);

  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Speichern der Kriterien-Bewertungen';
    console.error('❌ Fehler beim Speichern der Kriterien-Bewertungen:', err);
    throw err;
  }
};


// Die markAsCompleted und markMultipleAsCompleted Funktionen sind obsolet,
// da wir keine Gesamtbewertungen mehr speichern.
// Ich habe sie hier entfernt, damit sie nicht mehr versehentlich aufgerufen werden.
// Wenn du sie noch irgendwo im Code hast, wo sie aufgerufen werden, musst du diese Aufrufe ändern.

const refreshPendingTasks = async (staffId: string) => {
  await fetchPendingTasks(staffId)
}

const clearError = () => {
  globalState.error = null
}

// SINGLETON EXPORT - Immer dieselbe Instanz zurückgeben
export const usePendingTasks = () => {
  console.log('🔄 usePendingTasks called - returning singleton instance')
  console.log('🔥 Current global pending count:', pendingCount.value)
  
  return {
    // Reactive state - direkte Referenzen auf reactive state
    pendingAppointments: computed(() => globalState.pendingAppointments),
    formattedAppointments,
    pendingCount,
    buttonClasses,
    buttonText,
    isLoading: computed(() => globalState.isLoading),
    error: computed(() => globalState.error),
    
    // Actions
    fetchPendingTasks,
    saveCriteriaEvaluations, // Die neue Funktion zum Export hinzufügen
    refreshPendingTasks,
    clearError,
    
    // Utilities
    getFormattedAppointment
  }
}
```

### ./composables/useStaffCategoryDurations.ts

```
// composables/useStaffCategoryDurations.ts - Neue saubere DB-Struktur
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface StaffCategoryDuration {
  id: string
  created_at: string
  staff_id: string
  category_code: string
  duration_minutes: number
  is_active: boolean
  display_order: number
}

export const useStaffCategoryDurations = () => {
  // State
  const availableDurations = ref<number[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed - formatierte Dauern für UI
  const formattedDurations = computed(() => {
    return availableDurations.value.map(duration => ({
      value: duration,
      label: duration >= 120 
        ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
        : `${duration}min`
    }))
  })

  // Dauern für Staff + Kategorie laden
  const loadStaffCategoryDurations = async (staffId: string, categoryCode: string) => {
    console.log('🚀 Loading staff category durations:', { staffId, categoryCode })
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      const { data, error: fetchError } = await supabase
        .from('staff_category_durations')
        .select('duration_minutes')
        .eq('staff_id', staffId)
        .eq('category_code', categoryCode)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (fetchError) throw fetchError

      const durations = data?.map(item => item.duration_minutes) || []
      
      // Fallback wenn keine spezifischen Dauern gefunden
      if (durations.length === 0) {
        console.log('⚠️ No specific durations found, using category default')
        
        // Hole Standard-Dauer aus categories Tabelle
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('lesson_duration_minutes')
          .eq('code', categoryCode)
          .eq('is_active', true)
          .maybeSingle()

        if (categoryError) throw categoryError
        
        const defaultDuration = categoryData?.lesson_duration_minutes || 45
        availableDurations.value = [defaultDuration]
      } else {
        availableDurations.value = durations.sort((a: number, b: number) => a - b)
      }

      console.log('✅ Loaded durations:', availableDurations.value)
      return availableDurations.value

    } catch (err: any) {
      console.error('❌ Error loading staff category durations:', err)
      error.value = err.message
      // Absoluter Fallback
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Dauern für Staff + Kategorie speichern
  const saveStaffCategoryDurations = async (
    staffId: string, 
    categoryCode: string, 
    durations: number[]
  ) => {
    console.log('💾 Saving staff category durations:', { staffId, categoryCode, durations })
    
    try {
      const supabase = getSupabase()

      // Erst alle bestehenden Einträge für diesen Staff + Kategorie löschen
      const { error: deleteError } = await supabase
        .from('staff_category_durations')
        .delete()
        .eq('staff_id', staffId)
        .eq('category_code', categoryCode)

      if (deleteError) throw deleteError

      // Neue Einträge einfügen
      const insertData = durations.map((duration, index) => ({
        staff_id: staffId,
        category_code: categoryCode,
        duration_minutes: duration,
        display_order: index + 1,
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from('staff_category_durations')
        .insert(insertData)

      if (insertError) throw insertError

      // State aktualisieren
      availableDurations.value = durations.sort((a: number, b: number) => a - b)
      
      console.log('✅ Staff category durations saved successfully')

    } catch (err: any) {
      console.error('❌ Error saving staff category durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Alle Dauern eines Staff laden (für Settings)
  const loadAllStaffDurations = async (staffId: string) => {
    console.log('📋 Loading all staff durations for settings')
    
    try {
      const supabase = getSupabase()

      const { data, error: fetchError } = await supabase
        .from('staff_category_durations')
        .select(`
          category_code,
          duration_minutes,
          display_order,
          categories (name)
        `)
        .eq('staff_id', staffId)
        .eq('is_active', true)
        .order('category_code')
        .order('display_order')

      if (fetchError) throw fetchError

      // Gruppiere nach Kategorie
      const groupedDurations = data?.reduce((acc: any, item: any) => {
        if (!acc[item.category_code]) {
          acc[item.category_code] = {
            categoryCode: item.category_code,
            categoryName: item.categories?.name || item.category_code,
            durations: []
          }
        }
        acc[item.category_code].durations.push(item.duration_minutes)
        return acc
      }, {}) || {}

      return Object.values(groupedDurations)

    } catch (err: any) {
      console.error('❌ Error loading all staff durations:', err)
      return []
    }
  }

  // Standard-Dauern für neue Staff erstellen
  const createDefaultDurations = async (staffId: string) => {
    console.log('🏗️ Creating default durations for new staff')
    
    try {
      const supabase = getSupabase()

      // Lade alle aktiven Kategorien
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('code, lesson_duration_minutes')
        .eq('is_active', true)

      if (categoriesError) throw categoriesError

      // Erstelle Standard-Dauern für jede Kategorie
      const defaultDurations = categories?.flatMap(category => {
        const baseDuration = category.lesson_duration_minutes || 45
        
        // Erstelle 2-3 Standard-Optionen basierend auf der Kategorie
        const durations = [baseDuration]
        if (baseDuration >= 45) durations.push(baseDuration + 45) // +45min
        if (baseDuration <= 135) durations.push(baseDuration + 90) // +90min
        
        return durations.map((duration, index) => ({
          staff_id: staffId,
          category_code: category.code,
          duration_minutes: duration,
          display_order: index + 1,
          is_active: true
        }))
      }) || []

      const { error: insertError } = await supabase
        .from('staff_category_durations')
        .insert(defaultDurations)

      if (insertError) throw insertError

      console.log('✅ Default durations created for all categories')

    } catch (err: any) {
      console.error('❌ Error creating default durations:', err)
      throw err
    }
  }

  // Erstes verfügbares Dauer zurückgeben
  const getDefaultDuration = () => {
    return availableDurations.value.length > 0 ? availableDurations.value[0] : 45
  }

  // Check ob Dauer verfügbar ist
  const isDurationAvailable = (duration: number) => {
    return availableDurations.value.includes(duration)
  }

  // Reset state
  const reset = () => {
    availableDurations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    availableDurations: computed(() => availableDurations.value),
    formattedDurations,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Actions
    loadStaffCategoryDurations,
    saveStaffCategoryDurations,
    loadAllStaffDurations,
    createDefaultDurations,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}
```

### ./composables/useStaffDurations.ts

```
// composables/useStaffDurations.ts - Komplett Datenbank-getrieben
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useStaffDurations = () => {
  // State
  const availableDurations = ref<number[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed - formatierte Dauern für UI
  const formattedDurations = computed(() => {
    return availableDurations.value.map(duration => ({
      value: duration,
      label: duration >= 120 
        ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
        : `${duration}min`
    }))
  })

  // Verfügbare Dauern für Staff + Kategorie aus Datenbank laden
  const loadAvailableDurations = async (categoryCode: string, staffId: string) => {
    console.log('🔥 Loading durations from DB for:', categoryCode, 'staff:', staffId)
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      // 1. Staff Settings laden (preferred_durations)
      const { data: staffSettings, error: staffError } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (staffError) {
        console.log('⚠️ No staff settings found, will use category defaults')
      }

      // 2. Kategorie aus DB laden (für Fallback-Dauer)
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('lesson_duration, code')
        .eq('code', categoryCode)
        .eq('is_active', true)
        .maybeSingle()

      if (categoryError) throw categoryError

      if (!category) {
        throw new Error(`Kategorie ${categoryCode} nicht gefunden`)
      }

      // 3. Staff preferred_durations parsen
      let finalDurations: number[] = []
      
      if (staffSettings?.preferred_durations) {
        // Staff hat eigene Dauern konfiguriert
        finalDurations = staffSettings.preferred_durations
          .split(',')
          .map((d: string) => parseInt(d.trim()))
          .filter((d: number) => !isNaN(d) && d > 0)
          .sort((a: number, b: number) => a - b)
        
        console.log('✅ Using staff configured durations:', finalDurations)
      } else {
        // Fallback: Standard-Dauer der Kategorie
        finalDurations = [category.lesson_duration || 45]
        console.log('⚠️ No staff durations found, using category default:', finalDurations)
      }

      availableDurations.value = finalDurations
      return finalDurations

    } catch (err: any) {
      console.error('❌ Error loading durations from DB:', err)
      error.value = err.message
      // Absoluter Fallback
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Staff preferred durations in DB updaten
  const updateStaffDurations = async (staffId: string, newDurations: number[]) => {
    console.log('🔄 Updating staff durations in DB:', newDurations)
    
    try {
      const supabase = getSupabase()
      // Als JSON Array speichern um konsistent mit bestehenden Daten zu sein
      const durationsString = JSON.stringify(newDurations.sort((a: number, b: number) => a - b))
      
      const { error: upsertError } = await supabase
        .from('staff_settings')
        .upsert({
          staff_id: staffId,
          preferred_durations: durationsString,
          updated_at: new Date().toISOString()
        })

      if (upsertError) throw upsertError

      console.log('✅ Staff durations updated in DB as JSON:', durationsString)
      
      // State aktualisieren
      availableDurations.value = newDurations.sort((a: number, b: number) => a - b)
      
    } catch (err: any) {
      console.error('❌ Error updating staff durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Standard-Dauern für alle Kategorien aus DB laden (für Settings UI)
  const loadAllPossibleDurations = async () => {
    console.log('🔥 Loading all possible durations from DB')
    
    try {
      const supabase = getSupabase()
      
      // Alle aktiven Kategorien laden
      const { data: categories, error } = await supabase
        .from('categories')
        .select('code, lesson_duration')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error

      // Alle möglichen Dauern sammeln (15min steps von 45-240)
      const allDurations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
      
      return allDurations.map(duration => ({
        value: duration,
        label: duration >= 120 
          ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
          : `${duration}min`,
        // Zeige welche Kategorien diese Dauer unterstützen (Info für Settings)
        supportedCategories: categories?.filter(cat => {
          // Logik welche Kategorien welche Dauern unterstützen kann in DB erweitert werden
          return duration >= (cat.lesson_duration || 45)
        }).map(cat => cat.code) || []
      }))

    } catch (err: any) {
      console.error('❌ Error loading possible durations:', err)
      return []
    }
  }

  // Staff-Settings für User laden
  const loadStaffSettings = async (staffId: string) => {
    console.log('🔥 Loading complete staff settings from DB')
    
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('staff_settings')
        .select('*')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (error) throw error
      
      return data
    } catch (err: any) {
      console.error('❌ Error loading staff settings:', err)
      return null
    }
  }

  // Erstes verfügbares Dauer zurückgeben
  const getDefaultDuration = () => {
    return availableDurations.value.length > 0 ? availableDurations.value[0] : 45
  }

  // Check ob Dauer verfügbar ist
  const isDurationAvailable = (duration: number) => {
    return availableDurations.value.includes(duration)
  }

  // Reset state
  const reset = () => {
    availableDurations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    availableDurations: computed(() => availableDurations.value),
    formattedDurations,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Actions
    loadAvailableDurations,
    calculateAvailableDurations: loadAvailableDurations, // Alias für Kompatibilität
    updateStaffDurations,
    loadAllPossibleDurations,
    loadStaffSettings,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}
```

### ./composables/useStudents.ts

```
// composables/useStudents.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import type { User } from '~/types'

export const useStudents = () => {
  const students = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const showInactive = ref(false)
  const showAllStudents = ref(false) // false = nur eigene, true = alle

  // Computed: Gefilterte Schülerliste
  const filteredStudents = computed(() => {
    let filtered = students.value

    // Suche nach Name/Email
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(student =>
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
      )
    }

    // Aktiv/Inaktiv Filter
    if (!showInactive.value) {
      filtered = filtered.filter(student => student.is_active)
    }

    return filtered
  })

  // Statistiken
  const totalStudents = computed(() => students.value.length)
  const activeStudents = computed(() => students.value.filter(s => s.is_active).length)
  const inactiveStudents = computed(() => students.value.filter(s => !s.is_active).length)

  // Schüler laden
  const fetchStudents = async (currentUserId: string, userRole: string) => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'client')

      // Staff sieht nur eigene Schüler, außer showAllStudents ist true
      if (userRole === 'staff' && !showAllStudents.value) {
        query = query.eq('assigned_staff_id', currentUserId)
      }

      // Sortierung nach Nachname, Vorname
      query = query.order('last_name').order('first_name')

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      students.value = data || []

    } catch (err: any) {
      error.value = err.message
      console.error('Fehler beim Laden der Schüler:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Einzelnen Schüler laden
  const fetchStudent = async (studentId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          *,
          assigned_staff:users!users_assigned_staff_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', studentId)
        .eq('role', 'client')
        .single()

      if (fetchError) throw fetchError

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler-Termine laden
  const fetchStudentAppointments = async (studentId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          staff:users!appointments_staff_id_fkey (
            first_name,
            last_name
          ),
          notes (
            staff_rating,
            staff_note,
            last_updated_at
          )
        `)
        .eq('user_id', studentId)
        .order('start_time', { ascending: false })

      if (fetchError) throw fetchError

      return data || []

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler aktivieren/deaktivieren
  const toggleStudentStatus = async (studentId: string, isActive: boolean) => {
    try {
      const supabase = getSupabase()
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', studentId)

      if (updateError) throw updateError

      // Lokale Liste aktualisieren
      const student = students.value.find(s => s.id === studentId)
      if (student) {
        student.is_active = isActive
      }

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Neuen Schüler hinzufügen
  const addStudent = async (studentData: Partial<User>) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: insertError } = await supabase
        .from('users')
        .insert([{
          ...studentData,
          role: 'client',
          is_active: true
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // Zur lokalen Liste hinzufügen
      students.value.unshift(data)

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler bearbeiten
  const updateStudent = async (studentId: string, updates: Partial<User>) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', studentId)
        .select()
        .single()

      if (updateError) throw updateError

      // Lokale Liste aktualisieren
      const index = students.value.findIndex(s => s.id === studentId)
      if (index !== -1) {
        students.value[index] = { ...students.value[index], ...data }
      }

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    students,
    isLoading,
    error,
    searchQuery,
    showInactive,
    showAllStudents,

    // Computed
    filteredStudents,
    totalStudents,
    activeStudents,
    inactiveStudents,

    // Methods
    fetchStudents,
    fetchStudent,
    fetchStudentAppointments,
    toggleStudentStatus,
    addStudent,
    updateStudent
  }
}
```

### ./composables/useUsers.ts

```
// composables/useUsers.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useUsers = () => {
  const users = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Soft Delete - User deaktivieren
  const deactivateUser = async (userId: string, reason?: string) => {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deletion_reason: reason || 'Deaktiviert'
        })
        .eq('id', userId)
        
      if (error) throw error
      console.log('User deaktiviert (Soft Delete)')
      
      // Liste aktualisieren
      await getActiveUsers()
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // User reaktivieren
  const reactivateUser = async (userId: string) => {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('users')
        .update({
          is_active: true,
          deleted_at: null,
          deletion_reason: null
        })
        .eq('id', userId)
        
      if (error) throw error
      console.log('User reaktiviert')
      
      // Liste aktualisieren
      await getActiveUsers()
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Nur aktive User laden (Standard)
  const getActiveUsers = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('last_name')
        .order('first_name')
        
      if (fetchError) throw fetchError
      
      users.value = data || []
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Alle User inkl. inaktive (für Admin)
  const getAllUsers = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*, deleted_at')
        .order('is_active', { ascending: false })
        .order('last_name')
        .order('first_name')
        
      if (fetchError) throw fetchError
      
      users.value = data || []
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // User nach ID suchen
  const getUserById = async (userId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (fetchError) throw fetchError
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    users,
    isLoading,
    error,
    
    // Methods
    deactivateUser,
    reactivateUser,
    getActiveUsers,
    getAllUsers,
    getUserById
  }
}
```

### ./composables/useWallee.ts

```
// composables/useWallee.ts - Updated Version

import { useRuntimeConfig } from '#app'

interface WalleeTransactionResult {
  success: boolean
  error: string | null
  transactionId?: string
  paymentUrl?: string
  transaction?: any
}

interface WalleeConnectionResult {
  success: boolean
  error: string | null
  connected?: boolean
  spaceId?: string
}

interface WalleeTransactionRequest {
  appointmentId: string
  amount: number
  currency?: string
  customerId: string
  customerEmail: string
  lineItems?: Array<{
    uniqueId: string
    name: string
    quantity: number
    amountIncludingTax: number
    type: string
  }>
  successUrl?: string
  failedUrl?: string
}

export const useWallee = () => {
  const createTransaction = async (request: WalleeTransactionRequest): Promise<WalleeTransactionResult> => {
    try {
      console.log('🔄 Creating Wallee transaction:', request)
      
      // Validierung der erforderlichen Felder
      if (!request.appointmentId || !request.amount || !request.customerId || !request.customerEmail) {
        throw new Error('Missing required fields: appointmentId, amount, customerId, customerEmail')
      }

      // API Call zu deiner Wallee Route
      const response = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: {
          appointmentId: request.appointmentId,
          amount: request.amount,
          currency: request.currency || 'CHF',
          customerId: request.customerId,
          customerEmail: request.customerEmail,
          lineItems: request.lineItems || [
            {
              uniqueId: `appointment-${request.appointmentId}`,
              name: 'Fahrstunde',
              quantity: 1,
              amountIncludingTax: request.amount,
              type: 'PRODUCT'
            }
          ],
          successUrl: request.successUrl,
          failedUrl: request.failedUrl
        }
      })  as any

      console.log('✅ Wallee transaction created successfully:', response)

      return {
        success: true,
        transactionId: response.transactionId,
        paymentUrl: response.paymentUrl,
        transaction: response.transaction,
        error: null
      }

    } catch (error: any) {
      console.error('❌ Wallee Transaction Error:', error)
      
      return {
        success: false,
        error: error.data?.message || error.message || 'Transaction creation failed'
      }
    }
  }

  const testConnection = async (): Promise<WalleeConnectionResult> => {
    try {
      console.log('🔄 Testing Wallee connection...')
      
      // Test mit einer minimalen Transaction oder Connection Check
      const testResponse = await $fetch('/api/wallee/test-connection', {
        method: 'GET'
      }) as any

      return {
        success: true,
        connected: true,
        spaceId: testResponse.spaceId,
        error: null
      }

    } catch (error: any) {
      console.error('❌ Wallee Connection Error:', error)
      
      return {
        success: false,
        connected: false,
        error: error.message || 'Connection test failed'
      }
    }
  }

  const isWalleeAvailable = (): boolean => {
    // Check if environment variables are available
    const config = useRuntimeConfig()
    return !!(config.public.walleeEnabled || process.env.WALLEE_SPACE_ID)
  }

  // Neue Utility-Funktionen
  const calculateAppointmentPrice = (category: string, duration: number, isSecondAppointment: boolean = false): number => {
    // Preise basierend auf deinen Projektdaten
    const categoryPrices: Record<string, { base: number, admin: number }> = {
      'B': { base: 95, admin: 120 },
      'A1': { base: 95, admin: 0 },
      'A35kW': { base: 95, admin: 0 },
      'A': { base: 95, admin: 0 },
      'BE': { base: 120, admin: 120 },
      'C1': { base: 150, admin: 200 },
      'D1': { base: 150, admin: 200 },
      'C': { base: 170, admin: 200 },
      'CE': { base: 200, admin: 250 },
      'D': { base: 200, admin: 300 },
      'Motorboot': { base: 95, admin: 120 },
      'BPT': { base: 100, admin: 120 }
    }

    const priceInfo = categoryPrices[category] || { base: 95, admin: 120 }
    
    // Preis pro 45min auf gewünschte Dauer umrechnen
    const lessonPrice = (priceInfo.base / 45) * duration
    
    // Versicherungspauschale ab 2. Termin (außer bei Motorrad-Kategorien)
    const adminFee = isSecondAppointment ? priceInfo.admin : 0
    
    return Math.round((lessonPrice + adminFee) * 100) / 100 // Auf 2 Dezimalstellen runden
  }

  const createAppointmentPayment = async (
    appointment: any, 
    user: any, 
    isSecondAppointment: boolean = false
  ): Promise<WalleeTransactionResult> => {
    const amount = calculateAppointmentPrice(
      appointment.type || 'B', 
      appointment.duration_minutes || 45, 
      isSecondAppointment
    )

    return await createTransaction({
      appointmentId: appointment.id,
      amount: amount,
      currency: 'CHF',
      customerId: user.id,
      customerEmail: user.email,
      lineItems: [
        {
          uniqueId: `appointment-${appointment.id}`,
          name: `Fahrstunde ${appointment.type || 'B'} (${appointment.duration_minutes || 45}min)`,
          quantity: 1,
          amountIncludingTax: amount,
          type: 'PRODUCT'
        }
      ]
    })
  }

  return {
    // Core functions
    createTransaction,
    testConnection,
    isWalleeAvailable,
    
    // Utility functions
    calculateAppointmentPrice,
    createAppointmentPayment
  }
}
```

### ./eslint.config.mjs

```
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
)

```

### ./middleware/auth-check.ts

```
// middleware/auth-check.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase' // Annahme: Du hast diese Hilfsfunktion
// import { useAuthStore } from '~/stores/auth' // Pinia Store nicht direkt in dieser Middleware verwenden
// import { storeToRefs } from 'pinia' // Auch nicht nötig, wenn direkt supabase.auth genutzt wird
import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtRouteMiddleware(async (to: RouteLocationNormalized, from: RouteLocationNormalized) => { // <<< WICHTIG: async hinzufügen!
  console.log('🔥 Auth middleware triggered for:', to.path)

  if (process.server) return

  const supabase = getSupabase() // Supabase Client initialisieren

  // Den aktuellen User-Status direkt von Supabase holen
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('❌ Supabase getUser error in middleware:', error.message)
    // Im Fehlerfall trotzdem umleiten, wenn kein User
    if (!user) {
        console.log('❌ No authenticated user (error in getUser), redirecting to /')
        return navigateTo('/')
    }
  }

  // Wenn kein User gefunden wurde (nach erfolgreichem get-Aufruf oder Fehler mit null-User)
  if (!user) {
    console.log('❌ No authenticated user, redirecting to /')
    // Stelle sicher, dass die Login-Seite nicht geschützt ist, um eine Redirect-Schleife zu vermeiden
    if (to.path !== '/') { // Wenn '/' deine Login-Seite ist
      return navigateTo('/')
    }
    return // Bleibt auf der Login-Seite
  }

  console.log('✅ User authenticated in middleware:', user.email)
  // Hier könntest du jetzt weitere Logik basierend auf der Rolle des Benutzers implementieren
  // Wenn du weiterhin den Pinia Store verwenden möchtest, stelle sicher, dass er hier aktualisiert wird
  // oder die Navigationsentscheidung primär auf der Role-Property des 'user'-Objekts basiert.
  // Beispiel:
  // const authStore = useAuthStore();
  // authStore.setUser(user); // Optional: Pinia Store hier aktualisieren
})
```

### ./nuxt.config.ts

```
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },
  ssr: true,
  
  // --- Module Configuration (ohne @nuxtjs/supabase) ---
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],
  
  // --- Build Configuration ---
  build: {
    transpile: [
      '@fullcalendar/core',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      '@fullcalendar/vue3',
    ],
  },
  
  // --- TypeScript Configuration ---
  typescript: {
    strict: true,
    typeCheck: true
  },
  
  // --- Nitro Configuration ---
  nitro: {
    experimental: {
      wasm: true
    }
  },
  
  experimental: {
    // Suspense explizit aktivieren
    payloadExtraction: false
  },
  
  // Vue-spezifische Konfiguration
  vue: {
    compilerOptions: {
      // Suspense-Warnungen unterdrücken
      isCustomElement: (tag) => false
    }
  },
  
  runtimeConfig: {
    // Private keys (only available on server-side)
    walleeSpaceId: process.env.WALLEE_SPACE_ID,
    walleeApplicationUserId: process.env.WALLEE_APPLICATION_USER_ID,
    walleeSecretKey: process.env.WALLEE_SECRET_KEY,
    
    // Public keys (exposed to client-side)
    public: {
      googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY,
      walleeSpaceId: process.env.WALLEE_SPACE_ID,
      walleeUserId: process.env.WALLEE_USER_ID
    }
  },
  
  app: {
    head: {
      script: [
        {
          src: `https://maps.googleapis.com/maps/api/js?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&language=de&region=CH&v=beta&loading=async`,
          async: true,
          defer: true
        }
      ]
    }
  }
})
```

### ./package.json

```
{
  "name": "driving-team-app",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare"
  },
  "dependencies": {
    "@fullcalendar/core": "^6.1.17",
    "@fullcalendar/daygrid": "^6.1.17",
    "@fullcalendar/interaction": "^6.1.17",
    "@fullcalendar/timegrid": "^6.1.17",
    "@fullcalendar/vue3": "^6.1.17",
    "@nuxt/ui": "^2.18.7",
    "@nuxtjs/supabase": "^1.5.3",
    "@pinia/nuxt": "^0.5.5",
    "@supabase/supabase-js": "^2.50.2",
    "nuxt": "^3.17.5",
    "pinia": "^2.2.6"
  },
  "devDependencies": {
    "@nuxt/eslint": "^0.5.7",
    "@types/node": "^24.0.12",
    "eslint": "^8.57.1",
    "typescript": "^5.8.3",
    "vue-tsc": "^2.2.12"
  }
}

```

### ./plugins/wallee.client.ts

```
// plugins/wallee.client.ts
import { defineNuxtPlugin } from '#app'
import type { WalleeService, WalleeTransactionResult, WalleeConnectionResult } from '~/types/wallee'

export default defineNuxtPlugin(() => {
  // Prüfe ob wir im Browser sind
  if (!process.client) {
    return {
      provide: {
        wallee: {
          createTransaction: () => Promise.resolve({ success: false, error: 'Server-side not supported' }),
          testSpaceConnection: () => Promise.resolve({ success: false, error: 'Server-side not supported' })
        }
      }
    }
  }

  // Browser-Implementation
  const createTransaction = async (): Promise<WalleeTransactionResult> => {
    try {
      console.log('🔄 Wallee: Creating transaction...')
      
      // Hier würde die echte Wallee-Integration stehen
      // Für den Moment geben wir ein Mock-Ergebnis zurück
      
      return {
        success: true,
        error: '',
        transactionId: `txn_${Date.now()}`,
        paymentUrl: 'https://checkout.wallee.com/...'
      }
    } catch (error: any) {
      console.error('❌ Wallee Transaction Error:', error)
      return {
        success: false,
        error: error.message || 'Transaction failed'
      }
    }
  }

  const testSpaceConnection = async (): Promise<WalleeConnectionResult> => {
    try {
      console.log('🔄 Testing Wallee Space connection...')
      
      // Test-Verbindung zu Wallee Space
      // Für den Moment simulieren wir eine erfolgreiche Verbindung
      
      return {
        success: true,
        error: '',
        spaceId: '12345',
        connected: true
      }
    } catch (error: any) {
      console.error('❌ Wallee Connection Error:', error)
      return {
        success: false,
        error: error.message || 'Connection failed'
      }
    }
  }

  return {
    provide: {
      wallee: {
        createTransaction,
        testSpaceConnection
      }
    }
  }
})
```

### ./public/robots.txt

```
User-Agent: *
Disallow:

```

### ./server/api/payments/receipt.post.ts

```
// PDF Receipt Generation API

import { defineEventHandler, readBody } from 'h3'
import { getSupabase } from '~/utils/supabase'

interface ReceiptRequest {
  paymentId: string
}

interface ReceiptResponse {
  success: boolean
  pdfUrl?: string
  error?: string
}

export default defineEventHandler(async (event): Promise<ReceiptResponse> => {
  try {
    const { paymentId }: ReceiptRequest = await readBody(event)
    
    if (!paymentId) {
      throw new Error('Payment ID is required')
    }

    console.log('📄 Generating receipt for payment:', paymentId)

    // Get payment details from database
    const supabase = getSupabase()
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          title,
          start_time,
          duration_minutes,
          type
        ),
        users!payments_user_id_fkey (
          first_name,
          last_name,
          email,
          street,
          street_nr,
          zip,
          city
        )
      `)
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      throw new Error('Payment not found')
    }

    // Generate PDF receipt
    const receiptData = {
      payment: {
        id: payment.id,
        transactionId: payment.wallee_transaction_id,
        amount: payment.total_amount_rappen / 100,
        baseAmount: payment.amount_rappen / 100,
        adminFee: payment.admin_fee_rappen / 100,
        method: payment.payment_method,
        status: payment.payment_status,
        paidAt: payment.paid_at,
        createdAt: payment.created_at,
        description: payment.description,
        currency: payment.currency
      },
      appointment: payment.appointments,
      customer: payment.users,
      company: {
        name: 'Driving Team Zürich GmbH',
        address: 'Baslerstrasse 145',
        zip: '8048',
        city: 'Zürich',
        email: 'info@drivingteam.ch',
        phone: '044 431 00 33'
      }
    }

    // Here you would integrate with a PDF generation service
    // For now, we'll return a placeholder
    const pdfUrl = await generatePDF(receiptData)

    console.log('✅ Receipt generated:', pdfUrl)

    return {
      success: true,
      pdfUrl
    }

  } catch (error: any) {
    console.error('❌ Receipt generation failed:', error)
    return {
      success: false,
      error: error.message || 'Receipt generation failed'
    }
  }
})

async function generatePDF(data: any): Promise<string> {
  // Placeholder for PDF generation
  // You can integrate with services like:
  // - Puppeteer
  // - jsPDF
  // - PDFKit
  // - External PDF service
  
  // For now, return a mock URL
  return '/api/receipts/placeholder.pdf'
}

// .env Variables für Wallee
/*
# Wallee Configuration
WALLEE_BASE_URL=https://app-wallee.com
WALLEE_SPACE_ID=your_space_id_here
WALLEE_USER_ID=your_user_id_here
WALLEE_API_SECRET=your_api_secret_here
WALLEE_TWINT_METHOD_ID=your_twint_method_configuration_id

# Webhook URLs (für Wallee Dashboard)
# Success URL: https://yourdomain.com/payment/success
# Failed URL: https://yourdomain.com/payment/failed
# Webhook URL: https://yourdomain.com/api/wallee/webhook
*/
```

### ./server/api/wallee/create-transaction.post.ts

```
// server/api/wallee/create-transaction.post.ts
export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Wallee API called')
    
    // Body aus der Anfrage lesen
    const body = await readBody(event)
    
    console.log('📨 Received body:', body)
    
    const {
      appointmentId,
      amount,
      currency = 'CHF',
      customerId,
      customerEmail,
      lineItems,
      successUrl,
      failedUrl
    } = body

    // Validierung der erforderlichen Felder
    if (!appointmentId || !amount || !customerId || !customerEmail) {
      console.error('❌ Missing required fields:', { appointmentId, amount, customerId, customerEmail })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: appointmentId, amount, customerId, customerEmail'
      })
    }

    // Wallee Konfiguration aus Environment Variables
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Wallee Config Check:', {
      hasSpaceId: !!walleeSpaceId,
      hasUserId: !!walleeApplicationUserId,
      hasSecretKey: !!walleeSecretKey,
      spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}...` : 'missing',
      userId: walleeApplicationUserId ? `${walleeApplicationUserId.substring(0, 3)}...` : 'missing'
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      console.error('❌ Wallee configuration missing')
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee configuration missing in environment variables'
      })
    }

    // Base64 Authentifizierung für Wallee API
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')

    // Get request host for URLs
    const host = getHeader(event, 'host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    // Transaction Data für Wallee
    const transactionData = {
      lineItems: lineItems || [
        {
          uniqueId: `appointment-${appointmentId}`,
          name: 'Fahrstunde',
          quantity: 1,
          amountIncludingTax: amount,
          type: 'PRODUCT'
        }
      ],
      currency: currency,
      customerId: customerId,
      merchantReference: `appointment-${appointmentId}`,
      successUrl: successUrl || `${baseUrl}/payment/success`,
      failedUrl: failedUrl || `${baseUrl}/payment/failed`,
      language: 'de-CH',
      spaceId: parseInt(walleeSpaceId),
      autoConfirmationEnabled: true,
      customerEmailAddress: customerEmail,
      metaData: {
        appointmentId: appointmentId,
        createdAt: new Date().toISOString()
      }
    }

    console.log('🔄 Creating Wallee transaction:', {
      spaceId: walleeSpaceId,
      amount: amount,
      currency: currency,
      customerId: customerId
    })

    // Wallee Transaction erstellen
    const response = await $fetch<any>(
      `https://app-wallee.com/api/transaction/create?spaceId=${walleeSpaceId}`,
      {
        method: 'POST',
        body: transactionData,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    console.log('✅ Wallee transaction created:', {
      id: response?.id,
      state: response?.state,
      amount: response?.authorizationAmount
    })

    // Payment Page URL erstellen
    const paymentPageUrl = await $fetch<string>(
      `https://app-wallee.com/api/transaction-payment-page/payment-page-url?spaceId=${walleeSpaceId}`,
      {
        method: 'POST',
        body: {
          id: response?.id
        },
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    console.log('✅ Payment page URL created:', paymentPageUrl)

    return {
      success: true,
      transactionId: response?.id,
      paymentUrl: paymentPageUrl,
      transaction: response
    }

  } catch (error: any) {
    console.error('❌ Wallee API Error:', error)
    
    // Spezifische Fehlerbehandlung für Wallee API Fehler
    if (error.data) {
      console.error('❌ Wallee API Response Error:', error.data)
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.data.message || 'Wallee API Error'
      })
    }

    // Allgemeine Fehlerbehandlung
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
```

### ./server/api/wallee/debug-credentials.get.ts

```
// server/api/wallee/debug-credentials.get.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Debug Wallee Credentials')
  
  // Environment Variables checken
  const walleeSpaceId = process.env.WALLEE_SPACE_ID
  const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
  const walleeSecretKey = process.env.WALLEE_SECRET_KEY
  
  console.log('📊 Environment Check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasSpaceId: !!walleeSpaceId,
    hasUserId: !!walleeApplicationUserId,
    hasSecretKey: !!walleeSecretKey,
    spaceIdLength: walleeSpaceId?.length || 0,
    userIdLength: walleeApplicationUserId?.length || 0,
    secretKeyLength: walleeSecretKey?.length || 0
  })
  
  // Partial values für Debug (keine Secrets leaken!)
  const debugInfo = {
    spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}...${walleeSpaceId.substring(-3)}` : 'MISSING',
    userId: walleeApplicationUserId ? `${walleeApplicationUserId.substring(0, 3)}...${walleeApplicationUserId.substring(-3)}` : 'MISSING',
    secretKey: walleeSecretKey ? `${walleeSecretKey.substring(0, 10)}...` : 'MISSING',
    authString: walleeApplicationUserId && walleeSecretKey ? 
      `${walleeApplicationUserId.substring(0, 3)}:${walleeSecretKey.substring(0, 10)}...` : 'MISSING'
  }
  
  console.log('🔐 Credential Preview:', debugInfo)
  
  // Test Base64 Encoding
  if (walleeApplicationUserId && walleeSecretKey) {
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')
    console.log('📝 Base64 Auth Length:', auth.length)
    console.log('📝 Base64 Auth Preview:', `${auth.substring(0, 20)}...`)
  }
  
  return {
    success: true,
    environment: process.env.NODE_ENV,
    hasCredentials: {
      spaceId: !!walleeSpaceId,
      userId: !!walleeApplicationUserId,
      secretKey: !!walleeSecretKey
    },
    debug: debugInfo,
    message: 'Check server console for detailed logs'
  }
})
```

### ./server/api/wallee/test-auth.post.ts

```
// server/api/wallee/test-auth.post.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Wallee Auth Test started')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received:', body)
    
    // Get credentials
    const spaceId = process.env.WALLEE_SPACE_ID
    const userId = process.env.WALLEE_APPLICATION_USER_ID  
    const secretKey = process.env.WALLEE_SECRET_KEY
    
    console.log('📊 Credentials check:', {
      spaceId: spaceId,
      userId: userId,
      secretKey: secretKey ? `${secretKey.substring(0, 20)}...` : 'MISSING',
      allPresent: !!(spaceId && userId && secretKey)
    })
    
    if (!spaceId || !userId || !secretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Wallee credentials'
      })
    }
    
    // Create auth string
    const authString = `${userId}:${secretKey}`
    const authBase64 = Buffer.from(authString).toString('base64')
    
    console.log('🔐 Auth creation:', {
      authString: `${userId}:${secretKey.substring(0, 10)}...`,
      authBase64: `${authBase64.substring(0, 30)}...`,
      authBase64Length: authBase64.length
    })
    
    // Test simple Wallee API call - get space info
    const testUrl = `https://app-wallee.com/api/space/read?spaceId=${spaceId}&id=${spaceId}`
    
    console.log('🌐 Testing Wallee API:', {
      url: testUrl,
      headers: {
        'Authorization': `Basic ${authBase64.substring(0, 30)}...`,
        'Content-Type': 'application/json'
      }
    })
    
    const response = await $fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('✅ Wallee API Response:', response)
    
    return {
      success: true,
      message: 'Authentication working!',
      spaceInfo: response
    }
    
  } catch (error: any) {
    console.error('❌ Wallee Auth Test Error:', error)
    
    if (error.statusCode === 442) {
      console.error('🚨 Permission Error - User not authenticated or no permissions')
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      details: error
    }
  }
})
```

### ./server/api/wallee/test-connection.get.ts

```
// server/api/wallee/test-connection.get.ts
export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Testing Wallee connection...')

    // Environment Variables prüfen
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Environment Variables Check:', {
      hasSpaceId: !!walleeSpaceId,
      hasUserId: !!walleeApplicationUserId,
      hasSecretKey: !!walleeSecretKey,
      spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}***` : 'missing'
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee configuration missing. Please check environment variables.'
      })
    }

    // Base64 Authentifizierung
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')

    // Wallee Space Information abrufen (einfacher Connection Test)
    const spaceInfo = await $fetch(
      `https://app-wallee.com/api/space/read?spaceId=${walleeSpaceId}&id=${walleeSpaceId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ) as any

    console.log('✅ Wallee connection successful:', {
      spaceId: walleeSpaceId,
      spaceName: spaceInfo?.name,
      state: spaceInfo?.state
    })

    return {
      success: true,
      connected: true,
      spaceId: walleeSpaceId,
      spaceName: spaceInfo?.name,
      state: spaceInfo?.state,
      message: 'Wallee connection successful'
    }

  } catch (error: any) {
    console.error('❌ Wallee connection test failed:', error)

    // Spezifische Fehlerbehandlung
    if (error.statusCode === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Wallee authentication failed. Please check your credentials.'
      })
    }

    if (error.statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Wallee space not found. Please check your Space ID.'
      })
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Wallee connection test failed'
    })
  }
})
```

### ./server/api/wallee/transaction-debug.post.ts

```
// server/api/wallee/transaction-debug.post.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Transaction Debug API called')
  
  try {
    const body = await readBody(event)
    console.log('📨 Request body:', body)
    
    // Get credentials
    const spaceId = process.env.WALLEE_SPACE_ID
    const userId = process.env.WALLEE_APPLICATION_USER_ID  
    const secretKey = process.env.WALLEE_SECRET_KEY
    
    console.log('📊 Using credentials:', {
      spaceId: spaceId,
      userId: userId,
      secretKeyLength: secretKey?.length
    })
    
    // Create auth
    const authBase64 = Buffer.from(`${userId}:${secretKey}`).toString('base64')
    
    // Minimal transaction data
    const transactionData = {
      lineItems: [{
        uniqueId: `test-${Date.now()}`,
        name: 'Test Transaction',
        quantity: 1,
        amountIncludingTax: 95.00,
        type: 'PRODUCT'
      }],
      currency: 'CHF',
      customerId: 'test-customer-123',
      merchantReference: `test-${Date.now()}`,
      language: 'de-CH',
      spaceId: parseInt(spaceId!),
      autoConfirmationEnabled: false, // Einfacher für Test
      customerEmailAddress: 'test@drivingteam.ch'
    }
    
    console.log('💳 Transaction data:', JSON.stringify(transactionData, null, 2))
    
    const url = `https://app-wallee.com/api/transaction/create?spaceId=${spaceId}`
    console.log('🌐 API URL:', url)
    
    // Test transaction creation
    const response = await $fetch<any>(url, {
      method: 'POST',
      body: transactionData,
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('✅ Transaction created successfully:', response)
    
    return {
      success: true,
      message: 'Transaction creation working!',
      transactionId: response?.id || 'unknown',
      response: response
    }
    
  } catch (error: any) {
    console.error('❌ Transaction Debug Error:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data,
      stack: error.stack?.split('\n')[0]
    })
    
    // Check specific permission error
    if (error.message?.includes('Permission denied')) {
      console.error('🚨 PERMISSION ISSUE:', {
        errorType: 'Permission denied',
        suggestion: 'User needs Transaction Create permission in the specific space',
        currentSpace: process.env.WALLEE_SPACE_ID
      })
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      errorData: error.data,
      suggestion: error.message?.includes('Permission denied') 
        ? 'Add Transaction Create permission to your Application User in this Space'
        : 'Check Wallee credentials and API format'
    }
  }
})
```

### ./stores/auth.ts

```
// stores/auth.ts
/// <reference types="nuxt" />

import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { User, SupabaseClient, AuthResponse } from '@supabase/supabase-js' // <<< AuthResponse hier hinzufügen!
import type { Ref } from 'vue' 

export const useAuthStore = defineStore('authV2', () => {

  // State
  const user = ref<User | null>(null)
  const userRole = ref<string>('')
  const errorMessage = ref<string | null>(null)
  const loading = ref<boolean>(false)

  // Computed Properties
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => userRole.value === 'admin')
  const isStaff = computed(() => userRole.value === 'staff')
  const isClient = computed(() => userRole.value === 'client')

  /**
   * Initialisiert den Auth-Store. Diese Funktion wird vom Nuxt-Plugin aufgerufen.
   * Sie empfängt den SupabaseClient und den SupabaseUserRef als Argumente,
   * um Composables innerhalb des Stores zu vermeiden.
   */
  const initializeAuthStore = (
    supabaseClient: SupabaseClient,
    supabaseUserRef: Ref<User | null> // Der Ref vom Composable useSupabaseUser
  ) => {
    // Setze den initialen Benutzerwert im Store
    user.value = supabaseUserRef.value;

    // Registriere den onAuthStateChange Listener von Supabase Auth.
    // Dieser wird bei jeder Authentifizierungsänderung (Login, Logout, Session-Refresh) ausgelöst.
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        user.value = session.user as User; // Supabase gibt ein User-Objekt zurück
        // Rufe fetchUserRole auf und übergebe den erhaltenen supabaseClient
        await fetchUserRole(supabaseClient, session.user.id);
      } else {
        // Bei Abmeldung oder fehlender Session den Benutzerstatus zurücksetzen
        user.value = null;
        userRole.value = '';
      }
    });

    // Watcher für den useSupabaseUser Ref von Nuxt.
    // Dies synchronisiert den Benutzerstatus, wenn useSupabaseUser sich ändert.
    // Nur clientseitig ausführen, um SSR-Probleme zu vermeiden.
    if (process.client) {
      watch(supabaseUserRef, async (newUser) => {
        user.value = newUser;
        if (newUser) {
          // Wenn ein neuer Benutzer vorhanden ist, lade seine Rolle
          await fetchUserRole(supabaseClient, newUser.id); // Übergebe den Client
        } else {
          // Benutzer abgemeldet, Rolle zurücksetzen
          userRole.value = '';
        }
      }, { immediate: true }); // Sofort beim Start des Watchers ausführen
    }
  };


  /**
   * Führt den Login-Prozess durch.
   * @param email_val - Die E-Mail-Adresse des Benutzers.
   * @param password_val - Das Passwort des Benutzers.
   * @param supabaseClient - Der Supabase-Client, der für die Authentifizierung verwendet wird.
   */
  const login = async (email_val: string, password_val: string, supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email_val,
        password: password_val,
      })
      if (error) throw error
            // NEU: Wenn Login erfolgreich ist, aktualisiere den User im Store
      if (data.user) {
        user.value = data.user;
        await fetchUserRole(supabaseClient, data.user.id); // NEU: Rolle direkt nach Login laden
      }
      return true
    } catch (err: any) {
      errorMessage.value = err.message || 'Login fehlgeschlagen.'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Führt den Registrierungsprozess durch.
   * @param email_val - Die E-Mail-Adresse des neuen Benutzers.
   * @param password_val - Das Passwort des neuen Benutzers.
   * @param supabaseClient - Der Supabase-Client, der für die Registrierung verwendet wird.
   */
  const register = async (email_val: string, password_val: string, supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      const { error } = await supabaseClient.auth.signUp({
        email: email_val,
        password: password_val,
      })
      if (error) throw error
      return true
    } catch (err: any) {
      errorMessage.value = err.message || 'Registrierung fehlgeschlagen.'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Meldet den Benutzer ab.
   * @param supabaseClient - Der Supabase-Client, der für die Abmeldung verwendet wird.
   */
  const logout = async (supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
      user.value = null
      userRole.value = ''
    } catch (err: any) {
      errorMessage.value = err.message || 'Abmeldung fehlgeschlagen.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Lädt die Rolle des Benutzers aus der 'users'-Tabelle.
   * @param supabaseClient - Der Supabase-Client, der für die Datenbankabfrage verwendet wird.
   * @param userId - Die ID des Benutzers, dessen Rolle geladen werden soll.
   */
  const fetchUserRole = async (supabaseClient: SupabaseClient, userId: string) => {
    // HIER WIRD KEIN useSupabaseClient() MEHR AUFGERUFEN!
    // Stattdessen wird der übergebene 'supabaseClient' verwendet.
    try {
      console.log('DEBUG_FETCH_USER_ROLE: Using passed supabaseClient for role fetch.'); 
      const { data, error } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single<{ role: string }>()

      if (error && error.code !== 'PGRST116') { // PGRST116 = keine Zeile gefunden
        console.error('Fehler beim Laden der Benutzerrolle:', error.message)
        errorMessage.value = 'Konnte Benutzerrolle nicht laden.'
        userRole.value = ''
      } else {
        userRole.value = data?.role || '' // Wenn keine Rolle gefunden, Standard auf leeren String
      }
    } catch (err: any) {
      console.error('Unerwarteter Fehler beim Rollen-Fetch:', err.message)
      errorMessage.value = 'Unbekannter Fehler beim Laden der Rolle.'
      userRole.value = ''
    }
  }

  return {
    user,
    userRole,
    errorMessage,
    loading,
    isLoggedIn,
    isAdmin,
    isStaff,
    isClient,
    login,
    register,
    logout,
    fetchUserRole,
    initializeAuthStore, // Diese Funktion wird vom Nuxt-Plugin aufgerufen
  }
})
```

### ./tailwind.config.js

```
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

```

### ./tsconfig.json

```
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["@types/node"]
  },
  "include": [
    ".nuxt",
    "nuxt.config.ts",
    "**/*.ts",
    "**/*.vue"
  ]
}

```

### ./types/UserProfile.ts

```
// types/UserProfile.ts
export interface UserProfile {
  id: string;
  created_at: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birthdate: string | null;
  street: string | null;
  street_nr: string | null;
  zip: string | null;
  city: string | null;
  is_active: boolean;
  assigned_staff: string | null;
  category: string | null;
}
```

### ./types/eventType.ts

```
// types/eventTypes.ts
export interface EventType {
  code: string
  name: string
  emoji: string
  description?: string
  default_duration_minutes?: number
  default_color?: string
  auto_generate_title?: boolean
  price_per_minute?: number
}
```

### ./types/h3.d.ts

```
// types/h3.d.ts
declare global {
  // Nuxt 3 Server API Global Functions
  function defineEventHandler(handler: (event: any) => any): any
  function readBody(event: any): Promise<any>
  function createError(error: { statusCode: number; statusMessage: string }): never
  function getHeader(event: any, name: string): string | undefined
  function $fetch<T = any>(url: string, options?: any): Promise<T>
}

export {}
```

### ./types/index.ts

```
// types/index.ts (oder eine ähnliche Datei)
// Füge dies zu deinen bestehenden Typen hinzu

export interface Location {
  id: string; // UUID
  created_at: string; // ISO-Datum String
  staff_id: string; // UUID des zugehörigen Fahrlehrers
  name: string; // Name des Ortes, z.B. "Bahnhof Uster", "Meine Garage"
  address: string; // Vollständige Adresse des Ortes
}

// types/index.ts - Neue Datei erstellen
export interface User {
  id: string
  email: string | null  // ✅ Email kann null sein
  role: 'client' | 'staff' | 'admin'
  first_name: string | null
  last_name: string | null
  phone?: string | null
  is_active: boolean
  assigned_staff_id?: string | null
  category?: string | null
  created_at?: string
}

export interface CalendarApi {
  today(): void
  next(): void
  prev(): void
  getDate(): Date
  view: {
    currentStart: Date
  }
}

export interface DashboardState {
  showStaffSettings: boolean
  showCustomers: boolean
  showPendenzen: boolean
  showEinstellungen: boolean
  currentMonth: string
  isTodayActive: boolean
  pendingCount: number
}
```

### ./types/supabase.ts

```
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          end_time: string
          id: string
          is_paid: boolean
          location_id: string
          price_per_minute: number
          staff_id: string
          start_time: string
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          duration_minutes: number
          end_time: string
          id?: string
          is_paid: boolean
          location_id: string
          price_per_minute: number
          staff_id: string
          start_time: string
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          is_paid?: boolean
          location_id?: string
          price_per_minute?: number
          staff_id?: string
          start_time?: string
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          adress: string | null
          created_at: string
          id: string
          name: string
          staff_id: string
        }
        Insert: {
          adress?: string | null
          created_at?: string
          id?: string
          name: string
          staff_id: string
        }
        Update: {
          adress?: string | null
          created_at?: string
          id?: string
          name?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          last_updated_at: string
          last_updated_by_user_id: string
          staff_note: string
          staff_rating: number
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          last_updated_at?: string
          last_updated_by_user_id: string
          staff_note?: string
          staff_rating: number
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          last_updated_at?: string
          last_updated_by_user_id?: string
          staff_note?: string
          staff_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_categories: {
        Row: {
          category_id: number | null
          created_at: string
          id: number
          teacher_id: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          id?: number
          teacher_id: string
        }
        Update: {
          category_id?: number | null
          created_at?: string
          id?: number
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_categories_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          assigned_staff_id: string | null
          birthdate: string | null
          category: string | null
          city: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          lernfahrausweis_url: string | null
          payment_provider_customer_id: string | null
          phone: string
          role: string
          street: string | null
          street_nr: string | null
          zip: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          birthdate?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          lernfahrausweis_url?: string | null
          payment_provider_customer_id?: string | null
          phone: string
          role?: string
          street?: string | null
          street_nr?: string | null
          zip?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          birthdate?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          lernfahrausweis_url?: string | null
          payment_provider_customer_id?: string | null
          phone?: string
          role?: string
          street?: string | null
          street_nr?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

```

### ./types/wallee.ts

```
// types/wallee.ts
export interface WalleeTransactionResult {
  success: boolean
  error: string
  transactionId?: string
  paymentUrl?: string
}

export interface WalleeConnectionResult {
  success: boolean
  error: string
  spaceId?: string
  connected?: boolean
}

export interface WalleeService {
  createTransaction: () => Promise<WalleeTransactionResult>
  testSpaceConnection: () => Promise<WalleeConnectionResult>
}

// Erweitere die Nuxt App Types
declare module '#app' {
  interface NuxtApp {
    $wallee: WalleeService
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $wallee: WalleeService
  }
}

export interface WalleeConfig {
  spaceId: number
  userId: number
  apiSecret: string
  environment: 'test' | 'live'
}

export interface PaymentData {
  id: string
  category: string
  totalAmount: number
  userId: string
  userEmail: string
  firstName: string
  lastName: string
  duration: number
}

export interface WalleeResponse {
  success: boolean
  error?: string
  statusCode?: number
  transactionId?: string
  paymentPageUrl?: string
}
```

### ./utils/dateUtils.ts

```
// utils/dateUtils.ts

// Beispiel für eine Funktion, die du bereits hast und korrekt exportieren könntest
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

// Beispiel für formatTime
export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 06:33
  return new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
};

// Hier müssen formatDateTime, formatDateShort und formatTimeShort hinzugefügt werden,
// falls sie noch nicht vorhanden sind, und mit 'export' versehen werden.

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025 06:33
  return new Intl.DateTimeFormat('de-CH', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  }).format(date);
};

// Diese beiden sind entscheidend für deinen Fehler:
export const formatDateShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatTimeShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 06:33
  return new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
};
```

### ./utils/supabase.ts

```
// utils/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      'https://unyjaetebnaexaflpyoc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
    )
  }
  return supabaseInstance
}

export default getSupabase
```

### ./utils/walleeService.ts

```
// utils/walleeService.ts
interface WalleeConfig {
  spaceId?: string
  userId?: string
  apiSecret?: string
}

interface WalleeTransactionResult {
  success: boolean
  error: string | null
  transactionId?: string
  paymentUrl?: string
}

interface WalleeConnectionResult {
  success: boolean
  error: string | null
  connected?: boolean
  spaceId?: string
}

export class WalleeService {
  private config: WalleeConfig

  constructor(config: WalleeConfig) {
    this.config = config
  }

  async createTransaction(amount: number, currency: string = 'CHF'): Promise<WalleeTransactionResult> {
    try {
      console.log('🔄 Wallee: Creating transaction...', { amount, currency })
      
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Wallee not configured properly'
        }
      }

      // TODO: Implement real Wallee API call
      // For now, return mock data
      await this.delay(1000) // Simulate API call
      
      return {
        success: true,
        transactionId: `txn_${Date.now()}`,
        paymentUrl: `https://checkout.wallee.com/payment/${Date.now()}`,
        error: null
      }
    } catch (error: any) {
      console.error('❌ Wallee Transaction Error:', error)
      return {
        success: false,
        error: error.message || 'Transaction creation failed'
      }
    }
  }

  async testConnection(): Promise<WalleeConnectionResult> {
    try {
      console.log('🔄 Testing Wallee connection...')
      
      if (!this.isConfigured()) {
        return {
          success: false,
          connected: false,
          error: 'Wallee not configured properly'
        }
      }

      // TODO: Implement real connection test
      await this.delay(500) // Simulate API call
      
      return {
        success: true,
        connected: true,
        spaceId: this.config.spaceId,
        error: null
      }
    } catch (error: any) {
      console.error('❌ Wallee Connection Error:', error)
      return {
        success: false,
        connected: false,
        error: error.message || 'Connection test failed'
      }
    }
  }

  private isConfigured(): boolean {
    return !!(this.config.spaceId && this.config.userId)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Static factory method für einfache Erstellung
  static create(config: WalleeConfig): WalleeService {
    return new WalleeService(config)
  }
}
```

