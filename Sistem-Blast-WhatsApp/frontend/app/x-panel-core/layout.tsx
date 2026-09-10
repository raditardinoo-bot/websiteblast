"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [bgThemeType, setBgThemeType] = useState("DEFAULT");
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (!token) {
      router.push("/portal-bos");
    }
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    fetch(`${API_URL}/api/settings`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) {
          router.push("/portal-bos");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setIsAuthorized(true);
        if (data.bgThemeType) setBgThemeType(data.bgThemeType);
        if (data.bgImageUrl) setBgImageUrl(`${API_URL}${data.bgImageUrl}`);
      })
      .catch(() => {
        // Silent catch for network errors
        router.push("/portal-bos");
      });
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    router.push("/portal-bos");
  };

  const navItems = [
    { name: t("admin_nav_overview"), path: "/x-panel-core", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { name: t("admin_nav_users"), path: "/x-panel-core/users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { name: t("admin_nav_campaigns"), path: "/x-panel-core/campaigns", icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
    { name: t("admin_nav_targets"), path: "/x-panel-core/targets", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" },
    { name: t("admin_nav_reports"), path: "/x-panel-core/reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: t("admin_nav_withdraw"), path: "/x-panel-core/withdraw", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { name: t("admin_nav_admins"), path: "/x-panel-core/admins", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { name: t("admin_nav_settings"), path: "/x-panel-core/settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
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
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center overflow-hidden shadow-lg border border-teal-400">
              <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">AdminPortal</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 mt-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-3">
          {/* Desktop Language Switcher */}
          <div className="flex items-center justify-between px-2 bg-slate-900/50 py-2 rounded-xl border border-slate-700/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-2">{t("language")}</span>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as "id" | "zh")}
              className="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg focus:ring-teal-500 focus:border-teal-500 p-1.5 cursor-pointer outline-none hover:border-slate-500 transition-colors"
            >
              <option value="id">🇮🇩 {t("id_lang")}</option>
              <option value="zh">🇨🇳 {t("zh_lang")}</option>
            </select>
          </div>
          
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium border border-transparent hover:border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t("admin_nav_logout")}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen overflow-x-hidden pb-20 md:pb-0 ${bgThemeType === 'DEFAULT' ? 'bg-[#0B1120]' : 'bg-transparent'}`}>
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center overflow-hidden">
              <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as "id" | "zh")}
              className="bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg focus:ring-teal-500 focus:border-teal-500 p-1 cursor-pointer outline-none"
            >
              <option value="id">🇮🇩</option>
              <option value="zh">🇨🇳</option>
            </select>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-8">
          {children}
        </div>
      </main>

      {/* Bottom Navbar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 flex items-center justify-start pb-safe z-20 overflow-x-auto px-4 hide-scrollbar snap-x">
        <div className="flex w-max gap-2 min-w-full justify-between">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.name} href={item.path} className={`flex flex-col items-center justify-center gap-1 p-2 w-[72px] shrink-0 snap-center rounded-xl transition-all ${isActive ? 'text-teal-400 bg-teal-500/10' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive ? 'fill-teal-500/20' : 'fill-transparent'}`} stroke="currentColor" strokeWidth={isActive ? 2 : 1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-[9px] font-bold truncate w-full text-center leading-tight">{item.name}</span>
            </Link>
          );
        })}
        </div>
      </nav>

    </div>
    </>
  );
}
