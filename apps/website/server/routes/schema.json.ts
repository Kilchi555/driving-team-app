export default defineEventHandler(() => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://drivingteam.ch',
    name: 'Driving Team - Fahrschule Zürich',
    image: 'https://drivingteam.ch/og-image.jpg',
    description: 'Professionelle Fahrschule in Zürich für Auto, Motorrad, Lastwagen und Taxi Fahrausbildung',
    url: 'https://drivingteam.ch',
    telephone: '+41444310033',
    email: 'info@drivingteam.ch',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Hauptstrasse 123',
      addressLocality: 'Zürich',
      addressRegion: 'ZH',
      postalCode: '8000',
      addressCountry: 'CH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 47.3769,
      longitude: 8.5472,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '12:00',
      },
    ],
    priceRange: 'CHF 80 - 300',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
    },
    sameAs: [
      'https://www.facebook.com/drivingteam',
      'https://www.instagram.com/drivingteam',
      'https://www.google.com/search?q=Driving+Team+Fahrschule',
    ],
  }

  setHeader(event, 'Content-Type', 'application/ld+json')
  return schema
})
