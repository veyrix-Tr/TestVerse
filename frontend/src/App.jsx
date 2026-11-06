import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Admin from './pages/Admin/Admin.jsx'
import Checkout from './pages/Checkout/Checkout.jsx'
import Home from './pages/Home/Home.jsx'
import StudentHome from './pages/StudentHome/StudentHome.jsx'
import Test from './pages/Test/Test.jsx'

/*
  Routes map to the design's HTML files:
    testverse-home.html -> /
    checkout.html       -> /checkout
    student-home.html   -> /student
    test.html           -> /test
    admin.html          -> /admin
  Query strings (?ref=, ?exam=, ?test=P4&view=result …) are kept as-is.
*/
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/student" element={<StudentHome />} />
        <Route path="/test" element={<Test />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
