import { Navigate, RouterProvider, createBrowserRouter, useLocation } from 'react-router-dom'

/*
  Routes map to the design's HTML files:
    testverse-home.html -> /
    checkout.html       -> /checkout
    student-home.html   -> /student
    test.html           -> /test
    admin.html          -> /admin
  /login and /signup have no design file; they reuse the checkout palette.
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

/* Test reads its query string once, so a <Link> from /test?test=P4 to
   /test?test=JA1 must remount it (and flush the old attempt on unmount). */
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
  { path: '/checkout', ...page(() => import('./pages/Checkout/Checkout.jsx')) },
  { path: '/student', ...page(() => import('./pages/StudentHome/StudentHome.jsx')) },
  { path: '/test', ...testPage },
  { path: '/admin', ...page(() => import('./pages/Admin/Admin.jsx')) },
  { path: '*', element: <Navigate to="/" replace /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
