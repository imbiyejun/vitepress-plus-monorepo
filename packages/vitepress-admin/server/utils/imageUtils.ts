import path from 'path'
import qiniu from 'qiniu'
import { getProjectRoot as getRoot, getPublicPath } from '../config/paths.js'

// Re-export for backward compatibility
export const getProjectRoot = getRoot
export { getPublicPath }

// Map storage region to Qiniu zone
export const getQiniuZone = (region: string) => {
  switch (region) {
    case 'z0':
      return qiniu.zone.Zone_z0 // East China
    case 'z1':
      return qiniu.zone.Zone_z1 // North China
    case 'z2':
      return qiniu.zone.Zone_z2 // South China
    case 'na0':
      return qiniu.zone.Zone_na0 // North America
    case 'as0':
      return qiniu.zone.Zone_as0 // Southeast Asia
    default:
      return qiniu.zone.Zone_z0 // Default to East China
  }
}

// Convert path parts to relative path and ensure leading slash
export const convertPathPartsToRelativePath = (
  pathParts: unknown,
  _publicPath: string,
  _projectRoot: string
) => {
  if (!pathParts || !Array.isArray(pathParts) || pathParts.length === 0) {
    return ''
  }

  // Prevent directory traversal
  const safeParts = pathParts.filter((part: string) => {
    return (
      part &&
      typeof part === 'string' &&
      !part.includes('..') &&
      !part.includes('~') &&
      part !== '.'
    )
  })

  if (safeParts.length === 0) {
    return ''
  }

  const relativePath = path.join(...safeParts)
  return relativePath.replace(/\\/g, '/')
}

// Get path relative to public/images
export const getRelativeImagePath = (
  imagePath: string,
  _publicPath: string,
  _projectRoot: string
) => {
  try {
    const urlPath = new URL(imagePath).pathname
    return urlPath.replace(/^\/images\//, '') // Remove /images/ prefix
  } catch {
    // If not a valid URL, treat as relative path
    return imagePath.replace(/^\/images\//, '').replace(/^images\//, '')
  }
}
