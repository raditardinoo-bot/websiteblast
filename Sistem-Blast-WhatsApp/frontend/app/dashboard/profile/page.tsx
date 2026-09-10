"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [user, setUser] = useState({
    name: "",
    username: "",
    password: "", // Only for updating
    bankType: "BANK",
    bankName: "",
    bankAccount: "",
    bankOwner: ""
  });

  const [settings, setSettings] = useState({
    allowedBanks: "",
    allowedEWallets: "",
    minWithdrawalBank: 50000,
    minWithdrawalEwallet: 10000
  });

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

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
      // Ambil data user
      const uRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user-dashboard`, { headers: getHeaders() });
      if (uRes.ok) {
        const data = await uRes.json();
        setUser(prev => ({
          ...prev,
          name: data.user.name || "",
          username: data.user.username || "",
          bankType: data.user.bankType || "BANK",
          bankName: data.user.bankName || "",
          bankAccount: data.user.bankAccount || "",
          bankOwner: data.user.bankOwner || ""
        }));
      } else {
        router.push("/login");
      }

      // Ambil settings public (untuk dropdown)
      const sRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/public`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setSettings({
          allowedBanks: sData.allowedBanks || "BCA,BNI,BRI,MANDIRI",
          allowedEWallets: sData.allowedEWallets || "DANA,OVO,GOPAY,LINKAJA",
          minWithdrawalBank: sData.minWithdrawalBank || 50000,
          minWithdrawalEwallet: sData.minWithdrawalEwallet || 10000
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload: { name: string; password?: string } = { name: user.name, password: user.password };
      if (!payload.password) delete payload.password;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user-dashboard/profile`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Profil akun berhasil disimpan!", "success");
        setUser(prev => ({ ...prev, password: "" }));
      } else {
        showToast(data.error || "Gagal menyimpan akun", "error");
      }
    } catch (error) {
      showToast("Koneksi gagal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (!user.bankName) {
      showToast("Pilih Bank atau e-Wallet terlebih dahulu", "error");
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        bankType: user.bankType,
        bankName: user.bankName,
        bankAccount: user.bankAccount,
        bankOwner: user.bankOwner
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user-dashboard/profile`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Metode pencairan berhasil disimpan!", "success");
      } else {
        showToast(data.error || "Gagal menyimpan pembayaran", "error");
      }
    } catch (error) {
      showToast("Koneksi gagal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const bankOptions = user.bankType === 'BANK' ? settings.allowedBanks.split(',') : settings.allowedEWallets.split(',');

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Profil & Pembayaran</h1>
        <p className="text-slate-400 text-sm">Kelola identitas akun dan atur rekening tujuan penarikan dana Anda.</p>
      </div>

      <div className="space-y-6">

        {/* Akun Section */}
        <form onSubmit={handleSaveAccount} className="bg-slate-800 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-4">Informasi Akun</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nama Lengkap</label>
              <input
                type="text"
                name="name"
                required
                value={user.name}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Username</label>
              <input
                type="text"
                disabled
                value={user.username}
                className="w-full bg-slate-900/50 border border-slate-700 text-slate-500 text-sm px-4 py-3 rounded-xl cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-500 mt-1">Username tidak dapat diubah.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password Baru</label>
              <input
                type="password"
                name="password"
                value={user.password}
                onChange={handleChange}
                placeholder="Kosongkan jika tidak ingin mengubah password"
                className="w-full bg-slate-900 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-slate-700">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm"
            >
              Simpan Akun
            </button>
          </div>
        </form>

        {/* Pembayaran Section */}
        <form onSubmit={handleSavePayment} className="bg-slate-800 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>

          <div className="relative z-10 border-b border-slate-700 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Metode Pencairan Saldo
            </h2>
            <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <span className="text-[10px] font-bold text-indigo-400">
                Min. Tarik: Rp {user.bankType === 'BANK' ? settings.minWithdrawalBank.toLocaleString('id-ID') : settings.minWithdrawalEwallet.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Tipe Pembayaran Toggle */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">Jenis Pencairan</label>
              <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-700 w-full md:w-1/2">
                <button
                  type="button"
                  onClick={() => setUser({ ...user, bankType: 'BANK', bankName: '' })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${user.bankType === 'BANK' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Rekening Bank
                </button>
                <button
                  type="button"
                  onClick={() => setUser({ ...user, bankType: 'EWALLET', bankName: '' })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${user.bankType === 'EWALLET' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  e-Wallet
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Pilih {user.bankType === 'BANK' ? 'Bank Tujuan' : 'e-Wallet Tujuan'}
                </label>
                <select
                  name="bankName"
                  value={user.bankName}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="" disabled>-- Pilih {user.bankType === 'BANK' ? 'Bank' : 'e-Wallet'} --</option>
                  {bankOptions.map(opt => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nomor Rekening / HP</label>
                <input
                  type="text"
                  name="bankAccount"
                  required
                  value={user.bankAccount}
                  onChange={handleChange}
                  placeholder={user.bankType === 'BANK' ? "Contoh: 1234567890" : "Contoh: 08123456789"}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nama Pemilik Rekening / e-Wallet</label>
                <input
                  type="text"
                  name="bankOwner"
                  required
                  value={user.bankOwner}
                  onChange={handleChange}
                  placeholder="Nama lengkap sesuai yang terdaftar di bank/aplikasi"
                  className="w-full bg-slate-900 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-2">Penting: Penarikan dana mungkin ditolak jika nama tidak sesuai.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-slate-700">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_5px_15px_rgba(99,102,241,0.2)] disabled:shadow-none"
            >
              {isSaving ? "Menyimpan..." : "Simpan Rekening Pencairan"}
            </button>
          </div>
        </form>

      </div>

      {/* Toast */}
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
