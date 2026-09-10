"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UserDashboardOverview() {
  const router = useRouter();
  const [data, setData] = useState({
    user: { name: "", username: "", tier: "REGULAR", balance: 0, joinedAt: "", bankType: "BANK" },
    stats: { totalWa: 0, activeWa: 0, offlineWa: 0, income: 0, messagesSent: 0 },
    settings: { 
      rewardPerMessage: 50, 
      minWithdrawalBank: 50000, 
      minWithdrawalEwallet: 10000,
      ruleProfileName: "",
      ruleProfilePhotoUrl: "",
      popupEnabledDashboard: true,
      popupType: "IMAGE",
      popupMediaUrls: "",
      popupText: ""
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user-dashboard`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(d => {
        setData(d);
        setIsLoading(false);
        if (d.settings.popupEnabledDashboard && !sessionStorage.getItem("dashboardPopupShown")) {
          setShowPopup(true);
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-emerald-500"></div>
      </div>
    );
  }

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka);
  };

  const handleDownloadProfile = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "Aturan_Profil.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, "_blank");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d);
  };

  const minWithdraw = data.user.bankType === 'EWALLET' ? data.settings.minWithdrawalEwallet : data.settings.minWithdrawalBank;

  const closePopup = () => {
    sessionStorage.setItem("dashboardPopupShown", "true");
    setShowPopup(false);
  };

  const getMediaUrls = () => {
    if (!data.settings.popupMediaUrls) return [];
    try {
      return JSON.parse(data.settings.popupMediaUrls);
    } catch(e) {
      return [data.settings.popupMediaUrls];
    }
  };
  const mediaUrls = getMediaUrls();

  const getEmbedUrl = (url: string) => {
    if (!url) return url;
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      


      {/* Header */}
      <div className={`flex flex-col justify-center gap-2 bg-slate-800/40 border p-6 rounded-2xl backdrop-blur-md relative overflow-hidden ${data.user.tier === 'VIP' ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-slate-700/50'}`}>
        {/* Glows */}
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] ${data.user.tier === 'VIP' ? 'bg-amber-500/20' : 'bg-emerald-500/10'}`}></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <p className={`font-bold tracking-widest text-[10px] uppercase ${data.user.tier === 'VIP' ? 'text-amber-400' : 'text-emerald-400'}`}>
              Selamat Datang,
            </p>
            {data.user.tier === 'VIP' && (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/50 text-[9px] font-extrabold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                VIP
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-1 capitalize">
            {data.user.name}
          </h1>
          <p className="text-slate-400 text-xs max-w-lg">
            Pantau statistik mesin pengirim pesan Anda dan kelola performa perangkat sekarang.
          </p>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pesan Berhasil */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-500 transition-colors">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pesan Terkirim</h3>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-2xl font-extrabold text-white">{data.stats.messagesSent}</span>
          </div>
          <div className="text-[9px] text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 w-max">
            Total Seluruh Waktu
          </div>
        </div>

        {/* Total Devices */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-500 transition-colors">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Nomor WA</h3>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-2xl font-extrabold text-white">{data.stats.totalWa}</span>
          </div>
          <div className="text-[9px] text-indigo-400 font-medium bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 w-max">
            Perangkat Anda
          </div>
        </div>

        {/* WA Aktif */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-500 transition-colors">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status: Aktif</h3>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-2xl font-extrabold text-white">{data.stats.activeWa}</span>
          </div>
          <div className="text-[9px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 w-max">
            Siap Mengirim
          </div>
        </div>

        {/* WA Offline */}
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-500 transition-colors">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status: Offline</h3>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-2xl font-extrabold text-white">{data.stats.offlineWa}</span>
          </div>
          <div className="text-[9px] text-red-400 font-medium bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20 w-max">
            Perlu Scan Ulang
          </div>
        </div>

      </div>

      {/* Quick Action Bar */}
      <div className="flex justify-start">
         <Link href="/dashboard/devices" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold rounded-xl transition-all shadow-[0_5px_15px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.3)] flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
            </svg>
            Scan Nomor Baru
         </Link>
      </div>

      {/* Dua Kolom: Saldo & Informasi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
         
         {/* Withdraw Card */}
         <div className="bg-gradient-to-br from-teal-900/50 to-emerald-900/30 border border-teal-500/30 p-6 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
               <div>
                  <h3 className="text-teal-400 font-bold tracking-widest text-xs uppercase mb-1">Total Saldo (Kompensasi)</h3>
                  <div className="text-3xl font-black text-white mb-1 drop-shadow-md">
                     {formatRupiah(data.user.balance)}
                  </div>
                  <p className="text-slate-300 text-xs">
                     Minimal penarikan adalah {formatRupiah(minWithdraw)}.
                  </p>
               </div>

               <div className="mt-6 flex gap-3">
                  <Link href="/dashboard/withdraw" className={`flex-1 text-center py-3 text-sm rounded-xl font-bold transition-all ${data.user.balance >= minWithdraw ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-[0_5px_15px_rgba(16,185,129,0.3)]' : 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'}`}>
                     Klaim Dana
                  </Link>
               </div>
            </div>
         </div>

         {/* Info Card */}
         <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-center">
            <h3 className="text-white font-bold text-lg mb-4">Tarif & Ketentuan</h3>
            
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-teal-400">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                  </div>
                  <div>
                     <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Tarif per Pesan</p>
                     <p className="text-white font-bold text-base">{formatRupiah(data.settings.rewardPerMessage)} <span className="text-xs font-normal text-slate-500">/ sukses</span></p>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-indigo-400">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                  </div>
                  <div>
                     <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Bergabung Sejak</p>
                     <p className="text-white font-bold text-sm">{formatDate(data.user.joinedAt)}</p>
                  </div>
               </div>
            </div>
         </div>

      </div>

      {/* Compact Rule Banner at Bottom */}
      {data.settings.ruleProfilePhotoUrl && (
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4 shadow-lg relative overflow-hidden mt-8">
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            
            {/* Foto Profil */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <img 
                src={`${process.env.NEXT_PUBLIC_API_URL}${data.settings.ruleProfilePhotoUrl}`} 
                alt="Profile Rule" 
                className="w-16 h-16 object-cover rounded-full border-2 border-red-500/50 shadow-md"
              />
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest text-center">Wajib Dipakai</span>
              <a 
                href={`${process.env.NEXT_PUBLIC_API_URL}${data.settings.ruleProfilePhotoUrl}`} 
                onClick={(e) => handleDownloadProfile(e, `${process.env.NEXT_PUBLIC_API_URL}${data.settings.ruleProfilePhotoUrl}`)}
                className="mt-1 flex items-center gap-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 px-2 py-1 rounded text-[10px] transition-colors border border-red-500/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Unduh
              </a>
            </div>

            {/* Informasi */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-red-400 font-bold text-sm uppercase tracking-wide flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Perhatian: Aturan Profil
              </h2>
              <p className="text-slate-300 text-xs mb-3 leading-relaxed max-w-2xl mx-auto sm:mx-0">
                Anda diwajibkan untuk menggunakan foto di samping dan mengganti nama WhatsApp sesuai format di bawah ini sebelum memulai pengiriman pesan.
              </p>
              <div className="bg-slate-900/60 border border-slate-700/50 py-2 px-3 rounded-lg flex flex-col sm:flex-row items-center sm:items-center gap-2 max-w-full overflow-hidden w-max mx-auto sm:mx-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Nama Wajib:</span>
                <span className="text-white font-mono text-xs font-bold truncate select-all">{data.settings.ruleProfileName}</span>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Pop-up Modal */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            <button onClick={closePopup} className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {data.settings.popupType === 'IMAGE' && mediaUrls.length > 0 && (
              <div className="relative w-full bg-slate-800 min-h-[200px] max-h-[400px] flex items-center justify-center shrink-0">
                <img 
                  src={mediaUrls[currentSlide].startsWith('http') ? mediaUrls[currentSlide] : `${process.env.NEXT_PUBLIC_API_URL}${mediaUrls[currentSlide]}`} 
                  alt="Announcement" 
                  className="w-full h-full object-contain max-h-[400px]" 
                />
                
                {mediaUrls.length > 1 && (
                  <>
                    <button onClick={() => setCurrentSlide(prev => (prev === 0 ? mediaUrls.length - 1 : prev - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-slate-700 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => setCurrentSlide(prev => (prev === mediaUrls.length - 1 ? 0 : prev + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-slate-700 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {mediaUrls.map((_: any, i: number) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i === currentSlide ? 'bg-white' : 'bg-white/30'}`}></div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {data.settings.popupType === 'VIDEO' && mediaUrls.length > 0 && (
              <div className="w-full aspect-video bg-black shrink-0 relative">
                {!mediaUrls[0].startsWith('http') ? (
                  <video 
                    src={`${process.env.NEXT_PUBLIC_API_URL}${mediaUrls[0]}`}
                    className="absolute inset-0 w-full h-full object-contain"
                    controls
                    autoPlay
                  ></video>
                ) : (
                  <iframe 
                    src={getEmbedUrl(mediaUrls[0])} 
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            )}

            <div className="p-6 overflow-y-auto">
              <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-400 mb-4 uppercase tracking-widest border-b border-slate-700 pb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                PENGUMUMAN
              </h3>
              <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                {data.settings.popupText || "Tidak ada pesan pengumuman."}
              </div>
              <button onClick={closePopup} className="mt-8 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-600">
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
