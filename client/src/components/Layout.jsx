import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

/**
 * Layout — shared shell for all authenticated pages.
 *
 * Renders the Navbar and delegates page content to React Router's Outlet.
 */
export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
