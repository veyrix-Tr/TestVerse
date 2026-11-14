import { useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { getToken } from '../../lib/session.js'
import { useToast } from '../../lib/useToast.jsx'
import Dropdown from './Dropdown.jsx'
import LiveStamp from './LiveStamp.jsx'
import { useDebounced } from './pickerHooks.js'
import { downloadCsv } from './studentsApi.js'
import { when } from './testsApi.js'
import { useLive } from './useLive.js'

/*
  Admin › Payments: every Cashfree checkout a student started (batch or test
  series), newest first, with totals, filters and a CSV export
  (backend/controllers/adminPaymentsController.js).
  Read-only. The one action is "Check with Cashfree" on a pending order: it
  asks Cashfree for the real status and, only if the order was paid, grants
  the purchase exactly as the student's return page would have (safe to
  press twice). There are no refunds or edits.
*/

const PAGE = 50
const NO_FILTERS = { q: '', status: '', item: '', from: '', to: '' }

const STATUS = {
  paid: { label: 'Paid', cls: 'p-published' },
  pending: { label: 'Pending', cls: 'p-warn' },
  failed: { label: 'Failed', cls: 'p-off' },
}
const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]

const call = (path, opts = {}) => api('/admin' + path, { ...opts, token: getToken() })
function listPayments(filters, offset, limit) {
  const q = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => v && q.set(k, v))
  if (filters.item) {
    // "batch:<id>" / "series:<id>" from the Bought dropdown
    const [kind, id] = filters.item.split(':')
    q.set('kind', kind)
    q.set('item', id)
  }
  q.set('offset', offset)
  q.set('limit', limit)
  return call('/payments?' + q.toString())
}
const checkPayment = (id) => call('/payments/' + encodeURIComponent(id) + '/check', { body: {} })

const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
const plural = (n, w) => n.toLocaleString('en-IN') + ' ' + w + (n === 1 ? '' : 's')
const kindText = (k) => (k === 'batch' ? 'Batch' : k === 'series' ? 'Test series' : k)
const itemText = (p) => (p.item ? p.item.name : kindText(p.kind) + ' (deleted)')
// When it was paid: just the time on the same day, else "13 Nov, 8:08 pm"
function paidText(created, paid) {
  const a = new Date(created)
  const b = new Date(paid)
  if (isNaN(b)) return ''
  const time = b.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  return a.toDateString() === b.toDateString() ? 'at ' + time : b.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + time
}

// A pending checkout older than this was most likely abandoned
const STALE_MS = 30 * 60 * 1000

export default function PaymentsAdmin() {
  const { toast, node: toastNode } = useToast()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [want, setWant] = useState(PAGE)
  const [checking, setChecking] = useState(null) // payment id
  const [exporting, setExporting] = useState(false)
  const q = useDebounced(filters.q, 300)
  const query = useMemo(() => ({ ...filters, q: q.trim() }), [filters, q])
  const queryKey = JSON.stringify(query)

  const live = useLive(() => listPayments(query, 0, want), queryKey + ':' + want, queryKey === JSON.stringify(NO_FILTERS) && want === PAGE ? 'payments' : null)
  const d = live.data
  const s = d && d.summary
  const rows = (d && d.payments) || []
  const filtered = !!(filters.q.trim() || filters.status || filters.item || filters.from || filters.to)
  // New filters start from the first page again
  const set = (k) => (v) => {
    setFilters((f) => ({ ...f, [k]: v }))
    setWant(PAGE)
  }
  const itemOptions = [
    { value: '', label: 'Any batch or series' },
    ...((d && d.items) || []).map((i) => ({ value: i.kind + ':' + i.id, label: (i.kind === 'batch' ? 'Batch · ' : 'Series · ') + i.name })),
  ]
  const cf = d && d.cashfree

  async function check(p) {
    setChecking(p.id)
    try {
      const r = await checkPayment(p.id)
      live.setData((cur) => (cur ? { ...cur, payments: cur.payments.map((x) => (x.id === p.id ? r.payment : x)) } : cur))
      if (r.payment.status === 'paid') toast(r.changed ? 'Paid on Cashfree. ' + r.payment.student?.name + ' now has access.' : 'This order is already paid.', 4000)
      else if (r.payment.status === 'failed') toast('Cashfree says this order ' + (r.orderStatus === 'TERMINATED' ? 'was cancelled' : 'expired') + ' without payment. Marked as failed.', 4000)
      else toast('Not paid yet on Cashfree (' + (r.orderStatus || 'ACTIVE') + '). The student may still finish paying.', 4000)
      live.refresh() // totals
    } catch (e) {
      toast(e.message, 5000)
    } finally {
      setChecking(null)
    }
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const all = await listPayments(query, 0, 5000)
      const head = ['Date', 'Student', 'Email', 'Mobile', 'Type', 'Bought', 'Amount (INR)', 'Status', 'Paid at', 'Cashfree order id', 'Cashfree payment id']
      downloadCsv('testverse-payments-' + new Date().toISOString().slice(0, 10) + '.csv', [
        head,
        ...all.payments.map((p) => [
          when(p.createdAt),
          p.student ? p.student.name : '(deleted account)',
          p.student ? p.student.email : '',
          p.student ? p.student.phone || '' : '',
          kindText(p.kind),
          itemText(p),
          p.amount,
          (STATUS[p.status] || { label: p.status }).label,
          when(p.paidAt),
          p.orderId,
          p.cfPaymentId || '',
        ]),
      ])
      toast('Exported ' + plural(all.payments.length, 'payment'))
    } catch (e) {
      toast("Couldn't export. " + e.message, 4000)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="head sg-head">
        <div>
          <h1>Payments</h1>
          <p>Every Cashfree checkout for a batch or a test series: who paid, for what, and how much. Payments are kept as a record and can’t be edited.</p>
        </div>
        <div className="pay-head-end">
          {cf && cf.enabled && cf.mode === 'TEST' ? <span className="pill p-warn">Cashfree test mode</span> : null}
          <LiveStamp at={live.at} loading={live.loading} error={live.error} onRefresh={live.refresh} />
          {s && s.all ? (
            <button className="btn btn-primary btn-sm" type="button" onClick={exportCsv} disabled={exporting || !d.total} title={filtered ? 'Exports the payments that match your filters' : 'Exports every payment'}>
              {exporting ? 'Exporting…' : 'Download CSV'}
            </button>
          ) : null}
        </div>
      </div>

      {cf && !cf.enabled ? (
        <div className="alert a-warn">
          <span>Cashfree isn’t set up on this server, so students can’t pay online right now. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in the backend’s environment.</span>
        </div>
      ) : null}

      <div className="stats pay-stats">
        <Stat label="Received" value={s && rupees(s.revenue)} note={s && (s.paid ? plural(s.paid, 'paid order') + ', all time' : 'Nothing received yet')} />
        <Stat label="This month" value={s && rupees(s.monthRevenue)} note={s && (s.monthPaid ? plural(s.monthPaid, 'paid order') : 'No payments this month')} />
        <Stat label="Pending" value={s && s.pending.toLocaleString('en-IN')} note={s && (s.pending ? 'Checkouts not finished yet' : 'None waiting')} />
        <Stat label="Failed" value={s && s.failed.toLocaleString('en-IN')} note={s && (s.failed ? 'Expired or cancelled checkouts' : 'None failed')} />
      </div>

      {live.error && !d ? (
        <div className="alert a-err" role="alert">
          <span className="ts-grow">Couldn&apos;t load payments. {live.error}</span>
          <button className="btn btn-outline btn-sm" type="button" disabled={live.loading} onClick={() => live.refresh()}>
            {live.loading ? 'Trying…' : 'Try again'}
          </button>
        </div>
      ) : !d ? (
        <div className="table-wrap ts-loading" aria-busy="true">
          <p className="hint">Loading payments…</p>
        </div>
      ) : s.all === 0 ? (
        <div className="card ts-empty">
          <h2>No payments yet</h2>
          <p className="hint">When a student buys a batch or a test series with Cashfree, the payment shows up here, from the moment they open the checkout until it’s paid.</p>
        </div>
      ) : (
        <>
          <div className="filters sg-filters pay-filters">
            <label className="sr" htmlFor="pay-q">
              Search payments
            </label>
            <input
              className="input search"
              id="pay-q"
              type="search"
              data-live-ok
              value={filters.q}
              placeholder="Name, email, mobile or order id"
              onChange={(e) => set('q')(e.target.value)}
            />
            <Dropdown id="pay-status" label="Status" value={filters.status} onChange={set('status')} options={STATUS_OPTIONS} />
            <Dropdown id="pay-item" label="Bought" value={filters.item} onChange={set('item')} options={itemOptions} />
            <label className="pay-date">
              <span>From</span>
              <input className="input" type="date" aria-label="From date" value={filters.from} max={filters.to || undefined} onChange={(e) => set('from')(e.target.value)} />
            </label>
            <label className="pay-date">
              <span>To</span>
              <input className="input" type="date" aria-label="To date" value={filters.to} min={filters.from || undefined} onChange={(e) => set('to')(e.target.value)} />
            </label>
            <div className="sg-filters-end">
              {filtered ? (
                <button className="btn btn-outline btn-sm" type="button" onClick={() => {
                    setFilters(NO_FILTERS)
                    setWant(PAGE)
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <p className="hint pay-count" aria-live="polite">
            {filtered ? plural(d.total, 'payment') + ' match' + (d.total === 1 ? 'es' : '') : plural(d.total, 'payment')}
            {d.total > rows.length ? ' · showing the newest ' + rows.length : ''}
          </p>

          <div className="table-wrap pay-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Bought</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                  <th scope="col">Cashfree order</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((p) => <Row key={p.id} p={p} canCheck={!!(cf && cf.enabled)} busy={checking === p.id} onCheck={() => check(p)} />)
                ) : (
                  <tr>
                    <td className="hint" colSpan={6}>
                      No payments match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {d.total > rows.length ? (
            <div className="pay-more">
              <button className="btn btn-outline" type="button" disabled={live.loading} onClick={() => setWant((w) => w + PAGE)}>
                {live.loading ? 'Loading…' : 'Show ' + Math.min(PAGE, d.total - rows.length) + ' more'}
              </button>
            </div>
          ) : null}
        </>
      )}
      {toastNode}
    </>
  )
}

function Row({ p, canCheck, busy, onCheck }) {
  const st = STATUS[p.status] || { label: p.status, cls: 'p-draft' }
  const stale = p.status === 'pending' && Date.now() - new Date(p.createdAt).getTime() > STALE_MS
  return (
    <tr>
      <td className="pay-who">
        <b>{p.student ? p.student.name : 'Deleted account'}</b>
        {p.student ? <span className="sub">{p.student.email}</span> : null}
        {p.student && p.student.phone ? <span className="sub">{p.student.phone}</span> : null}
      </td>
      <td data-label="Bought">
        {itemText(p)}
        <span className="sub">{kindText(p.kind)}</span>
      </td>
      <td data-label="Amount" className="pay-amt">
        <b>{rupees(p.amount)}</b>
      </td>
      <td data-label="Status" className="pay-status">
        <span className={'pill ' + st.cls}>{st.label}</span>
        {stale ? <span className="sub">Likely abandoned</span> : null}
        {p.status === 'pending' && canCheck ? (
          <button className="btn btn-outline btn-sm pay-check" type="button" disabled={busy} onClick={onCheck} title="Ask Cashfree whether this order was paid">
            {busy ? 'Checking…' : 'Check with Cashfree'}
          </button>
        ) : null}
      </td>
      <td data-label="Date" className="pay-date-cell">
        {when(p.createdAt)}
        {p.paidAt ? <span className="sub">Paid {paidText(p.createdAt, p.paidAt)}</span> : null}
      </td>
      <td data-label="Cashfree order" className="pay-ids">
        <code>{p.orderId}</code>
        {p.cfPaymentId ? <span className="sub">Payment {p.cfPaymentId}</span> : null}
      </td>
    </tr>
  )
}

function Stat({ label, value, note }) {
  return (
    <div className="card stat">
      <span>{label}</span>
      {value == null ? (
        <b aria-busy="true">
          <span className="skel skel-stat"></span>
          <span className="sr">Loading</span>
        </b>
      ) : (
        <b>{value}</b>
      )}
      <small>{note || (value == null ? <span className="skel skel-note"></span> : null)}</small>
    </div>
  )
}
