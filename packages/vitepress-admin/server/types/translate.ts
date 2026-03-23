export interface TranslateRequest {
  text: string
}

export interface TranslateResponse {
  success: boolean
  slug?: string
  error?: string
}
