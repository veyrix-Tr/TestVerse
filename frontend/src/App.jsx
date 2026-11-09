import { Navigate, RouterProvider, createBrowserRouter, redirect, useLocation } from 'react-router-dom'
import { checkSession } from './lib/session.js'

/*
  Routes map to the design's HTML files:
    testverse-home.html -> /
    student-home.html   -> /student
    test.html           -> /test
    admin.html          -> /admin
  /login, /signup and /subscribe have no design file.
  /student needs a signed-in student session (email + password, see
  lib/session.js). Without an active batch it shows only the free mock tests
  (the server decides which tests each student gets); /subscribe is where a
  student buys a batch.
  Query strings (?ref=, ?exam=, ?test=P4&view=result …) are kept as-is.
  A data router (createBrowserRouter) is used because <Link viewTransition>
  only animates under RouterProvider. Each page is loaded on demand; the
  router waits for it before committing, so transitions still capture the
  finished page.
*/
/* Lazy route: a page module whose default export is the screen. */
const page = (load) => ({
  lazy: () => load().then((m) => ({ Component: m.default })),
  HydrateFallback: () => null,
})

/* Signed-in only: confirm the session with the server, else go to /login and come back. */
async function requireSession({ request }) {
  if (await checkSession()) return null
  const { pathname, search } = new URL(request.url)
  return redirect('/login?next=' + encodeURIComponent(pathname + search))
}

/* Signed-in students, with or without a batch. Admins go to their console. */
async function requireStudent(args) {
  const user = await checkSession()
  if (!user) return requireSession(args)
  return user.role === 'admin' ? redirect('/admin') : null
}

/* The batch page is for signed-in students who don't have a batch yet. */
async function requireNoSubscription(args) {
  const user = await checkSession()
  if (!user) return requireSession(args)
  if (user.role === 'admin') return redirect('/admin')
  return user.subscription?.status === 'active' ? redirect('/student') : null
}

/* Admin accounts only (the server checks the role again on every admin API call). */
async function requireAdmin(args) {
  const user = await checkSession()
  if (!user) return requireSession(args)
  return user.role === 'admin' ? null : redirect('/student')
}

/* Test reads its query string once, so a <Link> from /test?test=a to
   /test?test=b (or to &view=result) must remount it (and flush the old attempt on unmount). */
const testPage = {
  lazy: () =>
    import('./pages/Test/Test.jsx').then(({ default: Test }) => ({
      Component: function TestRoute() {
        const { search } = useLocation()
        return <Test key={search} />
      },
    })),
  HydrateFallback: () => null,
}

const router = createBrowserRouter([
  { path: '/', ...page(() => import('./pages/Home/Home.jsx')) },
  { path: '/login', ...page(() => import('./pages/Login/Login.jsx')) },
  { path: '/signup', ...page(() => import('./pages/Signup/Signup.jsx')) },
  { path: '/subscribe', loader: requireNoSubscription, ...page(() => import('./pages/Subscribe/Subscribe.jsx')) },
  { path: '/checkout', element: <Navigate to="/subscribe" replace /> },
  // One route for the dashboard and its coming-soon pages (/student/analysis …),
  // so moving between them keeps the page mounted instead of rebuilding it.
  {
    path: '/student/:page?',
    loader: requireStudent,
    // The session was checked on the way in; the server checks it on every API call too
    shouldRevalidate: ({ currentUrl, nextUrl }) => !currentUrl.pathname.startsWith('/student') || !nextUrl.pathname.startsWith('/student'),
    ...page(() => import('./pages/StudentHome/StudentHome.jsx')),
  },
  { path: '/test', loader: requireSession, ...testPage },
  { path: '/admin', loader: requireAdmin, ...page(() => import('./pages/Admin/Admin.jsx')) },
  { path: '*', element: <Navigate to="/" replace /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
