import { HashRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Mission from './pages/Mission'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/challenger" element={<Mission mission="challenger" />} />
        <Route path="/columbia" element={<Mission mission="columbia" />} />
      </Routes>
    </HashRouter>
  )
}
