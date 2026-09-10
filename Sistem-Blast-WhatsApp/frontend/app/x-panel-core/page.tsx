"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../contexts/LanguageContext";

export default function AdminDashboardOverview() {
  const [data, setData] = useState({
    readyNumbers: 0,
    totalWa: 0,
    activeWa: 0,
    totalUsers: 0,
    activeCampaign: null as any
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const { t } = useLanguage();

  // UI States
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: t("admin_modal_stop_confirm"),
    cancelText: t("admin_modal_cancel"),
    onConfirm: () => {}
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const openModal = (config: any) => {
    setModalConfig({ ...modalConfig, ...config, cancelText: t("admin_modal_cancel") });
    setModalOpen(true);
  };

  const handleStopAllBlasts = () => {
    openModal({
      title: t("admin_modal_stop_title"),
      message: t("admin_modal_stop_msg"),
      confirmText: t("admin_modal_stop_confirm"),
      onConfirm: async () => {
        setIsStopping(true);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/admin/stop-all-blast`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}`
            }
          });
          const resData = await res.json();
          if (res.ok) {
            showToast(resData.message || t("admin_toast_stop_success"), "success");
          } else {
            showToast(resData.error || t("admin_toast_stop_fail"), "error");
          }
        } catch (error) {
          showToast(t("admin_toast_network_error"), "error");
        } finally {
          setIsStopping(false);
        }
      }
    });
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-md relative overflow-hidden">
        {/* Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

        <div className="relative z-10 w-full flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
              {t("admin_dash_title")}
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-lg">
              {t("admin_dash_subtitle")}
            </p>
          </div>
          <Link href="/x-panel-core/monitor" className="opacity-20 hover:opacity-100 transition-opacity p-2 bg-slate-800 rounded-full border border-slate-700 tooltip-trigger" title="Engine Monitor">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Analytics Grid (4 Items Now) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Users */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:border-slate-500 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t("admin_dash_total_workers")}</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-extrabold text-white">{data.totalUsers}</span>
            <span className="text-purple-400 font-medium mb-1">{t("admin_dash_user")}</span>
          </div>
          <Link href="/x-panel-core/users" className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 w-max bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
            {t("admin_dash_manage")} <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </Link>
        </div>

        {/* Nomor Ready */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:border-slate-500 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t("admin_dash_ready_targets")}</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-extrabold text-white">{data.readyNumbers}</span>
            <span className="text-teal-400 font-medium mb-1">{t("admin_dash_target")}</span>
          </div>
          <Link href="/x-panel-core/targets" className="text-[10px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 w-max bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20">
            {t("admin_dash_detail")} <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </Link>
        </div>

        {/* WA Terdaftar */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:border-slate-500 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t("admin_dash_total_devices")}</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-extrabold text-white">{data.totalWa}</span>
            <span className="text-indigo-400 font-medium mb-1">{t("admin_dash_registered")}</span>
          </div>
           <div className="text-[10px] text-slate-400 font-medium bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/50 w-max">{t("admin_dash_all_users")}</div>
        </div>

        {/* WA Aktif */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:border-slate-500 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t("admin_dash_active_wa")}</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-extrabold text-white">{data.activeWa}</span>
            <span className="text-emerald-400 font-medium mb-1">{t("admin_dash_online")}</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-max">
            {t("admin_dash_ready_shoot")}
          </div>
        </div>

      </div>

      {/* Quick Actions (Below Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
         <Link href="/x-panel-core/users" className="flex items-center gap-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 p-4 rounded-2xl transition-all group">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
               </svg>
            </div>
            <div>
               <h3 className="text-white font-bold text-lg">{t("admin_dash_monitor_workers")}</h3>
               <p className="text-slate-400 text-sm">{t("admin_dash_monitor_desc")}</p>
            </div>
         </Link>

         <Link href="/x-panel-core/campaigns" className="flex items-center gap-4 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 p-4 rounded-2xl transition-all group">
            <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
               </svg>
            </div>
            <div>
               <h3 className="text-white font-bold text-lg">{t("admin_dash_manage_campaigns")}</h3>
               <p className="text-slate-400 text-sm">{t("admin_dash_campaign_desc")}</p>
            </div>
         </Link>

         <Link href="/x-panel-core/reports" className="flex items-center gap-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl transition-all group">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
            </div>
            <div>
               <h3 className="text-white font-bold text-lg">{t("admin_dash_reports")}</h3>
               <p className="text-slate-400 text-sm">{t("admin_dash_reports_desc")}</p>
            </div>
         </Link>

         {/* Panic Button: Stop All Blasts */}
         <button 
           onClick={handleStopAllBlasts}
           disabled={isStopping}
           className="flex w-full text-left items-center gap-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 p-4 rounded-2xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
               {isStopping ? (
                 <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-400 border-t-transparent"></div>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                 </svg>
               )}
            </div>
            <div>
               <h3 className="text-red-400 font-bold text-lg">{t("admin_dash_stop_all")}</h3>
               <p className="text-red-400/70 text-sm">{t("admin_dash_stop_desc")}</p>
            </div>
         </button>
      </div>

      {/* Kampanye Aktif Saat Ini */}
      <div className="mt-8 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{t("admin_dash_current_campaign")}</h2>
        </div>
        
        {data.activeCampaign ? (
          <div className="bg-slate-800/80 backdrop-blur-xl border border-teal-500/30 p-2 sm:p-4 rounded-[2.5rem] shadow-[0_30px_60px_rgba(20,184,166,0.1)] relative overflow-hidden group transition-all hover:border-teal-400/50">
            
            {/* Glow Background inside card */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/40 to-emerald-900/10"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-6 lg:gap-8 items-center bg-slate-900/40 p-6 rounded-[2rem] border border-slate-700/50">
              
              {data.activeCampaign.mediaUrl ? (
                <div className="w-full md:w-64 h-40 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 relative group-hover:scale-[1.02] transition-transform duration-500">
                  <img src={`${process.env.NEXT_PUBLIC_API_URL}${data.activeCampaign.mediaUrl}`} className="w-full h-full object-cover" alt="Campaign Banner" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                </div>
              ) : (
                <div className="w-full md:w-64 h-40 flex-shrink-0 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              <div className="flex-1 w-full text-center md:text-left flex flex-col justify-center">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                  </span>
                  <span className="text-xs font-black text-teal-400 tracking-[0.2em] uppercase">{t("admin_dash_status_running")}</span>
                </div>
                
                <h3 className="text-3xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">{data.activeCampaign.name}</h3>
                
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/50 max-w-2xl text-left shadow-inner">
                  <p className="text-slate-300 text-sm line-clamp-3 leading-relaxed italic">
                    "{data.activeCampaign.messageTemplate}"
                  </p>
                </div>
              </div>
              
              <div className="w-full md:w-auto flex-shrink-0 md:pr-4">
                 <Link href="/x-panel-core/campaigns" className="group flex items-center justify-center w-full md:w-16 md:h-16 bg-slate-800 hover:bg-teal-500 text-slate-400 hover:text-slate-900 rounded-2xl md:rounded-full border border-slate-600 hover:border-teal-400 transition-all shadow-lg py-4 md:py-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                 </Link>
                 <span className="hidden md:block text-[10px] text-center text-slate-500 font-bold uppercase mt-2">{t("admin_dash_change")}</span>
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border-2 border-dashed border-slate-700 p-12 rounded-[2.5rem] text-center">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{t("admin_dash_machine_stopped")}</h3>
            <p className="text-slate-400 text-sm mb-8 max-w-lg mx-auto leading-relaxed">
              {t("admin_dash_stopped_desc")}
            </p>
            <Link href="/x-panel-core/campaigns" className="inline-flex items-center gap-2 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-black tracking-wide rounded-2xl transition-all shadow-[0_10px_30px_rgba(20,184,166,0.3)] hover:shadow-[0_15px_40px_rgba(20,184,166,0.5)] hover:-translate-y-1">
               {t("admin_dash_launch_campaign")} <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </Link>
          </div>
        )}
      </div>
      
      {/* Modal Konfirmasi */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{modalConfig.title}</h3>
              <p className="text-slate-400 text-sm mb-6">{modalConfig.message}</p>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setModalOpen(false)} 
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {modalConfig.cancelText}
                </button>
                <button 
                  onClick={() => {
                    modalConfig.onConfirm();
                    setModalOpen(false);
                  }} 
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors shadow-md bg-red-500 hover:bg-red-400"
                >
                  {modalConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] border ${
            toastType === 'success' 
              ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100' 
              : 'bg-red-900/90 border-red-500/50 text-red-100'
          }`}>
            {toastType === 'success' ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <p className="font-bold text-sm tracking-wide">{toastMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
