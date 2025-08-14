import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeIPAddress, extractClientIP } from '../../src/utils/ip-validation'

describe('normalizeIPAddress', () => {
  beforeEach(() => {
    // Reset console.warn mock
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('IPv4 addresses', () => {
    it('should preserve valid IPv4 addresses', () => {
      expect(normalizeIPAddress('192.168.1.1')).toBe('192.168.1.1')
      expect(normalizeIPAddress('10.0.0.1')).toBe('10.0.0.1')
      expect(normalizeIPAddress('203.0.113.1')).toBe('203.0.113.1')
      expect(normalizeIPAddress('127.0.0.1')).toBe('127.0.0.1')
    })

    it('should handle IPv4 with whitespace', () => {
      expect(normalizeIPAddress('  192.168.1.1  ')).toBe('192.168.1.1')
      expect(normalizeIPAddress('\t10.0.0.1\n')).toBe('10.0.0.1')
    })
  })

  describe('IPv6 addresses', () => {
    it('should compress IPv6 addresses', () => {
      // Basic compression
      expect(normalizeIPAddress('2001:0db8:0000:0000:0000:ff00:0042:8329'))
        .toBe('2001:db8::ff00:42:8329')
      
      // Remove leading zeros
      expect(normalizeIPAddress('2001:0db8:0001:0000:0000:0000:0000:0001'))
        .toBe('2001:db8:1::1')
      
      // Already compressed should remain the same
      expect(normalizeIPAddress('2001:db8::1'))
        .toBe('2001:db8::1')
      
      // Localhost IPv6
      expect(normalizeIPAddress('0000:0000:0000:0000:0000:0000:0000:0001'))
        .toBe('::1')
    })

    it('should handle IPv6 with brackets', () => {
      expect(normalizeIPAddress('[2001:db8::1]')).toBe('2001:db8::1')
      expect(normalizeIPAddress('[::1]')).toBe('::1')
    })

    it('should remove port numbers from IPv6', () => {
      expect(normalizeIPAddress('[2001:db8::1]:8080')).toBe('2001:db8::1')
      expect(normalizeIPAddress('[::1]:3000')).toBe('::1')
      
      // Without brackets (less common but possible)
      expect(normalizeIPAddress('2001:db8::1:8080')).toBe('2001:db8::1')
    })

    it('should handle various IPv6 formats', () => {
      // Full IPv6
      expect(normalizeIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334'))
        .toBe('2001:db8:85a3::8a2e:370:7334')
      
      // IPv4-mapped IPv6
      expect(normalizeIPAddress('::ffff:192.0.2.1'))
        .toBe('::ffff:192.0.2.1')
      
      // Link-local
      expect(normalizeIPAddress('fe80::1%eth0')).toBe('unknown') // Invalid due to %
    })

    it('should reject IPv6 addresses that are too long after normalization', () => {
      // Create a very long IPv6 (this is artificial but tests the edge case)
      const longIPv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra:data'
      expect(normalizeIPAddress(longIPv6)).toBe('unknown')
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid IP address format'))
    })
  })

  describe('Invalid inputs', () => {
    it('should return "unknown" for invalid IP addresses', () => {
      expect(normalizeIPAddress('not-an-ip')).toBe('unknown')
      expect(normalizeIPAddress('256.256.256.256')).toBe('unknown')
      expect(normalizeIPAddress('192.168.1')).toBe('unknown')
      expect(normalizeIPAddress('192.168.1.1.1')).toBe('unknown')
      expect(console.warn).toHaveBeenCalled()
    })

    it('should return "unknown" for empty or null inputs', () => {
      expect(normalizeIPAddress('')).toBe('unknown')
      expect(normalizeIPAddress(null as any)).toBe('unknown')
      expect(normalizeIPAddress(undefined as any)).toBe('unknown')
    })

    it('should return "unknown" for non-string inputs', () => {
      expect(normalizeIPAddress(123 as any)).toBe('unknown')
      expect(normalizeIPAddress({} as any)).toBe('unknown')
      expect(normalizeIPAddress([] as any)).toBe('unknown')
    })
  })

  describe('Edge cases', () => {
    it('should handle malformed bracketed addresses', () => {
      expect(normalizeIPAddress('[192.168.1.1')).toBe('unknown') // Missing closing bracket
      expect(normalizeIPAddress('192.168.1.1]')).toBe('192.168.1.1') // No opening bracket, but valid IP
      expect(normalizeIPAddress('[invalid-ip]')).toBe('unknown')
    })

    it('should handle IPv4 with port (should not remove port from IPv4)', () => {
      // IPv4 with port should be treated as invalid since IPv4 doesn't use colons normally
      expect(normalizeIPAddress('192.168.1.1:8080')).toBe('unknown')
    })

    it('should preserve valid short IPv6 addresses', () => {
      expect(normalizeIPAddress('::')).toBe('::') // All zeros
      expect(normalizeIPAddress('::1')).toBe('::1') // Localhost
      expect(normalizeIPAddress('::ffff:0:0')).toBe('::ffff:0:0')
    })
  })
})

describe('extractClientIP', () => {
  const createMockRequest = (headers: Record<string, string>) => ({
    headers: new Map(Object.entries(headers)),
  }) as Request

  it('should extract IP from x-forwarded-for header', () => {
    const request = createMockRequest({
      'x-forwarded-for': '203.0.113.1, 70.41.3.18, 192.168.1.1',
    })
    expect(extractClientIP(request)).toBe('203.0.113.1')
  })

  it('should extract IPv6 from x-forwarded-for header', () => {
    const request = createMockRequest({
      'x-forwarded-for': '2001:db8::1, 192.168.1.1',
    })
    expect(extractClientIP(request)).toBe('2001:db8::1')
  })

  it('should fallback to x-real-ip header', () => {
    const request = createMockRequest({
      'x-real-ip': '198.51.100.1',
    })
    expect(extractClientIP(request)).toBe('198.51.100.1')
  })

  it('should fallback to cf-connecting-ip header', () => {
    const request = createMockRequest({
      'cf-connecting-ip': '203.0.113.42',
    })
    expect(extractClientIP(request)).toBe('203.0.113.42')
  })

  it('should prioritize headers correctly', () => {
    const request = createMockRequest({
      'x-forwarded-for': '203.0.113.1',
      'x-real-ip': '198.51.100.1',
      'cf-connecting-ip': '203.0.113.42',
    })
    expect(extractClientIP(request)).toBe('203.0.113.1')
  })

  it('should handle missing headers', () => {
    const request = createMockRequest({})
    expect(extractClientIP(request)).toBe('unknown')
  })

  it('should handle empty headers', () => {
    const request = createMockRequest({
      'x-forwarded-for': '',
      'x-real-ip': '  ',
    })
    expect(extractClientIP(request)).toBe('unknown')
  })

  it('should normalize extracted IPs', () => {
    const request = createMockRequest({
      'x-forwarded-for': '[2001:0db8:0000:0000:0000:0000:0000:0001]:8080',
    })
    expect(extractClientIP(request)).toBe('::1')
  })

  it('should handle malformed forwarded-for header', () => {
    const request = createMockRequest({
      'x-forwarded-for': 'invalid-ip, 192.168.1.1',
    })
    expect(extractClientIP(request)).toBe('unknown')
  })
})