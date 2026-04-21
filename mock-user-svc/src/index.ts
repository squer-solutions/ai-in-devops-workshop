import Fastify from 'fastify'

type User = {
  user_id: string
  firstname: string
  lastname: string
  privileges: string[]
  is_active: boolean
  is_locked: boolean
}

type UserPatch = Partial<Omit<User, 'user_id'>>

const users: User[] = [
  {
    user_id: 'u1',
    firstname: 'Alice',
    lastname: 'Müller',
    privileges: ['claims:read', 'claims:write', 'admin'],
    is_active: true,
    is_locked: false,
  },
  {
    user_id: 'u2',
    firstname: 'Bob',
    lastname: 'Schmidt',
    privileges: ['claims:read'],
    is_active: true,
    is_locked: false,
  },
  {
    user_id: 'u3',
    firstname: 'Carol',
    lastname: 'Weber',
    privileges: ['claims:read', 'claims:write'],
    is_active: false,
    is_locked: false,
  },
  {
    user_id: 'u4',
    firstname: 'Dave',
    lastname: 'Fischer',
    privileges: [],
    is_active: true,
    is_locked: true,
  },
  {
    user_id: 'u5',
    firstname: 'Eve',
    lastname: 'Bauer',
    privileges: ['claims:read'],
    is_active: false,
    is_locked: true,
  },
]

export function buildServer() {
  const app = Fastify({ logger: true })

  app.get('/users', async () => users)

  app.get<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const user = users.find((u) => u.user_id === req.params.id)
    if (!user) return reply.code(404).send({ error: 'not found' })
    return user
  })

  app.patch<{ Params: { id: string }; Body: UserPatch }>('/users/:id', async (req, reply) => {
    const idx = users.findIndex((u) => u.user_id === req.params.id)
    if (idx === -1) return reply.code(404).send({ error: 'not found' })
    const { user_id: _ignored, ...patch } = req.body as UserPatch & { user_id?: unknown }
    users[idx] = { ...users[idx], ...patch }
    return users[idx]
  })

  return app
}

if (!process.env.VITEST) {
  const app = buildServer()
  app.listen({ port: Number(process.env.PORT ?? 8082), host: '0.0.0.0' }, (err) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  })
}
