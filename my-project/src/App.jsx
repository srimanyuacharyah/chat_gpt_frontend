import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/home'
import About from './pages/about'
import Contact from './pages/contact'
import Header from './components/Header'
import Footer from './components/footer'

function App() {
  return (
    <Router>
      <Header />
      

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
      <Footer />
    </Router>
  )
}

export default App