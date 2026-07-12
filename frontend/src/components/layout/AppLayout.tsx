import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile Header */}
        <div className="mobile-header" style={{ display: 'none', padding: '16px', background: '#111', alignItems: 'center', gap: '16px', zIndex: 900 }}>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsSidebarOpen(true)}
            style={{ color: 'white' }}
          >
            ☰
          </button>
          <div style={{ color: 'white', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
            GUIOS PRO
          </div>
        </div>
        
        <main style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
