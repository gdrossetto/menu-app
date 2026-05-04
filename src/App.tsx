import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import EditMenu from './pages/EditMenu'
import PublicMenu from './pages/PublicMenu'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/menu" element={<EditMenu />} />
        <Route path="/m/:restaurantId" element={<PublicMenu />} />
      </Routes>
    </Router>
  )
}

export default App
