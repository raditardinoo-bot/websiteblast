"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from '@marsidev/react-turnstile';
import { useLanguage } from "../../contexts/LanguageContext";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken }),
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
        setErrorMsg(data.error || t("admin_login_failed"));
      } else {
        sessionStorage.setItem("admin_token", data.token);
        router.push("/x-panel-core");
      }
    } catch (error) {
      setErrorMsg("Koneksi ke server gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-800 font-sans overflow-hidden px-4 py-8">
      {/* Animated Background Elements (Twilight Theme) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-4000"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value as "id" | "zh")}
          className="bg-slate-700/80 border border-slate-600 text-slate-300 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 cursor-pointer outline-none hover:border-slate-500 transition-colors"
        >
          <option value="id">🇮🇩 {t("id_lang")}</option>
          <option value="zh">🇨🇳 {t("zh_lang")}</option>
        </select>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[400px] bg-slate-700/50 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_15px_50px_rgba(0,0,0,0.2)] border border-slate-600">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 shadow-inner flex items-center justify-center overflow-hidden mb-5 border border-slate-600">
            <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t("admin_portal")}</h1>
          <p className="text-slate-300 mt-2 text-sm px-2">
            {t("admin_login_desc")} TRYWSBLAST
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-300 ml-1">{t("admin_username")}</label>
            <input
              type="text"
              required
              className="w-full bg-slate-800/80 border border-slate-600 text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500 shadow-inner"
              placeholder={t("enter_username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-300 ml-1">{t("admin_password")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-slate-800/80 border border-slate-600 text-white pl-5 pr-12 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500 shadow-inner"
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

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-500/50 text-slate-900 font-bold py-4 px-4 rounded-2xl transition-colors shadow-[0_0_15px_rgba(20,184,166,0.3)] active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {isLoading ? t("processing") : t("access_system")}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center border-t border-slate-600/50 pt-6">
          <p className="text-[12px] text-slate-400 font-medium">
            {t("admin_only")}
          </p>
        </div>
      </div>
    </div>
  );
}
