"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Turnstile } from '@marsidev/react-turnstile';
import { useLanguage } from "../../contexts/LanguageContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  
  const [appName, setAppName] = useState("TRYWSBLAST");
  const [logoUrl, setLogoUrl] = useState("/logo.jpeg");

  // Maintenance States
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [showMaintenancePopup, setShowMaintenancePopup] = useState(false);
  const [maintenanceKey, setMaintenanceKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const clickCount = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    fetch(`${API_URL}/api/settings/public`)
      .then((res) => res.json())
      .then((data) => {
        if (data.appName) setAppName(data.appName);
        if (data.logoUrl) setLogoUrl(`${API_URL}${data.logoUrl}`);
        if (data.isMaintenance !== undefined) setIsMaintenance(data.isMaintenance);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken, maintenanceKey }),
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        console.error("Non-JSON response received");
        data = { error: `Terjadi kesalahan pada server (Kode: ${res.status}). Silakan coba lagi nanti.` };
      }

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal masuk, periksa kembali koneksi Anda.");
      } else {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      }
    } catch (error) {
      setErrorMsg("Koneksi ke server gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMaintenanceKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsVerifying(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceKey }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setShowMaintenancePopup(false);
        setShowBypassInput(true); // Tampilkan form login
      } else {
        setErrorMsg(data.error || "Kunci salah!");
      }
    } catch (err) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToolIconClick = () => {
    clickCount.current += 1;
    if (clickCount.current >= 5) {
      setShowMaintenancePopup(true);
      clickCount.current = 0;
      if (clickTimer.current) clearTimeout(clickTimer.current);
    } else {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0;
      }, 2000); // Harus klik 5 kali dalam 2 detik
    }
  };

  if (isMaintenance && !showBypassInput) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-slate-900 font-sans overflow-hidden px-4">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-red-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 w-full max-w-[480px] bg-slate-800/60 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_15px_50px_rgba(0,0,0,0.3)] border border-slate-700/80 text-center">
          
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 bg-rose-500/20 rounded-3xl blur-xl animate-pulse"></div>
            <div className="relative w-full h-full rounded-3xl bg-slate-800 shadow-inner flex items-center justify-center overflow-hidden border border-slate-700/50">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover select-none" />
            </div>
            {/* Small tool icon badge */}
            <div 
              onClick={handleToolIconClick}
              className="absolute -bottom-2 -right-2 bg-rose-500 w-10 h-10 rounded-full border-4 border-slate-900 flex items-center justify-center text-white shadow-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight" dangerouslySetInnerHTML={{ __html: t("system_maintenance").replace(" ", "<br/>") }}></h1>
          
          <div className="w-16 h-1 bg-gradient-to-r from-rose-500 to-orange-500 mx-auto rounded-full mb-6"></div>
          
          <p className="text-slate-400 text-sm leading-relaxed px-4">
            {t("maintenance_desc")}
          </p>

          <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-center gap-2 items-center text-xs text-slate-500 font-medium">
             <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
             {t("maintenance_fixing")}
          </div>
        </div>

        {/* Modal Popup Kunci Rahasia */}
        {showMaintenancePopup && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative">
              <button 
                onClick={() => setShowMaintenancePopup(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              <h3 className="text-xl font-bold text-white mb-2">{t("bypass_access")}</h3>
              <p className="text-sm text-slate-400 mb-4">{t("bypass_desc")}</p>
              
              <form onSubmit={verifyMaintenanceKey}>
                {errorMsg && <div className="mb-3 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{errorMsg}</div>}
                <input 
                  type="password"
                  value={maintenanceKey}
                  onChange={(e) => setMaintenanceKey(e.target.value)}
                  placeholder={t("secret_key_placeholder")}
                  className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
                  autoFocus
                />
                <button 
                  type="submit"
                  disabled={isVerifying}
                  className="w-full bg-rose-500 hover:bg-rose-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isVerifying ? t("verifying") : t("access_login")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-900 font-sans overflow-hidden px-4 py-8">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-4000"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value as "id" | "zh")}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 cursor-pointer outline-none hover:border-slate-600 transition-colors"
        >
          <option value="id">🇮🇩 {t("id_lang")}</option>
          <option value="zh">🇨🇳 {t("zh_lang")}</option>
        </select>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[420px] bg-slate-800/60 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_15px_50px_rgba(0,0,0,0.3)] border border-slate-700">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-slate-800 shadow-inner flex items-center justify-center overflow-hidden mb-5 border border-slate-700">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{t("welcome")}</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium px-4">
            {t("login_to")} {appName}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-300 ml-1">{t("username")}</label>
            <input
              type="text"
              required
              className="w-full bg-slate-900/60 border border-slate-700 text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 shadow-inner"
              placeholder={t("enter_username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-300 ml-1">{t("password")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-slate-900/60 border border-slate-700 text-white pl-5 pr-12 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 shadow-inner"
                placeholder="••••••••"
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
          </div>

          <div className="flex justify-center pt-2">
            <Turnstile 
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAADsTkItRmnw2XZf3"} 
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 text-white font-bold py-4 px-4 rounded-2xl transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)] active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {isLoading ? t("processing") : t("login")}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[14px] text-slate-400 font-medium">
            {t("no_account")}{" "}
            <Link href="/register" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
              {t("register_now")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
