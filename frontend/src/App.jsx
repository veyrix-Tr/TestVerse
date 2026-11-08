import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Admin from './pages/Admin/Admin.jsx'
import Checkout from './pages/Checkout/Checkout.jsx'
import Home from './pages/Home/Home.jsx'
import Login from './pages/Login/Login.jsx'
import Signup from './pages/Signup/Signup.jsx'
import StudentHome from './pages/StudentHome/StudentHome.jsx'
import Test from './pages/Test/Test.jsx'

/*
  Routes map to the design's HTML files:
    testverse-home.html -> /
    checkout.html       -> /checkout
    student-home.html   -> /student
    test.html           -> /test
    admin.html          -> /admin
  /login and /signup have no design file; they reuse the checkout palette.
  Query strings (?ref=, ?exam=, ?test=P4&view=result …) are kept as-is.
*/
/* Test reads its query string once, so a <Link> from /test?test=P4 to
   /test?test=JA1 must remount it (and flush the old attempt on unmount). */
function TestRoute() {
  const { search } = useLocation()
  return <Test key={search} />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/student" element={<StudentHome />} />
        <Route path="/test" element={<TestRoute />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
