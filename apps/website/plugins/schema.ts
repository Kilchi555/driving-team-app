export default defineNuxtPlugin(() => {
  if (process.server) {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'Driving Team',
            description: 'Moderne Fahrschule in Zürich für Auto, Motorrad, Taxi, Lastwagen, Bus und Anhänger Fahrausbildung',
            image: 'https://drivingteam.ch/og-image.jpg',
            url: 'https://drivingteam.ch',
            telephone: '+41 44 431 00 33',
            email: 'info@drivingteam.ch',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Bahnhofstrasse 145',
              addressLocality: 'Zürich',
              postalCode: '8048',
              addressCountry: 'CH'
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: '47.3694',
              longitude: '8.5167'
            },
            areaServed: ['Zürich', 'Lachen', 'Uster', 'Schwyz', 'Zug', 'Aargau', 'Dietikon', 'Reichenburg', 'Einsiedeln', 'St. Gallen'],
            priceRange: 'CHF',
            openingHoursSpecification: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              opens: '08:00',
              closes: '17:00'
            },
            sameAs: [
              'https://www.facebook.com/drivingteam',
              'https://www.instagram.com/drivingteam'
            ],
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '8',
              bestRating: '5',
              worstRating: '1'
            },
            hasOfferingCategory: [
              'Auto Fahrschule',
              'Motorrad Fahrschule',
              'Taxi Fahrschule',
              'Lastwagen Fahrschule',
              'Bus Fahrschule',
              'Anhänger Fahrschule',
              'Motorboot Fahrschule'
            ]
          })
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Wieviele Fahrstunden benötige ich?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Die meisten Auto-Fahrschüler benötigen zwischen 15-30 Fahrlektionen bis zur Fahrprüfung. Mit privaten Lernfahrten können Sie mehr Fahrstunden benötigen. Die genaue Anzahl hängt von Ihrem Lerntempo ab.'
                }
              },
              {
                '@type': 'Question',
                name: 'Wo bietet die Fahrschule Driving Team Fahrstunden an?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Unsere Lokale befinden sich in Zürich-Altstetten und Lachen/SZ. Das Tätigkeitsgebiet erstreckt sich von Zürich bis nach Schwyz, Zug und ins Zürcher Oberland (Uster).'
                }
              }
            ]
          })
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Driving Team',
            url: 'https://drivingteam.ch',
            logo: 'https://drivingteam.ch/logo.png',
            contact: {
              '@type': 'ContactPoint',
              contactType: 'Customer Service',
              telephone: '+41 44 431 00 33',
              email: 'info@drivingteam.ch',
              availableLanguage: 'de'
            }
          })
        }
      ]
    });
  }
});
