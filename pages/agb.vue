<!-- pages/agb.vue – Allgemeine Geschäftsbedingungen Simy SaaS -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div class="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div class="flex items-center gap-3 mb-4">
          <NuxtLink to="/" class="text-blue-200 hover:text-white text-sm transition-colors">← Zurück</NuxtLink>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold mb-2">Allgemeine Geschäftsbedingungen</h1>
        <p class="text-blue-200 text-sm">Simy – SaaS-Plattform für Fahrschulen | Stand: 1. April 2026 · Version 1.1</p>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-10 sm:py-14">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-10 text-sm sm:text-base leading-relaxed text-gray-700">

        <!-- Inhaltsverzeichnis -->
        <nav class="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Inhaltsverzeichnis</p>
          <ol class="space-y-1.5 text-sm text-blue-600 columns-2">
            <li><a href="#s1" class="hover:underline">1. Geltungsbereich und Vertragsparteien</a></li>
            <li><a href="#s2" class="hover:underline">2. Leistungsbeschreibung</a></li>
            <li><a href="#s3" class="hover:underline">3. Abonnement, Preise und Zahlung</a></li>
            <li><a href="#s4" class="hover:underline">4. Verfügbarkeit (SLA)</a></li>
            <li><a href="#s5" class="hover:underline">5. Nutzungsrechte und geistiges Eigentum</a></li>
            <li><a href="#s6" class="hover:underline">6. Hochgeladene Inhalte</a></li>
            <li><a href="#s7" class="hover:underline">7. Datenschutz und Auftragsverarbeitung</a></li>
            <li><a href="#s8" class="hover:underline">8. Pflichten des Kunden</a></li>
            <li><a href="#s9" class="hover:underline">9. Empfehlungsprogramm und Guthaben</a></li>
            <li><a href="#s10" class="hover:underline">10. Wechselrecht und Datenexport</a></li>
            <li><a href="#s11" class="hover:underline">11. Haftungsbeschränkung</a></li>
            <li><a href="#s12" class="hover:underline">12. Vertragsdauer und Kündigung</a></li>
            <li><a href="#s13" class="hover:underline">13. Änderungen der AGB</a></li>
            <li><a href="#s14" class="hover:underline">14. Anwendbares Recht und Gerichtsstand</a></li>
            <li><a href="#s15" class="hover:underline">15. Vertraulichkeit</a></li>
            <li><a href="#s16" class="hover:underline">16. Schlussbestimmungen</a></li>
          </ol>
        </nav>

        <!-- §1 -->
        <section id="s1">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">1. Geltungsbereich und Vertragsparteien</h2>
          <p class="mb-3">Diese Allgemeinen Geschäftsbedingungen («AGB») gelten für alle Verträge zwischen der <strong>Driving Team Zürich GmbH</strong>, Baslerstrasse 145, 8048 Zürich, Schweiz («Simy», «wir», «uns») und gewerblichen Kunden («Kunde», «Tenant»), die die Simy-SaaS-Plattform nutzen.</p>
          <p class="mb-3">Diese AGB gelten ausschliesslich für Unternehmen, Fahrschulen und andere gewerbliche Nutzer (B2B). Verbraucher im Sinne des Konsumentenrechts sind von der Nutzung ausgeschlossen.</p>
          <p class="mb-3">Die Nutzung der Plattform setzt voraus, dass der Kunde ein rechtmässig betriebenes Fahrschulunternehmen oder ein verwandtes Gewerbe führt. Simy behält sich vor, die Registrierung ohne Angabe von Gründen abzulehnen oder zu widerrufen, insbesondere wenn begründeter Verdacht auf fehlende Gewerbsberechtigung, Missbrauch oder Verstoss gegen diese AGB besteht.</p>
          <p>Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.</p>
        </section>

        <!-- §2 -->
        <section id="s2">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">2. Leistungsbeschreibung</h2>
          <p class="mb-3">Simy stellt dem Kunden über das Internet eine webbasierte Verwaltungssoftware für Fahrschulen bereit («Plattform»). Die Plattform umfasst im Wesentlichen:</p>
          <ul class="list-disc pl-5 space-y-1.5 mb-3">
            <li>Verwaltung von Fahrstunden und Terminen</li>
            <li>Schülerverwaltung (Stammdaten, Lernfortschritt, Kategorien)</li>
            <li>Rechnungsstellung und Zahlungsverwaltung</li>
            <li>Fahrlehrer-Verwaltung und Einladungssystem</li>
            <li>Standort- und Kategorien-Verwaltung</li>
            <li>Bewertungen und Lernfortschritts-Tracking</li>
          </ul>
          <p class="mb-3">Der konkrete Leistungsumfang richtet sich nach dem jeweils gebuchten Abonnement-Plan. Simy behält sich vor, den Leistungsumfang im Rahmen der technischen Weiterentwicklung zu erweitern oder anzupassen, ohne den vereinbarten Kernfunktionsumfang wesentlich einzuschränken.</p>
          <p>Simy erbringt keine Leistungen, die eine Zulassung als Finanzintermediär erfordern. Zahlungsabwicklungen erfolgen ausschliesslich über den zertifizierten Drittanbieter Wallee Group AG (PCI DSS Level 1).</p>
        </section>

        <!-- §3 -->
        <section id="s3">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">3. Abonnement, Preise und Zahlung</h2>
          <p class="mb-3">Die Nutzung der Plattform erfolgt auf Abonnementbasis. Die aktuell gültigen Preise sind auf der Simy-Website veröffentlicht. Alle Preise verstehen sich in Schweizer Franken (CHF) zuzüglich allfälliger Mehrwertsteuer.</p>
          <p class="mb-3">Die Abonnementgebühr wird monatlich oder jährlich im Voraus in Rechnung gestellt. Bei Zahlung per SEPA-Lastschrift oder Kreditkarte erfolgt der Einzug automatisch zum Abrechnungstermin.</p>
          <p class="mb-3">Jeder Tenant ist selbst für die ordnungsgemässe Erfassung, den Einbehalt und die Abführung der auf seine Umsätze anfallenden Steuern (insbesondere MWST) an die zuständigen Steuerbehörden verantwortlich. Simy übernimmt hierfür keine Haftung.</p>
          <p class="mb-3">Bei Zahlungsverzug von mehr als 14 Tagen ist Simy berechtigt, den Zugang zur Plattform zu sperren, bis der ausstehende Betrag beglichen ist. Bei einem Verzug von mehr als 60 Tagen ist Simy berechtigt, das Vertragsverhältnis ausserordentlich zu kündigen.</p>
          <p class="mb-3">Preisanpassungen werden dem Kunden mindestens <strong>30 Tage im Voraus</strong> per E-Mail mitgeteilt. Bei wesentlichen Preiserhöhungen (mehr als 10 %) hat der Kunde ein ausserordentliches Kündigungsrecht mit 14-tägiger Frist.</p>
          <p class="mb-3">Bei Zahlungsverzug werden Mahnschreiben versendet. Pro Mahnschreiben wird eine Bearbeitungsgebühr von <strong>CHF 20.00</strong> erhoben. Der Verzugszins beträgt <strong>5 % p.a.</strong> ab Fälligkeitsdatum. Mahnschreiben werden im Abstand von mindestens 10 Tagen verschickt.</p>
          <p>Eine Verrechnung von Forderungen des Kunden gegenüber Forderungen von Simy ist ausgeschlossen, sofern die Gegenforderung nicht rechtskräftig festgestellt oder von Simy schriftlich anerkannt wurde.</p>
        </section>

        <!-- §4 -->
        <section id="s4">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">4. Verfügbarkeit (SLA)</h2>
          <p class="mb-3">Simy strebt eine monatliche Verfügbarkeit der Plattform von <strong>99,0 %</strong> an, gemessen auf monatlicher Basis, exklusive geplanter Wartungsfenster.</p>
          <p class="mb-3">Geplante Wartungsarbeiten werden mindestens 48 Stunden im Voraus per E-Mail oder In-App-Benachrichtigung angekündigt und finden bevorzugt ausserhalb der üblichen Geschäftszeiten (Sonntag 02:00–06:00 Uhr MEZ) statt.</p>
          <p class="mb-3">Simy haftet nicht für Ausfälle oder Störungen, die durch Drittanbieter (Hosting-Provider, Zahlungsanbieter, Mobilfunknetze), höhere Gewalt, unsachgemässe Nutzung oder von Simy nicht zu vertretende Umstände verursacht werden.</p>
          <p>Für den Fall, dass die vereinbarte Verfügbarkeit unterschritten wird, kann der Kunde eine anteilige Gutschrift auf die nächste Rechnung beantragen. Ein Recht auf Schadensersatz ist damit nicht verbunden, sofern die Unterschreitung nicht auf grobem Verschulden von Simy beruht.</p>
        </section>

        <!-- §5 -->
        <section id="s5">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">5. Nutzungsrechte und geistiges Eigentum</h2>
          <p class="mb-3">Simy räumt dem Kunden für die Dauer des Abonnements ein nicht-exklusives, nicht übertragbares Recht zur Nutzung der Plattform über das Internet ein. Eine Unterlizenzierung oder Weitergabe an Dritte ist untersagt.</p>
          <p class="mb-3">Alle Rechte an der Plattform, der Software, dem Design und den Marken verbleiben bei Simy. Der Kunde erhält kein Recht auf den Quellcode.</p>
          <p class="mb-3"><strong>Kundendaten</strong> (Schülerdaten, Buchungen, Dokumente, Einstellungen) bleiben vollständig im Eigentum des Kunden. Simy erhebt keinerlei Eigentumsansprüche an diesen Daten.</p>
          <p>Simy ist berechtigt, anonymisierte, aggregierte Nutzungsstatistiken zur Produktverbesserung zu verwenden, sofern keine Rückschlüsse auf einzelne Kunden oder deren Endkunden möglich sind.</p>
        </section>

        <!-- §6 NEU: Hochgeladene Inhalte -->
        <section id="s6">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">6. Hochgeladene Inhalte</h2>
          <p class="mb-3">Der Kunde kann über die Plattform Inhalte hochladen, insbesondere Logos, Profilbilder, Dokumente und sonstige Dateien («Kundeninhalte»). Mit dem Hochladen erklärt der Kunde:</p>
          <ul class="list-disc pl-5 space-y-1.5 mb-3">
            <li>Er ist Inhaber der erforderlichen Urheberrechte und sonstigen Schutzrechte an den Kundeninhalten, oder verfügt über die entsprechenden Nutzungsrechte.</li>
            <li>Die Kundeninhalte verletzen keine Rechte Dritter (Urheberrecht, Persönlichkeitsrechte, Markenrecht).</li>
            <li>Die Kundeninhalte enthalten keine Schadsoftware, illegale, beleidigende oder pornografische Inhalte.</li>
          </ul>
          <p class="mb-3">Simy verwendet Kundeninhalte ausschliesslich zur Bereitstellung der Plattform für den jeweiligen Kunden. Eine Nutzung für Marketing, Werbematerial oder Weitergabe an Dritte erfolgt nicht ohne ausdrückliche schriftliche Einwilligung des Kunden.</p>
          <p class="mb-3">Simy ist berechtigt, Kundeninhalte, die gegen diese Bestimmungen verstossen, ohne Vorankündigung zu entfernen. Der Kunde trägt die volle rechtliche Verantwortung für hochgeladene Inhalte und stellt Simy von Ansprüchen Dritter frei, die aus der Nutzung dieser Inhalte entstehen.</p>
          <p>Nach Vertragsende werden alle hochgeladenen Kundeninhalte innerhalb der 30-tägigen Übergangsphase mit den übrigen Kundendaten gelöscht.</p>
        </section>

        <!-- §7 (war §6) -->
        <section id="s7">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">7. Datenschutz und Auftragsverarbeitung</h2>
          <p class="mb-3">Soweit der Kunde über die Plattform Personendaten (insbesondere Schülerdaten) verarbeitet, handelt Simy als <strong>Auftragsverarbeiter</strong> im Sinne des Schweizer Datenschutzgesetzes (nDSG) und der EU-Datenschutz-Grundverordnung (DSGVO). Der Kunde ist in diesem Verhältnis der <strong>Verantwortliche</strong>.</p>
          <p class="mb-3">Mit der Registrierung und Akzeptanz dieser AGB stimmt der Kunde dem <strong>Auftragsverarbeitungsvertrag (AVV)</strong> zu, der integraler Bestandteil dieser AGB ist und unter <NuxtLink to="/avv" class="text-blue-600 hover:underline">simy.ch/avv</NuxtLink> abrufbar ist.</p>
          <p>Für die Verarbeitung von Daten im Rahmen der eigenen Plattform-Administration (Admin-Accounts, Rechnungsdaten) ist Simy selbst Verantwortlicher. Näheres regelt die <NuxtLink to="/datenschutz" class="text-blue-600 hover:underline">Datenschutzerklärung</NuxtLink>.</p>
        </section>

        <!-- §8 (war §7, erweitert) -->
        <section id="s8">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">8. Pflichten des Kunden</h2>
          <p class="mb-3">Der Kunde ist verantwortlich für:</p>
          <ul class="list-disc pl-5 space-y-1.5 mb-3">
            <li>Die rechtmässige Erhebung und Verarbeitung der Daten seiner Schüler und Mitarbeiter (Einholung erforderlicher Einwilligungen, Bereitstellung einer eigenen Datenschutzerklärung gegenüber seinen Endkunden)</li>
            <li>Die Geheimhaltung von Zugangsdaten; bei Kompromittierung ist Simy unverzüglich zu benachrichtigen. Das Benutzerkonto ist persönlich und nicht auf Dritte übertragbar.</li>
            <li>Die Richtigkeit der bei der Registrierung und im laufenden Betrieb angegebenen Daten</li>
            <li>Die Einhaltung aller geltenden Gesetze, insbesondere des Strassenverkehrsrechts, der Berufszulassungsvorschriften für Fahrlehrer sowie des Datenschutzrechts</li>
          </ul>

          <h3 class="font-semibold text-gray-800 mt-4 mb-2">Kommunikation (SMS / E-Mail)</h3>
          <p class="mb-3">Mit der Registrierung auf der Plattform erklärt der Kunde und erklären eingeladene Mitarbeiter sich einverstanden, dass ihnen als Teil des normalen Plattformbetriebs transaktionale Mitteilungen per E-Mail und SMS zugestellt werden (z. B. Einladungen, Erinnerungen, Sicherheitscodes). Der Empfang transaktionaler Nachrichten ist für den Betrieb des Accounts erforderlich und kann nicht vollständig abgemeldet werden. Marketingkommunikation wird separat mit ausdrücklicher Einwilligung versendet und kann jederzeit widerrufen werden.</p>

          <h3 class="font-semibold text-gray-800 mt-4 mb-2">Unzulässige Nutzung und Sperrungsgründe</h3>
          <p class="mb-3">Simy ist berechtigt, den Zugang zur Plattform mit sofortiger Wirkung zu sperren und/oder das Vertragsverhältnis ausserordentlich zu kündigen, wenn begründeter Verdacht auf eine der folgenden Handlungen besteht:</p>
          <ul class="list-disc pl-5 space-y-1.5">
            <li>Betrug, Identitätstäuschung oder Missbrauch der Plattform</li>
            <li>Verarbeitung von Daten zu rechtswidrigen Zwecken</li>
            <li>Verletzung von Schutzrechten Dritter (Urheberrecht, Markenrecht, Persönlichkeitsrechte)</li>
            <li>Verbreitung von Schadsoftware, Spam oder unerwünschten Massennachrichten über die Plattform</li>
            <li>Diskriminierung, Belästigung oder Bedrohung anderer Nutzer oder von Simy-Mitarbeitenden</li>
            <li>Weiterverkauf oder Untervermietung des Plattformzugangs an Dritte</li>
            <li>Nutzung der Plattform durch eine Person, die nicht über die erforderliche Fahrlehrer-Qualifikation (eidg. Fachausweis oder gleichwertig) verfügt, sofern dies Voraussetzung für die beantragte Dienstleistungserbringung ist</li>
          </ul>
        </section>

        <!-- §9 NEU: Empfehlungsprogramm -->
        <section id="s9">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">9. Empfehlungsprogramm und Guthaben</h2>
          <p class="mb-3">Simy bietet ein Empfehlungsprogramm an, über das aktive Tenants andere Fahrschulen zur Nutzung der Simy-Plattform einladen können. Für erfolgreiche Empfehlungen wird dem empfehlenden Tenant ein <strong>Guthaben auf seinem Simy-Konto</strong> gutgeschrieben.</p>

          <h3 class="font-semibold text-gray-800 mt-4 mb-2">Funktionsweise</h3>
          <ul class="list-disc pl-5 space-y-1.5 mb-3">
            <li>Der empfehlende Tenant erhält einen persönlichen Empfehlungslink oder -code über die Plattform.</li>
            <li>Das Guthaben wird gutgeschrieben, sobald die empfohlene Fahrschule einen kostenpflichtigen Abonnement-Plan aktiviert und die erste Abonnementgebühr vollständig bezahlt hat.</li>
            <li>Die Höhe des Guthabens richtet sich nach dem zum Zeitpunkt der Empfehlung gültigen Programm, das auf der Simy-Website veröffentlicht ist.</li>
          </ul>

          <h3 class="font-semibold text-gray-800 mt-4 mb-2">Nutzung des Guthabens</h3>
          <ul class="list-disc pl-5 space-y-1.5 mb-3">
            <li>Das Guthaben wird automatisch mit der nächsten fälligen Abonnementrechnung des empfehlenden Tenants verrechnet.</li>
            <li>Das Guthaben ist <strong>nicht auf andere Tenants übertragbar</strong> und nicht in bar auszahlbar.</li>
            <li>Nicht verbrauchtes Guthaben verfällt <strong>12 Monate</strong> nach Gutschrift, sofern das Konto aktiv ist; bei Kündigung verfällt verbleibendes Guthaben sofort.</li>
          </ul>

          <h3 class="font-semibold text-gray-800 mt-4 mb-2">Missbrauch und Einschränkungen</h3>
          <ul class="list-disc pl-5 space-y-1.5 mb-3">
            <li>Die Selbstempfehlung (Erstellung mehrerer Konten zur Generierung von Guthaben) ist untersagt und führt zur sofortigen Stornierung des Guthabens sowie ggf. zur Kontosperrung.</li>
            <li>Empfehlungen dürfen nicht über irreführende, spam-artige oder anderweitig unzulässige Kommunikationskanäle verbreitet werden.</li>
            <li>Simy behält sich vor, die Bedingungen des Empfehlungsprogramms jederzeit mit einer Ankündigungsfrist von 14 Tagen anzupassen oder das Programm einzustellen. Bereits gutgeschriebenes Guthaben bleibt davon unberührt.</li>
          </ul>
          <p>Das Empfehlungsprogramm stellt keine Provisionsvereinbarung oder ein dauerhaftes Agenturverhältnis dar. Simy übernimmt keine Haftung für entgangene Guthaben-Gutschriften infolge technischer Fehler, sofern der Fehler nicht auf grobem Verschulden von Simy beruht.</p>
        </section>

        <!-- §10 (war §8) -->
        <section id="s10">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">10. Wechselrecht und Datenexport</h2>
          <p class="mb-3">Im Einklang mit dem EU Data Act (gültig seit 12. September 2025) garantiert Simy dem Kunden folgende Rechte:</p>
          <ul class="list-disc pl-5 space-y-1.5 mb-3">
            <li><strong>Jederzeit-Export:</strong> Der Kunde kann seine Daten jederzeit über die Plattform in maschinenlesbaren Standardformaten (CSV, JSON) exportieren.</li>
            <li><strong>Migrationshilfe:</strong> Nach Kündigung stellt Simy für mindestens <strong>30 Tage</strong> den vollständigen Datenzugang zur Verfügung, um eine Migration zu ermöglichen.</li>
            <li><strong>Keine Ausstiegsgebühren:</strong> Es werden keine zusätzlichen Gebühren für den Datenexport oder die Migration erhoben.</li>
            <li><strong>Maximale Kündigungsfrist:</strong> Die Kündigungsfrist beträgt höchstens 30 Tage zum Monatsende.</li>
          </ul>
          <p>Nach Ablauf der 30-tägigen Übergangsfrist nach Vertragsende werden Kundendaten unwiderruflich gelöscht.</p>
        </section>

        <!-- §11 (war §9) -->
        <section id="s11">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">11. Haftungsbeschränkung</h2>
          <p class="mb-3">Simy haftet für direkte Schäden, die auf eine schuldhafte Pflichtverletzung zurückzuführen sind, bis zu einem Betrag von maximal einer <strong>Jahresabonnementgebühr</strong> des Kunden.</p>
          <p class="mb-3">Für indirekte Schäden, entgangenen Gewinn, Datenverlust (sofern der Kunde keine eigenen Backups erstellt hat), Folgeschäden sowie Schäden infolge von Betriebsunterbrüchen durch Drittanbieter haftet Simy nicht, soweit dies gesetzlich zulässig ist.</p>
          <p>Diese Haftungsbeschränkungen gelten nicht für Schäden aus Vorsatz oder grober Fahrlässigkeit sowie für Personenschäden.</p>
        </section>

        <!-- §12 (war §10) -->
        <section id="s12">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">12. Vertragsdauer und Kündigung</h2>
          <p class="mb-3">Der Vertrag läuft auf unbestimmte Zeit und kann von beiden Parteien mit einer Frist von <strong>30 Tagen zum Monatsende</strong> ordentlich gekündigt werden.</p>
          <p class="mb-3">Bei jährlichen Abonnements verlängert sich der Vertrag automatisch um ein weiteres Jahr, sofern nicht mindestens 30 Tage vor Ablauf des Vertragsjahres schriftlich gekündigt wird.</p>
          <p class="mb-3">Das Recht zur ausserordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt insbesondere vor, wenn der Kunde gegen diese AGB, geltende Gesetze oder die Rechte Dritter verstösst.</p>
          <p>Nach Vertragsende endet das Nutzungsrecht sofort. Simy stellt dem Kunden für 30 Tage einen schreibgeschützten Datenzugang zum Export seiner Daten zur Verfügung. Ein allfällig verbleibendes Guthaben aus dem Empfehlungsprogramm verfällt bei Kündigung.</p>
        </section>

        <!-- §13 (war §11) -->
        <section id="s13">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">13. Änderungen der AGB</h2>
          <p class="mb-3">Simy ist berechtigt, diese AGB mit einer Ankündigungsfrist von mindestens <strong>30 Tagen</strong> per E-Mail zu ändern. Widerspricht der Kunde den neuen AGB nicht innerhalb von 30 Tagen nach Zugang der Mitteilung, gelten die neuen AGB als akzeptiert. Auf diesen Umstand wird in der Änderungsmitteilung ausdrücklich hingewiesen.</p>
          <p>Im Falle eines Widerspruchs ist der Kunde berechtigt, das Vertragsverhältnis zum Zeitpunkt des Inkrafttretens der neuen AGB ohne Kostenfolge ordentlich zu kündigen.</p>
        </section>

        <!-- §14 (war §12) -->
        <section id="s14">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">14. Anwendbares Recht und Gerichtsstand</h2>
          <p class="mb-3">Diese AGB und alle daraus entstehenden Streitigkeiten unterliegen ausschliesslich <strong>Schweizer Recht</strong> unter Ausschluss des UN-Kaufrechts (CISG) und der Kollisionsnormen des IPRG.</p>
          <p>Als ausschliesslicher Erfüllungs- und Gerichtsstand wird <strong>Zürich</strong> vereinbart, soweit nicht durch zwingendes Zivilprozessrecht anders bestimmt.</p>
        </section>

        <!-- §15: Vertraulichkeit -->
        <section id="s15">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">15. Vertraulichkeit</h2>
          <p class="mb-3">Beide Parteien verpflichten sich, alle Informationen, von denen sie im Rahmen des Vertragsverhältnisses Kenntnis erlangen und die nicht allgemein bekannt sind, während und nach Beendigung des Vertrags unbefristet vertraulich zu behandeln und nicht an Dritte weiterzugeben.</p>
          <p class="mb-3">Als vertraulich gelten insbesondere: Geschäftsgeheimnisse, technische Unterlagen, Preiskalkulationen, Systemarchitektur und sonstige nicht öffentliche Informationen der jeweils anderen Partei.</p>
          <p>Diese Vertraulichkeitspflicht gilt nicht für Informationen, die (i) öffentlich bekannt sind oder werden, ohne dass eine Partei dagegen verstossen hat, (ii) der empfangenden Partei bereits vor Vertragsbeginn bekannt waren, oder (iii) aufgrund gesetzlicher oder behördlicher Verpflichtung offengelegt werden müssen. Im letzteren Fall ist die andere Partei soweit rechtlich möglich vorab zu informieren.</p>
        </section>

        <!-- §16: Schlussbestimmungen -->
        <section id="s16">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">16. Schlussbestimmungen</h2>
          <p class="mb-3"><strong>Salvatorische Klausel:</strong> Sollte eine Bestimmung dieser AGB ganz oder teilweise ungültig, nichtig oder nicht durchsetzbar sein oder werden, so berührt dies die Gültigkeit der übrigen Bestimmungen nicht. Die unwirksame Bestimmung wird durch eine wirksame ersetzt, die dem wirtschaftlichen Sinn und Zweck der unwirksamen Bestimmung möglichst nahekommt.</p>
          <p class="mb-3"><strong>Gesamter Vertrag:</strong> Diese AGB, die Datenschutzerklärung und der AVV bilden zusammen den vollständigen Vertrag zwischen Simy und dem Kunden. Mündliche Nebenabreden bestehen nicht.</p>
          <p><strong>Schriftformerfordernis:</strong> Änderungen oder Ergänzungen dieser AGB bedürfen der Schriftform (E-Mail genügt). Dies gilt auch für das Abweichen von diesem Schriftformerfordernis.</p>
        </section>

        <!-- Footer -->
        <div class="pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p>Driving Team Zürich GmbH · Baslerstrasse 145 · 8048 Zürich · Schweiz</p>
          <p class="mt-1">E-Mail: support@simy.ch · Stand: 1. April 2026 · Version 1.2</p>
          <div class="flex gap-4 mt-3">
            <NuxtLink to="/datenschutz" class="text-blue-500 hover:underline">Datenschutz</NuxtLink>
            <NuxtLink to="/avv" class="text-blue-500 hover:underline">Auftragsverarbeitungsvertrag</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'AGB – Allgemeine Geschäftsbedingungen | Simy' })
</script>
