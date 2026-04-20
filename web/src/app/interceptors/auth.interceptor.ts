import { HttpInterceptorFn } from '@angular/common/http'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('bs_token')
  if (token && !req.url.includes('/auth/')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
  }
  return next(req)
}
