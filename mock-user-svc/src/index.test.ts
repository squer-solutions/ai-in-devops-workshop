import { describe, it, expect } from 'vitest'
import { buildServer } from './index.js'

describe('GET /users', () => {
  it('returns 200 with an array of all users', async () => {
    const app = buildServer()
    try {
      const res = await app.inject({ method: 'GET', url: '/users' })
      expect(res.statusCode).toBe(200)
      const body = res.json<unknown[]>()
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
    } finally {
      await app.close()
    }
  })

  it('each user has the required fields', async () => {
    const app = buildServer()
    try {
      const res = await app.inject({ method: 'GET', url: '/users' })
      const users = res.json<Record<string, unknown>[]>()
      for (const user of users) {
        expect(typeof user.user_id).toBe('string')
        expect(typeof user.firstname).toBe('string')
        expect(typeof user.lastname).toBe('string')
        expect(Array.isArray(user.privileges)).toBe(true)
        expect(typeof user.is_active).toBe('boolean')
        expect(typeof user.is_locked).toBe('boolean')
      }
    } finally {
      await app.close()
    }
  })
})

describe('GET /users/:id', () => {
  it('returns 200 with the matching user', async () => {
    const app = buildServer()
    try {
      const res = await app.inject({ method: 'GET', url: '/users/u1' })
      expect(res.statusCode).toBe(200)
      const user = res.json<Record<string, unknown>>()
      expect(user.user_id).toBe('u1')
      expect(typeof user.firstname).toBe('string')
    } finally {
      await app.close()
    }
  })

  it('returns 404 with error body for unknown id', async () => {
    const app = buildServer()
    try {
      const res = await app.inject({ method: 'GET', url: '/users/does-not-exist' })
      expect(res.statusCode).toBe(404)
      expect(res.json()).toEqual({ error: 'not found' })
    } finally {
      await app.close()
    }
  })
})

describe('PATCH /users/:id', () => {
  it('returns 200 with the updated user', async () => {
    const app = buildServer()
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/users/u4',
        payload: { is_locked: false, privileges: ['claims:read'] },
      })
      expect(res.statusCode).toBe(200)
      const user = res.json<Record<string, unknown>>()
      expect(user.user_id).toBe('u4')
      expect(user.is_locked).toBe(false)
      expect(user.privileges).toEqual(['claims:read'])
    } finally {
      await app.close()
    }
  })

  it('does not change unpatched fields', async () => {
    const app = buildServer()
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/users/u4',
        payload: { is_locked: false },
      })
      expect(res.statusCode).toBe(200)
      const user = res.json<Record<string, unknown>>()
      expect(user.firstname).toBe('Dave')
      expect(user.lastname).toBe('Fischer')
    } finally {
      await app.close()
    }
  })

  it('returns 404 for unknown id', async () => {
    const app = buildServer()
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/users/does-not-exist',
        payload: { is_locked: false },
      })
      expect(res.statusCode).toBe(404)
      expect(res.json()).toEqual({ error: 'not found' })
    } finally {
      await app.close()
    }
  })

  it('ignores user_id in payload', async () => {
    const app = buildServer()
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/users/u4',
        payload: { user_id: 'u999', is_locked: false },
      })
      expect(res.statusCode).toBe(200)
      const user = res.json<Record<string, unknown>>()
      expect(user.user_id).toBe('u4')
    } finally {
      await app.close()
    }
  })
})
