"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReferralPage() {
  const [stats, setStats] = useState({
    referralCode: "",
    totalInvited: 0,
    totalEarned: 0,
    totalMessages: 0,
    history: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.userId;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/referrals/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [router]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Berhasil disalin ke clipboard!");
  };

  const referralLink = stats.referralCode ? `${window.location.origin}/register?ref=${stats.referralCode}` : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Program Referral </h1>
        <p className="text-slate-400">Undang teman untuk bergabung dan dapatkan bonus saldo otomatis dari setiap pesan mereka!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Share Box */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-800 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>

          <h2 className="text-xl font-bold text-white mb-4 relative z-10">Link Undangan Anda</h2>

          <div className="space-y-4 relative z-10">
            <div>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Kode Referral</p>
              <div className="flex gap-2">
                <div className="bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl flex-1 font-mono text-white text-lg tracking-widest text-center shadow-inner">
                  {stats.referralCode || "------"}
                </div>
                <button
                  onClick={() => copyToClipboard(stats.referralCode)}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3 rounded-xl transition-colors shadow-md"
                  title="Copy Kode"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Link Cepat</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl flex-1 text-slate-400 text-sm focus:outline-none shadow-inner"
                />
                <button
                  onClick={() => copyToClipboard(referralLink)}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl transition-colors border border-slate-600 shadow-md"
                  title="Copy Link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Box */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col justify-center">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-2xl font-extrabold text-white">{stats.totalInvited}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bawahan</p>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className={`font-extrabold text-blue-400 ${stats.totalMessages.toString().length > 7 ? 'text-lg' : 'text-2xl'}`}>
                {stats.totalMessages.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pesan Sukses</p>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700 flex flex-col items-center justify-center text-center col-span-2 lg:col-span-1">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className={`font-extrabold text-amber-400 flex items-start justify-center gap-1 ${stats.totalEarned.toString().length > 9 ? 'text-lg' : 'text-2xl'}`}>
                <span className="text-xs font-medium text-amber-500/70 mt-1">Rp</span>
                {stats.totalEarned.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Bonus</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Riwayat Undangan Anda</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Nama Pendaftar</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Tanggal Bergabung</th>
                <th className="px-6 py-4 text-center">Pesan Sukses</th>
                <th className="px-6 py-4">Status Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {stats.history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                    Belum ada teman yang mendaftar melalui link Anda.
                  </td>
                </tr>
              ) : (
                stats.history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{h.name}</td>
                    <td className="px-6 py-4 text-slate-400">@{h.username}</td>
                    <td className="px-6 py-4">{new Date(h.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                        {(h.messagesSent || 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-1 rounded uppercase">Aktif</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border bg-slate-800 border-slate-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-bold text-sm">{toastMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
