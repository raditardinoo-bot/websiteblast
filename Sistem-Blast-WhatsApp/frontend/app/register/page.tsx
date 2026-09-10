"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Turnstile } from '@marsidev/react-turnstile';

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [referredByCode, setReferredByCode] = useState("");
  const [refLocked, setRefLocked] = useState(false);
  const [strength, setStrength] = useState({ label: "Kosong", score: 0, color: "bg-slate-700" });
  const [turnstileToken, setTurnstileToken] = useState("");
  
  // Dynamic Settings
  const [appName, setAppName] = useState("TRYWSBLAST");
  const [logoUrl, setLogoUrl] = useState("/logo.jpeg");

  const router = useRouter();

  useEffect(() => {
    evaluatePassword(password);
  }, [password]);

  useEffect(() => {
    // Ambil kode referral dari URL jika ada
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setReferredByCode(ref);
      setRefLocked(true);
    }
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.appName) setAppName(data.appName);
        if (data.logoUrl) setLogoUrl(`${process.env.NEXT_PUBLIC_API_URL}${data.logoUrl}`);
      })
      .catch((err) => console.error(err));
  }, []);

  const evaluatePassword = (pass: string) => {
    if (!pass) {
      setStrength({ label: "Kosong", score: 0, color: "bg-slate-700" });
      return;
    }
    
    let score = 0;
    if (pass.length >= 8) score += 1;
    
    const typesCount = [/[a-z]/.test(pass), /[A-Z]/.test(pass), /[0-9]/.test(pass), /[^A-Za-z0-9]/.test(pass)].filter(Boolean).length;
    
    if (pass.length < 8) {
      setStrength({ label: "Terlalu Pendek (Min. 8 Karakter)", score: 1, color: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" });
    } else if (pass.length >= 8 && typesCount < 2) {
      setStrength({ label: "Lemah (Gunakan kombinasi angka & huruf)", score: 1, color: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" });
    } else if (pass.length >= 8 && typesCount >= 2 && typesCount < 4) {
      setStrength({ label: "Sedang", score: 2, color: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" });
    } else if (pass.length >= 8 && typesCount >= 4) {
      setStrength({ label: "Kuat", score: 3, color: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" });
    }
  };

  const isPasswordValid = strength.score >= 2;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, referredByCode, turnstileToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mendaftar. Silakan coba lagi.");
        setIsLoading(false);
      } else {
        // Tampilkan popup keren!
        setIsLoading(false);
        setShowSuccessPopup(true);
      }
    } catch (error) {
      setErrorMsg("Koneksi ke server gagal.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative min-h-screen flex items-center justify-center bg-slate-900 font-sans overflow-hidden px-4 py-8">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-4000"></div>

        {/* Main Card */}
        <div className={`relative z-10 w-full max-w-[420px] bg-slate-800/60 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_15px_50px_rgba(0,0,0,0.3)] border border-slate-700 transition-all duration-500 ${showSuccessPopup ? 'scale-95 opacity-50 blur-sm pointer-events-none' : ''}`}>
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 shadow-inner flex items-center justify-center overflow-hidden mb-4 border border-slate-700">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Buat Akun Baru</h1>
            <p className="text-slate-400 mt-2 text-sm font-medium px-4">
              Bergabunglah dengan {appName} hari ini
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-300 ml-1">Nama Lengkap</label>
              <input
                type="text"
                required
                className="w-full bg-slate-900/60 border border-slate-700 text-white px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 shadow-inner"
                placeholder="Cth: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-300 ml-1">Username</label>
              <input
                type="text"
                required
                className="w-full bg-slate-900/60 border border-slate-700 text-white px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 shadow-inner"
                placeholder="budisantoso"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-300 ml-1">Kode Referral (Opsional)</label>
              <input
                type="text"
                className={`w-full bg-slate-900/60 border border-slate-700 px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner ${refLocked ? 'text-slate-500 bg-slate-800 cursor-not-allowed opacity-70' : 'text-white placeholder:text-slate-500'}`}
                placeholder="Cth: ABCD12"
                value={referredByCode}
                onChange={(e) => setReferredByCode(e.target.value)}
                readOnly={refLocked}
              />
              {refLocked && <p className="text-[10px] text-emerald-400 font-bold ml-1 mt-1">✓ Kode referral valid telah diterapkan otomatis</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-300 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-slate-900/60 border border-slate-700 text-white pl-5 pr-12 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 shadow-inner"
                  placeholder="Buat password yang kuat"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              <div className="pt-2 px-1">
                <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-transparent'} transition-all duration-500`}></div>
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-transparent'} transition-all duration-500`}></div>
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-transparent'} transition-all duration-500`}></div>
                </div>
                <div className="flex flex-col mt-2">
                  <span className={`text-[12px] font-bold ${strength.score < 2 ? 'text-red-400' : strength.score === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {strength.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                    Info: Wajib 8 karakter, gunakan kombinasi huruf & angka.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Turnstile 
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAADsTkItRmnw2XZf3"} 
                onSuccess={(token) => setTurnstileToken(token)}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={!isPasswordValid || password.length === 0 || isLoading}
                className={`w-full py-4 px-4 rounded-2xl transition-all font-bold flex justify-center items-center gap-2
                  ${isPasswordValid
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] active:scale-[0.98]' 
                    : 'bg-slate-700/50 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'}`}
              >
                {isLoading ? "Memproses..." : "Daftar Akun"}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[14px] text-slate-400 font-medium">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal Pop-up */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 slide-in-from-bottom-4">
            <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Pendaftaran Sukses!</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Akun Anda telah berhasil dibuat. Silakan masuk menggunakan kredensial yang baru saja Anda buat.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-[0.98]"
            >
              Lanjut ke Login
            </button>
          </div>
        </div>
      )}
    </>
  );
}
