import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { message as antMessage } from 'ant-design-vue'
import { API_BASE_URL } from '@/config'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: unknown
}

export interface RequestConfig extends AxiosRequestConfig {
  showError?: boolean // Show error message automatically
  showSuccess?: boolean // Show success message automatically
}

class HttpClient {
  private instance: AxiosInstance

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      config => {
        return config
      },
      error => {
        console.error('Request error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.instance.interceptors.response.use(
      response => {
        return response
      },
      error => {
        console.error('Response error:', error)

        if (error.response) {
          const { status, data } = error.response
          const errorMessage =
            data?.error || data?.message || `Request failed with status ${status}`

          // Handle specific status codes
          switch (status) {
            case 400:
              console.error('Bad Request:', errorMessage)
              break
            case 404:
              console.error('Not Found:', errorMessage)
              break
            case 500:
              console.error('Server Error:', errorMessage)
              break
            default:
              console.error('Error:', errorMessage)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * Generic request method
   */
  async request<T = unknown>(config: RequestConfig): Promise<T> {
    const { showError = true, showSuccess = false, ...axiosConfig } = config

    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.request(axiosConfig)

      // Check if response has success field
      if ('success' in response.data) {
        if (!response.data.success) {
          const errorMsg = response.data.error || 'Request failed'
          if (showError) {
            antMessage.error(errorMsg)
          }
          throw new Error(errorMsg)
        }

        if (showSuccess && response.data.message) {
          antMessage.success(response.data.message)
        }

        return response.data.data as T
      }

      // For responses without success field (backward compatibility)
      return response.data as unknown as T
    } catch (error: unknown) {
      const errorMessage =
        (error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
        (error instanceof Error ? error.message : 'Unknown error')

      if (
        showError &&
        !(
          error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { error?: string } } }).response?.data?.error
        )
      ) {
        antMessage.error(errorMessage as string)
      }

      throw error
    }
  }

  /**
   * GET request
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  /**
   * POST request
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  /**
   * PUT request
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  /**
   * DELETE request
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  /**
   * PATCH request
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }

  /**
   * Upload file
   */
  upload<T = unknown>(url: string, formData: FormData, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers
      }
    })
  }

  /**
   * Download file
   */
  async download(url: string, filename: string, config?: RequestConfig): Promise<void> {
    try {
      const response = await this.instance.request({
        ...config,
        method: 'GET',
        url,
        responseType: 'blob'
      })

      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error: unknown) {
      const errorMessage =
        (error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
        (error instanceof Error ? error.message : 'Download failed')
      antMessage.error(errorMessage as string)
      throw error
    }
  }
}

// Create and export instance
export const http = new HttpClient(API_BASE_URL)

// Export for convenience
export default http
