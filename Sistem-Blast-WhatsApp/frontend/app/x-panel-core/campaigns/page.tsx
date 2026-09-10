"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { t } = useLanguage();
  
  // Form States
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error(t("admin_camp_toast_load_fail"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    setCampaigns(campaigns.map(c => {
      if (c.id === id) return { ...c, status: newStatus };
      if (newStatus === 'ACTIVE') return { ...c, status: 'PAUSED' };
      return c;
    }));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/${id}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) fetchCampaigns();
    } catch (error) {
      fetchCampaigns();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const openEditModal = (camp: any) => {
    setEditId(camp.id);
    setName(camp.name);
    setMessageTemplate(camp.messageTemplate);
    setLinkText(camp.linkText || "");
    setLinkUrl(camp.linkUrl || "");
    setMediaPreview(camp.mediaUrl ? `${process.env.NEXT_PUBLIC_API_URL}${camp.mediaUrl}` : "");
    setMediaFile(null);
    setShowModal(true);
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/${deleteId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        setDeleteId(null);
        fetchCampaigns();
      } else {
        alert(t("admin_camp_toast_del_fail"));
      }
    } catch (error) {
      alert(t("admin_camp_toast_conn_fail"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("messageTemplate", messageTemplate);
    if (linkText) formData.append("linkText", linkText);
    if (linkUrl) formData.append("linkUrl", linkUrl);
    if (mediaFile) formData.append("media", mediaFile);

    try {
      const url = editId ? `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/${editId}` : `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
        body: formData,
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchCampaigns();
      } else {
        alert(t("admin_camp_toast_save_fail"));
      }
    } catch (error) {
      alert(t("admin_camp_toast_conn_fail"));
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setMessageTemplate("");
    setLinkText("");
    setLinkUrl("");
    setMediaFile(null);
    setMediaPreview("");
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="relative mb-10 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
              {t("admin_camp_title")}
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-lg">
              {t("admin_camp_desc")}
            </p>
          </div>
          
          <button 
            onClick={openCreateModal}
            className="group relative inline-flex items-center justify-center px-8 py-3.5 font-bold text-slate-900 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-2xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(45,212,191,0.4)] active:scale-95"
          >
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 -ml-4 w-1/2"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t("admin_camp_btn_create")}
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64 bg-slate-800/30 rounded-3xl border border-slate-700/50">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-teal-500"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 bg-slate-800/30 rounded-3xl border border-slate-700/50 text-center p-8 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-slate-700 to-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-slate-600/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{t("admin_camp_empty_title")}</h3>
            <p className="text-slate-400 max-w-md text-sm leading-relaxed">
              {t("admin_camp_empty_desc")}
            </p>
          </div>
        ) : (
          campaigns.map((camp) => (
            <div 
              key={camp.id} 
              className={`group relative flex flex-col md:flex-row bg-slate-800/60 backdrop-blur-xl border rounded-[2rem] p-5 gap-6 transition-all duration-300 hover:shadow-2xl overflow-hidden
                ${camp.status === 'ACTIVE' ? 'border-teal-500/50 bg-teal-900/10 shadow-[0_0_30px_rgba(20,184,166,0.1)]' : 'border-slate-700 hover:border-slate-500'}
              `}
            >
              {/* Active Glow Accent */}
              {camp.status === 'ACTIVE' && (
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-teal-400 to-emerald-500 shadow-[0_0_15px_rgba(45,212,191,0.5)]"></div>
              )}

              {/* Thumbnail Container */}
              <div className="w-full md:w-48 h-40 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/50 relative">
                {camp.mediaUrl ? (
                  <img src={`${process.env.NEXT_PUBLIC_API_URL}${camp.mediaUrl}`} alt="Media" className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">{t("admin_camp_no_image")}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
              </div>

              {/* Content Container */}
              <div className="flex-1 flex flex-col justify-center min-w-0 py-2">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-white truncate pr-4">{camp.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border 
                      ${camp.status === 'ACTIVE' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}
                    `}>
                      {camp.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>}
                      {camp.status === 'ACTIVE' ? t("admin_camp_status_running") : t("admin_camp_status_paused")}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {camp.messageTemplate}
                </p>

                <div className="flex flex-wrap gap-3 mt-auto">
                  {camp.linkText && (
                    <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1.5 rounded-lg font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      {camp.linkText}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {new Date(camp.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>

                  <div className="flex-1"></div>

                  {/* Edit and Delete Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(camp)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-indigo-500 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      {t("admin_camp_btn_edit")}
                    </button>
                    <button 
                      onClick={() => confirmDelete(camp.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {t("admin_camp_btn_delete")}
                    </button>
                  </div>

                </div>
              </div>

              {/* Action Toggle */}
              <div className="flex items-center justify-end md:justify-center border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-8">
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{t("admin_camp_power_switch")}</label>
                  <button 
                    onClick={() => handleToggleStatus(camp.id, camp.status)}
                    className={`relative inline-flex h-9 w-16 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-teal-500/30 
                      ${camp.status === 'ACTIVE' ? 'bg-gradient-to-r from-teal-400 to-emerald-400 shadow-[0_0_20px_rgba(20,184,166,0.4)]' : 'bg-slate-700 hover:bg-slate-600'}
                    `}
                  >
                    <span className="sr-only">Toggle Campaign</span>
                    <span
                      className={`pointer-events-none absolute top-0.5 left-0.5 inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ease-bounce 
                        ${camp.status === 'ACTIVE' ? 'translate-x-7' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Modern Modal Create / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
            
            <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{editId ? t("admin_camp_modal_edit_title") : t("admin_camp_modal_create_title")}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
              {/* KOLOM KIRI: FORM */}
              <form onSubmit={handleSubmit} className="flex-1 space-y-6">
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300">{t("admin_camp_form_title")} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-600"
                    placeholder={t("admin_camp_form_title_ph")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300">{t("admin_camp_form_image")}</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 rounded-2xl bg-slate-900/50 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-slate-800/50 transition-all group relative overflow-hidden"
                  >
                    {mediaPreview ? (
                      <>
                        <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-all flex items-center justify-center">
                          <span className="bg-white/10 text-white font-bold px-4 py-2 rounded-xl border border-white/20">{t("admin_camp_form_image_change")}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 group-hover:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <span className="text-sm text-slate-400 font-medium">{t("admin_camp_form_image_upload")}</span>
                      </>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300">{t("admin_camp_form_caption")} <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows={5}
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-600 leading-relaxed"
                    placeholder={t("admin_camp_form_caption_ph")}
                  ></textarea>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500 px-1 mt-1">
                    <span>{t("admin_camp_form_insert_vars")}</span>
                    <div className="flex gap-2">
                       <button 
                         type="button" 
                         onClick={() => setMessageTemplate(prev => prev + " {{name}}")}
                         className="flex items-center gap-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                       >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          {"{{name}}"}
                       </button>
                       <button 
                         type="button" 
                         onClick={() => setMessageTemplate(prev => prev + " {{phone}}")}
                         className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                       >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {"{{phone}}"}
                       </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-700">
                  <h3 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                    {t("admin_camp_form_btn_title")}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t("admin_camp_form_btn_text")}</label>
                      <input
                        type="text"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm placeholder:text-slate-600"
                        placeholder={t("admin_camp_form_btn_text_ph")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t("admin_camp_form_btn_url")}</label>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm placeholder:text-slate-600"
                        placeholder="https://gacor.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-700/50 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-600 transition-all"
                  >
                    {t("admin_modal_cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:from-teal-500/50 disabled:to-emerald-500/50 text-slate-900 font-extrabold py-4 px-6 rounded-2xl transition-all shadow-[0_10px_30px_rgba(20,184,166,0.3)] hover:shadow-[0_10px_40px_rgba(20,184,166,0.5)] active:scale-[0.98]"
                  >
                    {isSaving ? t("admin_camp_form_saving") : (editId ? t("admin_camp_form_save_edit") : t("admin_camp_form_save_create"))}
                  </button>
                </div>
              </form>

              {/* KOLOM KANAN: LIVE PREVIEW WA */}
              <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col items-center">
                <div className="bg-slate-900/80 border border-slate-700 w-full rounded-full py-2 px-4 mb-4 text-center">
                   <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest flex items-center justify-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                     {t("admin_camp_preview_title")}
                   </h3>
                </div>
                
                {/* Mockup HP */}
                <div className="w-[350px] h-[650px] bg-slate-800 rounded-[3rem] p-[10px] relative shadow-2xl border-[6px] border-slate-700 overflow-hidden flex flex-col mx-auto">
                   
                   {/* Notch */}
                   <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                     <div className="w-32 h-6 bg-slate-700 rounded-b-xl"></div>
                   </div>

                   {/* WA Header */}
                   <div className="bg-[#075E54] w-full h-20 rounded-t-[2.5rem] flex items-end px-4 pb-3 gap-3 z-10 shadow-md">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                         </svg>
                      </div>
                      <div className="flex-1 pb-1">
                         <h4 className="text-white font-bold text-[15px] leading-tight">TRYWSBLAST</h4>
                         <span className="text-teal-100 text-[11px] font-medium opacity-80">online</span>
                      </div>
                      <div className="flex gap-4 pb-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                   </div>
                   
                   {/* WA Background */}
                   <div className="flex-1 bg-[#ECE5DD] relative overflow-y-auto p-3 flex flex-col pb-24 scrollbar-hide">
                      {/* WA Pattern Overlay */}
                      <div className="absolute inset-0 opacity-[0.06] bg-[url('https://i.imgur.com/GzQvHwD.png')] bg-repeat" style={{backgroundSize: '300px'}}></div>
                      
                      {/* Date Bubble */}
                      <div className="self-center bg-[#E1F3FB] text-[#4A5568] text-[11px] px-3 py-1 rounded-lg shadow-sm font-medium z-10 mb-4 mt-2 border border-blue-100">
                         {t("admin_camp_preview_today")}
                      </div>

                      {/* Chat Bubble (Receiver Side for realism, or Sender side? Let's use Sender side = green) */}
                      {(messageTemplate || mediaPreview || linkText) ? (
                        <div className="bg-[#DCF8C6] rounded-xl rounded-tr-none p-1.5 shadow-sm max-w-[88%] relative mb-2 self-end z-10 flex flex-col">
                           {mediaPreview && (
                              <div className="w-full h-40 bg-slate-200 rounded-lg overflow-hidden mb-1.5 relative border border-green-200/50">
                                 <img src={mediaPreview} className="w-full h-full object-cover" />
                              </div>
                           )}
                           
                           {messageTemplate && (
                             <div className="text-[14.5px] leading-relaxed whitespace-pre-wrap text-[#111111] font-sans px-1.5 pt-1 pb-1">
                                {messageTemplate}
                             </div>
                           )}
                           
                           <div className="flex justify-between items-end px-1.5 pb-0.5 mt-1">
                             <div className="text-[11px] text-green-700/60 uppercase font-bold tracking-wider pt-1">{linkText ? t("admin_camp_preview_important") : ""}</div>
                             <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                               10:45 AM
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                               </svg>
                             </div>
                           </div>
                           
                           {linkText && (
                              <div className="mt-2 pt-2 border-t border-green-300/40 flex flex-col pb-0.5 px-0.5">
                                <div className="text-center py-2 px-4 rounded-lg bg-white/80 hover:bg-white text-teal-600 font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm border border-green-200/50 transition-colors cursor-pointer">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                   </svg>
                                   {linkText}
                                </div>
                              </div>
                           )}
                        </div>
                      ) : (
                        <div className="self-center bg-white/50 text-slate-500 text-[12px] px-4 py-2 rounded-xl mt-10 italic">
                          {t("admin_camp_preview_empty")}
                        </div>
                      )}
                   </div>
                   
                   {/* WA Input */}
                   <div className="absolute bottom-3 left-3 right-3 h-[52px] flex items-center gap-2 z-20">
                      <div className="flex-1 bg-white rounded-full h-full flex items-center px-4 shadow-sm">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <span className="text-slate-400 text-[15px] font-sans">{t("admin_camp_preview_input")}</span>
                      </div>
                      <div className="w-[52px] h-[52px] rounded-full bg-[#128C7E] flex items-center justify-center shadow-sm">
                         <svg className="w-6 h-6 text-white ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </div>
                   </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t("admin_camp_del_modal_title")}</h3>
            <p className="text-slate-400 text-sm mb-8">
              {t("admin_camp_del_modal_msg")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 transition-all"
              >
                {t("admin_modal_cancel")}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
              >
                {t("admin_camp_del_modal_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
