import { createMiddleware } from 'hono/factory'
import { verifyToken, type JwtPayload } from '../lib/auth.ts'

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
    userId: number
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const path = c.req.path
  if (path === '/' || path === '' || path.startsWith('/auth') || path.startsWith('/api/auth') || path === '/api' || path === '/api/') {
    return next()
  }

  const header = c.req.header('Authorization')
  const queryToken = new URL(c.req.url).searchParams.get('token')
  const tokenStr = header?.startsWith('Bearer ') ? header.slice(7) : queryToken

  if (!tokenStr) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  try {
    const payload = await verifyToken(tokenStr)
    c.set('user', payload)
    c.set('userId', Number(payload.sub))
  } catch {
    return c.json({ error: 'invalid token' }, 401)
  }

  await next()
})
