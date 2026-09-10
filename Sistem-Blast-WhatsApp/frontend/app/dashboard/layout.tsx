"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [appName, setAppName] = useState("TRYWSBLAST");
  const [logoUrl, setLogoUrl] = useState("/logo.jpeg");
  const [bgThemeType, setBgThemeType] = useState("DEFAULT");
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Simple mock protection (if no token, redirect to login)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/public`)
      .then((res) => res.json())
      .then((data) => {
        setIsAuthorized(true);
        if (data.appName) setAppName(data.appName);
        if (data.logoUrl) setLogoUrl(`${process.env.NEXT_PUBLIC_API_URL}${data.logoUrl}`);
        if (data.bgThemeType) setBgThemeType(data.bgThemeType);
        if (data.bgImageUrl) setBgImageUrl(`${process.env.NEXT_PUBLIC_API_URL}${data.bgImageUrl}`);
      })
      .catch((err) => {
        console.error(err);
        setIsAuthorized(true); // Biarkan render meskipun pengaturan gagal
      });
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "WhatsApp", path: "/dashboard/devices", icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" },
    { name: "Klaim Saldo", path: "/dashboard/withdraw", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { name: "Tim Afiliasi", path: "/dashboard/referral", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { name: "Pengaturan Akun", path: "/dashboard/profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ];

  return (
    <>
      {bgThemeType === 'PHOTO' && bgImageUrl && (
        <>
          <div 
            style={{ backgroundImage: `url(${bgImageUrl})` }}
            className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat"
          />
          <div className="fixed inset-0 z-[-1] bg-slate-900/80 backdrop-blur-md" />
        </>
      )}
      <div className={`min-h-screen text-slate-200 font-sans flex flex-col md:flex-row ${bgThemeType === 'DEFAULT' ? 'bg-slate-900' : 'bg-transparent'}`}>
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-800 border-r border-slate-700 h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center overflow-hidden shadow-lg">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">{appName}</span>
        </div>
        
        <nav className="flex-1 px-4 mt-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-indigo-500/10 text-indigo-400 font-semibold' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden pb-20 md:pb-0">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] supports-[backdrop-filter]:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-lg border border-indigo-400/20">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">{appName}</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-2 rounded-full hover:bg-slate-800 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-8">
          {children}
        </div>
      </main>

      {/* Bottom Navbar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 flex items-center justify-around pb-safe z-20">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.name} href={item.path} className={`flex flex-col items-center gap-1 p-3 flex-1 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isActive ? 'fill-indigo-500/20' : 'fill-transparent'}`} stroke="currentColor" strokeWidth={isActive ? 2 : 1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

    </div>
    </>
  );
}
