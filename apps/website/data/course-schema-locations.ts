import type { CourseLocationSchema } from '~/utils/build-course-schema'

export const COURSE_SCHEMA_LOCATIONS = {
  zuerichAltstetten: {
    name: 'Zürich-Altstetten',
    streetAddress: 'Vulkanstrasse 130b',
    addressLocality: 'Zürich',
    postalCode: '8048',
    addressRegion: 'ZH',
    addressCountry: 'CH',
  },
  lachen: {
    name: 'Lachen SZ',
    streetAddress: 'Herrengasse 17',
    addressLocality: 'Lachen',
    postalCode: '8853',
    addressRegion: 'SZ',
    addressCountry: 'CH',
  },
  einsiedeln: {
    name: 'Motorradschule Einsiedeln (Bennau)',
    streetAddress: 'Bennauerstrasse 48',
    addressLocality: 'Bennau',
    postalCode: '8836',
    addressRegion: 'SZ',
    addressCountry: 'CH',
  },
  zug: {
    name: 'Motorradschule Zug (Steinhausen)',
    streetAddress: 'Sennweidstrasse 30',
    addressLocality: 'Steinhausen',
    postalCode: '6312',
    addressRegion: 'ZG',
    addressCountry: 'CH',
  },
} satisfies Record<string, CourseLocationSchema>
