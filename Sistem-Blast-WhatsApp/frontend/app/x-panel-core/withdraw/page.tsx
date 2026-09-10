"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function AdminWithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Reject Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Approve Modal State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveData, setApproveData] = useState<any>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const getHeaders = () => ({
    "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}`,
    "Content-Type": "application/json"
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/withdrawals`, { headers: getHeaders() });
      if (res.ok) {
        setWithdrawals(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: number, status: 'APPROVED' | 'REJECTED', reason: string = "") => {
    setIsProcessing(id);
    try {
      const payload: any = { status };
      if (status === 'REJECTED') {
        payload.rejectReason = reason;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/withdrawals/${id}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast(data.message, "success");
        fetchWithdrawals();
      } else {
        showToast(data.error || t("admin_withdraw_toast_update_fail"), "error");
      }
    } catch (error) {
      showToast(t("admin_withdraw_toast_conn_fail"), "error");
    } finally {
      setIsProcessing(null);
      setIsRejectModalOpen(false);
      setRejectReason("");
      setRejectId(null);
    }
  };

  const openApproveModal = (w: any) => {
    setApproveData(w);
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = () => {
    if (approveData) {
      updateStatus(approveData.id, 'APPROVED');
      setIsApproveModalOpen(false);
    }
  };

  const openRejectModal = (id: number) => {
    setRejectId(id);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      return showToast(t("admin_withdraw_toast_reason_req"), "error");
    }
    updateStatus(rejectId, 'REJECTED', rejectReason);
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchStatus = w.status === activeTab;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = w.user?.username?.toLowerCase().includes(searchLower) || 
                        w.user?.name?.toLowerCase().includes(searchLower) ||
                        w.bankAccount?.toLowerCase().includes(searchLower) ||
                        (!w.user && "pekerja terhapus".includes(searchLower));
    return matchStatus && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative">
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("admin_withdraw_title")}</h1>
          <p className="text-slate-400 text-sm">{t("admin_withdraw_desc")}</p>
        </div>

        <div className="w-full md:w-64 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors sm:text-sm"
            placeholder={t("admin_withdraw_search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-[2rem] shadow-xl overflow-hidden min-h-[500px] flex flex-col">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900/50">
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'PENDING' ? 'text-teal-400 border-b-2 border-teal-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >{t("admin_withdraw_tab_pending")} 
            <span className="ml-2 bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs">
              {withdrawals.filter(w => w.status === 'PENDING').length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('APPROVED')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'APPROVED' ? 'text-teal-400 border-b-2 border-teal-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >{t("admin_withdraw_tab_approved")}</button>
          <button 
            onClick={() => setActiveTab('REJECTED')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'REJECTED' ? 'text-teal-400 border-b-2 border-teal-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >{t("admin_withdraw_tab_rejected")}</button>
        </div>
        
        <div className="flex-1 overflow-x-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <p className="text-slate-400 font-bold">{t("admin_withdraw_empty")}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">{t("admin_withdraw_th_date")}</th>
                  <th className="p-4 font-bold">{t("admin_withdraw_th_worker")}</th>
                  <th className="p-4 font-bold">{t("admin_withdraw_th_amount")}</th>
                  <th className="p-4 font-bold">{t("admin_withdraw_th_bank")}</th>
                  {activeTab === 'REJECTED' && <th className="p-4 font-bold">{t("admin_withdraw_th_reason")}</th>}
                  {activeTab === 'PENDING' && <th className="p-4 font-bold text-right">{t("admin_withdraw_th_action")}</th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredWithdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 text-slate-300 whitespace-nowrap">
                      {new Date(w.createdAt).toLocaleDateString('id-ID')}
                      <br/>
                      <span className="text-[10px] text-slate-500">{new Date(w.createdAt).toLocaleTimeString('id-ID')}</span>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-bold">{w.user?.name || <span className="text-red-400 italic">{t("admin_withdraw_deleted_worker")}</span>}</p>
                      <p className="text-[10px] text-slate-400">@{w.user?.username || 'deleted_user'}</p>
                    </td>
                    <td className="p-4 text-white font-black whitespace-nowrap">
                      Rp {w.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 min-w-[200px]">
                      <span className="inline-block px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-slate-300 mb-1">
                        {w.bankName}
                      </span>
                      <p className="text-slate-400 font-mono text-xs break-all">{w.bankAccount}</p>
                      <p className="text-slate-500 text-[10px] uppercase mt-0.5">{w.bankOwner}</p>
                    </td>
                    
                    {activeTab === 'REJECTED' && (
                      <td className="p-4">
                        <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                          {w.rejectReason || t("admin_withdraw_no_reason")}
                        </p>
                      </td>
                    )}

                    {activeTab === 'PENDING' && (
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button 
                            disabled={isProcessing === w.id}
                            onClick={() => openApproveModal(w)}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all border border-emerald-500/20"
                            title={t("admin_withdraw_btn_approve")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button 
                            disabled={isProcessing === w.id}
                            onClick={() => openRejectModal(w.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20"
                            title={t("admin_withdraw_btn_reject")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-2">{t("admin_withdraw_modal_reject_title")}</h2>
            <p className="text-sm text-slate-400 mb-6">{t("admin_withdraw_modal_reject_desc")}</p>
            
            <textarea
              className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-6 resize-none h-32"
              placeholder={t("admin_withdraw_modal_reject_placeholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            ></textarea>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
              >{t("admin_modal_cancel")}</button>
              <button 
                onClick={handleConfirmReject}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center gap-2"
                disabled={isProcessing !== null}
              >
                {isProcessing !== null ? t("admin_withdraw_processing") : t("admin_withdraw_modal_reject_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {isApproveModalOpen && approveData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t("admin_withdraw_modal_approve_title")}</h2>
                <p className="text-sm text-slate-400">{t("admin_withdraw_modal_approve_desc")}</p>
              </div>
            </div>
            
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6 space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{t("admin_withdraw_modal_approve_amount")}</p>
                <p className="text-2xl font-black text-emerald-400">Rp {approveData.amount.toLocaleString('id-ID')}</p>
              </div>
              <div className="pt-3 border-t border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{t("admin_withdraw_modal_approve_bank")}</p>
                <p className="text-sm font-bold text-white">{approveData.bankName}</p>
                <p className="text-base font-mono text-slate-300">{approveData.bankAccount}</p>
                <p className="text-sm text-slate-400">a.n. <span className="text-white font-bold">{approveData.bankOwner}</span></p>
              </div>
            </div>
            
            <p className="text-xs text-yellow-400 mb-6 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
              {t("admin_withdraw_modal_approve_warning")}
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsApproveModalOpen(false)}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
              >{t("admin_modal_cancel")}</button>
              <button 
                onClick={handleConfirmApprove}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2"
                disabled={isProcessing !== null}
              >
                {isProcessing !== null ? t("admin_withdraw_processing") : t("admin_withdraw_modal_approve_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] border ${
            toastType === 'success' 
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
