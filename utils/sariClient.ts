/**
 * SARI API Client
 * Handles authentication and API calls to Kyberna SARI system
 * https://vku-pgs.asa.ch/ (Production) or sari-vku-test.ky2help.com (Test)
 */

export interface SARIConfig {
  environment: 'test' | 'production'
  clientId: string
  clientSecret: string
  username: string
  password: string
}

export interface SARICustomer {
  faberid: string
  birthdate: string
  firstname: string
  lastname: string
  address: string
  zip: string
  city: string
  licenses: Array<{
    category: string
    expirationdate: string
  }>
}

export interface SARICourse {
  id: number
  name: string
  date: string // ISO 8601
  address: {
    name: string
    address: string
    zip: number
    city: string
  }
  freeplaces: number
  instructor?: string // Instructor name, if provided by SARI
  teacher?: string // Alternative field name for instructor
}

export interface SARICourseGroup {
  name: string
  date: string // ISO 8601
  courses: SARICourse[]
}

export interface SARICourseMember {
  faberid: string
  firstname: string
  lastname: string
  birthdate: string
  confirmed: string // ISO 8601
}

export interface SARIResponse<T> {
  result: T
  status: string // 'OK' or error message
}

export class SARIClient {
  private baseUrl: string
  private config: SARIConfig
  private accessToken?: string
  private tokenExpiry?: Date

  constructor(config: SARIConfig) {
    this.config = config
    this.baseUrl =
      config.environment === 'test'
        ? 'https://sari-v4-test.ky2help.com'
        : 'https://www.vku-pgs.asa.ch'
  }

  /**
   * Authenticate with SARI and get access token
   * Token is cached until expiry
   */
  async authenticate(): Promise<string> {
    // Return cached token if still valid
    if (
      this.accessToken &&
      this.tokenExpiry &&
      new Date() < new Date(this.tokenExpiry.getTime() - 60000) // 1 min buffer
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

    const url = `${this.baseUrl}/oauth/v2/token?${params.toString()}`

    const response = await fetch(url, {
      method: 'GET'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SARI OAuth Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url.replace(this.config.clientSecret, '***').replace(this.config.password, '***')
      })
      throw new Error(`SARI OAuth failed: ${response.statusText} - ${errorText.substring(0, 200)}`)
    }

    const data = await response.json()

    if (!data.access_token) {
      throw new Error('No access token received from SARI')
    }

    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000)

    return this.accessToken
  }

  /**
   * Test connection with SARI
   * Returns the echo text if successful
   */
  async getVersion(text: string): Promise<string> {
    const token = await this.authenticate()

    const url = `${this.baseUrl}/api/courseregistration/version/${encodeURIComponent(text)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`SARI version check failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SARIResponse<string>

    if (data.status !== 'OK') {
      throw new Error(`SARI error: ${data.status}`)
    }

    return data.result
  }

  /**
   * Get customer data by FABERID and birthdate
   */
  async getCustomer(
    faberid: string,
    birthdate: string
  ): Promise<SARICustomer> {
    const token = await this.authenticate()

    const url = `${this.baseUrl}/api/courseregistration/customer/${encodeURIComponent(faberid)}/${encodeURIComponent(birthdate)}`
    
    console.log('🔍 SARI getCustomer URL:', url)
    console.log('📝 SARI getCustomer params:', { faberid, birthdate })

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    console.log('📊 SARI getCustomer response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ SARI getCustomer HTTP error:', { status: response.status, statusText: response.statusText, body: errorText })
      throw new Error(`SARI getCustomer failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SARIResponse<SARICustomer>
    
    console.log('📥 SARI getCustomer response data:', data)

    if (data.status !== 'OK') {
      console.error('❌ SARI getCustomer returned error status:', data.status)
      throw new Error(`SARI error: ${data.status}`)
    }

    console.log('✅ SARI getCustomer success:', data.result)
    return data.result
  }

  /**
   * Get all course GROUPS for a given type (VKU or PGS)
   * Each group contains multiple sessions (Teil 1, 2, 3, 4)
   * Returns raw array of groups for proper course/session mapping
   */
  async getCourseGroups(courseType: 'VKU' | 'PGS'): Promise<SARICourseGroup[]> {
    const token = await this.authenticate()

    const url = `${this.baseUrl}/api/courseregistration/courses/${courseType}`

    console.log(`🔍 SARI getCourseGroups URL: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SARI getCourseGroups error:', { status: response.status, body: errorText })
      throw new Error(`SARI getCourseGroups failed: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`SARI error: ${data.status}`)
    }

    // SARI returns an array of course GROUPS
    const result = data.result
    
    if (Array.isArray(result)) {
      console.log(`🔍 SARI: Found ${result.length} course groups`)
      return result as SARICourseGroup[]
    }
    
    // Single group
    if (result && result.name) {
      return [result as SARICourseGroup]
    }

    console.warn('SARI getCourseGroups: Unexpected response structure')
    return []
  }

  /**
   * Get all courses for a given type (VKU or PGS) - flattened
   * @deprecated Use getCourseGroups for proper course/session mapping
   */
  async getCourses(courseType: 'VKU' | 'PGS'): Promise<SARICourseGroup> {
    const groups = await this.getCourseGroups(courseType)
    
    // Flatten all groups into individual courses
    const allCourses: SARICourse[] = []
    
    for (const group of groups) {
      if (group.courses && Array.isArray(group.courses)) {
        for (const course of group.courses) {
          allCourses.push({
            ...course,
            groupName: group.name
          } as SARICourse & { groupName: string })
        }
      }
    }
    
    console.log(`🔍 SARI: Flattened ${groups.length} groups into ${allCourses.length} individual courses`)
    
    return {
      name: courseType,
      date: new Date().toISOString(),
      courses: allCourses
    }
  }

  /**
   * Get all participants for a specific course
   */
  async getCourseDetail(courseId: number): Promise<SARICourseMember[]> {
    const token = await this.authenticate()

    const url = `${this.baseUrl}/api/courseregistration/coursedetail/${courseId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`SARI getCourseDetail failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SARIResponse<SARICourseMember[]>

    if (data.status !== 'OK') {
      throw new Error(`SARI error: ${data.status}`)
    }

    return data.result
  }

  /**
   * Enroll a student in a course
   */
  async enrollStudent(
    courseId: number,
    faberid: string,
    birthdate: string
  ): Promise<void> {
    const token = await this.authenticate()

    const url = `${this.baseUrl}/api/courseregistration/personcourse`

    const body = new URLSearchParams({
      courseid: courseId.toString(),
      faberid,
      birthdate
    })

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    if (!response.ok) {
      throw new Error(`SARI enrollStudent failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SARIResponse<any>

    if (data.status !== 'OK') {
      throw new Error(`SARI error: ${data.status}`)
    }
  }

  /**
   * Unenroll a student from a course
   * Only works if student is not yet confirmed
   * Note: DELETE sends data in body with application/x-www-form-urlencoded (per SARI docs)
   */
  async unenrollStudent(
    courseId: number | string,
    faberid: string
  ): Promise<void> {
    const token = await this.authenticate()
    
    // Extract numeric ID if it's a group string
    const numericCourseId = this.getNumericSariCourseId(courseId)
    if (!numericCourseId) {
      throw new Error('Invalid SARI course ID')
    }

    const url = `${this.baseUrl}/api/courseregistration/personcourse`

    const body = new URLSearchParams({
      courseid: numericCourseId.toString(),
      faberid
    })

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    if (!response.ok) {
      throw new Error(`SARI unenrollStudent failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SARIResponse<any>

    if (data.status !== 'OK') {
      throw new Error(`SARI error: ${data.status}`)
    }
  }

  /**
   * Check if a student can enroll in a course
   * Returns true if: student not already enrolled AND free places available
   */
  async canEnrollInCourse(
    courseId: number | string,
    faberid: string
  ): Promise<{ canEnroll: boolean; reason?: string }> {
    try {
      // Extract numeric ID if it's a group string (e.g., "GROUP_2110023_...")
      const numericCourseId = this.getNumericSariCourseId(courseId)
      if (!numericCourseId) {
        return { canEnroll: false, reason: 'Ungültige SARI Kurs-ID' }
      }

      // Get course participants
      const members = await this.getCourseDetail(numericCourseId)
      
      // Check if already enrolled
      const alreadyEnrolled = members.some(m => m.faberid === faberid)
      if (alreadyEnrolled) {
        return { canEnroll: false, reason: 'Sie sind bereits für diesen Kurs angemeldet.' }
      }

      // Note: We can't directly check free places from getCourseDetail
      // SARI doesn't return course capacity info in the members list
      // Assume enrollment is possible if not already enrolled
      return { canEnroll: true }
    } catch (error: any) {
      console.error('❌ SARI canEnrollInCourse error:', error.message)
      if (error.message?.includes('COURSE_NOT_FOUND')) {
        return { canEnroll: false, reason: 'SARI Kurs nicht gefunden.' }
      }
      return { canEnroll: false, reason: `SARI Fehler: ${error.message}` }
    }
  }

  /**
   * Helper: Extract numeric SARI course ID from a potential group string
   * e.g., "GROUP_2110023_..." → 2110023
   */
  private getNumericSariCourseId(courseSariId: number | string): number | null {
    if (typeof courseSariId === 'number') {
      return courseSariId
    }
    const match = String(courseSariId).match(/(\d+)/)
    return match ? parseInt(match[1]) : null
  }
}

