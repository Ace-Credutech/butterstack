import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'

@Injectable({ providedIn: 'root' })
export class ExportService {
  private base = `${environment.url}/api`

  private get headers(): Record<string, string> {
    const token = localStorage.getItem('bs_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  openBrd(projectId: string, moduleId?: number, pageId?: number) {
    let url = `${this.base}/exports/brd?projectId=${projectId}`
    if (moduleId) url += `&moduleId=${moduleId}`
    if (pageId) url += `&pageId=${pageId}`
    window.open(url + `&token=${localStorage.getItem('bs_token')}`, '_blank')
  }

  openMindmap(projectId: string) {
    const url = `${this.base}/exports/mindmap?projectId=${projectId}&token=${localStorage.getItem('bs_token')}`
    window.open(url, '_blank')
  }

  async downloadExcel(projectId: string) {
    const url = `${this.base}/exports/excel?projectId=${projectId}`
    const res = await fetch(url, { headers: this.headers })
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'butterstack-export.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }
}
