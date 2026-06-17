/**
 * SARI SOAP CoursesV3 Client
 * Kyberna AG – ASA SARI Schnittstelle für CZV und Fahrlehrerweiterbildung (FL)
 *
 * Dokumentation: Schnittstelle-SOAP-CoursesV3_Version032021.pdf
 * WSDL: https://www.sari.asa.ch/interface/soap/coursesV2.wsdl
 * Production: https://www.sari.asa.ch/interface/soap/coursesServerV2.php
 *
 * ⚠️ NAMESPACE: Muss nach Erhalt der WSDL von Kyberna überprüft und ggf. angepasst werden.
 * Nach Erhalt der Zugangsdaten: WSDL laden und targetNamespace prüfen.
 */

import { XMLParser } from 'fast-xml-parser'

// ─────────────────────────────────────────────────────────────────────────────
// Konfiguration – nach WSDL-Erhalt anpassen falls nötig
// ─────────────────────────────────────────────────────────────────────────────
const SOAP_ENDPOINTS = {
  test: 'https://www.sari.asa.ch/interface/soap/coursesServerV2.php',
  production: 'https://www.sari.asa.ch/interface/soap/coursesServerV2.php'
} as const

const OAUTH_ENDPOINTS = {
  test: 'https://www.sari.asa.ch/oauth/v2/token',
  production: 'https://www.sari.asa.ch/oauth/v2/token'
} as const

// Namespace aus der WSDL – nach Erhalt der Zugangsdaten prüfen
// Typischerweise steht dieser im WSDL als targetNamespace
const SOAP_NS = 'urn:CoursesServerV2'

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export type SARICzvCourseType = 'CZV' | 'FL' | '2PHASE' | 'MOD' | 'ADR'

export interface SARICoursesV3Config {
  environment: 'test' | 'production'
  clientId: string
  clientSecret: string
  username: string
  password: string
  registrationId: string
}

export interface SARIStatusObject {
  Number: number
  Message: string
  Description: string
}

export interface SARICourseTypeData {
  Name: string
  Description: {
    DE: string
    FR: string
    IT: string
  }
  From: string
  To: string
  MaxMembers: number
}

export interface SARILecturerData {
  FaberId: string
  Name: string
  Prename: string
  Birthdate: string
  SariId: string
  LecturerId: string
}

export interface SARIMemberImport {
  /** 12-stellige Führerausweisnummer (nicht 9-stellige FaberId!) */
  FaberId: string
  Birthdate: string
  Registrationdate: string
}

export interface SARIInstructorImport {
  /** SARI-interne ID (von getLecturers) */
  ID: string
  /** 12-stellige Führerausweisnummer */
  FaberId: string
  IsMaster: boolean
}

export interface SARICourseImport {
  /** Eigene externe Kurs-ID des Kursveranstalters */
  ID: string
  Description: string
  Date: string
  /** Kursdefinition von Kyberna z.B. "WB01234" */
  Type: string
  Location: string
  Address: string
  ZIP: string
  Comment?: string
  Members: SARIMemberImport[]
  Instructors: SARIInstructorImport[]
}

export interface SARIImportResult {
  importedFaberIds: string[]
  warnings: Array<{ Number: number; Description: string }>
  errors: Array<{ Number: number; Description: string }>
}

export interface SARIConfirmationResult {
  faberIds: string[]
  fileExtension: string
  mimeType: string
  isBinary: boolean
  data: string
}

// ─────────────────────────────────────────────────────────────────────────────
// XML Parser
// ─────────────────────────────────────────────────────────────────────────────
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: true,
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
  isArray: (tagName) =>
    ['CourseType', 'Lecturer', 'Member', 'Instructor', 'Error', 'Warning', 'ID'].includes(tagName)
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildEnvelope(methodName: string, bodyContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns="${SOAP_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <ns:${methodName}>
      ${bodyContent}
    </ns:${methodName}>
  </soapenv:Body>
</soapenv:Envelope>`
}

function extractSoapBody(parsed: any): any {
  const envelope =
    parsed['soapenv:Envelope'] ||
    parsed['SOAP-ENV:Envelope'] ||
    parsed['Envelope'] ||
    Object.values(parsed)[0]

  const body =
    envelope?.['soapenv:Body'] ||
    envelope?.['SOAP-ENV:Body'] ||
    envelope?.['Body'] ||
    Object.values(envelope || {})[0]

  const response = Object.values(body || {})[0] as any
  return response
}

function checkStatus(status: any, methodName: string): void {
  if (!status) return
  const num = parseInt(status.Number ?? status.number ?? '0')
  if (num !== 0) {
    throw new Error(
      `SARI ${methodName} Fehler ${num}: ${status.Message || status.message || ''} – ${status.Description || status.description || ''}`
    )
  }
}

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

export class SARICoursesV3Client {
  private config: SARICoursesV3Config
  private soapEndpoint: string
  private oauthEndpoint: string
  private accessToken?: string
  private tokenExpiry?: Date

  constructor(config: SARICoursesV3Config) {
    this.config = config
    this.soapEndpoint = SOAP_ENDPOINTS[config.environment]
    this.oauthEndpoint = OAUTH_ENDPOINTS[config.environment]
  }

  // ─── OAuth2 ───────────────────────────────────────────────────────────────

  async authenticate(): Promise<string> {
    if (
      this.accessToken &&
      this.tokenExpiry &&
      new Date() < new Date(this.tokenExpiry.getTime() - 60000)
    ) {
      return this.accessToken
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'password',
      username: this.config.username,
      password: this.config.password
    })

    const url = `${this.oauthEndpoint}?${params.toString()}`

    const response = await fetch(url, { method: 'GET' })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `SARI CZV/FL OAuth fehlgeschlagen: ${response.statusText} – ${errorText.substring(0, 200)}`
      )
    }

    const data = await response.json()

    if (!data.access_token) {
      throw new Error('Kein Access-Token von SARI CZV/FL erhalten')
    }

    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000)

    return this.accessToken
  }

  // ─── SOAP Request ─────────────────────────────────────────────────────────

  private async soapRequest(methodName: string, bodyXml: string): Promise<any> {
    const token = await this.authenticate()
    const envelope = buildEnvelope(methodName, bodyXml)

    const response = await fetch(this.soapEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${SOAP_NS}#${methodName}"`,
        Authorization: `Bearer ${token}`
      },
      body: envelope
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(
        `SARI SOAP ${methodName} HTTP ${response.status}: ${responseText.substring(0, 300)}`
      )
    }

    const parsed = xmlParser.parse(responseText)
    return extractSoapBody(parsed)
  }

  // ─── 3.3 getVersion ───────────────────────────────────────────────────────

  async getVersion(msg: string = 'test'): Promise<string> {
    const body = `<msg>${msg}</msg>`
    const result = await this.soapRequest('getVersion', body)

    const status = result?.Status || result?.status
    checkStatus(status, 'getVersion')

    return String(result?.Result || result?.result || '')
  }

  // ─── 3.4 getCourseTypes ───────────────────────────────────────────────────

  async getCourseTypes(type: SARICzvCourseType): Promise<SARICourseTypeData[]> {
    const body = `
      <CourseTypesRequest>
        <RegistrationId>${this.config.registrationId}</RegistrationId>
        <Type>${type}</Type>
      </CourseTypesRequest>`

    const result = await this.soapRequest('getCourseTypes', body)

    const status = result?.Status || result?.status
    checkStatus(status, 'getCourseTypes')

    const courseTypes =
      result?.Result?.CourseTypes?.CourseType ||
      result?.result?.CourseTypes?.CourseType ||
      []

    return ensureArray<SARICourseTypeData>(courseTypes).map((ct: any) => ({
      Name: String(ct.Name || ''),
      Description: {
        DE: String(ct.Description?.DE || ''),
        FR: String(ct.Description?.FR || ''),
        IT: String(ct.Description?.IT || '')
      },
      From: String(ct.From || ''),
      To: String(ct.To || ''),
      MaxMembers: parseInt(ct.MaxMembers || '0')
    }))
  }

  // ─── 3.5 getCustomer ──────────────────────────────────────────────────────

  async getCustomer(
    type: SARICzvCourseType,
    faberId: string,
    birthdate: string
  ) {
    const body = `
      <CustomerRequest>
        <RegistrationId>${this.config.registrationId}</RegistrationId>
        <FaberId>${faberId}</FaberId>
        <Birthdate>${birthdate}</Birthdate>
        <Type>${type}</Type>
      </CustomerRequest>`

    const result = await this.soapRequest('getCustomer', body)

    const status = result?.Status || result?.status
    checkStatus(status, 'getCustomer')

    const r = result?.Result || result?.result || {}

    return {
      faberId: String(r.FaberId || ''),
      licenseId: String(r.LicenseId || ''),
      birthdate: String(r.Birthdate || ''),
      name: String(r.Name || ''),
      prename: String(r.Prename || ''),
      canton: String(r.Canton || ''),
      sex: String(r.Sex || ''),
      language: String(r.Language || ''),
      address: {
        address: String(r.Address?.Address1 || r.Address?.Address || ''),
        zip: String(r.Address?.ZIP || ''),
        city: String(r.Address?.City || '')
      },
      licenses: ensureArray(r.Licenses?.License).map((l: any) => ({
        type: String(l.Type || ''),
        from: String(l.From || ''),
        to: String(l.To || '')
      }))
    }
  }

  // ─── 3.6 getLecturers ─────────────────────────────────────────────────────

  async getLecturers(type: SARICzvCourseType): Promise<SARILecturerData[]> {
    const body = `
      <LecturersRequest>
        <RegistrationId>${this.config.registrationId}</RegistrationId>
        <Type>${type}</Type>
      </LecturersRequest>`

    const result = await this.soapRequest('getLecturers', body)

    const status = result?.Status || result?.status
    checkStatus(status, 'getLecturers')

    const lecturers =
      result?.Result?.Lecturers?.Lecturer ||
      result?.result?.Lecturers?.Lecturer ||
      []

    return ensureArray<any>(lecturers).map((l: any) => ({
      FaberId: String(l.FaberId || ''),
      Name: String(l.Name || ''),
      Prename: String(l.Prename || ''),
      Birthdate: String(l.Birthdate || ''),
      SariId: String(l.SariId || ''),
      LecturerId: String(l.LecturerId || '')
    }))
  }

  // ─── 3.7 genConfirmation ──────────────────────────────────────────────────

  async genConfirmation(
    type: SARICzvCourseType,
    courseId: string,
    allIds: boolean = true,
    specificFaberIds: string[] = []
  ): Promise<SARIConfirmationResult> {
    const idsXml =
      !allIds && specificFaberIds.length > 0
        ? `<IDs>${specificFaberIds.map((id) => `<ID>${id}</ID>`).join('')}</IDs>`
        : '<IDs/>'

    const body = `
      <ConfirmationRequest>
        <RegistrationId>${this.config.registrationId}</RegistrationId>
        <CourseId>${courseId}</CourseId>
        <AllIds>${allIds}</AllIds>
        ${idsXml}
        <Type>${type}</Type>
      </ConfirmationRequest>`

    const result = await this.soapRequest('genConfirmation', body)

    const status = result?.Status || result?.status
    checkStatus(status, 'genConfirmation')

    const r = result?.Result || result?.result || {}
    const ids = r.IDs?.ID || []
    const fd = r.FileData || {}

    return {
      faberIds: ensureArray<string>(ids).map(String),
      fileExtension: String(fd.Extension || 'pdf'),
      mimeType: String(fd.MimeType || 'application/pdf'),
      isBinary: fd.IsBinary === true || fd.IsBinary === 'true',
      data: String(fd.Data || '')
    }
  }

  // ─── 3.8 startImport ──────────────────────────────────────────────────────

  async startImport(
    type: SARICzvCourseType,
    course: SARICourseImport
  ): Promise<SARIImportResult> {
    const membersXml = course.Members.map(
      (m) => `
      <Member>
        <FaberId>${m.FaberId}</FaberId>
        <Birthdate>${m.Birthdate}</Birthdate>
        <Registrationdate>${m.Registrationdate}</Registrationdate>
      </Member>`
    ).join('')

    const instructorsXml = course.Instructors.map(
      (i) => `
      <Instructor>
        <ID>${i.ID}</ID>
        <FaberId>${i.FaberId}</FaberId>
        <IsMaster>${i.IsMaster}</IsMaster>
      </Instructor>`
    ).join('')

    const body = `
      <StartImportRequest>
        <RegistrationId>${this.config.registrationId}</RegistrationId>
        <Type>${type}</Type>
        <Course>
          <ID>${course.ID}</ID>
          <Description>${course.Description}</Description>
          <Date>${course.Date}</Date>
          <Type>${course.Type}</Type>
          <Location>${course.Location}</Location>
          <Address>${course.Address}</Address>
          <ZIP>${course.ZIP}</ZIP>
          ${course.Comment ? `<Comment>${course.Comment}</Comment>` : '<Comment/>'}
          <FileData/>
          <Members>${membersXml}</Members>
          <Instructors>${instructorsXml}</Instructors>
        </Course>
      </StartImportRequest>`

    const result = await this.soapRequest('startImport', body)

    const status = result?.Status || result?.status
    checkStatus(status, 'startImport')

    const r = result?.Result || result?.result || {}

    const importedIds = ensureArray<string>(r.IDs?.ID || []).map(String)
    const errors = ensureArray<any>(r.Errors?.Error || []).map((e: any) => ({
      Number: parseInt(e.Number || '0'),
      Description: String(e.Description || '')
    }))
    const warnings = ensureArray<any>(r.Warnings?.Warning || []).map((w: any) => ({
      Number: parseInt(w.Number || '0'),
      Description: String(w.Description || '')
    }))

    return { importedFaberIds: importedIds, errors, warnings }
  }

  // ─── 3.9 deleteCourse ─────────────────────────────────────────────────────

  async deleteCourse(type: SARICzvCourseType, courseId: string): Promise<boolean> {
    const body = `
      <DeleteCourseRequest>
        <RegistrationId>${this.config.registrationId}</RegistrationId>
        <CourseId>${courseId}</CourseId>
        <Type>${type}</Type>
      </DeleteCourseRequest>`

    const result = await this.soapRequest('deleteCourse', body)

    const status = result?.Status || result?.status
    checkStatus(status, 'deleteCourse')

    const res = result?.Result ?? result?.result
    return res === true || res === 'true'
  }
}
