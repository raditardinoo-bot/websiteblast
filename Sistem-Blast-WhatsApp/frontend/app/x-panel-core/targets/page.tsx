"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function AdminTargetsPage() {
  // Data
  const [targets, setTargets] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, ready: 0, sukses: 0, gagal: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const { t } = useLanguage();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: "Ya",
    cancelText: "Batal",
    onConfirm: () => {}
  });

  const [modalCountdown, setModalCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (modalCountdown > 0) {
      timer = setTimeout(() => setModalCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [modalCountdown]);

  const openModal = (config: any) => {
    setModalConfig({ cancelText: t("admin_modal_cancel"), ...config });
    if (config.requireCountdown) {
      setModalCountdown(5);
    } else {
      setModalCountdown(0);
    }
    setModalOpen(true);
  };
  
  // Input Modes
  const [activeTab, setActiveTab] = useState<"MANUAL" | "EXCEL">("MANUAL");
  const [targetFilter, setTargetFilter] = useState<"ALL" | "READY" | "SUKSES" | "GAGAL">("ALL");
  const [campaignFilter, setCampaignFilter] = useState<number | "ALL">("ALL");
  const [manualInput, setManualInput] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [page, targetFilter, campaignFilter]);

  const handleFilterChange = (type: string, value: any) => {
    setPage(1);
    if (type === 'target') setTargetFilter(value);
    if (type === 'campaign') setCampaignFilter(value);
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (e) {}
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchTargets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/targets?page=${page}&limit=50&status=${targetFilter}&campaignId=${campaignFilter}`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets);
        setStats(data.stats);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalFiltered(data.pagination.totalFiltered || 0);
        }
      }
    } catch (error) {
      showToast(t("admin_targets_toast_load_fail"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    if (!selectedCampaignId) return showToast(t("admin_targets_toast_choose_camp"), "error");
    
    setIsSubmitting(true);
    const phones = manualInput.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/targets/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
        body: JSON.stringify({ phones, campaignId: selectedCampaignId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || t("admin_targets_toast_add_success"), "success");
        setManualInput("");
        fetchTargets();
      } else {
        showToast(data.error || t("admin_targets_toast_add_fail"), "error");
      }
    } catch (error) {
      showToast(t("admin_targets_toast_conn_fail"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) {
      showToast(t("admin_targets_toast_choose_excel"), "error");
      return;
    }
    if (!selectedCampaignId) return showToast(t("admin_targets_toast_choose_camp"), "error");
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("file", excelFile);
    formData.append("campaignId", String(selectedCampaignId));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/targets/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || t("admin_targets_toast_extract_success"), "success");
        setExcelFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchTargets();
      } else {
        showToast(data.error || t("admin_targets_toast_extract_fail"), "error");
      }
    } catch (error) {
      showToast(t("admin_targets_toast_upload_fail"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleanStatus = (status: string) => {
    openModal({
      title: t("admin_targets_modal_clean_title"),
      message: t("admin_targets_modal_clean_msg"),
      confirmText: t("admin_targets_modal_clean_confirm"),
      requireCountdown: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/targets/clean/${status}`, { method: "DELETE", headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` } });
          if (res.ok) {
            showToast(t("admin_targets_toast_add_success"), "success"); // we can reuse success
            fetchTargets();
          } else {
            showToast(t("admin_targets_toast_add_fail"), "error");
          }
        } catch (e) {
          showToast(t("admin_targets_toast_conn_fail"), "error");
        }
      }
    });
  };

  const handleDeleteTarget = (target: any) => {
    const isReady = target.status === 'READY';
    openModal({
      title: t("admin_targets_modal_del_title"),
      message: isReady ? t("admin_targets_modal_del_msg_ready") : t("admin_targets_modal_del_msg_other"),
      confirmText: t("admin_targets_modal_del_confirm"),
      requireCountdown: !isReady,
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/targets/${target.id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` } });
          if (res.ok) {
            showToast(t("admin_targets_toast_add_success"), "success");
            fetchTargets();
          } else {
            showToast(t("admin_targets_toast_add_fail"), "error");
          }
        } catch (e) {
          showToast(t("admin_targets_toast_conn_fail"), "error");
        }
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("admin_targets_title")}</h1>
          <p className="text-slate-400">{t("admin_targets_desc")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Input Forms */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-w-0">
               <span className="font-extrabold text-white text-2xl truncate w-full" title={stats.total.toLocaleString('id-ID')}>{stats.total.toLocaleString('id-ID')}</span>
               <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">{t("admin_targets_total_pool")}</span>
             </div>
             <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-w-0">
               <span className="font-extrabold text-emerald-400 text-2xl truncate w-full" title={stats.ready.toLocaleString('id-ID')}>{stats.ready.toLocaleString('id-ID')}</span>
               <span className="text-[10px] text-emerald-500 font-bold uppercase mt-1">{t("admin_targets_ready")}</span>
             </div>
             <div className="bg-teal-900/20 border border-teal-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-w-0">
               <span className="font-extrabold text-teal-400 text-2xl truncate w-full" title={stats.sukses.toLocaleString('id-ID')}>{stats.sukses.toLocaleString('id-ID')}</span>
               <span className="text-[10px] text-teal-500 font-bold uppercase mt-1">{t("admin_targets_success")}</span>
             </div>
             <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-w-0">
               <span className="font-extrabold text-red-400 text-2xl truncate w-full" title={stats.gagal.toLocaleString('id-ID')}>{stats.gagal.toLocaleString('id-ID')}</span>
               <span className="text-[10px] text-red-500 font-bold uppercase mt-1">{t("admin_targets_failed")}</span>
             </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-indigo-500"></div>
             
             <h3 className="text-lg font-bold text-white mb-6">{t("admin_targets_add_new")}</h3>

             <div className="mb-4">
               <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">{t("admin_targets_select_camp")}</label>
               <select 
                 className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-teal-500 text-sm"
                 value={selectedCampaignId}
                 onChange={(e) => setSelectedCampaignId(e.target.value ? Number(e.target.value) : "")}
                 required
               >
                 <option value="" disabled>{t("admin_targets_select_camp_placeholder")}</option>
                 {campaigns.map(c => (
                   <option key={c.id} value={c.id}>{c.name} {c.status === 'ACTIVE' ? t("admin_targets_active") : ''}</option>
                 ))}
               </select>
             </div>

             {/* Tabs */}
             <div className="flex p-1 bg-slate-900 rounded-xl mb-6">
               <button 
                 onClick={() => setActiveTab("MANUAL")}
                 className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "MANUAL" ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 {t("admin_targets_tab_manual")}
               </button>
               <button 
                 onClick={() => setActiveTab("EXCEL")}
                 className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "EXCEL" ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 {t("admin_targets_tab_excel")}
               </button>
             </div>

             {/* Tab Content: Manual */}
             {activeTab === "MANUAL" && (
               <form onSubmit={handleManualSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                 <div>
                   <label className="block text-xs font-bold text-slate-400 mb-2">{t("admin_targets_manual_input_label")}</label>
                   <textarea
                     required
                     rows={6}
                     value={manualInput}
                     onChange={(e) => setManualInput(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm placeholder:text-slate-600"
                     placeholder="08123456789&#10;08987654321&#10;628111222333"
                   ></textarea>
                 </div>
                 <button disabled={isSubmitting} className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-3 rounded-xl transition-all">
                   {isSubmitting ? t("admin_targets_manual_saving") : t("admin_targets_manual_add")}
                 </button>
               </form>
             )}

             {/* Tab Content: Excel */}
             {activeTab === "EXCEL" && (
               <form onSubmit={handleExcelSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                 
                 <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
                   <h4 className="text-xs font-bold text-indigo-400 mb-1 flex items-center gap-1.5">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                     </svg>
                     {t("admin_targets_excel_format")}
                   </h4>
                   <p className="text-[11px] text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("admin_targets_excel_desc") }}></p>
                 </div>

                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-full h-32 bg-slate-900 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 transition-all"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${excelFile ? 'text-teal-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                   <span className="text-sm font-bold text-white mb-1">
                     {excelFile ? excelFile.name : t("admin_targets_excel_select")}
                   </span>
                   <span className="text-xs text-slate-500">
                     {excelFile ? t("admin_targets_excel_change") : t("admin_targets_excel_format_ext")}
                   </span>
                 </div>
                 <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                 
                 <button disabled={isSubmitting || !excelFile} className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all">
                   {isSubmitting ? t("admin_targets_excel_extracting") : t("admin_targets_excel_upload")}
                 </button>
               </form>
             )}

          </div>
        </div>

        {/* Right Column: Targets List */}
        <div className="lg:col-span-2">
           <div className="bg-slate-800 border border-slate-700 rounded-[2rem] shadow-xl overflow-hidden h-[600px] flex flex-col">
              <div className="p-6 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start bg-slate-800/50 gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{t("admin_targets_list_title")}</h3>
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-bold border border-indigo-500/20 uppercase tracking-wider shadow-sm">
                      {totalFiltered.toLocaleString('id-ID')} {t("admin_targets_list_data_count")}
                    </span>
                  </div>

                  {(targetFilter === 'SUKSES' || targetFilter === 'GAGAL') && (
                    <button onClick={() => handleCleanStatus(targetFilter)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-500/20 flex items-center gap-1.5 w-fit shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {targetFilter === 'SUKSES' ? t("admin_targets_clean_success") : t("admin_targets_clean_failed")}
                    </button>
                  )}
                </div>
                
                {/* Filter Controls */}
                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                  <select 
                    className="w-full md:w-auto bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500 shadow-sm"
                    value={campaignFilter}
                    onChange={(e) => handleFilterChange('campaign', e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  >
                    <option value="ALL">{t("admin_targets_filter_all_camp")}</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Filter Tabs */}
                  <div className="flex bg-slate-900 p-1 rounded-xl w-full md:w-auto shadow-sm">
                    <button onClick={() => handleFilterChange('target', 'ALL')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${targetFilter === 'ALL' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                      {t("admin_targets_filter_all")}
                    </button>
                    <button onClick={() => handleFilterChange('target', 'READY')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${targetFilter === 'READY' ? 'bg-emerald-500/20 text-emerald-400 shadow border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                      Ready
                    </button>
                    <button onClick={() => handleFilterChange('target', 'SUKSES')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${targetFilter === 'SUKSES' ? 'bg-teal-500/20 text-teal-400 shadow border border-teal-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                      Sukses
                    </button>
                    <button onClick={() => handleFilterChange('target', 'GAGAL')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${targetFilter === 'GAGAL' ? 'bg-red-500/20 text-red-400 shadow border border-red-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                      Gagal
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                  </div>
                ) : targets.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-slate-400 max-w-sm">{t("admin_targets_empty_list")}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {targets.map((target) => (
                      <div key={target.id} className="flex justify-between items-center p-4 hover:bg-slate-700/30 rounded-xl transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            target.status === 'READY' ? 'bg-emerald-400' : (target.status === 'GAGAL' ? 'bg-red-500' : 'bg-slate-500')
                          }`}></div>
                          <div className="flex flex-col gap-1">
                            <p className="text-slate-200 font-bold">{target.phone}</p>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              {target.campaign && (
                                <span className="text-[9px] text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                  {target.campaign.name}
                                </span>
                              )}
                              
                              {target.senderNumber && (target.status === 'SUKSES' || target.status === 'GAGAL') && (
                                <span className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                  {t("admin_targets_sender")} +{target.senderNumber}
                                </span>
                              )}

                              {target.status === 'GAGAL' && (
                                <span className="text-[9px] text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                  {t("admin_targets_unregistered")}
                                </span>
                              )}
                              
                              <span className="text-[9px] text-slate-500 font-medium">{t("admin_targets_entered")} {new Date(target.createdAt).toLocaleDateString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border ${
                            target.status === 'READY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            target.status === 'GAGAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            target.status === 'SUKSES' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {target.status}
                          </span>
                          <button onClick={() => handleDeleteTarget(target)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white border border-slate-700 hover:border-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title={t("admin_targets_delete_number")}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center p-4 border-t border-slate-700 bg-slate-800/50 mt-2 rounded-xl">
                      <span className="text-xs text-slate-400 font-bold">
                        {t("admin_targets_page")} {page} {t("admin_targets_of")} {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          disabled={page === 1}
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-xs font-bold text-white rounded-lg transition-colors"
                        >
                          {t("admin_targets_prev")}
                        </button>
                        <button 
                          disabled={page >= totalPages}
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-xs font-bold text-white rounded-lg transition-colors"
                        >
                          {t("admin_targets_next")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>

      </div>

      {/* Modal Konfirmasi */}
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
                  disabled={modalCountdown > 0}
                  className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors shadow-md ${
                    modalCountdown > 0 ? "bg-red-500/50 cursor-not-allowed" : "bg-red-500 hover:bg-red-400"
                  }`}
                >
                  {modalCountdown > 0 ? `Tunggu (${modalCountdown}s)` : modalConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] border ${
            toastType === 'success' 
              ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100' 
              : 'bg-red-900/90 border-red-500/50 text-red-100'
          }`}>
            {toastType === 'success' ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <p className="font-bold text-sm tracking-wide">{toastMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
