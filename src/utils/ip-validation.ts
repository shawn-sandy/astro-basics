/**
 * IP address validation and normalization utilities
 */

import { isIP } from 'node:net'

/**
 * Normalizes an IP address for storage while preserving validity
 * - Validates IP format using Node.js isIP
 * - Compresses IPv6 addresses to shortest valid form
 * - Strips brackets and port numbers from IPv6 addresses
 * - Ensures result fits within database constraints (45 characters)
 */
export function normalizeIPAddress(rawIP: string): string {
  if (!rawIP || typeof rawIP !== 'string') {
    return 'unknown'
  }

  // Clean up common proxy header artifacts
  let cleanIP = rawIP.trim()

  // Remove port numbers and brackets from IPv6 addresses
  // Examples: [2001:db8::1]:8080 -> 2001:db8::1
  if (cleanIP.startsWith('[') && cleanIP.includes(']:')) {
    cleanIP = cleanIP.substring(1, cleanIP.indexOf(']:'))
  } else if (cleanIP.includes(':') && cleanIP.lastIndexOf(':') !== cleanIP.indexOf(':')) {
    // For IPv6 without brackets but with port (rare but possible)
    // Only remove port if there are multiple colons (IPv6 indicator)
    const lastColonIndex = cleanIP.lastIndexOf(':')
    const portPart = cleanIP.substring(lastColonIndex + 1)
    if (/^\d+$/.test(portPart)) {
      cleanIP = cleanIP.substring(0, lastColonIndex)
    }
  }

  // Validate the cleaned IP
  const ipVersion = isIP(cleanIP)
  if (ipVersion === 0) {
    // Invalid IP format
    console.warn(`Invalid IP address format: "${rawIP}" -> "${cleanIP}"`)
    return 'unknown'
  }

  // For IPv6 (version 6), ensure it's in compressed form
  if (ipVersion === 6) {
    try {
      // Node.js automatically normalizes IPv6 when we validate it
      // But we can ensure compression by parsing and reconstructing
      const normalizedIPv6 = compressIPv6(cleanIP)

      // Final length check - IPv6 should fit in 45 chars when properly compressed
      if (normalizedIPv6.length <= 45) {
        return normalizedIPv6
      } else {
        console.warn(
          `IPv6 address too long after normalization: "${rawIP}" (${normalizedIPv6.length} chars)`
        )
        return 'unknown'
      }
    } catch (error) {
      console.warn(`Error normalizing IPv6 address "${rawIP}":`, error)
      return 'unknown'
    }
  }

  // For IPv4 (version 4), return as-is if it passes validation
  // IPv4 addresses are never longer than 15 characters (xxx.xxx.xxx.xxx)
  return cleanIP
}

/**
 * Compresses an IPv6 address to its shortest valid representation
 * Examples:
 * - 2001:0db8:0000:0000:0000:ff00:0042:8329 -> 2001:db8::ff00:42:8329
 * - 2001:db8:0:0:1:0:0:1 -> 2001:db8::1:0:0:1
 */
function compressIPv6(ipv6: string): string {
  // Split into segments and remove leading zeros
  const segments = ipv6.split(':').map(segment => {
    // Remove leading zeros but keep at least one digit
    return segment.replace(/^0+/, '') || '0'
  })

  // Join back to create the uncompressed but zero-trimmed version
  let result = segments.join(':')

  // Find the longest sequence of consecutive zero segments
  let bestStart = -1
  let bestLength = 0
  let currentStart = -1
  let currentLength = 0

  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === '0') {
      if (currentStart === -1) {
        currentStart = i
        currentLength = 1
      } else {
        currentLength++
      }
    } else {
      if (currentLength > bestLength) {
        bestStart = currentStart
        bestLength = currentLength
      }
      currentStart = -1
      currentLength = 0
    }
  }

  // Check the final sequence
  if (currentLength > bestLength) {
    bestStart = currentStart
    bestLength = currentLength
  }

  // Only compress if we have at least 2 consecutive zeros
  if (bestLength >= 2) {
    const beforeZeros = segments.slice(0, bestStart)
    const afterZeros = segments.slice(bestStart + bestLength)

    if (beforeZeros.length === 0) {
      result = '::' + afterZeros.join(':')
    } else if (afterZeros.length === 0) {
      result = beforeZeros.join(':') + '::'
    } else {
      result = beforeZeros.join(':') + '::' + afterZeros.join(':')
    }
  }

  return result
}

/**
 * Extracts client IP from request headers with proper normalization
 * Handles common proxy headers in order of preference
 */
export function extractClientIP(request: Request): string {
  // Check common proxy headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, use the first one (client IP)
    const firstIP = forwardedFor.split(',')[0]?.trim()
    if (firstIP) {
      return normalizeIPAddress(firstIP)
    }
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return normalizeIPAddress(realIP.trim())
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return normalizeIPAddress(cfConnectingIP.trim())
  }

  // Fallback to unknown if no IP can be determined
  return 'unknown'
}
