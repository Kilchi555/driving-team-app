const currentYear = new Date().getFullYear()
const yearsFrom = (startYear: number) => currentYear - startYear
const lessonsFrom = (baseYear: number, baseLessons: number) => baseLessons + (currentYear - baseYear) * 2000

export interface Diploma {
  title: string       // e.g. "Eidg. dipl. Fahrlehrer Kat. B"
  category: string    // e.g. "B", "A", "BE", "C", "D", "Boot"
  label?: string      // Override für Badge-Text, z.B. "Mental Coach" statt "Kat. Mental"
  year?: number       // Jahr des Diploms
  image?: string      // Pfad zum Diplom-Scan, z.B. '/images/diplome/pascal-kat-b.webp'
  landscape?: boolean // true für Querformat-Diplome
}

export interface Instructor {
  id: string
  name: string
  title: string
  bio: string
  image?: string
  yearsExperience: number
  specialties: string[]
  teachingStyle: string
  lessonsGiven: number
  successRate: number
  languages: string[]
  diplomas?: Diploma[]
}

export const instructorData: Record<string, Instructor[]> = {
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
      languages: ['Deutsch', 'Englisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2011, image: '/images/diplome/pascal-fachausweis-b.png' },
        { title: 'SFV Zusatzqualifikation Motorradfahrlehrer (Modulabschluss A)', category: 'A-Moto', year: 2019, image: '/images/diplome/pascal-sfv-motorrad.png' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2022, image: '/images/diplome/pascal-sveb-kursleiter.png' },
        { title: 'Dipl. Mentaltrainer – MyMentalCoach Schweiz', category: 'Mental', label: 'Mental Coach', year: 2025, image: '/images/diplome/pascal-mentaltrainer.png', landscape: true },
      ]
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
      languages: ['Deutsch', 'Albanisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2011, image: '/images/diplome/skender-fachausweis-b.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. BE', category: 'BE', image: '' },
      ]
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
      languages: ['Deutsch', 'Englisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', image: '' },
      ]
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
      languages: ['Deutsch', 'Englisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2016, image: '/images/diplome/marc-fachausweis-b.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. BE', category: 'BE', image: '' },
        { title: 'Bootsführerausweis Kat. A', category: 'Boot', image: '' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2023, image: '/images/diplome/marc-sveb-kursleiter.png' },
      ]
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
      languages: ['Deutsch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2021, image: '/images/diplome/peter-fachausweis-b.png' },
        { title: 'L-drive Zusatzqualifikation Lastwagenfahrlehrer (Modulabschluss C)', category: 'C', year: 2023, image: '/images/diplome/peter-ldrive-lastwagen-c.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. D', category: 'D', image: '' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2023, image: '/images/diplome/peter-sveb-kursleiter.png' },
      ]
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
      languages: ['Deutsch'],
      diplomas: [
        { title: 'Eidg. dipl. Fahrlehrerin Kat. B', category: 'B', image: '' },
      ]
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
      languages: ['Deutsch', 'Englisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2011, image: '/images/diplome/pascal-fachausweis-b.png' },
        { title: 'SFV Zusatzqualifikation Motorradfahrlehrer (Modulabschluss A)', category: 'A-Moto', year: 2019, image: '/images/diplome/pascal-sfv-motorrad.png' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2022, image: '/images/diplome/pascal-sveb-kursleiter.png' },
        { title: 'Dipl. Mentaltrainer – MyMentalCoach Schweiz', category: 'Mental', label: 'Mental Coach', year: 2025, image: '/images/diplome/pascal-mentaltrainer.png', landscape: true },
      ]
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
      languages: ['Deutsch', 'Englisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2016, image: '/images/diplome/marc-fachausweis-b.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. BE', category: 'BE', image: '' },
        { title: 'Bootsführerausweis Kat. A', category: 'Boot', image: '' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2023, image: '/images/diplome/marc-sveb-kursleiter.png' },
      ]
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
      languages: ['Deutsch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2021, image: '/images/diplome/peter-fachausweis-b.png' },
        { title: 'L-drive Zusatzqualifikation Lastwagenfahrlehrer (Modulabschluss C)', category: 'C', year: 2023, image: '/images/diplome/peter-ldrive-lastwagen-c.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. D', category: 'D', image: '' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2023, image: '/images/diplome/peter-sveb-kursleiter.png' },
      ]
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
      languages: ['Deutsch', 'Albanisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2011, image: '/images/diplome/skender-fachausweis-b.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. BE', category: 'BE', image: '' },
      ]
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
      languages: ['Deutsch', 'Albanisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2011, image: '/images/diplome/skender-fachausweis-b.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. BE', category: 'BE', image: '' },
      ]
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
      languages: ['Deutsch', 'Englisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2016, image: '/images/diplome/marc-fachausweis-b.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. BE', category: 'BE', image: '' },
        { title: 'Bootsführerausweis Kat. A', category: 'Boot', image: '' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2023, image: '/images/diplome/marc-sveb-kursleiter.png' },
      ]
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
      languages: ['Deutsch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2021, image: '/images/diplome/peter-fachausweis-b.png' },
        { title: 'L-drive Zusatzqualifikation Lastwagenfahrlehrer (Modulabschluss C)', category: 'C', year: 2023, image: '/images/diplome/peter-ldrive-lastwagen-c.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. D', category: 'D', image: '' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2023, image: '/images/diplome/peter-sveb-kursleiter.png' },
      ]
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
      languages: ['Deutsch', 'Englisch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2016, image: '/images/diplome/marc-fachausweis-b.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. BE', category: 'BE', image: '' },
        { title: 'Bootsführerausweis Kat. A', category: 'Boot', image: '' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2023, image: '/images/diplome/marc-sveb-kursleiter.png' },
      ]
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
      languages: ['Deutsch'],
      diplomas: [
        { title: 'Fahrlehrer mit eidgenössischem Fachausweis', category: 'B', year: 2021, image: '/images/diplome/peter-fachausweis-b.png' },
        { title: 'L-drive Zusatzqualifikation Lastwagenfahrlehrer (Modulabschluss C)', category: 'C', year: 2023, image: '/images/diplome/peter-ldrive-lastwagen-c.png' },
        { title: 'Eidg. dipl. Fahrlehrer Kat. D', category: 'D', image: '' },
        { title: 'SVEB Zertifikat Kursleiter/in – Ada FA-M1', category: 'SVEB', year: 2023, image: '/images/diplome/peter-sveb-kursleiter.png' },
      ]
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
      languages: ['Deutsch'],
      diplomas: [
        { title: 'Eidg. dipl. Fahrlehrerin Kat. B', category: 'B', image: '' },
      ]
    }
  ]
}

export const getInstructorsByLocation = (location: keyof typeof instructorData) => {
  return instructorData[location] || []
}

export const getAllInstructors = () => {
  const all: Instructor[] = []
  Object.values(instructorData).forEach(instructors => {
    all.push(...instructors)
  })
  return all
}
