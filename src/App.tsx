import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Story from './pages/Story'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Story />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
