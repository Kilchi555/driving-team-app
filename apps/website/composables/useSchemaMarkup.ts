export const useSchemaMarkup = () => {
  const createOrganizationSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Driving Team',
    url: 'https://drivingteam.ch',
    logo: 'https://drivingteam.ch/logo.png',
    description: 'Professionelle Fahrschule in der Schweiz - Auto, Motorrad, Lastwagen, Bus, Taxi, Anhänger, Motorboot Fahrstunden',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      telephone: '+41-44-431-0033',
      email: 'info@drivingteam.ch'
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Gewerbestrasse 10',
      addressLocality: 'Zürich',
      postalCode: '8000',
      addressCountry: 'CH'
    },
    sameAs: [
      'https://www.facebook.com/drivingtea',
      'https://www.instagram.com/drivingtea'
    ]
  })

  const createLocalBusinessSchema = (location: string, city: string, postalCode: string) => ({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `Driving Team ${city}`,
    image: 'https://drivingteam.ch/logo.png',
    description: `Professionelle Fahrschule ${city} - Fahrstunden für alle Kategorien`,
    url: `https://drivingteam.ch/fahrschule-${location}/`,
    telephone: '+41-44-431-0033',
    priceRange: 'CHF 100-150',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Gewerbestrasse 10',
      addressLocality: city,
      postalCode: postalCode,
      addressCountry: 'CH'
    },
    areaServed: city,
    serviceType: ['Auto Fahrschule', 'Motorrad Fahrschule', 'Lastwagen Fahrschule'],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '08:00',
      closes: '18:00'
    }
  })

  const createCourseSchema = (courseData: {
    name: string
    description: string
    category: string
    price: number | string
    duration: string
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: courseData.name,
    description: courseData.description,
    provider: {
      '@type': 'Organization',
      name: 'Driving Team',
      url: 'https://drivingteam.ch'
    },
    offers: {
      '@type': 'Offer',
      price: courseData.price,
      priceCurrency: 'CHF',
      url: 'https://simy.ch/booking/availability/driving-team'
    },
    educationLevel: 'Intermediate',
    learningResourceType: 'Driving Course',
    keywords: `${courseData.category} Fahrschule, ${courseData.category} Fahrstunden, ${courseData.category} Führerschein`
  })

  const createFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  })

  const createBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  })

  const createAggregateRatingSchema = (ratingData: {
    ratingValue: number
    reviewCount: number
    bestRating?: number
    worstRating?: number
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue: ratingData.ratingValue,
    reviewCount: ratingData.reviewCount,
    bestRating: ratingData.bestRating || 5,
    worstRating: ratingData.worstRating || 1
  })

  return {
    createOrganizationSchema,
    createLocalBusinessSchema,
    createCourseSchema,
    createFAQSchema,
    createBreadcrumbSchema,
    createAggregateRatingSchema
  }
}
