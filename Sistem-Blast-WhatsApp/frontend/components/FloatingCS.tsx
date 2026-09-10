"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function FloatingCS() {
  const [csData, setCsData] = useState({
    csType: "WA",
    csValue: "628123456789"
  });
  const pathname = usePathname();

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    fetch(`${API_URL}/api/settings/public`)
      .then(res => res.json())
      .then(data => {
        if (data.csType) {
          setCsData({
            csType: data.csType,
            csValue: data.csValue || ""
          });
        }
      })
      .catch(err => console.error("Error fetching CS settings:", err));
  }, []);

  const handleClick = () => {
    if (!csData.csValue) return;

    if (csData.csType === "WA") {
      let waNumber = csData.csValue.replace(/[^0-9]/g, '');
      if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1);
      window.open(`https://wa.me/${waNumber}`, "_blank");
    } else {
      let url = csData.csValue;
      if (!url.startsWith('http')) url = 'https://' + url;
      window.open(url, "_blank");
    }
  };

  // Jangan tampilkan di halaman admin, login, atau register
  if (pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return null;
  }

  // bottom-24 di mobile agar tidak menutupi navbar navigasi bawah (jika ada), bottom-6 di PC
  return (
    <div className="fixed bottom-24 md:bottom-6 right-6 z-[999] animate-bounce hover:animate-none">
      <button
        onClick={handleClick}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-transform hover:scale-110 active:scale-95 text-white ${csData.csType === 'WA' ? 'bg-[#25D366] shadow-[#25D366]/40' : 'bg-indigo-500 shadow-indigo-500/40'
          }`}
        title="Customer Service"
      >
        {csData.csType === 'WA' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c-.003 1.396.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}
