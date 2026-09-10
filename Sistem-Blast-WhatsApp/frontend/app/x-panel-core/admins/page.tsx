"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function AdminTeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const { t } = useLanguage();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?role=ADMIN`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data);
      }
    } catch (error) {
      showToast(t("admin_team_toast_load_fail"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditId(null);
    setName("");
    setUsername("");
    setPassword("");
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setEditId(user.id);
    setName(user.name);
    setUsername(user.username);
    setPassword(""); 
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("admin_team_confirm_del"))) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` } });
      if (res.ok) {
        showToast(t("admin_team_toast_del_success"), "success");
        fetchAdmins();
      } else {
        showToast(t("admin_team_toast_del_fail"), "error");
      }
    } catch (error) {
      showToast(t("admin_withdraw_toast_conn_fail"), "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/${editId}` : `${process.env.NEXT_PUBLIC_API_URL}/api/users`;
      const method = editId ? "PUT" : "POST";
      
      const payload: any = { name, username, role: 'ADMIN' };
      if (password) payload.password = password;
      else if (!editId) {
        return showToast(t("admin_team_toast_pass_req"), "error");
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sessionStorage.getItem("admin_token")}` },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || t("admin_team_toast_save_success"), "success");
        setShowModal(false);
        fetchAdmins();
      } else {
        showToast(data.error || t("admin_team_toast_save_fail"), "error");
      }
    } catch (error) {
      showToast("Koneksi gagal", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("admin_team_title")}</h1>
          <p className="text-slate-400">{t("admin_team_desc")}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          {t("admin_team_add_btn")}
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-[2rem] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">{t("admin_team_th_name")}</th>
                <th className="px-6 py-4">{t("admin_team_th_username")}</th>
                <th className="px-6 py-4 text-center">{t("admin_team_th_action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 font-medium">{t("admin_team_empty")}</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                       <span className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">👑</span>
                       {user.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">@{user.username}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEditModal(user)} className="p-2 bg-slate-700 hover:bg-indigo-500 text-slate-300 hover:text-white rounded-lg transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="p-2 bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white rounded-lg transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-white mb-6">{editId ? t("admin_team_modal_edit") : t("admin_team_modal_add")}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">{t("admin_team_form_name")}</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">{t("admin_team_form_username")}</label>
                <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">{t("admin_team_form_password")} {editId && t("admin_team_form_pass_edit")}</label>
                <input type="password" required={!editId} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-700 hover:bg-slate-600 transition-colors">{t("admin_modal_cancel")}</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-400 transition-colors">{t("admin_team_btn_save")}</button>
              </div>
            </form>
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
    </div>
  );
}
