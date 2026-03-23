const currentYear = new Date().getFullYear()
const yearsFrom = (startYear: number) => currentYear - startYear
const lessonsFrom = (baseYear: number, baseLessons: number) => baseLessons + (currentYear - baseYear) * 2000

export const instructorData = {
  zuerich: [
    {
      id: 'pascal-zuerich',
      name: 'Pascal Kilchenmann',
      title: 'Auto & Motorrad Fahrlehrer',
      bio: 'Pascal mag keinen Streit und probiert es allen recht zu machen. Probleme gibt es für ihn nicht, nur Lösungen. Seine positive, ausgeglichene und geduldige Art wird sehr geschätzt.',
      image: '/images/team/pascal.webp',
      yearsExperience: yearsFrom(2009),
      specialties: ['Auto Automatik', 'Motorrad'],
      teachingStyle: 'Geduldig, positiv und ausgeglichen. Ich glaube daran, dass Fahren lernen Spass machen kann.',
      lessonsGiven: lessonsFrom(2026, 32000),
      successRate: 85,
      languages: ['Deutsch', 'Englisch']
    },
    {
      id: 'skender-zuerich',
      name: 'Skender Ismajli',
      title: 'Auto & Anhänger Fahrlehrer',
      bio: 'Skender ist durch und durch Familien-Mensch. Seine vier Kinder halten ihn auf Trab und er ist daher immer für einen Spass zu haben. Skenders grosse Freude am Fahren überträgt sich auf seine Fahrschüler.',
      image: '/images/team/skender.webp',
      yearsExperience: yearsFrom(2010),
      specialties: ['Auto Automatik', 'Taxi', 'Anhänger'],
      teachingStyle: 'Fröhlich, motivierend und praktisch. Ich zeige dir nicht nur wie man fährt, sondern auch wie man es geniesst.',
      lessonsGiven: lessonsFrom(2026, 35000),
      successRate: 84,
      languages: ['Deutsch', 'Albanisch']
    },
    {
      id: 'samir-zuerich',
      name: 'Samir',
      title: 'Auto Fahrlehrer',
      bio: 'Samir ist stets gut gelaunt und fröhlich. Mit seiner positiven Art bringt er seine Fahrschüler:innen auf sehr angenehme Art ans Ziel.',
      image: '/images/team/samir.webp',
      yearsExperience: yearsFrom(2022),
      specialties: ['Auto Automatik'],
      teachingStyle: 'Positiv, ermutigend und freundlich. Der Weg zum Führerschein wird bei mir zu einem Abenteuer.',
      lessonsGiven: lessonsFrom(2026, 5500),
      successRate: 83,
      languages: ['Deutsch', 'Englisch']
    }
  ],

  lachen: [
    {
      id: 'marc-lachen',
      name: 'Marc',
      title: 'Auto & Motorboot Fahrlehrer',
      bio: 'Marc ist mit viel Elan, Begeisterung und vollem Einsatz bei der Arbeit und kann so seine Fahrschülerinnen und Fahrschüler zu Höchstleistungen anspornen.',
      image: '/images/team/marc.webp',
      yearsExperience: yearsFrom(2016),
      specialties: ['Auto Automatik', 'Anhänger', 'Taxi', 'Motorboot'],
      teachingStyle: 'Motivierend, energisch und zielorientiert. Mit mir wirst du schneller zum Ziel kommen als du denkst.',
      lessonsGiven: lessonsFrom(2026, 18000),
      successRate: 86,
      languages: ['Deutsch', 'Englisch']
    },
    {
      id: 'peter-lachen',
      name: 'Peter',
      title: 'Lastwagen & Bus Fahrlehrer',
      bio: 'Peter ist ein Ruhepol. Durch seine jahrelange Erfahrung als Lastwagenchauffeur ist Geduld seine grosse Stärke. Es gibt keine Situation, die ihn ins Schwitzen bringt – Humor kommt nie zu kurz.',
      image: '/images/team/peter.webp',
      yearsExperience: yearsFrom(2022),
      specialties: ['Lastwagen', 'Bus', 'Anhänger', 'Auto Automatik'],
      teachingStyle: 'Ruhig, geduldig und mit viel Humor. Ich zeige dir, wie man sicher und professionell fährt.',
      lessonsGiven: lessonsFrom(2026, 11000),
      successRate: 87,
      languages: ['Deutsch']
    },
    {
      id: 'rahel-lachen',
      name: 'Rahel',
      title: 'Auto Fahrlehrerin',
      bio: 'Als Fahrlehrerin und Mutter ist Rahel immer unterwegs. Mit ihrer ausgeglichenen Art bleibt sie dabei jedoch immer gelassen und souverän – diese Ruhe überträgt sie auf ihre Fahrschüler:innen.',
      image: '/images/team/rahel.webp',
      yearsExperience: yearsFrom(2008),
      specialties: ['Auto Automatik'],
      teachingStyle: 'Ruhig, souverän und verständnisvoll. Ich schaffe eine entspannte Atmosphäre zum Lernen.',
      lessonsGiven: lessonsFrom(2026, 23000),
      successRate: 84,
      languages: ['Deutsch']
    }
  ],

  uster: [
    {
      id: 'pascal-uster',
      name: 'Pascal Kilchenmann',
      title: 'Auto & Motorrad Fahrlehrer',
      bio: 'Pascal mag keinen Streit und probiert es allen recht zu machen. Probleme gibt es für ihn nicht, nur Lösungen. Seine positive, ausgeglichene und geduldige Art wird sehr geschätzt.',
      image: '/images/team/pascal.webp',
      yearsExperience: yearsFrom(2009),
      specialties: ['Auto Automatik', 'Motorrad'],
      teachingStyle: 'Geduldig, positiv und ausgeglichen. Ich glaube daran, dass Fahren lernen Spass machen kann.',
      lessonsGiven: lessonsFrom(2026, 32000),
      successRate: 85,
      languages: ['Deutsch', 'Englisch']
    },
  ],

  stgallen: [
    {
      id: 'marc-stgallen',
      name: 'Marc',
      title: 'Auto & Motorboot Fahrlehrer',
      bio: 'Marc ist mit viel Elan, Begeisterung und vollem Einsatz bei der Arbeit und kann so seine Fahrschülerinnen und Fahrschüler zu Höchstleistungen anspornen.',
      image: '/images/team/marc.webp',
      yearsExperience: yearsFrom(2016),
      specialties: ['Auto Automatik', 'Anhänger', 'Taxi', 'Motorboot'],
      teachingStyle: 'Motivierend, energisch und zielorientiert. Mit mir wirst du schneller zum Ziel kommen als du denkst.',
      lessonsGiven: lessonsFrom(2026, 18000),
      successRate: 86,
      languages: ['Deutsch', 'Englisch']
    },
    {
      id: 'peter-stgallen',
      name: 'Peter',
      title: 'Lastwagen & Bus Fahrlehrer',
      bio: 'Peter ist ein Ruhepol. Durch seine jahrelange Erfahrung als Lastwagenchauffeur ist Geduld seine grosse Stärke. Es gibt keine Situation, die ihn ins Schwitzen bringt – Humor kommt nie zu kurz.',
      image: '/images/team/peter.webp',
      yearsExperience: yearsFrom(2022),
      specialties: ['Lastwagen', 'Bus', 'Anhänger', 'Auto Automatik'],
      teachingStyle: 'Ruhig, geduldig und mit viel Humor. Ich zeige dir, wie man sicher und professionell fährt.',
      lessonsGiven: lessonsFrom(2026, 9200),
      successRate: 87,
      languages: ['Deutsch']
    }
  ],

  dietikon: [
    {
      id: 'skender-dietikon',
      name: 'Skender Ismajli',
      title: 'Auto & Anhänger Fahrlehrer',
      bio: 'Skender ist durch und durch Familien-Mensch. Seine vier Kinder halten ihn auf Trab und er ist daher immer für einen Spass zu haben. Skenders grosse Freude am Fahren überträgt sich auf seine Fahrschüler.',
      image: '/images/team/skender.webp',
      yearsExperience: yearsFrom(2010),
      specialties: ['Auto Automatik', 'Taxi', 'Anhänger'],
      teachingStyle: 'Fröhlich, motivierend und praktisch. Ich zeige dir nicht nur wie man fährt, sondern auch wie man es geniesst.',
      lessonsGiven: lessonsFrom(2026, 35000),
      successRate: 84,
      languages: ['Deutsch', 'Albanisch']
    }
  ],

  aargau: [
    {
      id: 'skender-aargau',
      name: 'Skender Ismajli',
      title: 'Auto & Anhänger Fahrlehrer',
      bio: 'Skender ist durch und durch Familien-Mensch. Seine vier Kinder halten ihn auf Trab und er ist daher immer für einen Spass zu haben. Skenders grosse Freude am Fahren überträgt sich auf seine Fahrschüler.',
      image: '/images/team/skender.webp',
      yearsExperience: yearsFrom(2010),
      specialties: ['Auto Automatik', 'Taxi', 'Anhänger'],
      teachingStyle: 'Fröhlich, motivierend und praktisch. Ich zeige dir nicht nur wie man fährt, sondern auch wie man es geniesst.',
      lessonsGiven: lessonsFrom(2026, 35000),
      successRate: 84,
      languages: ['Deutsch', 'Albanisch']
    }
  ],

  reichenburg: [
    {
      id: 'marc-reichenburg',
      name: 'Marc',
      title: 'Auto & Motorboot Fahrlehrer',
      bio: 'Marc ist mit viel Elan, Begeisterung und vollem Einsatz bei der Arbeit und kann so seine Fahrschülerinnen und Fahrschüler zu Höchstleistungen anspornen.',
      image: '/images/team/marc.webp',
      yearsExperience: yearsFrom(2016),
      specialties: ['Auto Automatik', 'Anhänger', 'Taxi', 'Motorboot'],
      teachingStyle: 'Motivierend, energisch und zielorientiert. Mit mir wirst du schneller zum Ziel kommen als du denkst.',
      lessonsGiven: lessonsFrom(2026, 18000),
      successRate: 86,
      languages: ['Deutsch', 'Englisch']
    },
    {
      id: 'peter-reichenburg',
      name: 'Peter',
      title: 'Lastwagen & Bus Fahrlehrer',
      bio: 'Peter ist ein Ruhepol. Durch seine jahrelange Erfahrung als Lastwagenchauffeur ist Geduld seine grosse Stärke. Es gibt keine Situation, die ihn ins Schwitzen bringt – Humor kommt nie zu kurz.',
      image: '/images/team/peter.webp',
      yearsExperience: yearsFrom(2022),
      specialties: ['Lastwagen', 'Bus', 'Anhänger', 'Auto Automatik'],
      teachingStyle: 'Ruhig, geduldig und mit viel Humor. Ich zeige dir, wie man sicher und professionell fährt.',
      lessonsGiven: lessonsFrom(2026, 11000),
      successRate: 87,
      languages: ['Deutsch']
    }
  ],

  pfaeffikon: [
    {
      id: 'marc-pfaeffikon',
      name: 'Marc',
      title: 'Auto & Motorboot Fahrlehrer',
      bio: 'Marc ist mit viel Elan, Begeisterung und vollem Einsatz bei der Arbeit und kann so seine Fahrschülerinnen und Fahrschüler zu Höchstleistungen anspornen.',
      image: '/images/team/marc.webp',
      yearsExperience: yearsFrom(2016),
      specialties: ['Auto Automatik', 'Anhänger', 'Taxi', 'Motorboot'],
      teachingStyle: 'Motivierend, energisch und zielorientiert. Mit mir wirst du schneller zum Ziel kommen als du denkst.',
      lessonsGiven: lessonsFrom(2026, 18000),
      successRate: 86,
      languages: ['Deutsch', 'Englisch']
    },
    {
      id: 'peter-pfaeffikon',
      name: 'Peter',
      title: 'Lastwagen & Bus Fahrlehrer',
      bio: 'Peter ist ein Ruhepol. Durch seine jahrelange Erfahrung als Lastwagenchauffeur ist Geduld seine grosse Stärke. Es gibt keine Situation, die ihn ins Schwitzen bringt – Humor kommt nie zu kurz.',
      image: '/images/team/peter.webp',
      yearsExperience: yearsFrom(2022),
      specialties: ['Lastwagen', 'Bus', 'Anhänger', 'Auto Automatik'],
      teachingStyle: 'Ruhig, geduldig und mit viel Humor. Ich zeige dir, wie man sicher und professionell fährt.',
      lessonsGiven: lessonsFrom(2026, 11000),
      successRate: 87,
      languages: ['Deutsch']
    },
    {
      id: 'rahel-pfaeffikon',
      name: 'Rahel',
      title: 'Auto Fahrlehrerin',
      bio: 'Als Fahrlehrerin und Mutter ist Rahel immer unterwegs. Mit ihrer ausgeglichenen Art bleibt sie dabei jedoch immer gelassen und souverän – diese Ruhe überträgt sie auf ihre Fahrschüler:innen.',
      image: '/images/team/rahel.webp',
      yearsExperience: yearsFrom(2008),
      specialties: ['Auto Automatik'],
      teachingStyle: 'Ruhig, souverän und verständnisvoll. Ich schaffe eine entspannte Atmosphäre zum Lernen.',
      lessonsGiven: lessonsFrom(2026, 23000),
      successRate: 84,
      languages: ['Deutsch']
    }
  ]
}

export const getInstructorsByLocation = (location: keyof typeof instructorData) => {
  return instructorData[location] || []
}

export const getAllInstructors = () => {
  const all: any[] = []
  Object.values(instructorData).forEach(instructors => {
    all.push(...instructors)
  })
  return all
}
