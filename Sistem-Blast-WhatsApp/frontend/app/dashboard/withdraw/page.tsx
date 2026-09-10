"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserWithdrawPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [user, setUser] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Reject Reason Modal State
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [currentReason, setCurrentReason] = useState("");

  // Confirm Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState(0);

  // Form State
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const getHeaders = () => ({
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json"
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchData = async () => {
    try {
      // Fetch withdrawals
      const wRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/withdrawals`, { headers: getHeaders() });
      if (wRes.ok) setWithdrawals(await wRes.json());

      // Fetch user dashboard for balance and profile
      const uRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user-dashboard`, { headers: getHeaders() });
      if (uRes.ok) {
        const uData = await uRes.json();
        setUser(uData.user);
      }

      // Fetch settings
      const sRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/public`);
      if (sRes.ok) setSettings(await sRes.json());

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = Number(amount);

    if (!withdrawAmount) {
      return showToast("Pilih nominal penarikan terlebih dahulu", "error");
    }

    if (withdrawAmount > (user.balance || 0)) {
      return showToast("Saldo tidak mencukupi", "error");
    }

    setConfirmAmount(withdrawAmount);
    setIsConfirmModalOpen(true);
  };

  const executeWithdrawal = async () => {
    setIsSubmitting(true);
    setIsConfirmModalOpen(false);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/withdrawals`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ amount: confirmAmount })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Permintaan penarikan berhasil diajukan", "success");
        setAmount("");
        setActiveTab('PENDING'); // Otomatis pindah tab ke Menunggu
        fetchData();
      } else {
        showToast(data.error || "Gagal mengajukan", "error");
        if (data.error?.includes("profil")) {
          router.push("/dashboard/profile");
        }
      }
    } catch (error) {
      showToast("Koneksi gagal", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showReason = (reason: string) => {
    setCurrentReason(reason || "Tidak ada alasan spesifik.");
    setIsReasonModalOpen(true);
  };

  const balance = user.balance || 0;
  const isEwallet = user.bankType === 'EWALLET';
  const minWithdrawal = isEwallet ? (settings.minWithdrawalEwallet || 10000) : (settings.minWithdrawalBank || 50000);
  const maxWithdrawal = isEwallet ? (settings.maxWithdrawalEwallet || 500000) : (settings.maxWithdrawalBank || 5000000);
  const adminFee = isEwallet ? (settings.adminFeeEwallet || 300) : (settings.adminFeeBank || 2500);

  const generatePresetAmounts = (min: number, max: number) => {
    const amounts = new Set<number>();
    
    // Kelipatan 10k (dari 10k sampai 100k)
    for (let i = 10000; i <= 100000; i += 10000) {
      if (i >= min && i <= max) amounts.add(i);
    }
    
    // Kelipatan 100k (dari 100k sampai 2 juta)
    for (let i = 100000; i <= 2000000; i += 100000) {
      if (i >= min && i <= max) amounts.add(i);
    }
    
    // Kelipatan 500k (lebih dari 2 juta)
    for (let i = 2500000; i <= max && i <= 10000000; i += 500000) {
      if (i >= min && i <= max) amounts.add(i);
    }

    // Selalu pastikan nilai max ikut masuk jika belum ada (opsional, tapi bagus untuk presisi)
    if (max > 0) amounts.add(max);

    return Array.from(amounts).sort((a, b) => a - b);
  };

  const presetAmounts = generatePresetAmounts(minWithdrawal, maxWithdrawal);

  const progressPercent = Math.min(100, (balance / minWithdrawal) * 100);
  const isProfileComplete = !!(user.bankType && user.bankName && user.bankAccount && user.bankOwner);

  const checkIsClosed = () => {
    if (!settings.withdrawalAutoCloseEnabled) return false;
    
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const wibDate = new Date(utc + (3600000 * 7)); // UTC+7
    const currentMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();

    const [openH, openM] = (settings.withdrawalOpenTime || "08:00").split(':').map(Number);
    const openMinutes = openH * 60 + (openM || 0);

    const [closeH, closeM] = (settings.withdrawalCloseTime || "17:00").split(':').map(Number);
    const closeMinutes = closeH * 60 + (closeM || 0);

    if (closeMinutes < openMinutes) {
      return !(currentMinutes >= openMinutes || currentMinutes <= closeMinutes);
    } else {
      return !(currentMinutes >= openMinutes && currentMinutes <= closeMinutes);
    }
  };

  const isClosed = checkIsClosed();

  const filteredWithdrawals = withdrawals.filter(w => w.status === activeTab);

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Tarik Dana</h1>
        <p className="text-slate-400 text-sm">Cairkan penghasilan dari mesin Anda ke rekening bank atau e-Wallet.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <p className="text-indigo-200 font-medium mb-1 uppercase tracking-wider text-[10px]">Saldo Saat Ini</p>
            <h2 className="text-3xl font-bold text-white mb-4">Rp {balance.toLocaleString('id-ID')}</h2>

            {/* Progress Bar */}
            <div className="space-y-1.5 relative z-10">
              <div className="flex justify-between text-[10px] text-indigo-100 font-medium">
                <span>Progres ke Minimal Tarik</span>
                <span>{progressPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-indigo-900/50 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
              </div>
              {balance < minWithdrawal && (
                <p className="text-[9px] text-indigo-200 pt-1">
                  Kurang Rp {(minWithdrawal - balance).toLocaleString('id-ID')} lagi untuk bisa ditarik.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajukan Penarikan
            </h3>

            {isClosed ? (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center mb-6">
                <p className="text-rose-400 text-xs font-bold mb-2">Penarikan Sedang Ditutup</p>
                <p className="text-rose-400/80 text-[10px] leading-relaxed">
                  Operasional penarikan hanya dilayani pada jam <strong className="font-bold text-rose-300">{settings.withdrawalOpenTime}</strong> - <strong className="font-bold text-rose-300">{settings.withdrawalCloseTime}</strong> WIB. Silakan kembali lagi nanti.
                </p>
              </div>
            ) : !isProfileComplete ? (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center mb-6">
                <p className="text-amber-400 text-xs font-bold mb-2">Profil Pembayaran Belum Lengkap!</p>
                <p className="text-amber-400/80 text-[10px] mb-4">Anda harus melengkapi data rekening / e-Wallet terlebih dahulu.</p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/profile")}
                  className="px-4 py-2 bg-amber-500 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
                >
                  Lengkapi Profil
                </button>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Tujuan Pencairan</p>
                <p className="text-sm text-white font-bold">{user.bankName}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user.bankAccount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">a.n {user.bankOwner}</p>
                <button type="button" onClick={() => router.push("/dashboard/profile")} className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-2 font-semibold">Ubah Tujuan</button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-3 uppercase">Pilih Nominal Pencairan</label>
                
                <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {presetAmounts.length > 0 ? presetAmounts.map((base, idx) => {
                      const totalDeduction = base + adminFee;
                      const isDisabled = !isProfileComplete || balance < totalDeduction || isClosed;
                      const isSelected = amount === totalDeduction.toString();
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setAmount(totalDeduction.toString())}
                          className={`py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                            isSelected 
                              ? 'bg-indigo-500/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                              : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className={`text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap ${isSelected ? 'text-indigo-400' : 'text-slate-200'}`}>
                            Rp {totalDeduction.toLocaleString('id-ID')}
                          </span>
                        </button>
                      )
                    }) : (
                      <div className="col-span-full text-center py-4 text-xs text-slate-500">
                        Tidak ada opsi nominal yang tersedia.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    * Nominal di atas sudah termasuk biaya admin.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !amount || !isProfileComplete || isClosed}
              className="w-full mt-6 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-[0_5px_15px_rgba(99,102,241,0.15)] disabled:shadow-none border border-indigo-400/50 disabled:border-slate-700"
            >
              {isClosed ? "Operasional Tutup" : isSubmitting ? "Memproses..." : "Tarik Saldo ke Rekening"}
            </button>
          </form>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">

            {/* Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-900/50">
              <button
                onClick={() => setActiveTab('PENDING')}
                className={`flex-1 py-4 text-xs font-bold transition-colors ${activeTab === 'PENDING' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
              >
                Menunggu
              </button>
              <button
                onClick={() => setActiveTab('APPROVED')}
                className={`flex-1 py-4 text-xs font-bold transition-colors ${activeTab === 'APPROVED' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
              >
                Selesai
              </button>
              <button
                onClick={() => setActiveTab('REJECTED')}
                className={`flex-1 py-4 text-xs font-bold transition-colors ${activeTab === 'REJECTED' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
              >
                Ditolak
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : filteredWithdrawals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-slate-900/50 border border-slate-700 flex items-center justify-center mb-3 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">Tidak ada riwayat penarikan di kategori ini.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {filteredWithdrawals.map((w: any) => (
                    <div key={w.id} className="p-4 hover:bg-slate-700/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${w.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            w.status === 'REJECTED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                              'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                          {w.status === 'APPROVED' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : w.status === 'REJECTED' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>

                        <div>
                          <p className="text-white font-bold">Rp {w.amount.toLocaleString('id-ID')}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(w.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 ml-14 sm:ml-0">
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-bold text-slate-300">{w.bankName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{w.bankAccount}</p>
                        </div>

                        {w.status === 'REJECTED' && (
                          <button
                            onClick={() => showReason(w.rejectReason)}
                            className="text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-lg font-bold transition-colors"
                          >
                            Lihat Alasan
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {isReasonModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Alasan Penolakan</h2>
            <p className="text-sm text-slate-300 mb-6 bg-slate-900 p-4 rounded-xl border border-slate-700 leading-relaxed">
              {currentReason}
            </p>

            <p className="text-[11px] text-slate-400 mb-6 italic">
              * Saldo telah dikembalikan secara otomatis ke akun Anda. Anda dapat mengajukan penarikan ulang setelah memperbaiki masalah di atas.
            </p>

            <button
              onClick={() => setIsReasonModalOpen(false)}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Confirm Withdraw Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-4 border border-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">Apakah Anda yakin ingin menarik dana sebesar <strong className="text-white text-base">Rp {confirmAmount.toLocaleString('id-ID')}</strong>?</p>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-6">
              <p className="text-amber-400 text-[11px] font-medium leading-relaxed">
                ⚠️ Mohon periksa kembali tujuan pencairan Anda (<strong className="font-bold">{user.bankAccount}</strong> a.n <strong className="font-bold">{user.bankOwner}</strong>). Pastikan data sudah benar agar proses pencairan berjalan lancar.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={executeWithdrawal}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              >
                Ya, Tarik Dana
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] border ${toastType === 'success'
              ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100'
              : 'bg-red-900/90 border-red-500/50 text-red-100'
            }`}>
            <p className="font-bold text-sm tracking-wide">{toastMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
