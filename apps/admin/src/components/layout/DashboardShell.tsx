import { Sidebar } from './Sidebar';

// ---------------------------------------------------------------------------
// DashboardShell – top-level layout combining Sidebar + main content area
// ---------------------------------------------------------------------------

interface DashboardShellProps {
  children: React.ReactNode;
  /** Page title displayed in the top bar */
  title?: string;
}

export function DashboardShell({ children, title }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center border-b border-gray-200 bg-white px-6 shadow-sm">
          {/* Spacer on mobile so hamburger button doesn't overlap title */}
          <div className="w-10 lg:hidden" />
          <h1 className="text-base font-semibold text-gray-800 lg:text-lg">
            {title ?? 'Vee Admin'}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">
              admin@vee-handmade.de
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              V
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
