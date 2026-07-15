import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

/**
 * Layout — shared shell for all authenticated pages.
 *
 * Renders the Navbar and delegates page content to React Router's Outlet.
 */
export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className={`app-layout${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Navbar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
