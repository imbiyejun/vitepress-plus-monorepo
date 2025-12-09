import { Response } from 'express'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: unknown
}

export interface PaginationData<T = unknown> {
  items: T[]
  total?: number
  page?: number
  pageSize?: number
  hasMore?: boolean
}

/**
 * Send success response with data
 */
export const sendSuccess = <T>(res: Response, data?: T, message?: string): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  }
  res.json(response)
}

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500,
  details?: unknown
): void => {
  const response: ApiResponse = {
    success: false,
    error
  }
  if (details !== undefined) {
    response.details = details
  }
  res.status(statusCode).json(response)
}

/**
 * Send paginated response
 */
export const sendPaginatedSuccess = <T>(
  res: Response,
  data: PaginationData<T>,
  message?: string
): void => {
  const response: ApiResponse<PaginationData<T>> = {
    success: true,
    data,
    message
  }
  res.json(response)
}
