"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [wdFilter, setWdFilter] = useState("week");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const { t } = useLanguage();
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "confirm" as "confirm" | "prompt",
    onConfirm: (inputValue?: string) => {},
    confirmText: "Ya",
    cancelText: "Batal",
    inputPlaceholder: "",
  });

  const openModal = (config: any) => {
    setModalConfig({ cancelText: t("admin_modal_cancel"), ...config });
    setModalOpen(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedUser(expandedUser === id ? null : id);
  };

  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [globalStats, setGlobalStats] = useState({ totalWa: 0, onlineWa: 0, blastingWa: 0, totalBalance: 0, totalWithdrawal: 0 });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, phoneSearchQuery, wdFilter, sortBy, sortOrder]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?role=USER&page=${currentPage}&limit=${itemsPerPage}&search=${searchQuery}&phoneSearch=${phoneSearchQuery}&wdFilter=${wdFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalFiltered(data.pagination.totalFiltered || 0);
        }
        if (data.globalStats) {
          setGlobalStats(data.globalStats);
        }
      }
    } catch (error) {
      showToast(t("admin_users_toast_load_fail"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    openModal({
      title: t("admin_users_delete_worker"),
      message: t("admin_users_modal_del_msg"),
      type: "confirm",
      confirmText: t("admin_users_modal_del_confirm"),
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` } });
          if (res.ok) {
            showToast(t("admin_users_toast_del_success"), "success");
            fetchUsers();
          } else {
            showToast(t("admin_users_toast_del_fail"), "error");
          }
        } catch (error) {
          showToast(t("admin_users_toast_conn_fail"), "error");
        }
      }
    });
  };

  const toggleStatus = (user: any) => {
    openModal({
      title: user.isActive ? t("admin_users_suspend_worker") : t("admin_users_activate_worker"),
      message: user.isActive ? t("admin_users_modal_suspend_msg") : t("admin_users_modal_activate_msg"),
      type: "confirm",
      confirmText: user.isActive ? t("admin_users_modal_suspend_confirm") : t("admin_users_modal_activate_confirm"),
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`, { 
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
            body: JSON.stringify({ isActive: !user.isActive })
          });
          if (res.ok) {
            showToast(user.isActive ? t("admin_users_toast_suspend_success") : t("admin_users_toast_activate_success"), "success");
            fetchUsers();
          } else {
            showToast(t("admin_users_toast_status_fail"), "error");
          }
        } catch (e) {
          showToast(t("admin_users_toast_conn_fail"), "error");
        }
      }
    });
  };

  const toggleTier = (user: any) => {
    const newTier = user.tier === 'VIP' ? 'REGULAR' : 'VIP';
    openModal({
      title: `${t("admin_users_modal_tier_title")} ${newTier}`,
      message: `${t("admin_users_modal_tier_msg")} ${newTier}?`,
      type: "confirm",
      confirmText: `${t("admin_users_modal_tier_confirm")} ${newTier}`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}/tier`, { 
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
            body: JSON.stringify({ tier: newTier })
          });
          if (res.ok) {
            showToast(`${t("admin_users_toast_tier_success")} ${newTier}`, "success");
            fetchUsers();
          } else {
            showToast(t("admin_users_toast_tier_fail"), "error");
          }
        } catch (e) {
          showToast(t("admin_users_toast_conn_fail"), "error");
        }
      }
    });
  };

  const handleChangePassword = (id: number) => {
    openModal({
      title: t("admin_users_change_password"),
      message: t("admin_users_modal_pass_msg"),
      type: "prompt",
      inputPlaceholder: t("admin_users_modal_pass_placeholder"),
      confirmText: t("admin_users_modal_pass_confirm"),
      onConfirm: async (newPassword?: string) => {
        if (!newPassword) return showToast(t("admin_users_toast_pass_empty"), "error");
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, { 
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
            body: JSON.stringify({ password: newPassword })
          });
          if (res.ok) {
            showToast(t("admin_users_toast_pass_success"), "success");
          } else {
            showToast(t("admin_users_toast_pass_fail"), "error");
          }
        } catch (e) {
          showToast(t("admin_users_toast_conn_fail"), "error");
        }
      }
    });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const paginatedUsers = users;

  const globalTotalWa = globalStats.totalWa || 0;
  const globalOnlineWa = globalStats.onlineWa || 0;
  const globalBlastingWa = globalStats.blastingWa || 0;
  const globalBalance = globalStats.totalBalance || 0;
  const globalWithdrawal = globalStats.totalWithdrawal || 0;

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("admin_users_title")}</h1>
          <p className="text-slate-400">{t("admin_users_desc")}</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="w-full md:w-60 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition duration-150 ease-in-out sm:text-sm"
              placeholder={t("admin_users_search_name")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-56 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 ease-in-out sm:text-sm"
              placeholder={t("admin_users_search_phone")}
              value={phoneSearchQuery}
              onChange={(e) => setPhoneSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* GLOBAL STATS SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">{t("admin_users_total_wa")}</p>
            <p className="text-3xl font-black text-white mt-1">{globalTotalWa}</p>
          </div>
          <div className="h-10 w-10 mt-3 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </div>
        </div>
        
        <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400/80">{t("admin_users_online_wa")}</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{globalOnlineWa}</p>
          </div>
          <div className="h-10 w-10 mt-3 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-400/80">{t("admin_users_blasting_wa")}</p>
            <p className="text-3xl font-black text-indigo-400 mt-1">{globalBlastingWa}</p>
          </div>
          <div className="h-10 w-10 mt-3 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <div className="bg-teal-900/10 border border-teal-500/20 rounded-2xl p-5 flex flex-col justify-between col-span-2 md:col-span-1 min-w-0">
          <div>
            <p className="text-sm font-medium text-teal-400/80">{t("admin_users_total_balance")}</p>
            <p className="text-xl lg:text-2xl font-black text-teal-400 mt-1 truncate" title={formatRupiah(globalBalance)}>{formatRupiah(globalBalance)}</p>
          </div>
          <div className="h-10 w-10 mt-3 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col justify-between col-span-2 md:col-span-1 relative min-w-0">
          <div>
            <div className="flex justify-between items-start mb-1">
              <p className="text-sm font-medium text-amber-400/80">{t("admin_users_total_wd")}</p>
            </div>
            <p className="text-xl lg:text-2xl font-black text-amber-400 mt-1 truncate" title={formatRupiah(globalWithdrawal)}>{formatRupiah(globalWithdrawal)}</p>
          </div>
          <select 
            value={wdFilter}
            onChange={(e) => setWdFilter(e.target.value)}
            className="absolute top-4 right-4 bg-slate-900/80 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 outline-none focus:border-amber-500 cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <option value="day">{t("admin_users_filter_day")}</option>
            <option value="week">{t("admin_users_filter_week")}</option>
            <option value="month">{t("admin_users_filter_month")}</option>
            <option value="year">{t("admin_users_filter_year")}</option>
            <option value="all">{t("admin_users_filter_all")}</option>
          </select>
          <div className="h-10 w-10 mt-3 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-[2rem] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">{t("admin_users_th_name")}</th>
                <th className="px-6 py-4">{t("admin_users_th_username")}</th>
                <th className="px-6 py-4 text-center">{t("admin_users_th_tier")}</th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('balance')}>
                  <div className="flex items-center justify-end gap-1">
                    {t("admin_users_th_finance")}
                    <div className="flex flex-col opacity-50 group-hover:opacity-100">
                      <svg className={`w-2.5 h-2.5 ${sortBy === 'balance' && sortOrder === 'asc' ? 'text-teal-400' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"></path></svg>
                      <svg className={`w-2.5 h-2.5 -mt-1 ${sortBy === 'balance' && sortOrder === 'desc' ? 'text-teal-400' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 text-center">{t("admin_users_th_wa")}</th>
                <th className="px-6 py-4 text-center">{t("admin_users_th_action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                    {searchQuery ? t("admin_users_no_search") : t("admin_users_no_users")}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => (
                  <React.Fragment key={user.id}>
                  <tr className={`transition-colors ${user.isActive ? 'hover:bg-slate-700/30' : 'bg-red-900/10 opacity-75'}`}>
                    <td className="px-6 py-4 font-bold text-white">
                      {user.name} {!user.isActive && <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">{t("admin_users_suspended")}</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">@{user.username}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => toggleTier(user)}
                          className={`text-[10px] font-bold px-2 py-1 rounded border shadow-sm transition-colors ${user.tier === 'VIP' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'}`}
                          title={t("admin_users_change_tier")}
                        >
                          {user.tier || 'REGULAR'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold text-teal-400">{formatRupiah(user.balance || 0)}</span>
                        <span className="text-xs text-slate-500">WD: <span className="text-amber-400/80 font-semibold">{formatRupiah(user.totalWithdrawal || 0)}</span></span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <div className="bg-slate-700/50 text-slate-300 text-xs font-bold px-2 py-1 rounded-md border border-slate-600">{t("admin_users_total_label")}{user.totalWa}</div>
                        <div className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded-md border border-emerald-500/20">{t("admin_users_online_label")}{user.onlineWa}</div>
                        <div className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-1 rounded-md border border-indigo-500/20">{t("admin_users_running_label")}{user.blastingWa}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => toggleExpand(user.id)} 
                          className={`p-2 rounded-lg transition-all border ${expandedUser === user.id ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-600'}`} 
                          title={t("admin_users_view_detail")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        <button 
                          onClick={() => handleChangePassword(user.id)}  
                          className="p-2 bg-slate-800 hover:bg-amber-500 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-600 hover:border-amber-500" 
                          title={t("admin_users_change_password")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>

                        <button 
                          onClick={() => toggleStatus(user)} 
                          className={`p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-600 ${user.isActive ? 'hover:bg-orange-500 hover:border-orange-500' : 'hover:bg-emerald-500 hover:border-emerald-500'}`} 
                          title={user.isActive ? t("admin_users_suspend_worker") : t("admin_users_activate_worker")}
                        >
                          {user.isActive ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>

                        <button onClick={() => handleDelete(user.id)} className="p-2 bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-600 hover:border-red-500" title={t("admin_users_delete_worker")}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedUser === user.id && (
                    <tr className="bg-slate-900/50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                           <h4 className="text-white font-bold text-sm mb-3">{t("admin_users_device_detail")}</h4>
                           {user.devices && user.devices.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                               {user.devices.map((d: any) => (
                                 <div key={d.id} className="bg-slate-900 border border-slate-700 p-3 rounded-lg flex flex-col gap-2">
                                   <div className="flex justify-between items-center">
                                     <div>
                                       <p className="text-slate-300 font-bold text-xs">{d.sessionName.startsWith('Device') ? t("admin_users_not_linked") : `+${d.sessionName}`}</p>
                                     </div>
                                     <div className="flex gap-1.5">
                                       <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${d.status === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                         {d.status === 'READY_TO_CONNECT' ? t("admin_users_ready_link") : (d.status === 'CONNECTING' ? t("admin_users_connecting") : (d.status === 'CONNECTED' ? t("admin_users_connected") : t("admin_users_disconnected")))}
                                       </span>
                                       <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${d.isBlasting ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                         {d.isBlasting ? t("admin_users_sending") : t("admin_users_idle")}
                                       </span>
                                     </div>
                                   </div>
                                   <div className="flex gap-2 text-[10px] text-slate-400 border-t border-slate-800 pt-2 mt-1">
                                      <span className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {t("admin_users_success")}<strong className="text-emerald-400">{d.messagesSent || 0}</strong>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        {t("admin_users_failed")}<strong className="text-red-400">{d.messagesFailed || 0}</strong>
                                      </span>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <p className="text-xs text-slate-500 italic">{t("admin_users_no_device")}</p>
                           )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-slate-900/50 border-t border-slate-700 px-6 py-4 flex items-center justify-between sm:justify-end gap-4">
            <span className="text-sm text-slate-400">
              {t("admin_users_page")} <span className="font-bold text-white">{currentPage}</span> {t("admin_users_of")} <span className="font-bold text-white">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("admin_users_prev")}
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("admin_users_next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${toastType === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-red-900/90 border-red-500 text-red-100'}`}>
            <p className="font-bold text-sm">{toastMessage}</p>
          </div>
        </div>
      )}
      {/* Custom Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{modalConfig.title}</h3>
              <p className="text-slate-400 text-sm mb-6">{modalConfig.message}</p>
              
              {modalConfig.type === "prompt" && (
                <input 
                  type="text" 
                  id="modalInput"
                  className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 mb-6"
                  placeholder={modalConfig.inputPlaceholder}
                  autoFocus
                />
              )}

              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {modalConfig.cancelText}
                </button>
                <button 
                  onClick={() => {
                    const val = modalConfig.type === "prompt" ? (document.getElementById('modalInput') as HTMLInputElement)?.value : undefined;
                    modalConfig.onConfirm(val);
                    setModalOpen(false);
                  }}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-colors ${
                    modalConfig.confirmText?.includes('Hapus') || modalConfig.confirmText?.includes('Suspend') 
                      ? 'bg-red-500 hover:bg-red-400 text-white' 
                      : 'bg-teal-500 hover:bg-teal-400 text-slate-900'
                  }`}
                >
                  {modalConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
