/*
  Cashfree checkout in the browser. The backend creates the order (and picks
  sandbox vs live through CASHFREE_MODE); here we load Cashfree's JS SDK and
  send the student to its hosted checkout. Cashfree then brings them back to
  /payment/return?order_id=…, where PaymentReturn asks the backend to confirm.
*/
let sdk = null

function loadSdk() {
  if (window.Cashfree) return Promise.resolve(window.Cashfree)
  if (sdk) return sdk
  sdk = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
    s.async = true
    s.onload = () => (window.Cashfree ? resolve(window.Cashfree) : reject(new Error('Cashfree did not load')))
    s.onerror = () => {
      sdk = null // let a retry load it again
      reject(new Error("Couldn't load the payment page. Check your connection and try again."))
    }
    document.head.appendChild(s)
  })
  return sdk
}

/* Calls `reset` when the browser brings this page back from its back/forward
   cache — i.e. the student pressed Back on Cashfree's page — so a button left
   on "Opening secure payment…" works again. Returns the cleanup function. */
export function onReturnFromCheckout(reset) {
  const onShow = (e) => {
    if (e.persisted) reset()
  }
  window.addEventListener('pageshow', onShow)
  return () => window.removeEventListener('pageshow', onShow)
}

/* Opens the checkout for a { paymentSessionId, mode } the backend returned.
   The tab navigates away to Cashfree; this only resolves if that didn't happen
   (and throws if Cashfree reported an error). */
export async function openCheckout({ paymentSessionId, mode }) {
  if (!paymentSessionId) throw new Error('Missing payment session')
  const Cashfree = await loadSdk()
  const cashfree = Cashfree({ mode: mode === 'TEST' ? 'sandbox' : 'production' })
  const result = await cashfree.checkout({ paymentSessionId, redirectTarget: '_self' })
  if (result && result.error) throw new Error(result.error.message || 'The payment could not be started.')
  return result
}
