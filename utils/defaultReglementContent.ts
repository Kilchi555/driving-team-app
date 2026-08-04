/**
 * Default customer reglement HTML with multi-industry terminology.
 * FS-specific exam/vehicle clauses only when businessType is driving_school.
 */
import {
  getTerminologyDefaults,
  isDrivingSchoolBusinessType,
  type Terminology,
} from '~/composables/useTerminology'

function termsOrDefault(terms?: Terminology | null, businessType?: string | null): Terminology {
  return terms || getTerminologyDefaults(businessType)
}

export function getDefaultReglementContent(
  reglementType: string,
  businessType?: string | null,
  terms?: Terminology | null,
): string {
  const t = termsOrDefault(terms, businessType)
  const isFs = isDrivingSchoolBusinessType(businessType)

  const contractSubject = isFs
    ? `die Erteilung von ${t.appointmentsPlural} und die Vorbereitung auf die praktische Führerscheinprüfung`
    : `die Erbringung von ${t.appointmentsPlural} gemäss dem vereinbarten Angebot`

  const liabilityExtra = isFs
    ? `
      <h3>3. Fahrzeugschäden</h3>
      <p>Fahrzeugschäden, die während der ${t.appointment} durch den ${t.client} verursacht werden, sind durch ${t.businessNoun} versichert. Eigenanteile oder Selbstbeteiligungen können anfallen.</p>
      
      <h3>4. Personenschäden</h3>
      <p>Personenschäden sind durch die Haftpflichtversicherung abgedeckt. Der ${t.client} ist verpflichtet, sich an die Anweisungen von ${t.staff} zu halten.</p>
    `
    : `
      <h3>3. Sorgfaltspflicht</h3>
      <p>Der ${t.client} ist verpflichtet, den Anweisungen von ${t.staff} Folge zu leisten und die vereinbarten Rahmenbedingungen einzuhalten.</p>
    `

  const defaults: Record<string, string> = {
    datenschutz: `
      <h2>Datenschutzerklärung</h2>
      <p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Diese Datenschutzerklärung informiert Sie über die Art, den Umfang und Zweck der Verarbeitung von personenbezogenen Daten.</p>
      
      <h3>1. Verantwortliche Stelle</h3>
      <p>Die verantwortliche Stelle für die Datenverarbeitung ist ${t.businessNoun}, bei der Sie Ihre ${t.appointmentsPlural} buchen.</p>
      
      <h3>2. Erhebung und Speicherung personenbezogener Daten</h3>
      <p>Wir erheben und speichern folgende personenbezogene Daten:</p>
      <ul>
        <li>Name, Vorname</li>
        <li>E-Mail-Adresse</li>
        <li>Telefonnummer</li>
        <li>Adresse</li>
        <li>Termindaten</li>
        <li>Zahlungsdaten (verschlüsselt)</li>
      </ul>
      
      <h3>3. Zweck der Datenverarbeitung</h3>
      <p>Ihre Daten werden verwendet für:</p>
      <ul>
        <li>Terminplanung und -verwaltung</li>
        <li>Kommunikation bezüglich Ihrer ${t.appointmentsPlural}</li>
        <li>Abrechnung und Zahlungsabwicklung</li>
        <li>Erfüllung gesetzlicher Bestimmungen</li>
      </ul>
      
      <h3>4. Datenweitergabe</h3>
      <p>Ihre Daten werden nicht an Dritte weitergegeben, außer es ist gesetzlich vorgeschrieben oder für die Erfüllung unserer Dienstleistungen notwendig.</p>
      
      <h3>5. Ihre Rechte</h3>
      <p>Sie haben das Recht auf:</p>
      <ul>
        <li>Auskunft über Ihre gespeicherten Daten</li>
        <li>Berichtigung unrichtiger Daten</li>
        <li>Löschung Ihrer Daten</li>
        <li>Einschränkung der Verarbeitung</li>
        <li>Widerspruch gegen die Verarbeitung</li>
      </ul>
    `,
    nutzungsbedingungen: `
      <h2>Nutzungsbedingungen</h2>
      <p>Diese Nutzungsbedingungen regeln die Nutzung unserer Online-Plattform für die Buchung von ${t.appointmentsPlural}.</p>
      
      <h3>1. Geltungsbereich</h3>
      <p>Diese Bedingungen gelten für alle Nutzer unserer Plattform und alle damit verbundenen Dienstleistungen.</p>
      
      <h3>2. Registrierung und Account</h3>
      <p>Für die Nutzung der Plattform ist eine Registrierung erforderlich. Sie sind verpflichtet, wahrheitsgemäße Angaben zu machen und Ihre Zugangsdaten sicher aufzubewahren.</p>
      
      <h3>3. Buchung von ${t.appointmentsPlural}</h3>
      <p>${t.appointmentsPlural} können über die Plattform gebucht werden. Die Buchung ist verbindlich, sobald sie bestätigt wurde.</p>
      
      <h3>4. Stornierungsregeln</h3>
      <p>Stornierungen sind gemäss den geltenden Stornierungsrichtlinien möglich. Details finden Sie in den Allgemeinen Geschäftsbedingungen.</p>
      
      <h3>5. Zahlungsbedingungen</h3>
      <p>Die Zahlung erfolgt gemäss den vereinbarten Zahlungsbedingungen. Bei wiederholten Zahlungsverzögerungen behalten wir uns das Recht vor, weitere Buchungen zu verweigern.</p>
    `,
    agb: `
      <h2>Allgemeine Geschäftsbedingungen (AGB)</h2>
      <p>Diese Allgemeinen Geschäftsbedingungen regeln das Vertragsverhältnis zwischen Ihnen und ${t.businessNoun}.</p>
      
      <h3>1. Vertragsgegenstand</h3>
      <p>Gegenstand des Vertrags ist ${contractSubject}.</p>
      
      <h3>2. Preise und Zahlung</h3>
      <p>Die Preise für ${t.appointmentsPlural} sind auf der Plattform angegeben. Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt gemäss den vereinbarten Zahlungsbedingungen.</p>
      
      <h3>3. Termine und Stornierung</h3>
      <p>Termine müssen mindestens 24 Stunden vorher storniert werden, um Stornogebühren zu vermeiden. Bei späteren Stornierungen können gemäss Stornierungsrichtlinien Gebühren anfallen.</p>
      
      <h3>4. Haftung</h3>
      <p>Die Haftung beschränkt sich auf Vorsatz und grobe Fahrlässigkeit. Weitere Details finden Sie im Haftungsausschluss.</p>
    `,
    haftung: `
      <h2>Haftungsausschluss</h2>
      <p>Diese Haftungsausschlussbestimmungen regeln die Haftung von ${t.businessNoun} für Schäden, die im Zusammenhang mit den ${t.appointmentsPlural} entstehen können.</p>
      
      <h3>1. Allgemeine Haftung</h3>
      <p>${t.businessNoun} haftet nur für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen. Für leichte Fahrlässigkeit haftet ${t.businessNoun} nur bei Verletzung wesentlicher Vertragspflichten.</p>
      ${liabilityExtra}
      <h3>5. Haftung Dritter</h3>
      <p>${t.businessNoun} übernimmt keine Haftung für Schäden Dritter, die nicht auf ein Verschulden zurückzuführen sind.</p>
    `,
    rueckerstattung: `
      <h2>Rückerstattungsrichtlinien</h2>
      <p>Diese Richtlinien regeln die Bedingungen für Rückerstattungen von Zahlungen.</p>
      
      <h3>1. Stornierung durch den ${t.client}</h3>
      <p>Bei Stornierung durch den ${t.client} gelten die Stornierungsrichtlinien. Bereits bezahlte Beträge werden gemäss diesen Richtlinien zurückerstattet, abzüglich eventueller Stornogebühren.</p>
      
      <h3>2. Stornierung durch ${t.businessNoun}</h3>
      <p>Bei Stornierung durch ${t.businessNoun} wird der volle Betrag zurückerstattet.</p>
    `,
  }

  return defaults[reglementType] || '<p>Reglement nicht verfügbar</p>'
}
