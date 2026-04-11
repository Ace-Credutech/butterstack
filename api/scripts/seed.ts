/**
 * Seed script — 10 extreme real-life prototype generation cases
 * Run with: bun scripts/seed.ts (from the api directory)
 */

const API_BASE = 'http://localhost:3000'
const DELAY_MS = 500

const cases = [
  {
    label: '1. Hinglish — Order tracking',
    title: 'Order Track Karo',
    description: 'Mera customer ka order track karna hai. Uska status, location aur estimated delivery dikhao. Agar delay ho to notification bhi chahiye.',
  },
  {
    label: '2. Dashboard — Hospital OPD Patient Stats',
    title: 'OPD Patient Dashboard',
    description: 'Hospital outpatient department real-time stats: total patients today, waiting count, doctors on duty, average wait time, department-wise breakdown, and bed occupancy percentage.',
  },
  {
    label: '3. E-commerce — Product Listing with Filters',
    title: 'Product Listing Page',
    description: 'Show a grid of products with filters for category, price range, brand, ratings, and availability. Include sort options (price, popularity, newest). Pagination and quick-add to cart.',
  },
  {
    label: '4. Finance — Loan Application Form',
    title: 'Personal Loan Application',
    description: 'Multi-step loan application form with personal details, employment info, income verification, loan amount and tenure selection, document upload, and e-KYC consent.',
  },
  {
    label: '5. HR — Employee Leave Management',
    title: 'Leave Management System',
    description: 'Employee self-service leave portal with leave balance by type, apply for leave with date picker and reason, manager approval workflow, team calendar view, and leave history.',
  },
  {
    label: '6. Logistics — Delivery Tracking Map View',
    title: 'Live Delivery Tracker',
    description: 'Real-time delivery tracking with map showing driver location, route, and stops. ETA countdown, delivery status steps, driver contact, and proof-of-delivery photo upload.',
  },
  {
    label: '7. EdTech — Student Progress Dashboard',
    title: 'Student Learning Dashboard',
    description: 'Student dashboard showing course completion percentage, assignment scores, upcoming deadlines, streak counter, quiz performance trends, and recommended next lessons.',
  },
  {
    label: '8. Gujarati-English — Inventory Check',
    title: 'Inventory Joiye Chhe',
    description: 'Aapnu inventory joiye chhe — stock level, reorder alerts, category-wise breakdown, supplier info, aur fast-moving items highlight karva. Barcode scan support pan joiye.',
  },
  {
    label: '9. Settings — Multi-tenant Workspace Configuration',
    title: 'Workspace Settings',
    description: 'Admin settings panel for multi-tenant SaaS: workspace name, logo, domain, user roles and permissions, SSO configuration, billing plan, API keys, webhook setup, and audit log.',
  },
  {
    label: '10. CRM — Client Follow-up List with Pipeline',
    title: 'CRM Pipeline & Follow-ups',
    description: 'Sales CRM view showing client list with deal stages (lead, qualified, proposal, negotiation, closed), follow-up due dates, deal value, assigned rep, last contact, and quick notes.',
  },
]

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generatePrototype(title: string, description: string): Promise<any> {
  const res = await fetch(`${API_BASE}/prototype/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

async function run(): Promise<void> {
  console.log('='.repeat(60))
  console.log('Butterstack — Seed Script')
  console.log(`Seeding ${cases.length} prototype cases against ${API_BASE}`)
  console.log('='.repeat(60))
  console.log()

  const startTotal = Date.now()
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < cases.length; i++) {
    const { label, title, description } = cases[i]
    console.log(`Running: ${label}`)
    console.log(`  Title: ${title}`)
    console.log(`  Desc:  ${description.slice(0, 80)}${description.length > 80 ? '...' : ''}`)

    const start = Date.now()
    try {
      const result = await generatePrototype(title, description)
      const ms = Date.now() - start

      const tokens = result.tokens
      console.log(`  Result:`)
      console.log(`    page_type : ${tokens?.page_type ?? 'n/a'}`)
      console.log(`    source    : ${result.source ?? 'n/a'}`)
      console.log(`    fields    : ${tokens?.fields?.length ?? 0}`)
      console.log(`    sections  : ${tokens?.sections?.length ?? 0}`)
      console.log(`    actions   : ${tokens?.actions?.length ?? 0}`)
      console.log(`    cached    : ${result.cached}`)
      console.log(`    time      : ${ms}ms`)
      successCount++
    } catch (err: any) {
      const ms = Date.now() - start
      console.error(`  ERROR (${ms}ms): ${err?.message ?? err}`)
      errorCount++
    }

    console.log()

    if (i < cases.length - 1) {
      await delay(DELAY_MS)
    }
  }

  const totalMs = Date.now() - startTotal
  console.log('='.repeat(60))
  console.log(`Done. ${successCount} succeeded, ${errorCount} failed.`)
  console.log(`Total time: ${(totalMs / 1000).toFixed(2)}s`)
  console.log('='.repeat(60))
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
