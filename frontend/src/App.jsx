import logo from './assets/logo.svg'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <img src={logo} className="logo" alt="Testverse" />
      </header>
      <main className="main">
        <h1>Welcome to Testverse</h1>
        <p>Your frontend is ready for development</p>
      </main>
    </div>
  )
}

export default App
