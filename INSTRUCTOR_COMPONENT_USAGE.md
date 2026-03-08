# 👨‍🏫 Instructor Profile Component - Usage Guide

## Overview

Die neue `InstructorProfileSection.vue` Component zeigt die Fahrlehrerinnen & Fahrlehrer für eine Location mit schönen visuellen Cards.

---

## 📋 Component Props

```typescript
interface Instructor {
  id: string                  // Unique identifier
  name: string              // Full name
  title: string             // Job title (e.g., "Auto & Motorrad Fahrlehrer")
  bio: string               // 2-3 sentences biography
  image?: string            // URL to instructor photo (optional, fallback to emoji)
  yearsExperience: number   // Years of experience
  specialties: string[]     // Array of specialties
  teachingStyle: string     // Personal teaching philosophy
  lessonsGiven: number      // Total lessons given (approximated)
  successRate: number       // Pass rate percentage (e.g., 92)
  languages: string[]       // Languages spoken
}
```

---

## 🚀 HOW TO USE

### Example 1: On `/fahrschule-zuerich/` page

```vue
<template>
  <div>
    <!-- Other sections... -->
    
    <!-- Instructor Section -->
    <InstructorProfileSection :instructors="instructors" />
    
    <!-- More sections... -->
  </div>
</template>

<script setup lang="ts">
import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

const instructors = getInstructorsByLocation('zuerich')
</script>
```

### Example 2: On `/fahrschule-lachen/` page

```vue
<script setup lang="ts">
import { getInstructorsByLocation } from '~/instructor-data'

const instructors = getInstructorsByLocation('lachen')
</script>
```

### Example 3: Show all instructors on dedicated page

```vue
<script setup lang="ts">
import { getAllInstructors } from '~/instructor-data'

const instructors = getAllInstructors()
</script>
```

---

## 📍 Available Locations

The `instructor-data.ts` file includes instructors for these locations:

- ✅ `zuerich` - 2 instructors (Pascal, Vito)
- ✅ `lachen` - 2 instructors (Marc, Sybille)
- ✅ `uster` - 1 instructor (Keni)
- ✅ `stgallen` - 1 instructor (André)
- ✅ `dietikon` - 1 instructor (Samuel)
- ✅ `aargau` - 1 instructor (Rijad)
- ✅ `reichenburg` - 1 instructor (Peter)

---

## 🎨 Component Features

✅ **Responsive Grid Layout**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns

✅ **Visual Elements**
- Instructor photo with hover zoom effect
- Years of experience badge
- Specialty tags with checkmarks
- Teaching philosophy quote
- Language list
- Stats (lessons given, success rate)

✅ **Interactive**
- Hover effects on cards
- "Mit [Name] fahren" call-to-action button

✅ **SEO Optimized**
- Proper alt text on images
- Semantic HTML structure
- Schema markup ready (can be added)

---

## 📸 Image Handling

### Option 1: Upload real instructor photos to:
```
/public/images/instructors/[name].jpg
```

Example:
```
/public/images/instructors/pascal-mueller.jpg
/public/images/instructors/vito-rossi.jpg
/public/images/instructors/marc-keller.jpg
```

### Option 2: Use placeholder emoji
If `image` is not provided or URL is broken, component falls back to emoji (👨‍🏫)

---

## 🔧 Customization

### Add new instructor:

Edit `instructor-data.ts`:

```typescript
export const instructorData = {
  zuerich: [
    // ... existing instructors
    {
      id: 'new-instructor-id',
      name: 'Max Mustermann',
      title: 'Auto Fahrlehrer',
      bio: 'Max hat 5 Jahre Erfahrung...',
      image: '/images/instructors/max-mustermann.jpg',
      yearsExperience: 5,
      specialties: ['Auto (Kategorie B)'],
      teachingStyle: 'Fokussiert auf Sicherheit und Vertrauen',
      lessonsGiven: 3000,
      successRate: 88,
      languages: ['Deutsch', 'Englisch']
    }
  ]
}
```

### Customize styling:

Edit `InstructorProfileSection.vue` - modify classes in the template:

```vue
<!-- Example: Change card shadow -->
<div class="group bg-white rounded-2xl shadow-lg hover:shadow-2xl ...">
  <!-- shadow-lg and hover:shadow-2xl can be adjusted -->
</div>
```

---

## 📊 SEO Integration

### Option 1: Add Person Schema (Recommended)

```typescript
// In the component script, add:
import { useHead } from '#app'

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  'name': instructor.name,
  'jobTitle': instructor.title,
  'description': instructor.bio,
  'image': instructor.image,
  'knowsAbout': instructor.specialties
}

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify(personSchema)
  }]
})
```

### Option 2: Team schema on page level

```typescript
// On the page, add Team schema markup
{
  "@context": "https://schema.org",
  "@type": "Team",
  "name": "Driving Team Zürich",
  "member": [
    // Array of Person objects
  ]
}
```

---

## 🎯 Implementation Order

1. ✅ Component created: `InstructorProfileSection.vue`
2. ✅ Data file created: `instructor-data.ts`
3. ⏳ **TODO:** Add component to `/fahrschule-zuerich/` page
4. ⏳ **TODO:** Add component to other location pages
5. ⏳ **TODO:** Upload real instructor photos
6. ⏳ **TODO:** Add Person schema markup
7. ⏳ **TODO:** Test and optimize

---

## 📱 Mobile Responsiveness

Component is fully responsive:

```
Mobile (< 768px):   1 column
Tablet (768-1024px): 2 columns
Desktop (> 1024px):  3 columns
```

Cards automatically stack and scale based on viewport width.

---

## 🚀 Next Steps

1. Add instructors photos to `/public/images/instructors/`
2. Import component on location pages
3. Pass instructor data from `instructor-data.ts`
4. Add Person schema markup for SEO
5. Update CTA buttons to link to booking system

---

**Created:** 08. März 2026  
**Component Status:** ✅ Ready to use  
**Next Priority:** Add to location pages
