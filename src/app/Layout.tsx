import { Link, Outlet, useLocation } from "react-router-dom";
import { Suspense } from "react";
import { Paintbrush, Layers, Grid, Compass, PenTool } from "lucide-react";
import { cn } from "../lib/utils";

const SuspenseFallback = () => (
  <div className="w-full h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-6">
      <div className="w-10 h-10 border-t-2 border-r-2 border-emerald-500 rounded-full animate-spin"></div>
      <p className="text-neutral-500 text-sm font-mono tracking-widest uppercase">Sedang Memuat Modul...</p>
    </div>
  </div>
);

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: Grid },
    { name: "Inkubasi Ide", path: "/inkubasi", icon: Compass },
    { name: "Visualisasi", path: "/visualisasi", icon: PenTool },
    { name: "Studio Vector", path: "/studio", icon: Paintbrush },
    { name: "Pra-Cetak", path: "/pra-cetak", icon: Layers },
  ];

  return (
    <div className="min-h-screen flex bg-neutral-950 text-neutral-200">
      {/* Sidebar - Minimal & Distraction Free */}
      <aside className="w-64 border-r border-neutral-900 bg-neutral-950/50 flex flex-col pt-12 pb-8 px-6 relative z-10">
        <div className="mb-16">
          <h1 className="text-xl font-serif text-neutral-100 flex items-center gap-3">
            <Paintbrush className="w-5 h-5 text-neutral-400" />
            <span className="tracking-wide">GRAFIRA</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-2 font-medium tracking-widest uppercase">
            Screen Print Studio
          </p>
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 py-2 px-3 rounded-md transition-all duration-300 ease-in-out",
                  "hover:text-neutral-50 hover:bg-neutral-900/50",
                  isActive
                    ? "text-neutral-50 bg-neutral-900 font-medium"
                    : "text-neutral-400",
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-neutral-200" : "text-neutral-500",
                  )}
                />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area - Generous Negative Space */}
      <main className="flex-1 overflow-y-auto relative bg-neutral-950">
        {/* Subtle grid background for the studio feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="relative z-10 p-16 max-w-5xl mx-auto min-h-full">
          <Suspense fallback={<SuspenseFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
