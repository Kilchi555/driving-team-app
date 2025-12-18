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
        ? 'https://sari-vku-test.ky2help.com'
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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`SARI getCustomer failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SARIResponse<SARICustomer>

    if (data.status !== 'OK') {
      throw new Error(`SARI error: ${data.status}`)
    }

    return data.result
  }

  /**
   * Get all courses for a given type (VKU or PGS)
   */
  async getCourses(courseType: 'VKU' | 'PGS'): Promise<SARICourseGroup> {
    const token = await this.authenticate()

    const url = `${this.baseUrl}/api/courseregistration/courses/${courseType}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`SARI getCourses failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SARIResponse<SARICourseGroup>

    if (data.status !== 'OK') {
      throw new Error(`SARI error: ${data.status}`)
    }

    return data.result
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
   */
  async unenrollStudent(
    courseId: number,
    faberid: string
  ): Promise<void> {
    const token = await this.authenticate()

    const url = `${this.baseUrl}/api/courseregistration/personcourse?courseid=${courseId}&faberid=${encodeURIComponent(faberid)}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`SARI unenrollStudent failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SARIResponse<any>

    if (data.status !== 'OK') {
      throw new Error(`SARI error: ${data.status}`)
    }
  }
}

