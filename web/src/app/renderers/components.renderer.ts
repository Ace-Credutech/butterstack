export interface DesignSystem {
  primaryColor: string
  primaryHover: string
  primaryLight: string
  primaryText: string
  fontFamily: string
  borderRadius: string
  avatarBg: string
  avatarText: string
}

export interface PrototypeContext {
  currentUser?: { name: string; email: string; role: string; avatar: string }
  stats?: Record<string, number>
  recentItems?: string[]
  entities?: Record<string, number>
}

export function dsColorName(ds: DesignSystem): string {
  const m = ds.primaryColor.match(/bg-(\w+)-/)
  return m ? m[1] : 'green'
}

export function dsBgGradient(ds: DesignSystem): string {
  const color = dsColorName(ds)
  return `bg-gradient-to-br from-${color}-50 to-white`
}

export function dsBorderAccent(ds: DesignSystem): string {
  const color = dsColorName(ds)
  return `border-${color}-100`
}

export function dsCheckboxColor(ds: DesignSystem): string {
  const color = dsColorName(ds)
  return `text-${color}-600`
}

export const DEFAULT_DESIGN: DesignSystem = {
  primaryColor: 'bg-green-600',
  primaryHover: 'hover:bg-green-700',
  primaryLight: 'bg-green-50',
  primaryText: 'text-green-700',
  fontFamily: 'font-sans',
  borderRadius: 'rounded-lg',
  avatarBg: 'bg-green-600',
  avatarText: 'AS',
}

const NAMES = ['Akash Sadavarte', 'Shubhangi Mathur', 'Sameer Khan', 'Rajneesh Patel', 'Priya Sharma', 'Anil Deshmukh', 'Neha Gupta', 'Vikram Singh']
const EMAILS = ['akash@company.com', 'shubhangi@company.com', 'sameer@company.com', 'rajneesh@company.com', 'priya@company.com', 'anil@company.com', 'neha@company.com', 'vikram@company.com']
const STATUSES = ['Active', 'Active', 'Active', 'Inactive', 'Active', 'Pending', 'Active', 'Active']
const ROLES = ['Admin', 'Editor', 'Viewer', 'Editor', 'Admin', 'Viewer', 'Editor', 'Viewer']
const DATES = ['Jan 15, 2026', 'Feb 3, 2026', 'Mar 10, 2026', 'Mar 22, 2026', 'Apr 1, 2026', 'Apr 5, 2026', 'Apr 12, 2026', 'Apr 18, 2026']

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function renderAvatar(name: string, ds: DesignSystem, size = 8): string {
  return `<div class="w-${size} h-${size} rounded-full ${ds.avatarBg} flex items-center justify-center text-white text-xs font-semibold shrink-0">${initials(name)}</div>`
}

export function renderButton(label: string, ds: DesignSystem, variant: 'primary' | 'secondary' | 'danger' = 'primary'): string {
  const classes: Record<string, string> = {
    primary: `${ds.primaryColor} ${ds.primaryHover} text-white`,
    secondary: 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }
  return `<button class="px-4 py-2 text-sm font-medium ${ds.borderRadius} transition ${classes[variant]}">${label}</button>`
}

export function renderButtonGroup(primary: string, options: string[], ds: DesignSystem): string {
  const dropdownItems = options.map(o => `<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">${o}</a>`).join('')
  return `
    <div class="inline-flex ${ds.borderRadius} overflow-hidden shadow-sm border border-gray-200">
      <button class="px-4 py-2 text-sm font-medium ${ds.primaryColor} text-white">${primary}</button>
      <div class="relative group">
        <button class="px-2 py-2 ${ds.primaryColor} text-white border-l border-white/20">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
        </button>
        <div class="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-white ${ds.borderRadius} shadow-lg border border-gray-200 z-10">${dropdownItems}</div>
      </div>
    </div>`
}

export function renderStatusBadge(status: string): string {
  const cls: Record<string, string> = {
    Active: 'bg-green-50 text-green-700', Inactive: 'bg-gray-100 text-gray-500',
    Pending: 'bg-amber-50 text-amber-600', Approved: 'bg-green-50 text-green-700',
    Draft: 'bg-gray-100 text-gray-500', Rejected: 'bg-red-50 text-red-600',
  }
  return `<span class="px-2 py-0.5 text-xs font-medium rounded-full ${cls[status] || 'bg-gray-100 text-gray-500'}">${status}</span>`
}

export function renderRoleBadge(role: string): string {
  const cls: Record<string, string> = {
    Admin: 'bg-purple-50 text-purple-700', Editor: 'bg-blue-50 text-blue-700', Viewer: 'bg-gray-100 text-gray-500',
  }
  return `<span class="px-2 py-0.5 text-xs font-medium rounded-full ${cls[role] || 'bg-gray-100 text-gray-500'}">${role}</span>`
}

export function renderDataTable(columns: string[], rowCount: number, ds: DesignSystem, entity = 'record'): string {
  const headerCells = columns.map(c => `<th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">${c}</th>`).join('')

  const rows = Array.from({ length: Math.min(rowCount, 8) }, (_, i) => {
    const cells = columns.map(col => {
      const lc = col.toLowerCase()
      if (lc === 'name' || lc === 'user' || lc === 'member') return `<td class="px-4 py-3"><div class="flex items-center gap-2.5">${renderAvatar(NAMES[i], ds, 7)}<div><p class="text-sm font-medium text-gray-800">${NAMES[i]}</p><p class="text-xs text-gray-400">${EMAILS[i]}</p></div></div></td>`
      if (lc === 'email') return `<td class="px-4 py-3 text-sm text-gray-600">${EMAILS[i]}</td>`
      if (lc === 'status') return `<td class="px-4 py-3">${renderStatusBadge(STATUSES[i])}</td>`
      if (lc === 'role') return `<td class="px-4 py-3">${renderRoleBadge(ROLES[i])}</td>`
      if (lc === 'date' || lc === 'created' || lc.includes('date')) return `<td class="px-4 py-3 text-sm text-gray-500">${DATES[i]}</td>`
      if (lc === 'actions') return `<td class="px-4 py-3"><div class="flex gap-1"><button class="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">Edit</button><button class="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">Delete</button></div></td>`
      if (lc === 'id' || lc === '#') return `<td class="px-4 py-3 text-sm text-gray-400">#${1000 + i}</td>`
      return `<td class="px-4 py-3 text-sm text-gray-600">${entity} ${i + 1}</td>`
    }).join('')
    return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition">${cells}</tr>`
  }).join('')

  const total = 42 + Math.floor(Math.random() * 50)

  return `
    <table class="w-full">
      <thead><tr class="bg-gray-50/80 border-b border-gray-100">${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span class="text-xs text-gray-400">Showing ${rowCount} of ${total} ${entity}s</span>
      <div class="flex gap-1">
        <button class="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded hover:bg-gray-50">Prev</button>
        <button class="px-3 py-1 text-xs text-white ${ds.primaryColor} rounded">1</button>
        <button class="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50">2</button>
        <button class="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50">3</button>
        <button class="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded hover:bg-gray-50">Next</button>
      </div>
    </div>`
}

export function renderStatCard(label: string, value: string, trend?: string, ds?: DesignSystem): string {
  const border = ds ? dsBorderAccent(ds) : 'border-gray-100'
  const trendColor = ds ? dsColorName(ds) : 'green'
  const trendHtml = trend ? `<span class="text-xs ${trend.startsWith('+') ? `text-${trendColor}-600` : 'text-red-500'} font-medium">${trend}</span>` : ''
  return `
    <div class="bg-white rounded-xl border ${border} p-5 shadow-sm">
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs text-gray-400 font-medium">${label}</p>
        ${trendHtml}
      </div>
      <p class="text-2xl font-bold text-gray-900">${value}</p>
    </div>`
}

export function renderFormField(name: string, type: string, placeholder?: string, ds?: DesignSystem): string {
  const br = ds?.borderRadius || 'rounded-lg'
  const ph = placeholder || `Enter ${name.toLowerCase()}...`

  if (type === 'textarea') return `<div><label class="block text-xs font-medium text-gray-600 mb-1.5">${name}</label><textarea placeholder="${ph}" rows="3" class="w-full px-3.5 py-2.5 text-sm border border-gray-200 ${br} focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none transition"></textarea></div>`
  if (type === 'select') return `<div><label class="block text-xs font-medium text-gray-600 mb-1.5">${name}</label><select class="w-full px-3.5 py-2.5 text-sm border border-gray-200 ${br} focus:outline-none bg-white text-gray-700"><option>Select ${name.toLowerCase()}...</option><option>Option 1</option><option>Option 2</option><option>Option 3</option></select></div>`
  if (type === 'date') return `<div><label class="block text-xs font-medium text-gray-600 mb-1.5">${name}</label><input type="date" value="2026-04-21" class="w-full px-3.5 py-2.5 text-sm border border-gray-200 ${br} focus:outline-none focus:border-green-500 text-gray-700"/></div>`
  if (type === 'checkbox') return `<div class="flex items-center gap-2"><input type="checkbox" checked class="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/><label class="text-sm text-gray-700">${name}</label></div>`
  if (type === 'file') return `<div><label class="block text-xs font-medium text-gray-600 mb-1.5">${name}</label><div class="border-2 border-dashed border-gray-200 ${br} p-6 text-center hover:border-green-400 transition cursor-pointer"><svg class="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg><p class="text-xs text-gray-400">Click to upload or drag and drop</p></div></div>`
  if (type === 'password') return `<div><label class="block text-xs font-medium text-gray-600 mb-1.5">${name}</label><div class="relative"><input type="password" value="password123" class="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 ${br} focus:outline-none"/><button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z"/></svg></button></div></div>`

  return `<div><label class="block text-xs font-medium text-gray-600 mb-1.5">${name}</label><input type="${type}" placeholder="${ph}" class="w-full px-3.5 py-2.5 text-sm border border-gray-200 ${br} focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"/></div>`
}

export function renderSectionCard(title: string, content: string, ds?: DesignSystem): string {
  const border = ds ? dsBorderAccent(ds) : 'border-gray-100'
  return `
    <div class="bg-white rounded-xl border ${border} p-5 shadow-sm">
      <h3 class="text-sm font-semibold text-gray-800 mb-3">${title}</h3>
      <div class="text-sm text-gray-600 leading-relaxed">${content}</div>
    </div>`
}

export function renderActivityList(ds: DesignSystem): string {
  const items = [
    { name: 'Akash Sadavarte', action: 'created a new module', time: '2 min ago' },
    { name: 'Shubhangi Mathur', action: 'updated Login Page', time: '15 min ago' },
    { name: 'Sameer Khan', action: 'approved Dashboard specs', time: '1 hour ago' },
    { name: 'Rajneesh Patel', action: 'added a comment', time: '3 hours ago' },
    { name: 'Priya Sharma', action: 'completed ID Card module', time: 'yesterday' },
  ]
  return items.map(item => `
    <div class="flex items-start gap-3 py-2.5">
      ${renderAvatar(item.name, ds, 7)}
      <div class="flex-1 min-w-0">
        <p class="text-sm text-gray-700"><span class="font-medium">${item.name}</span> ${item.action}</p>
        <p class="text-xs text-gray-400">${item.time}</p>
      </div>
    </div>`).join('')
}
