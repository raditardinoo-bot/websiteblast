"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function UserDevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [campaignInfo, setCampaignInfo] = useState<{ campaign: any, count: number }>({ campaign: null, count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string>("STARTING");
  const [pairingCountdown, setPairingCountdown] = useState<number>(180);

  // Toggles
  const [linkMethod, setLinkMethod] = useState<"QR" | "CODE">("CODE");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  // Blast Controls
  const [globalMode, setGlobalMode] = useState<number>(5000);
  const [deviceModes, setDeviceModes] = useState<Record<number, number>>({});

  const [globalMaxMessages, setGlobalMaxMessages] = useState<number | "">("");
  const [deviceMaxMessages, setDeviceMaxMessages] = useState<Record<number, number | "">>({});

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Generic Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "confirm" as "confirm" | "prompt",
    onConfirm: () => { },
    confirmText: "Ya",
    cancelText: "Batal"
  });

  const openModal = (config: any) => {
    setModalConfig({ cancelText: "Batal", ...config });
    setModalOpen(true);
  };

  const [currentTime, setCurrentTime] = useState(Date.now());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Blast Popup State
  const [showBlastPopup, setShowBlastPopup] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [pendingBlastAction, setPendingBlastAction] = useState<any>(null);
  const [blastCountdown, setBlastCountdown] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showBlastPopup && blastCountdown > 0) {
      timer = setTimeout(() => setBlastCountdown(blastCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showBlastPopup, blastCountdown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQrModal && pairingCountdown > 0) {
      timer = setTimeout(() => setPairingCountdown(pairingCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showQrModal, pairingCountdown]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");
    fetchDevices();

    // Fetch settings
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/public`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);

    // Auto refresh status every 5 seconds in the background
    const bgInterval = setInterval(fetchDevices, 5000);
    return () => clearInterval(bgInterval);
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
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

  const getHeaders = () => ({
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json"
  });

  const fetchDevices = async (retries = 3) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.devices) {
          setDevices(data.devices);
          setCampaignInfo({ campaign: data.activeCampaign, count: data.activeTargetCount });
        } else if (Array.isArray(data)) {
          setDevices(data);
        }
      }
    } catch (error) {
      // Backend mungkin sedang restart, coba lagi dengan backoff
      if (retries > 0) {
        setTimeout(() => fetchDevices(retries - 1), 2000);
      }
      // Tidak console.error agar tidak polusi console
    } finally {
      setIsLoading(false);
    }
  };

  const createDevice = async () => {
    if (isAdding || devices.length >= 3) return;
    setIsAdding(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: `Device ${devices.length + 1}` })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Perangkat berhasil dibuat", "success");
        fetchDevices();
        openQrModal(data.device.id);
      } else {
        showToast(data.error || "Gagal membuat perangkat", "error");
      }
    } catch (error) {
      showToast("Koneksi gagal", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const reconnectDevice = async (deviceId: number) => {
    showToast("Mencoba menghubungkan kembali...", "success");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/${deviceId}/start`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {
      showToast("Koneksi gagal", "error");
    }
  };

  const openQrModal = async (deviceId: number) => {
    setActiveDeviceId(deviceId);
    setQrCode(null);
    setPairingCode(null);
    setPhoneNumber("");
    setQrStatus("STARTING");
    setPairingCountdown(180);
    setShowQrModal(true);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/${deviceId}/start`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) { }

    // Start polling
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    const pollQr = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/${deviceId}/qr`, { headers: getHeaders() });
        
        // Jika perangkat sudah dihapus (timeout pairing), berhenti poll dengan bersih
        if (res.status === 404) {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setShowQrModal(false);
          fetchDevices();
          return;
        }
        
        if (res.ok) {
          const data = await res.json();
          if (data.qrCode) setQrCode(data.qrCode);
          if (data.pairingCode) setPairingCode(data.pairingCode);
          setQrStatus(data.status);

          if (data.status === 'CONNECTED') {
            closeQrModal();
            showToast("WhatsApp Berhasil Terhubung!", "success");
            fetchDevices();
          }
        }
      } catch (error) {
        // Jaringan sedang tidak stabil, diamkan saja — poll berikutnya akan coba lagi
      }
    };

    pollQr();
    pollingInterval.current = setInterval(pollQr, 3000);
  };

  const requestPairingCode = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      return showToast("Masukkan nomor WA yang valid (contoh: 628xxx)", "error");
    }

    setIsRequestingCode(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/${activeDeviceId}/pairing-code`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      if (res.ok) {
        setPairingCode(data.pairingCode);
        setPairingCountdown(180);
        showToast("Kode berhasil didapatkan", "success");
      } else {
        showToast(data.error || "Gagal mendapatkan kode", "error");
      }
    } catch (error) {
      showToast("Koneksi gagal", "error");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const closeQrModal = () => {
    setShowQrModal(false);
    setActiveDeviceId(null);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    fetchDevices();
  };

  const handleDelete = async (id: number) => {
    openModal({
      title: "Hapus Perangkat",
      message: "Yakin ingin menghapus perangkat ini secara permanen?",
      type: "confirm",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/${id}`, {
            method: "DELETE",
            headers: getHeaders()
          });
          if (res.ok) {
            showToast("Perangkat berhasil dihapus", "success");
            fetchDevices();
          } else {
            showToast("Gagal menghapus", "error");
          }
        } catch (error) {
          showToast("Koneksi gagal", "error");
        }
      }
    });
  };

  const executeGlobalBlast = async (action: 'START' | 'STOP') => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/blast-all`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action, delay: globalMode, maxMessages: globalMaxMessages || null })
      });
      if (res.ok) {
        showToast(`Pengiriman Global ${action === 'START' ? 'Dimulai' : 'Dihentikan'}`, "success");
        fetchDevices();
      }
    } catch (error) {
      showToast("Gagal mengatur blast global", "error");
    }
  };

  const toggleGlobalBlast = (action: 'START' | 'STOP') => {
    if (action === 'START' && settings?.popupEnabledBlast) {
      setPendingBlastAction({ type: 'global', action });
      setShowBlastPopup(true);
      setCurrentSlide(0);
      setBlastCountdown(5);
    } else {
      executeGlobalBlast(action);
    }
  };

  const executeDeviceBlast = async (deviceId: number, action: 'START' | 'STOP') => {
    try {
      const delay = deviceModes[deviceId] || globalMode;
      const maxMessages = deviceMaxMessages[deviceId] !== undefined ? deviceMaxMessages[deviceId] : globalMaxMessages;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/${deviceId}/blast`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action, delay, maxMessages: maxMessages || null })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        fetchDevices();
      } else {
        showToast(data.error, "error");
      }
    } catch (error) {
      showToast("Gagal mengatur blast", "error");
    }
  };

  const toggleDeviceBlast = (deviceId: number, action: 'START' | 'STOP') => {
    if (action === 'START' && settings?.popupEnabledBlast) {
      setPendingBlastAction({ type: 'device', deviceId, action });
      setShowBlastPopup(true);
      setCurrentSlide(0);
      setBlastCountdown(7);
    } else {
      executeDeviceBlast(deviceId, action);
    }
  };

  const executePendingBlast = () => {
    setShowBlastPopup(false);
    if (pendingBlastAction) {
      if (pendingBlastAction.type === 'global') {
        executeGlobalBlast(pendingBlastAction.action);
      } else if (pendingBlastAction.type === 'device') {
        executeDeviceBlast(pendingBlastAction.deviceId, pendingBlastAction.action);
      }
      setPendingBlastAction(null);
    }
  };

  const getMediaUrls = () => {
    if (!settings?.popupMediaUrls) return [];
    try {
      return JSON.parse(settings.popupMediaUrls);
    } catch (e) {
      return [settings.popupMediaUrls];
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

  const handleDeviceModeChange = (deviceId: number, value: number) => {
    setDeviceModes(prev => ({ ...prev, [deviceId]: value }));
  };

  const handleDeviceMaxChange = (deviceId: number, value: string) => {
    setDeviceMaxMessages(prev => ({ ...prev, [deviceId]: value ? Number(value) : "" }));
  };

  const speedOptions = [
    { label: "Brutal (3dtk)", value: 3000 },
    { label: "Fastest (5dtk)", value: 5000 },
    { label: "Normal (15dtk)", value: 15000 },
    { label: "Slow (30dtk)", value: 30000 },
    { label: "Slowed (60dtk)", value: 60000 },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      {/* Compact Rule Banner */}
      {settings?.ruleProfilePhotoUrl && (
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4 shadow-lg relative overflow-hidden mb-6 mt-4">
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4">

            {/* Foto Profil */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${settings.ruleProfilePhotoUrl}`}
                alt="Profile Rule"
                className="w-16 h-16 object-cover rounded-full border-2 border-red-500/50 shadow-md"
              />
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest text-center">Wajib Dipakai</span>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}${settings.ruleProfilePhotoUrl}`}
                onClick={(e) => handleDownloadProfile(e, `${process.env.NEXT_PUBLIC_API_URL}${settings.ruleProfilePhotoUrl}`)}
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
                <span className="text-white font-mono text-xs font-bold truncate select-all">{settings.ruleProfileName}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Mesin Pengirim 🚀</h1>
          <p className="text-slate-400 text-sm">Kelola perangkat WhatsApp Anda untuk pengiriman pesan.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Campaign Info Card */}
          <div className="bg-slate-800/80 border border-slate-700 py-3 px-4 rounded-xl flex items-center gap-4 shadow-lg min-w-[220px] w-full sm:w-auto">
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                Total DB Saat Ini
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xl font-black text-white truncate" title={campaignInfo.campaign ? campaignInfo.count.toLocaleString('id-ID') : '0'}>
                  {campaignInfo.campaign ? campaignInfo.count.toLocaleString('id-ID') : '0'}
                </span>
                <span className="text-xs font-bold text-teal-400">READY</span>
              </div>
            </div>
          </div>

          <button
            onClick={createDevice}
            disabled={isAdding || devices.length >= 3}
            title={devices.length >= 3 ? "Batas maksimal 3 perangkat" : ""}
            className={`w-full sm:w-auto font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 ${devices.length >= 3 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-[0_5px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.5)]'}`}
          >
            {isAdding ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
            {devices.length >= 3 ? "Maksimal 3 Akun" : `Tambah Perangkat (${devices.length}/3)`}
          </button>
        </div>
      </div>

      {/* Global Controls Bar */}
      {devices.length > 0 && (
        <div className="mb-8 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Kendali Massal</h3>
              <p className="text-[10px] text-slate-400">Atur semua mesin sekaligus</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-bold px-3 uppercase">Kecepatan</span>
              <select
                className="bg-transparent text-slate-200 text-xs font-bold px-2 py-1.5 focus:outline-none cursor-pointer"
                value={globalMode}
                onChange={(e) => setGlobalMode(Number(e.target.value))}
              >
                {speedOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>)}
              </select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => toggleGlobalBlast('START')}
                className="flex-1 sm:flex-none bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2.5 px-5 rounded-lg transition-all text-xs shadow-[0_5px_15px_rgba(99,102,241,0.2)]"
              >
                Mulai Semua
              </button>
              <button
                onClick={() => toggleGlobalBlast('STOP')}
                className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all text-xs"
              >
                Hentikan Semua
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full bg-slate-800/50 border-2 border-dashed border-slate-700 p-12 rounded-[2rem] text-center">
            <h3 className="text-xl font-bold text-white mb-2">Belum Ada Mesin</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
              Silakan tambahkan perangkat baru untuk memulai menembak target.
            </p>
          </div>
        ) : (
          devices.map((device) => {
            const isBlasting = device.blastState?.isBlasting;
            const isConnected = device.status === 'CONNECTED';
            const isSleeping = device.status?.includes('TIDUR');

            let countdown = "";
            if (isBlasting && device.blastState?.nextActionTime) {
              const diff = Math.ceil((device.blastState.nextActionTime - currentTime) / 1000);
              if (diff > 0) countdown = ` (${diff}s)`;
            }
            const currentStatus = device.blastState?.status?.toUpperCase() || "";
            const isPending = currentStatus.includes('PENDING');

            return (
              <div key={device.id} className={`bg-slate-800 border ${isBlasting ? (isPending ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]') : 'border-slate-700'} p-6 rounded-3xl relative overflow-hidden transition-all`}>
                {isBlasting && <div className={`absolute inset-0 animate-pulse ${isPending ? 'bg-amber-500/5' : 'bg-indigo-500/5'}`}></div>}

                <div className="relative z-10 flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold border shadow-inner ${isConnected ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-700 border-slate-600'}`}>
                    WA
                  </div>
                  <div className="flex gap-2">
                    {!isConnected && (
                      <button 
                        onClick={() => {
                          if (device.sessionName !== 'Menunggu Tautan' && !device.sessionName.startsWith('Device')) {
                            reconnectDevice(device.id);
                          } else {
                            openQrModal(device.id);
                          }
                        }} 
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all" 
                        title="Hubungkan Ulang"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    <button onClick={() => handleDelete(device.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all" title="Hapus Perangkat">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="relative z-10 mb-4">
                  <h3 className="text-white font-bold text-lg">{device.sessionName.startsWith('Device') ? 'Belum Tertaut' : `+${device.sessionName}`}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? (isPending ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse') : 'bg-rose-500'}`}></div>
                    <span className={`text-[10px] font-bold tracking-wider ${isConnected ? (isPending ? 'text-amber-400' : 'text-emerald-400') : 'text-rose-400'}`}>
                      {isConnected ? 'ONLINE' : (device.status === 'READY_TO_CONNECT' ? 'SIAP DITAUTKAN' : (device.status === 'CONNECTING' ? 'MENGHUBUNGKAN' : device.status))} {isBlasting ? `• ${currentStatus}${countdown}` : (device.blastState?.status === 'STOPPED (Timeout)' ? '• TIMEOUT' : (isConnected ? ` • (TIDUR DALAM ${3 - (device.blastState?.idleMinutes || 0)} MNT)` : ''))}
                    </span>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="relative z-10 grid grid-cols-4 gap-2 mb-6">
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 text-center flex flex-col justify-center" title="Total usaha kirim pesan">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">Dikirim</p>
                    <p className="text-xs font-black text-blue-400">{device.blastState?.messagesAttempted || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 text-center flex flex-col justify-center" title="Pesan yang sukses terkirim">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">Sukses</p>
                    <p className="text-xs font-black text-emerald-400">{device.blastState?.messagesSent || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 text-center flex flex-col justify-center" title="Pesan yang gagal">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">Gagal</p>
                    <p className="text-xs font-black text-rose-400">{device.blastState?.messagesFailed || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 text-center flex flex-col justify-center" title="Kompensasi dari perangkat ini">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">Rp</p>
                    <p className="text-xs font-black text-amber-400">{(device.blastState?.incomeEarned || 0).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Kecepatan Tembakan</label>
                    <select
                      disabled={!isConnected || isBlasting}
                      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none w-full disabled:opacity-50"
                      value={deviceModes[device.id] || globalMode}
                      onChange={(e) => handleDeviceModeChange(device.id, Number(e.target.value))}
                    >
                      {speedOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <label className="flex items-center gap-2 cursor-pointer w-max">
                      <input
                        type="checkbox"
                        checked={deviceMaxMessages[device.id] !== undefined && deviceMaxMessages[device.id] !== ""}
                        onChange={(e) => handleDeviceMaxChange(device.id, e.target.checked ? "100" : "")}
                        disabled={!isConnected || isBlasting}
                        className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/50"
                      />
                      <span className="text-[10px] text-slate-300 font-bold uppercase">Tentukan Limit Pesan</span>
                    </label>

                    {deviceMaxMessages[device.id] !== undefined && deviceMaxMessages[device.id] !== "" && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <input
                          disabled={!isConnected || isBlasting}
                          type="number"
                          placeholder="Contoh: 50"
                          min="1"
                          className="bg-slate-900 border border-indigo-500/30 text-slate-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 w-full disabled:opacity-50"
                          value={deviceMaxMessages[device.id]}
                          onChange={(e) => handleDeviceMaxChange(device.id, e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {isBlasting ? (
                    <button
                      onClick={() => toggleDeviceBlast(device.id, 'STOP')}
                      className="w-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-400 font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 mt-1 shadow-lg"
                    >
                      Hentikan Pengiriman
                    </button>
                  ) : (
                    <button
                      disabled={!isConnected}
                      onClick={() => toggleDeviceBlast(device.id, 'START')}
                      className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(99,102,241,0.2)] disabled:opacity-50 disabled:bg-slate-700 disabled:shadow-none mt-1"
                    >
                      Mulai Pengiriman
                    </button>
                  )}
                </div>

              </div>
            )
          })
        )}
      </div>

      {/* Connection Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300 relative">

            <button onClick={closeQrModal} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white bg-slate-900 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="flex flex-col items-center w-full mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Hubungkan WhatsApp</h2>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={pairingCountdown <= 30 ? "text-red-400 animate-pulse" : "text-slate-300"}>
                  Sisa Waktu: {Math.floor(pairingCountdown / 60).toString().padStart(2, '0')}:{(pairingCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Toggle Method */}
            <div className="flex bg-slate-900 rounded-xl p-1 w-full mb-6 border border-slate-700">
              <button
                onClick={() => setLinkMethod("CODE")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${linkMethod === "CODE" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Gunakan Kode
              </button>
              <button
                onClick={() => setLinkMethod("QR")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${linkMethod === "QR" ? "bg-emerald-500 text-slate-900" : "text-slate-400 hover:text-white"}`}
              >
                Scan QR
              </button>
            </div>

            {linkMethod === "CODE" ? (
              <div className="w-full flex flex-col items-center">
                <p className="text-slate-400 text-xs text-center mb-4">
                  Buka WhatsApp &gt; Perangkat Taut &gt; Tautkan dengan Nomor. Masukkan kode di bawah ini.
                </p>

                {pairingCode ? (
                  <div className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-500">
                    <span className="text-3xl font-black text-indigo-400 tracking-[0.2em]">{pairingCode}</span>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nomor WhatsApp Anda</label>
                      <input
                        type="text"
                        placeholder="Contoh: 628123456789"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white text-center font-mono text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <button
                      onClick={requestPairingCode}
                      disabled={isRequestingCode}
                      className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-all shadow-[0_5px_15px_rgba(99,102,241,0.2)]"
                    >
                      {isRequestingCode ? "Meminta..." : "Dapatkan Kode"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <p className="text-slate-400 text-xs text-center mb-4">
                  Buka aplikasi WhatsApp di HP Anda, pilih **Perangkat Taut** lalu scan kode di bawah ini.
                </p>

                <div className="w-56 h-56 bg-white rounded-2xl p-4 shadow-inner flex items-center justify-center relative overflow-hidden">
                  {qrCode ? (
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain animate-in fade-in zoom-in duration-500" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-emerald-500"></div>
                      <span className="text-xs font-bold text-slate-400">Loading QR...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
              <span className="text-xs font-bold text-yellow-400 tracking-wider">MENUNGGU TERHUBUNG...</span>
            </div>

          </div>
        </div>
      )}

      {/* Modal Konfirmasi / Prompt */}
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
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-500 text-white hover:bg-indigo-400 shadow-md transition-colors"
                >
                  {modalConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${toastType === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-red-900/90 border-red-500 text-red-100'}`}>
            <p className="font-bold text-sm">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Blast Pop-up Interception Modal */}
      {showBlastPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">

            <button onClick={() => setShowBlastPopup(false)} className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {settings?.popupType === 'IMAGE' && mediaUrls.length > 0 && (
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

            {settings?.popupType === 'VIDEO' && mediaUrls.length > 0 && (
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
                ATURAN BLAST
              </h3>
              <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                {settings?.popupText || "Harap patuhi aturan blast sebelum memulai."}
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowBlastPopup(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-600">
                  Batal
                </button>
                <button
                  onClick={executePendingBlast}
                  disabled={blastCountdown > 0}
                  className={`flex-[2] py-3 font-extrabold rounded-xl transition-all ${blastCountdown > 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-400 text-slate-900 shadow-[0_0_15px_rgba(20,184,166,0.3)]'}`}
                >
                  {blastCountdown > 0 ? `Mohon Tunggu (${blastCountdown}s)` : "Saya Mengerti & Mulai Blast"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
