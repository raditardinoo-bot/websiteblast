"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("identitas");
  const [settings, setSettings] = useState({
    appName: "TRYWSBLAST",
    rewardPerMessage: 50,
    minWithdrawalBank: 50000,
    minWithdrawalEwallet: 10000,
    maxWithdrawalBank: 5000000,
    maxWithdrawalEwallet: 500000,
    adminFeeBank: 2500,
    adminFeeEwallet: 300,
    withdrawalAutoCloseEnabled: false,
    withdrawalOpenTime: "08:00",
    withdrawalCloseTime: "17:00",
    allowedBanks: "BCA,BNI,BRI,MANDIRI,BSI",
    allowedEWallets: "DANA,OVO,GOPAY,LINKAJA,SHOPEEPAY",
    referralRewardRegular: 50,
    referralRewardVip: 200,
    csType: "WA",
    csValue: "628123456789",
    logoUrl: "",
    telegramBotToken: "",
    telegramChatId: "",
    telegramChannelId: "",
    telegramBroadcastEnabled: true,
    ruleProfileName: "Nama Pegawai - TRYWSBLAST",
    ruleProfilePhotoUrl: "",
    popupEnabledDashboard: true,
    popupEnabledBlast: true,
    popupType: "IMAGE",
    popupMediaUrls: "",
    popupText: "aturan wajib ganti nama dan profil gitu jika tidak patuh saldo tidak bisa di witdraw",
    bgThemeType: "DEFAULT",
    bgImageUrl: "",
    shadowbanCheckEnabled: false,
    isMaintenance: false,
    maintenanceKey: "admin123",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [rulePhotoFile, setRulePhotoFile] = useState<File | null>(null);
  const [rulePhotoPreview, setRulePhotoPreview] = useState<string>("");
  const [popupFiles, setPopupFiles] = useState<File[]>([]);
  const [popupFilesPreview, setPopupFilesPreview] = useState<string[]>([]);
  const [videoInputType, setVideoInputType] = useState<"LINK" | "UPLOAD">("LINK");
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string>("");

  // Cropper states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawBgImage, setRawBgImage] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = async () => {
    try {
      const croppedImageFile = await getCroppedImg(
        rawBgImage,
        croppedAreaPixels as any,
        0
      );
      if (croppedImageFile) {
        setBgImageFile(croppedImageFile);
        setBgImagePreview(URL.createObjectURL(croppedImageFile));
        setCropModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [inactiveDays, setInactiveDays] = useState<number>(3);
  const [inactiveCount, setInactiveCount] = useState<number | null>(null);
  const [isCheckingInactive, setIsCheckingInactive] = useState(false);

  // States for Batch Cleaning
  const [isCleaningInactive, setIsCleaningInactive] = useState(false);
  const [deleteLimit, setDeleteLimit] = useState<number>(0);
  const [deletedSoFar, setDeletedSoFar] = useState<number>(0);
  const stopRef = useRef(false);
  const [isStopRequested, setIsStopRequested] = useState(false);

  // States for Custom Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, type: 'JUNK' | 'ALL' | null, title: string, message: string }>({ isOpen: false, type: null, title: '', message: '' });
  const [isExecutingFast, setIsExecutingFast] = useState(false);

  const [totalDevices, setTotalDevices] = useState<number | null>(null);
  const [totalStorageMB, setTotalStorageMB] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentWibTime, setCurrentWibTime] = useState<string>("");

  // Secret Feature States
  const [secretClicks, setSecretClicks] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [isSecretFeatureActive, setIsSecretFeatureActive] = useState(false);
  const [noRefUsers, setNoRefUsers] = useState<any[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [selectedReferrers, setSelectedReferrers] = useState<{ [key: number]: number }>({});
  const [activeKetuaId, setActiveKetuaId] = useState<number | null>(null);
  const [ketuaSearchTerm, setKetuaSearchTerm] = useState("");
  const [bawahanSortBy, setBawahanSortBy] = useState<"DEFAULT" | "BALANCE" | "BLAST">("DEFAULT");
  
  const handleSecretClick = () => {
    if (isSecretFeatureActive) return;
    const newClicks = secretClicks + 1;
    setSecretClicks(newClicks);
    if (newClicks >= 5) {
      setShowSecretModal(true);
      setSecretClicks(0);
    }
  };

  const handleVerifySecret = () => {
    if (secretCode === '110404') {
      setIsSecretFeatureActive(true);
      setShowSecretModal(false);
      fetchSecretData();
    } else {
      setToastMessage("Kode Rahasia Salah!");
      setShowSecretModal(false);
      setSecretCode("");
    }
  };

  const fetchSecretData = async () => {
    try {
      const [resUsers, resRefs] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/secret/no-referral`, { headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/secret/referrers`, { headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` } })
      ]);
      if (resUsers.ok && resRefs.ok) {
        setNoRefUsers(await resUsers.json());
        setReferrers(await resRefs.json());
      }
    } catch(e) {}
  };

  const handleSetReferrer = async (userId: number, referrerIdArg?: number) => {
    const referrerId = referrerIdArg || selectedReferrers[userId];
    if (!referrerId) return setToastMessage("Pilih ketua terlebih dahulu");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/secret/set-referrer`, {
        method: 'PUT',
        headers: { 
          "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, referrerId: Number(referrerId) })
      });
      if (res.ok) {
        setToastMessage("Ketua berhasil diatur!");
        fetchSecretData();
      }
    } catch(e) {}
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSecretFeatureActive && activeTab === 'cs') {
      interval = setInterval(fetchSecretData, 5000);
    }
    return () => clearInterval(interval);
  }, [isSecretFeatureActive, activeTab]);

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(() => {
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const wibDate = new Date(utc + (3600000 * 7)); // UTC+7
      setCurrentWibTime(wibDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'inactive') {
      fetchStorageStats();
    }
  }, [activeTab]);

  const fetchStorageStats = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/storage/stats`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTotalDevices(data.totalDevices);
        setTotalStorageMB(data.sizeInMB);
      }
    } catch (e) { }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          appName: data.appName || "TRYWSBLAST",
          rewardPerMessage: data.rewardPerMessage !== undefined ? data.rewardPerMessage : 50,
          minWithdrawalBank: data.minWithdrawalBank !== undefined ? data.minWithdrawalBank : 50000,
          minWithdrawalEwallet: data.minWithdrawalEwallet !== undefined ? data.minWithdrawalEwallet : 10000,
          maxWithdrawalBank: data.maxWithdrawalBank !== undefined ? data.maxWithdrawalBank : 5000000,
          maxWithdrawalEwallet: data.maxWithdrawalEwallet !== undefined ? data.maxWithdrawalEwallet : 500000,
          adminFeeBank: data.adminFeeBank !== undefined ? data.adminFeeBank : 2500,
          adminFeeEwallet: data.adminFeeEwallet !== undefined ? data.adminFeeEwallet : 300,
          withdrawalAutoCloseEnabled: data.withdrawalAutoCloseEnabled !== undefined ? data.withdrawalAutoCloseEnabled : false,
          withdrawalOpenTime: data.withdrawalOpenTime || "08:00",
          withdrawalCloseTime: data.withdrawalCloseTime || "17:00",
          allowedBanks: data.allowedBanks || "BCA,BNI,BRI,MANDIRI,BSI",
          allowedEWallets: data.allowedEWallets || "DANA,OVO,GOPAY,LINKAJA,SHOPEEPAY",
          referralRewardRegular: data.referralRewardRegular !== undefined ? data.referralRewardRegular : 50,
          referralRewardVip: data.referralRewardVip !== undefined ? data.referralRewardVip : 200,
          csType: data.csType || "WA",
          csValue: data.csValue || "628123456789",
          telegramBotToken: data.telegramBotToken || "",
          telegramChatId: data.telegramChatId || "",
          telegramChannelId: data.telegramChannelId || "",
          telegramBroadcastEnabled: data.telegramBroadcastEnabled !== undefined ? data.telegramBroadcastEnabled : true,
          logoUrl: data.logoUrl || "",
          ruleProfileName: data.ruleProfileName || "Nama Pegawai - TRYWSBLAST",
          ruleProfilePhotoUrl: data.ruleProfilePhotoUrl || "",
          popupEnabledDashboard: data.popupEnabledDashboard !== undefined ? data.popupEnabledDashboard : true,
          popupEnabledBlast: data.popupEnabledBlast !== undefined ? data.popupEnabledBlast : true,
          popupType: data.popupType || "IMAGE",
          popupMediaUrls: data.popupMediaUrls || "",
          popupText: data.popupText || "aturan wajib ganti nama dan profil gitu jika tidak patuh saldo tidak bisa di witdraw",
          bgThemeType: data.bgThemeType || "DEFAULT",
          bgImageUrl: data.bgImageUrl || "",
          shadowbanCheckEnabled: data.shadowbanCheckEnabled !== undefined ? data.shadowbanCheckEnabled : false,
          isMaintenance: data.isMaintenance !== undefined ? data.isMaintenance : false,
          maintenanceKey: data.maintenanceKey || "admin123",
        });
        if (data.logoUrl) {
          setLogoPreview(`${process.env.NEXT_PUBLIC_API_URL}${data.logoUrl}`);
        }
        if (data.bgImageUrl) {
          setBgImagePreview(`${process.env.NEXT_PUBLIC_API_URL}${data.bgImageUrl}`);
        }
        if (data.ruleProfilePhotoUrl) {
          setRulePhotoPreview(`${process.env.NEXT_PUBLIC_API_URL}${data.ruleProfilePhotoUrl}`);
        }
        if (data.popupType === "VIDEO" && data.popupMediaUrls?.includes("/uploads/")) {
          setVideoInputType("UPLOAD");
        }
      }
    } catch (error) {
      console.error("Gagal memuat pengaturan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRulePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRulePhotoFile(file);
      setRulePhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePopupFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setPopupFiles(files);
      const previews = files.map(file => URL.createObjectURL(file));
      setPopupFilesPreview(previews);
    }
  };

  const getVideoDisplayUrl = () => {
    if (!settings.popupMediaUrls) return "";
    try {
      const parsed = JSON.parse(settings.popupMediaUrls);
      const url = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : "";
      return url || "";
    } catch {
      return settings.popupMediaUrls || "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMessage("");

    const formData = new FormData();
    formData.append("appName", settings.appName);
    formData.append("rewardPerMessage", settings.rewardPerMessage.toString());
    formData.append("minWithdrawalBank", settings.minWithdrawalBank.toString());
    formData.append("minWithdrawalEwallet", settings.minWithdrawalEwallet.toString());
    formData.append("maxWithdrawalBank", settings.maxWithdrawalBank.toString());
    formData.append("maxWithdrawalEwallet", settings.maxWithdrawalEwallet.toString());
    formData.append("adminFeeBank", settings.adminFeeBank.toString());
    formData.append("adminFeeEwallet", settings.adminFeeEwallet.toString());
    formData.append("withdrawalAutoCloseEnabled", settings.withdrawalAutoCloseEnabled.toString());
    formData.append("withdrawalOpenTime", settings.withdrawalOpenTime);
    formData.append("withdrawalCloseTime", settings.withdrawalCloseTime);
    formData.append("allowedBanks", settings.allowedBanks);
    formData.append("allowedEWallets", settings.allowedEWallets);
    formData.append("referralRewardRegular", settings.referralRewardRegular.toString());
    formData.append("referralRewardVip", settings.referralRewardVip.toString());
    formData.append("csType", settings.csType);
    formData.append("csValue", settings.csValue);
    formData.append("telegramBotToken", settings.telegramBotToken);
    formData.append("telegramChatId", settings.telegramChatId);
    formData.append("telegramChannelId", settings.telegramChannelId);
    formData.append("telegramBroadcastEnabled", settings.telegramBroadcastEnabled.toString());
    formData.append("ruleProfileName", settings.ruleProfileName);

    formData.append("popupEnabledDashboard", settings.popupEnabledDashboard.toString());
    formData.append("popupEnabledBlast", settings.popupEnabledBlast.toString());
    formData.append("popupType", settings.popupType);
    formData.append("popupMediaUrls", settings.popupMediaUrls);
    formData.append("popupText", settings.popupText);
    formData.append("bgThemeType", settings.bgThemeType);
    formData.append("shadowbanCheckEnabled", settings.shadowbanCheckEnabled.toString());
    formData.append("isMaintenance", settings.isMaintenance.toString());
    formData.append("maintenanceKey", settings.maintenanceKey);

    if (bgImageFile) {
      formData.append("bgImage", bgImageFile);
    }

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    if (rulePhotoFile) {
      formData.append("ruleProfilePhoto", rulePhotoFile);
    }

    if (popupFiles.length > 0) {
      popupFiles.forEach((file) => {
        formData.append("popupFiles", file);
      });
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setToastMessage(t("admin_settings_toast_saved"));
        if (data.settings.logoUrl) {
          setLogoPreview(`${process.env.NEXT_PUBLIC_API_URL}${data.settings.logoUrl}`);
        }
        if (data.settings.bgImageUrl) {
          setBgImagePreview(`${process.env.NEXT_PUBLIC_API_URL}${data.settings.bgImageUrl}`);
        }
        if (data.settings.ruleProfilePhotoUrl) {
          setRulePhotoPreview(`${process.env.NEXT_PUBLIC_API_URL}${data.settings.ruleProfilePhotoUrl}`);
        }
        setTimeout(() => setToastMessage(""), 3000);
      } else {
        setToastMessage(t("admin_settings_toast_save_fail"));
      }
    } catch (error) {
      setToastMessage(t("admin_settings_toast_conn_fail"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckInactive = async () => {
    setIsCheckingInactive(true);
    setInactiveCount(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/inactive/check?days=${inactiveDays}`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInactiveCount(data.count);
        setDeleteLimit(data.count); // Defaultkan batas hapus ke total
      } else {
        setToastMessage(t("admin_settings_toast_check_fail"));
      }
    } catch (e) {
      setToastMessage(t("admin_settings_toast_conn_fail"));
    } finally {
      setIsCheckingInactive(false);
    }
  };

  const handleCleanInactive = async () => {
    setIsCleaningInactive(true);
    setDeletedSoFar(0);
    setIsStopRequested(false);
    stopRef.current = false;

    let remaining = deleteLimit;
    let totalDeleted = 0;

    try {
      while (remaining > 0) {
        if (stopRef.current) {
          setToastMessage(t("admin_settings_toast_clean_stop"));
          break;
        }

        // Hapus 10 per 10 agar terlihat loadingnya dan tidak timeout
        const batchSize = Math.min(remaining, 10);

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/inactive/clean?days=${inactiveDays}&limit=${batchSize}`, {
          method: 'DELETE',
          headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
        });

        if (res.ok) {
          totalDeleted += batchSize;
          remaining -= batchSize;
          setDeletedSoFar(totalDeleted);
        } else {
          setToastMessage(t("admin_settings_toast_clean_err"));
          break;
        }
      }

      if (!stopRef.current) {
        setToastMessage(`${t("admin_settings_toast_clean_succ")} ${totalDeleted} ${t("admin_settings_toast_clean_unit")}`);
      }

      // Update sisa UI
      setInactiveCount(prev => prev !== null ? Math.max(0, prev - totalDeleted) : null);
      fetchStorageStats(); // Refresh angka storage

    } catch (e) {
      setToastMessage(t("admin_settings_toast_clean_conn_err"));
    } finally {
      setIsCleaningInactive(false);
      setIsStopRequested(false);
    }
  };

  const handleStopCleaning = () => {
    stopRef.current = true;
    setIsStopRequested(true);
  };

  const executeFastClean = async () => {
    if (!confirmModal.type) return;
    setIsExecutingFast(true);
    
    try {
      const endpoint = confirmModal.type === 'JUNK' ? '/api/devices/inactive/clean-junk' : '/api/devices/inactive/clean-all';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(data.message);
        fetchStorageStats();
      } else {
        setToastMessage(data.error);
      }
    } catch (e) {
      setToastMessage("Koneksi gagal.");
    } finally {
      setIsExecutingFast(false);
      setConfirmModal({ ...confirmModal, isOpen: false });
    }
  };

  const handleCleanJunk = () => {
    setConfirmModal({
      isOpen: true,
      type: 'JUNK',
      title: 'Sapu Bersih "Menunggu Tautan"',
      message: 'Anda yakin ingin menghapus semua perangkat sampah yang berstatus "Menunggu Tautan"? Proses ini akan dilakukan secara massal dan sangat cepat (instan) tanpa progress bar.'
    });
  };

  const handleCleanAll = () => {
    setConfirmModal({
      isOpen: true,
      type: 'ALL',
      title: '⚠️ RESET TOTAL SEMUA SESI',
      message: 'PERINGATAN KERAS! Tindakan ini akan MENGHAPUS SELURUH PERANGKAT di database, termasuk yang sedang aktif dipakai user. Folder sesi fisik juga akan dikosongkan secara paksa. Yakin?'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const tabs = [
    { id: "identitas", label: t("admin_settings_tab_identity"), icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
    { id: "keuangan", label: t("admin_settings_tab_finance"), icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "cs", label: t("admin_settings_tab_cs"), icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { id: "telegram", label: t("admin_settings_tab_telegram"), icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8" },
    { id: "aturan", label: t("admin_settings_tab_rules"), icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { id: "popup", label: t("admin_settings_tab_popup"), icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
    { id: "tema", label: t("admin_settings_tab_theme"), icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { id: "inactive", label: t("admin_settings_tab_inactive"), icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
    { id: "maintenance", label: t("admin_settings_tab_maintenance"), icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t("admin_settings_title")}</h1>
        <p className="text-slate-400">{t("admin_settings_desc")}</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">

        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-slate-900/50 border-r border-slate-700 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal text-left font-medium ${activeTab === tab.id
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 lg:p-10 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <form onSubmit={handleSave} className="relative z-10 space-y-8">

            {/* TAB IDENTITAS */}
            {activeTab === "identitas" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4">{t("admin_settings_id_title")}</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center gap-3">
                    <label className="text-sm font-semibold text-slate-300">{t("admin_settings_id_logo")}</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-teal-500 transition-colors group relative"
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-500 group-hover:text-teal-400">{t("admin_settings_id_logo_upload")}</span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{t("admin_settings_id_logo_change")}</span>
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_id_name")}</label>
                      <input
                        type="text"
                        name="appName"
                        value={settings.appName}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={t("admin_settings_id_name_placeholder")}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB KEUANGAN */}
            {activeTab === "keuangan" && (
              <div className="space-y-8 animate-in fade-in duration-300">

                <div>
                  <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4 mb-6">{t("admin_settings_fin_wage_title")}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wage_msg")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input type="number" name="rewardPerMessage" value={settings.rewardPerMessage} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wage_ref_reg")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input type="number" name="referralRewardRegular" value={settings.referralRewardRegular} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wage_ref_vip")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-bold">Rp</span>
                        <input type="number" name="referralRewardVip" value={settings.referralRewardVip} onChange={handleChange} required className="w-full bg-slate-900 border border-amber-500/50 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-[0_0_10px_rgba(245,158,11,0.1)]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4 mb-6">{t("admin_settings_fin_wd_title")}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_min_bank")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input type="number" name="minWithdrawalBank" value={settings.minWithdrawalBank} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_min_ewallet")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input type="number" name="minWithdrawalEwallet" value={settings.minWithdrawalEwallet} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_max_bank")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input type="number" name="maxWithdrawalBank" value={settings.maxWithdrawalBank} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_max_ewallet")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input type="number" name="maxWithdrawalEwallet" value={settings.maxWithdrawalEwallet} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_fee_bank")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input type="number" name="adminFeeBank" value={settings.adminFeeBank} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_fee_ewallet")}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input type="number" name="adminFeeEwallet" value={settings.adminFeeEwallet} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_banks")}</label>
                      <textarea
                        name="allowedBanks"
                        value={settings.allowedBanks}
                        onChange={handleChange}
                        placeholder="BCA, BNI, BRI, Mandiri"
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none h-24 resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">{t("admin_settings_fin_wd_banks_desc")}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_ewallets")}</label>
                      <textarea
                        name="allowedEWallets"
                        value={settings.allowedEWallets}
                        onChange={handleChange}
                        placeholder="OVO, DANA, GoPay, LinkAja"
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none h-24 resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">{t("admin_settings_fin_wd_banks_desc")}</p>
                    </div>
                  </div>

                  {/* Jam Buka Tutup WD */}
                  <div className="mt-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-700/50 pb-4">
                      <div>
                        <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Jam Operasional Penarikan (Otomatis)
                          {currentWibTime && <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs rounded-md font-mono">{currentWibTime} WIB</span>}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-lg">{t("admin_settings_fin_wd_hours_desc")}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer mt-4 md:mt-0">
                        <input
                          type="checkbox"
                          name="withdrawalAutoCloseEnabled"
                          checked={settings.withdrawalAutoCloseEnabled}
                          onChange={(e) => setSettings({ ...settings, withdrawalAutoCloseEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                      </label>
                    </div>

                    {settings.withdrawalAutoCloseEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_hours_open")}</label>
                          <input
                            type="time"
                            name="withdrawalOpenTime"
                            value={settings.withdrawalOpenTime}
                            onChange={handleChange}
                            required={settings.withdrawalAutoCloseEnabled}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_fin_wd_hours_close")}</label>
                          <input
                            type="time"
                            name="withdrawalCloseTime"
                            value={settings.withdrawalCloseTime}
                            onChange={handleChange}
                            required={settings.withdrawalAutoCloseEnabled}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CUSTOMER SERVICE */}
            {activeTab === "cs" && (
              <div className="relative space-y-6 animate-in fade-in duration-300">
                <div className="absolute top-0 right-0 w-10 h-10 cursor-pointer opacity-0 z-50" onClick={handleSecretClick}></div>
                <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4">{t("admin_settings_cs_title")}</h2>
                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-inner">
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Tombol ini akan selalu muncul mengambang (mengikuti scroll) di sudut kanan bawah semua layar pengguna, baik sebelum login maupun sesudah masuk ke dashboard.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_cs_type")}</label>
                      <select
                        name="csType"
                        value={settings.csType}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="WA">{t("admin_settings_cs_type_wa")}</option>
                        <option value="LINK">{t("admin_settings_cs_type_link")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        {settings.csType === "WA" ? t("admin_settings_cs_value_wa") : t("admin_settings_cs_value_link")}
                      </label>
                      <input
                        type="text"
                        name="csValue"
                        value={settings.csValue}
                        onChange={handleChange}
                        placeholder={settings.csType === "WA" ? "628123456789" : "https://t.me/cs_blast"}
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            


            {/* TAB TELEGRAM */}
            {activeTab === "telegram" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4">{t("admin_settings_tg_title")}</h2>
                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-inner">
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Sistem akan otomatis mengirim pesan ke Telegram Anda setiap kali ada *User* yang mengklaim dana.
                  </p>

                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl mb-8">
                    <h3 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Panduan Mendapatkan Chat ID
                    </h3>
                    <ol className="list-decimal ml-5 text-xs text-indigo-300/80 space-y-1.5 font-medium">
                      <li>{t("admin_settings_tg_guide_1")} <a href="https://t.me/BotFather" target="_blank" className="text-indigo-400 hover:underline">@BotFather</a></li>
                      <li>{t("admin_settings_tg_guide_2")} <a href="https://t.me/userinfobot" target="_blank" className="text-indigo-400 hover:underline">@userinfobot</a></li>
                      <li>{t("admin_settings_tg_guide_3")}</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_tg_token")}</label>
                      <input
                        type="text"
                        name="telegramBotToken"
                        value={settings.telegramBotToken}
                        onChange={handleChange}
                        placeholder="Contoh: 8362761636:AAEOsGV9_IW3EYlC1gudfg-eyAXtXb0PzQo"
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_tg_chatid")}</label>
                      <input
                        type="text"
                        name="telegramChatId"
                        value={settings.telegramChatId}
                        onChange={handleChange}
                        placeholder="Contoh: 123456789"
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 flex justify-between items-center">
                      <div>
                        <h4 className="text-white font-bold mb-1">{t("admin_settings_tg_broadcast_title")}</h4>
                        <p className="text-xs text-slate-400">{t("admin_settings_tg_broadcast_desc")}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="telegramBroadcastEnabled"
                          checked={settings.telegramBroadcastEnabled}
                          onChange={(e) => setSettings({ ...settings, telegramBroadcastEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                      </label>
                    </div>

                    {settings.telegramBroadcastEnabled && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_tg_channel_id")}</label>
                        <input
                          type="text"
                          name="telegramChannelId"
                          value={settings.telegramChannelId}
                          onChange={handleChange}
                          placeholder="Contoh: -100987654321"
                          className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          <strong className="text-indigo-400">INFO:</strong> {t("admin_settings_tg_channel_info")}<br/>
                          <strong className="text-teal-400">INFO:</strong> {t("admin_settings_tg_channel_guide")}<br/>
                          <span className="text-red-400 font-bold">PENTING:</span> {t("admin_settings_tg_channel_warn")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB ATURAN PEKERJA */}
            {activeTab === "aturan" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4">{t("admin_settings_rule_title")}</h2>
                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-inner">
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Atur foto profil dan nama WhatsApp yang <strong className="text-red-400">wajib</strong> digunakan oleh pekerja sebelum mereka memulai pengiriman pesan. Peringatan ini akan muncul di dashboard pekerja.
                  </p>

                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Upload Foto Aturan */}
                    <div className="w-full md:w-1/3">
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_rule_photo")}</label>
                      <div className="border-2 border-dashed border-slate-600 rounded-2xl p-4 text-center hover:border-indigo-500 transition-colors bg-slate-900 group">
                        {rulePhotoPreview ? (
                          <div className="relative mx-auto w-32 h-32 mb-4">
                            <img src={rulePhotoPreview} alt="Rule Profile Preview" className="w-full h-full object-cover rounded-full border-4 border-slate-800 shadow-xl" />
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs font-bold text-white">{t("admin_settings_rule_photo_change")}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-32 h-32 mx-auto bg-slate-800 rounded-full flex flex-col items-center justify-center mb-4 text-slate-400 border border-slate-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs">{t("admin_settings_rule_photo_upload")}</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleRulePhotoChange}
                          className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
                        />
                      </div>
                    </div>

                    {/* Nama Wajib */}
                    <div className="w-full md:w-2/3 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_rule_name")}</label>
                        <input
                          type="text"
                          name="ruleProfileName"
                          value={settings.ruleProfileName}
                          onChange={handleChange}
                          placeholder="Contoh: Nama Pegawai - TRYWSBLAST"
                          className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4 mt-8">{t("admin_settings_rule_sec_title")}</h2>
                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 flex justify-between items-center shadow-inner mt-4">
                  <div>
                    <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Deteksi Shadowban
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      name="shadowbanCheckEnabled"
                      checked={settings.shadowbanCheckEnabled}
                      onChange={(e) => setSettings({ ...settings, shadowbanCheckEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
              </div>
            )}

            {/* TAB POPUP */}
            {activeTab === "popup" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4 mb-6">{t("admin_settings_popup_title")}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 flex justify-between items-center">
                      <div>
                        <h4 className="text-white font-bold mb-1">{t("admin_settings_popup_dash")}</h4>
                        <p className="text-xs text-slate-400">{t("admin_settings_popup_dash_desc")}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="popupEnabledDashboard"
                          checked={settings.popupEnabledDashboard}
                          onChange={(e) => setSettings({ ...settings, popupEnabledDashboard: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                      </label>
                    </div>

                    <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 flex justify-between items-center">
                      <div>
                        <h4 className="text-white font-bold mb-1">{t("admin_settings_popup_blast")}</h4>
                        <p className="text-xs text-slate-400">{t("admin_settings_popup_blast_desc")}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="popupEnabledBlast"
                          checked={settings.popupEnabledBlast}
                          onChange={(e) => setSettings({ ...settings, popupEnabledBlast: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-inner space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_popup_type")}</label>
                      <select
                        name="popupType"
                        value={settings.popupType}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="IMAGE">{t("admin_settings_popup_type_img")}</option>
                        <option value="VIDEO">{t("admin_settings_popup_type_vid")}</option>
                      </select>
                    </div>

                    {settings.popupType === 'IMAGE' ? (
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_popup_img_label")}</label>
                        <p className="text-xs text-slate-400 mb-4">{t("admin_settings_popup_img_desc")}</p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePopupFilesChange}
                          className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20 mb-4"
                        />
                        {popupFilesPreview.length > 0 ? (
                          <div className="flex gap-4 overflow-x-auto pb-2">
                            {popupFilesPreview.map((src, i) => (
                              <img key={i} src={src} alt="preview" className="h-24 rounded-lg border border-slate-600" />
                            ))}
                          </div>
                        ) : settings.popupMediaUrls && settings.popupMediaUrls.startsWith('[') ? (
                          <div className="flex gap-4 overflow-x-auto pb-2">
                            {JSON.parse(settings.popupMediaUrls).map((src: string, i: number) => (
                              <img key={i} src={`${process.env.NEXT_PUBLIC_API_URL}${src}`} alt="preview" className="h-24 rounded-lg border border-slate-600" />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="videoInputType"
                              value="LINK"
                              checked={videoInputType === "LINK"}
                              onChange={() => setVideoInputType("LINK")}
                              className="w-4 h-4 text-teal-500 bg-slate-900 border-slate-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-slate-300">{t("admin_settings_popup_vid_link_opt")}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="videoInputType"
                              value="UPLOAD"
                              checked={videoInputType === "UPLOAD"}
                              onChange={() => setVideoInputType("UPLOAD")}
                              className="w-4 h-4 text-teal-500 bg-slate-900 border-slate-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-slate-300">{t("admin_settings_popup_vid_up_opt")}</span>
                          </label>
                        </div>

                        {videoInputType === "LINK" ? (
                          <div key="link-input">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_popup_vid_link_label")}</label>
                            <input
                              type="text"
                              name="popupMediaUrls"
                              value={getVideoDisplayUrl()}
                              onChange={(e) => setSettings({ ...settings, popupMediaUrls: e.target.value })}
                              placeholder="Contoh: https://www.youtube.com/embed/xxxxxx"
                              className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <p className="text-xs text-slate-400 mt-2">{t("admin_settings_popup_vid_link_desc")}</p>
                          </div>
                        ) : (
                          <div key="upload-input">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_popup_vid_up_label")}</label>
                            <input
                              type="file"
                              accept="video/*"
                              onChange={handlePopupFilesChange}
                              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20"
                            />
                            {popupFilesPreview.length > 0 ? (
                              <video src={popupFilesPreview[0]} controls className="mt-4 h-32 rounded-lg border border-slate-600"></video>
                            ) : settings.popupMediaUrls && settings.popupMediaUrls.includes('/uploads/') ? (
                              <video src={`${process.env.NEXT_PUBLIC_API_URL}${getVideoDisplayUrl()}`} controls className="mt-4 h-32 rounded-lg border border-slate-600"></video>
                            ) : null}
                            <p className="text-xs text-slate-400 mt-2">{t("admin_settings_popup_vid_up_desc")}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_popup_text")}</label>
                      <textarea
                        name="popupText"
                        value={settings.popupText}
                        onChange={handleChange}
                        rows={4}
                        placeholder={t("admin_settings_popup_text_placeholder")}
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB TEMA & BACKGROUND */}
            {activeTab === "tema" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4">{t("admin_settings_theme_title")}</h2>
                <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-inner">
                  <p className="text-sm text-slate-400 mb-6">{t("admin_settings_theme_desc")}</p>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_theme_select")}</label>
                      <select
                        name="bgThemeType"
                        value={settings.bgThemeType}
                        onChange={handleChange}
                        className="w-full md:w-1/2 bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="DEFAULT">{t("admin_settings_theme_default")}</option>
                        <option value="PHOTO">{t("admin_settings_theme_photo")}</option>
                      </select>
                    </div>

                    {settings.bgThemeType === 'PHOTO' && (
                      <div className="pt-4 border-t border-slate-700">
                        <label className="block text-sm font-semibold text-slate-300 mb-4">{t("admin_settings_theme_up_label")}</label>
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                          <div className="w-full md:w-1/2 aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-600 flex items-center justify-center relative group">
                            {bgImagePreview ? (
                              <img src={bgImagePreview} alt="Background Preview" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-slate-500 text-sm">{t("admin_settings_theme_up_empty")}</span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-sm font-bold shadow-lg">{t("admin_settings_theme_up_preview")}</span>
                            </div>
                          </div>

                          <div className="w-full md:w-1/2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const url = URL.createObjectURL(e.target.files[0]);
                                  setRawBgImage(url);
                                  setCropModalOpen(true);
                                }
                              }}
                              className="w-full text-sm text-slate-400 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20"
                            />
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("admin_settings_theme_up_desc") }}></p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB INACTIVE SESSIONS (PEMBERSIHAN) */}
            {activeTab === "inactive" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-red-400 border-b border-red-500/30 pb-4">{t("admin_settings_inac_title")}</h2>
                <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/20 shadow-inner">

                  {/* STORAGE STATS */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900 border border-slate-700 p-5 rounded-xl mb-6">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">{t("admin_settings_inac_dev_total")}</p>
                        <p className="text-white font-bold text-xl">{totalDevices !== null ? totalDevices : '...'} {t('admin_settings_inac_dev_unit')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">{t("admin_settings_inac_folder")}</p>
                        <p className="text-red-400 font-bold text-xl">{totalStorageMB !== null ? totalStorageMB : '...'} MB</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 mb-6 leading-relaxed border-t border-slate-700/50 pt-6">
                    Fitur ini digunakan untuk <strong className="text-red-400">menghapus permanen</strong> folder WhatsApp dan data perangkat pekerja yang sudah berstatus <em>DISCONNECTED</em> berhari-hari. Ini akan melegakan <strong>Penyimpanan (Storage)</strong> VPS Anda.
                  </p>

                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="w-full md:w-1/3">
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t("admin_settings_inac_search_label")}</label>
                      <input
                        type="number"
                        min="1"
                        value={inactiveDays}
                        onChange={(e) => setInactiveDays(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleCheckInactive}
                      disabled={isCheckingInactive || isCleaningInactive}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-600 transition-all disabled:opacity-50"
                    >
                      {isCheckingInactive ? t("admin_settings_inac_btn_checking") : t("admin_settings_inac_btn_check")}
                    </button>
                  </div>

                  {inactiveCount !== null && (
                    <div className="mt-8 p-6 bg-slate-900 rounded-xl border border-slate-700 animate-in fade-in zoom-in-95">
                      <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-400 text-sm">{t("admin_settings_inac_res_title")}</p>
                            <p className="text-xl font-bold text-white mt-1">
                              {t("admin_settings_inac_res_found")} <span className="text-red-400 text-2xl">{inactiveCount}</span> {t("admin_settings_inac_res_dead")}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">{t("admin_settings_inac_res_warn")}</p>
                          </div>
                        </div>

                        {inactiveCount > 0 && !isCleaningInactive && (
                          <div className="flex flex-col md:flex-row items-end gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <div className="flex-1 w-full">
                              <label className="block text-xs font-bold text-slate-400 mb-1">{t("admin_settings_inac_limit")}</label>
                              <input
                                type="number"
                                min="1"
                                max={inactiveCount}
                                value={deleteLimit}
                                onChange={(e) => setDeleteLimit(Math.min(inactiveCount, Math.max(1, Number(e.target.value))))}
                                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-red-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleCleanInactive}
                              className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.4)] transition-all whitespace-nowrap w-full md:w-auto"
                            >
                              Mulai Eksekusi 🚀
                            </button>
                          </div>
                        )}

                        {isCleaningInactive && (
                          <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 space-y-4">
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-slate-300">{t("admin_settings_inac_prog_title")}</span>
                              <span className="text-teal-400">{deletedSoFar} / {deleteLimit} {t("admin_settings_inac_prog_deleted")}</span>
                            </div>

                            <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden relative">
                              <div
                                className="bg-gradient-to-r from-red-600 to-rose-400 h-4 transition-all duration-300 ease-out"
                                style={{ width: `${(deletedSoFar / deleteLimit) * 100}%` }}
                              ></div>
                              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={handleStopCleaning}
                                disabled={isStopRequested}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                              >
                                {isStopRequested ? t("admin_settings_inac_btn_stopping") : t("admin_settings_inac_btn_stop")}
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                  
                  {/* TOMBOL EXTRA (Sapu Bersih) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-xl text-center flex flex-col justify-between">
                      <div>
                        <h4 className="text-orange-400 font-bold mb-2">{t("admin_settings_inac_junk_title")}</h4>
                        <p className="text-xs text-slate-400 mb-4">{t("admin_settings_inac_junk_desc")}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={handleCleanJunk}
                        className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors"
                      >
                        Bersihkan Sampah
                      </button>
                    </div>

                    <div className="bg-red-600/10 border border-red-600/30 p-5 rounded-xl text-center flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/20 rounded-bl-full"></div>
                      <div>
                        <h4 className="text-red-500 font-bold mb-2">{t("admin_settings_inac_reset_title")}</h4>
                        <p className="text-xs text-slate-400 mb-4"><span dangerouslySetInnerHTML={{ __html: t("admin_settings_inac_reset_desc") }}></span></p>
                      </div>
                      <button 
                        type="button"
                        onClick={handleCleanAll}
                        className="w-full py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-lg"
                      >
                        ⚠️ Sapu Bersih Semua
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB MAINTENANCE */}
            {activeTab === "maintenance" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-rose-400 border-b border-rose-500/30 pb-4">{t("admin_settings_maint_title")}</h2>
                <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/20 shadow-inner">
                  <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                    Fitur ini digunakan untuk <strong>menutup sementara</strong> akses aplikasi bagi semua *User*. Sangat berguna ketika Anda sedang melakukan perbaikan database, update VPS, atau mengubah pengaturan penting.
                  </p>

                  <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl mb-6 flex justify-between items-center">
                    <div>
                      <h4 className="text-rose-400 font-bold mb-1 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Aktifkan Maintenance Mode
                      </h4>
                      <p className="text-xs text-slate-400">{t("admin_settings_maint_toggle_desc")}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                      <input
                        type="checkbox"
                        name="isMaintenance"
                        checked={settings.isMaintenance}
                        onChange={(e) => setSettings({ ...settings, isMaintenance: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>
                  </div>

                  {settings.isMaintenance && (
                    <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 mt-4 animate-in zoom-in-95">
                      <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Kode Kunci Rahasia (Bypass Key)
                      </label>
                      <input
                        type="text"
                        name="maintenanceKey"
                        value={settings.maintenanceKey}
                        onChange={handleChange}
                        placeholder="Contoh: buka123"
                        className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-sm shadow-inner"
                      />
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        Jika ada user tertentu (atau Anda sendiri dengan akun user) yang harus mengakses web saat maintenance, gunakan kunci ini. <br />
                        <strong>Cara Pakai:</strong> Pada halaman depan "Under Maintenance", klik icon <strong>Kunci</strong> transparan di pojok kanan bawah, lalu isi kunci rahasia ini beserta username & password login.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-8 border-t border-slate-700 flex justify-end gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
      
      {/* DRAG & DROP SECRET PANEL MODAL */}
      {isSecretFeatureActive && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-amber-500/50 w-full max-w-5xl rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <div>
                <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Panel Rahasia: Manajemen Referral
                </h3>
                <p className="text-sm text-slate-400 mt-1">Seret (drag) nama bawahan dari daftar kanan ke dalam kotak ketua di sebelah kiri.</p>
              </div>
              <button 
                onClick={() => setIsSecretFeatureActive(false)}
                className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-rose-500/80 p-2 rounded-xl transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              
              {/* Step 1: Search & Select Ketua */}
              <div>
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">1</span>
                  Pilih Ketua (Target)
                </h4>
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <input 
                    type="text" 
                    placeholder="Cari Username / Kode Ketua..."
                    value={ketuaSearchTerm}
                    onChange={(e) => setKetuaSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
                  />
                  <div className="max-h-[250px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {referrers.filter(r => r.username.toLowerCase().includes(ketuaSearchTerm.toLowerCase()) || r.referralCode.toLowerCase().includes(ketuaSearchTerm.toLowerCase())).map((ref: any) => (
                      <button
                        key={ref.id}
                        type="button"
                        onClick={() => setActiveKetuaId(ref.id)}
                        className={`text-left p-3 rounded-lg border transition-all flex justify-between items-center ${activeKetuaId === ref.id ? 'bg-amber-600/20 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                      >
                        <div>
                          <p className="font-bold text-white text-sm">{ref.username}</p>
                          <p className="text-xs text-slate-400 font-mono">{ref.referralCode}</p>
                        </div>
                        {activeKetuaId === ref.id && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Select Bawahan */}
              <div className={`transition-opacity duration-300 ${activeKetuaId ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs">2</span>
                    Pilih Bawahan
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Urutkan:</span>
                    <select
                      value={bawahanSortBy}
                      onChange={(e) => setBawahanSortBy(e.target.value as any)}
                      className="bg-slate-800 border border-slate-600 text-white text-xs rounded-lg px-2 py-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                    >
                      <option value="DEFAULT">Default</option>
                      <option value="BALANCE">Saldo Tertinggi</option>
                      <option value="BLAST">Blast Terbanyak</option>
                    </select>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 overflow-y-auto max-h-[400px]">
                  {!activeKetuaId ? (
                    <div className="text-center py-8 text-slate-500">Silakan pilih Ketua terlebih dahulu di langkah 1.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {noRefUsers.filter(u => u.id !== activeKetuaId).length > 0 ? (
                        [...noRefUsers]
                          .filter(u => u.id !== activeKetuaId)
                          .sort((a, b) => {
                            if (bawahanSortBy === "BALANCE") return b.balance - a.balance;
                            if (bawahanSortBy === "BLAST") return b.messagesSent - a.messagesSent;
                            return 0;
                          })
                          .map((user: any) => (
                          <div key={user.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex justify-between items-center group hover:border-teal-500 transition-colors">
                            <div>
                              <p className="font-bold text-white text-sm">{user.username}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-emerald-400 font-medium">Rp {user.balance.toLocaleString('id-ID')}</p>
                                <p className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{user.messagesSent} Blast</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSetReferrer(user.id, activeKetuaId)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg whitespace-nowrap"
                            >
                              + Bawahan
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-12 flex flex-col items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700/50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-slate-400 font-medium text-sm">Semua akun sudah memiliki ketua referral.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECRET MODAL */}
      {showSecretModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-amber-500/50 w-full max-w-sm p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)] relative">
            <h3 className="text-xl font-bold text-amber-400 text-center mb-4">Akses Rahasia</h3>
            <input 
              type="password"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="Masukkan kode..."
              className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 mb-6 text-center tracking-widest font-mono"
            />
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setShowSecretModal(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
              >Batal</button>
              <button 
                type="button"
                onClick={handleVerifySecret}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
              >Verifikasi</button>
            </div>
          </div>
        </div>
      )}

{/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-6 rounded-2xl shadow-2xl relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.type === 'ALL' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">{confirmModal.title === 'Sapu Bersih "Menunggu Tautan"' ? t("admin_settings_modal_junk_title") : (confirmModal.title === '⚠️ RESET TOTAL SEMUA SESI' ? t("admin_settings_modal_reset_title") : confirmModal.title)}</h3>
            <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">{confirmModal.message.includes('sampah') ? t("admin_settings_modal_junk_msg") : t("admin_settings_modal_reset_msg")}</p>
            
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                disabled={isExecutingFast}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >{t("admin_settings_modal_btn_cancel")}</button>
              <button 
                type="button"
                onClick={executeFastClean}
                disabled={isExecutingFast}
                className={`flex-1 py-3 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${confirmModal.type === 'ALL' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
              >
                {isExecutingFast ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Memproses...
                  </>
                ) : (
                  "Ya, Eksekusi!"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${toastMessage.includes('Gagal') ? 'bg-red-900/90 border-red-500 text-red-100' : 'bg-emerald-900/90 border-emerald-500 text-emerald-100'}`}>
            <p className="font-bold text-sm">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* CROPPER MODAL */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 rounded-2xl border border-slate-700 flex flex-col h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
              <h3 className="text-white font-bold text-lg">{t("admin_settings_crop_title")}</h3>
              <button onClick={() => setCropModalOpen(false)} className="text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 relative bg-black/50 w-full h-full">
              <Cropper
                image={rawBgImage}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-6 border-t border-slate-700 bg-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="w-full sm:w-1/2 flex items-center gap-4">
                <span className="text-sm text-slate-400 font-medium">{t("admin_settings_crop_zoom")}</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCropModalOpen(false)}
                  className="flex-1 sm:flex-none px-6 py-2 rounded-xl text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                >{t("admin_settings_modal_btn_cancel")}</button>
                <button
                  type="button"
                  onClick={showCroppedImage}
                  className="flex-1 sm:flex-none px-6 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold transition-colors shadow-lg"
                >
                  {t("admin_settings_crop_use")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
