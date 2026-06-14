'use client';

import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/medicines', label: 'Medicines' },
    { href: '/pos', label: 'POS' },
    { href: '/purchases', label: 'Purchases' },
    { href: '/sales', label: 'Sales' },
    { href: '/reports', label: 'Reports' },
  ];

  return (
    <nav className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary">PharmaTrack</h1>
        <p className="text-sm text-muted-foreground mt-1">Inventory System</p>
      </div>
      <ul className="flex-1 overflow-y-auto p-4 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;  // ← simplified, no more /pos default
          return (
            <li key={link.href}>
              <a
                  href={link.href}
                className={`block px-4 py-2 rounded-md transition font-medium ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
      {/* ← moved INSIDE the return */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => {
            document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            window.location.href = '/login';
          }}
          className="w-full px-4 py-2 bg-destructive text-white rounded-md text-sm font-medium hover:opacity-90 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}