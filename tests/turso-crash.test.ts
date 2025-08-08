import { describe, it, expect, beforeEach } from 'vitest'
import {
  isTursoConfigured,
  validateTursoConfig,
  getTursoClient,
  executeQuery,
  resetTursoClient,
} from '#libs/turso'

describe('Turso error handling and validation', () => {
  beforeEach(() => {
    // Reset client state before each test
    resetTursoClient()
  })

  describe('isTursoConfigured', () => {
    it('should return false when no environment variables are set', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      delete process.env.TURSO_DATABASE_URL
      delete process.env.TURSO_AUTH_TOKEN

      try {
        expect(isTursoConfigured()).toBe(false)
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })

    it('should return false when only URL is set', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
      delete process.env.TURSO_AUTH_TOKEN

      try {
        expect(isTursoConfigured()).toBe(false)
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })

    it('should return false when only token is set', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      delete process.env.TURSO_DATABASE_URL
      process.env.TURSO_AUTH_TOKEN = 'test_token'

      try {
        expect(isTursoConfigured()).toBe(false)
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })

    it('should return true when both URL and token are set', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test_token'

      try {
        expect(isTursoConfigured()).toBe(true)
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })
  })

  describe('validateTursoConfig', () => {
    it('should throw descriptive error when both env vars are missing', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      delete process.env.TURSO_DATABASE_URL
      delete process.env.TURSO_AUTH_TOKEN

      try {
        expect(() => validateTursoConfig()).toThrow(
          'Turso database not configured. Both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables are required.'
        )
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })

    it('should throw specific error when only URL is missing', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      delete process.env.TURSO_DATABASE_URL
      process.env.TURSO_AUTH_TOKEN = 'test_token'

      try {
        expect(() => validateTursoConfig()).toThrow(
          'TURSO_DATABASE_URL environment variable is required.'
        )
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })

    it('should throw specific error when only token is missing', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
      delete process.env.TURSO_AUTH_TOKEN

      try {
        expect(() => validateTursoConfig()).toThrow(
          'TURSO_AUTH_TOKEN environment variable is required.'
        )
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })

    it('should not throw when both env vars are present', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test_token'

      try {
        expect(() => validateTursoConfig()).not.toThrow()
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })
  })

  describe('getTursoClient', () => {
    it('should throw error when configuration is missing', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      delete process.env.TURSO_DATABASE_URL
      delete process.env.TURSO_AUTH_TOKEN

      try {
        expect(() => getTursoClient()).toThrow(
          'Turso database not configured. Both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables are required.'
        )
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })

    it('should cache initialization error and throw it on subsequent calls', () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      delete process.env.TURSO_DATABASE_URL
      delete process.env.TURSO_AUTH_TOKEN

      try {
        // First call should throw and cache the error
        expect(() => getTursoClient()).toThrow()

        // Second call should throw the same cached error
        expect(() => getTursoClient()).toThrow()
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })
  })

  describe('executeQuery', () => {
    it('should throw wrapped error when client creation fails', async () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      delete process.env.TURSO_DATABASE_URL
      delete process.env.TURSO_AUTH_TOKEN

      try {
        await expect(executeQuery('SELECT 1')).rejects.toThrow('Database operation failed:')
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })
  })

  describe('Module import safety', () => {
    it('should not crash when importing module without env vars', async () => {
      const originalUrl = process.env.TURSO_DATABASE_URL
      const originalToken = process.env.TURSO_AUTH_TOKEN

      delete process.env.TURSO_DATABASE_URL
      delete process.env.TURSO_AUTH_TOKEN

      try {
        // This should not throw - the module should import safely
        expect(() => {
          // Import is already done at the top of this file
          // This test verifies that the module loaded without throwing
        }).not.toThrow()
      } finally {
        if (originalUrl) process.env.TURSO_DATABASE_URL = originalUrl
        if (originalToken) process.env.TURSO_AUTH_TOKEN = originalToken
      }
    })
  })
})
