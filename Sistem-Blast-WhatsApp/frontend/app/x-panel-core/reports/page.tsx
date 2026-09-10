"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx-js-style";

export default function LaporanPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (!token) {
      router.push("/portal-bos");
      return;
    }
    fetchCampaigns(token);
  }, []);

  const fetchCampaigns = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        if (data.length > 0) {
          setSelectedCampaignId(data[0].id.toString());
        }
      }
    } catch (error) {
      console.error("Gagal memuat kampanye:", error);
    }
  };

  const fetchReport = async () => {
    if (!selectedCampaignId) return;
    setIsLoading(true);
    setErrorMsg("");
    setCurrentPage(1); // Reset page on new campaign select
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${selectedCampaignId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Gagal mengambil laporan");
      const data = await res.json();
      setReportData(data);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) {
      fetchReport();
    }
  }, [selectedCampaignId]);

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    
    // Siapkan data untuk Excel
    const excelData = reportData.map((item, index) => ({
      [`${t("admin_reports_excel_no")}`]: index + 1,
      [`${t("admin_reports_excel_sender")}`]: item.senderNumber,
      [`${t("admin_reports_excel_target")}`]: item.targetNumber,
      [`${t("admin_reports_excel_message")}`]: item.messageText,
      [`${t("admin_reports_excel_status")}`]: item.status === 'TERPAKAI' ? t("admin_reports_success") : (item.status === "SUKSES" ? t("admin_reports_success") : (item.status === "GAGAL" ? t("admin_reports_failed") : (item.status === "READY" ? t("admin_reports_ready") : item.status)))
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const borderAll = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    // Custom Styling untuk Header (Baris pertama)
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } }, // Indigo background
      alignment: { horizontal: "center", vertical: "center" },
      border: borderAll
    };

    // Terapkan style ke header (A1 sampai E1)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:E1");
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ c: C, r: 0 });
      if (!worksheet[address]) continue;
      worksheet[address].s = headerStyle;
    }

    // Terapkan style ke semua baris data
    for (let R = 1; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ c: C, r: R });
        if (!worksheet[address]) continue;
        
        let cellStyle: any = { border: borderAll };
        
        // Status Column (Kolom E)
        if (C === 4) {
          const statusValue = worksheet[address].v;
          cellStyle.font = { bold: true };
          cellStyle.alignment = { horizontal: "center" };
          cellStyle.fill = { fgColor: {} };
          
          if (statusValue === 'SUKSES') {
            cellStyle.fill.fgColor = { rgb: "10B981" }; // Emerald
            cellStyle.font.color = { rgb: "FFFFFF" };
          } else if (statusValue === 'GAGAL') {
            cellStyle.fill.fgColor = { rgb: "EF4444" }; // Red
            cellStyle.font.color = { rgb: "FFFFFF" };
          } else {
            cellStyle.fill.fgColor = { rgb: "64748B" }; // Slate/Abu-abu (Ready/Proses)
            cellStyle.font.color = { rgb: "FFFFFF" };
          }
        }
        
        // Nomor Column (Kolom A)
        if (C === 0) {
          cellStyle.alignment = { horizontal: "center" };
        }
        
        worksheet[address].s = cellStyle;
      }
    }

    // Tambahkan Tabel Ringkasan (Grafik Angka) di sebelah kanan (Mulai di kolom G)
    const totalBerhasil = reportData.filter(d => d.status === 'SUKSES' || d.status === 'TERPAKAI').length;
    const totalGagal = reportData.filter(d => d.status === 'GAGAL').length;
    const totalReady = reportData.filter(d => d.status === 'READY').length;
    
    // G2, G3, dll
    XLSX.utils.sheet_add_aoa(worksheet, [
       [t("admin_reports_excel_summary_title"), ""],
       [t("admin_reports_excel_summary_success"), totalBerhasil],
       [t("admin_reports_excel_summary_failed"), totalGagal],
       [t("admin_reports_excel_summary_ready"), totalReady],
       [t("admin_reports_excel_summary_total"), reportData.length]
    ], { origin: "G2" });

    // Style Header Ringkasan
    if (worksheet["G2"]) worksheet["G2"].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0F172A" } }, border: borderAll };
    if (worksheet["H2"]) worksheet["H2"].s = { fill: { fgColor: { rgb: "0F172A" } }, border: borderAll };
    
    // Style Label Ringkasan
    if (worksheet["G3"]) worksheet["G3"].s = { font: { bold: true, color: { rgb: "10B981" } }, border: borderAll }; // Hijau
    if (worksheet["G4"]) worksheet["G4"].s = { font: { bold: true, color: { rgb: "EF4444" } }, border: borderAll }; // Merah
    if (worksheet["G5"]) worksheet["G5"].s = { font: { bold: true, color: { rgb: "64748B" } }, border: borderAll }; // Abu-abu
    if (worksheet["G6"]) worksheet["G6"].s = { font: { bold: true }, border: borderAll }; 
    
    // Value Ringkasan (Kolom H)
    if (worksheet["H3"]) worksheet["H3"].s = { font: { bold: true }, alignment: { horizontal: "right" }, border: borderAll };
    if (worksheet["H4"]) worksheet["H4"].s = { font: { bold: true }, alignment: { horizontal: "right" }, border: borderAll };
    if (worksheet["H5"]) worksheet["H5"].s = { font: { bold: true }, alignment: { horizontal: "right" }, border: borderAll };
    if (worksheet["H6"]) worksheet["H6"].s = { font: { bold: true }, alignment: { horizontal: "right" }, border: borderAll };
    
    // Sesuaikan lebar kolom
    const wscols = [
      { wch: 5 },  // No
      { wch: 20 }, // Pengirim
      { wch: 20 }, // Target
      { wch: 50 }, // Pesan
      { wch: 15 }, // Status
      { wch: 5 },  // Spasi kosong
      { wch: 20 }, // Label Ringkasan
      { wch: 15 }, // Nilai Ringkasan
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Blast");

    const selectedCampName = campaigns.find(c => c.id.toString() === selectedCampaignId)?.name || "Kampanye";
    const safeName = selectedCampName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    XLSX.writeFile(workbook, `Laporan_Kampanye_${safeName}.xlsx`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUKSES': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'GAGAL': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'TERPAKAI': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'READY': return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  // Hitung Statistik
  const totalBerhasil = reportData.filter(d => d.status === 'SUKSES' || d.status === 'TERPAKAI').length;
  const totalGagal = reportData.filter(d => d.status === 'GAGAL').length;
  const totalReady = reportData.filter(d => d.status === 'READY').length;

  // Logic Pagination
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = reportData.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1 w-full">
          <h1 className="text-2xl font-bold text-white mb-2">{t("admin_reports_title")}</h1>
          <p className="text-slate-400 mb-4">{t("admin_reports_desc")}</p>
          
          <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full md:w-80"
            >
              <option value="" disabled>{t("admin_reports_select_camp_placeholder")}</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>
        
        {/* Ringkasan Statistik */}
        <div className="w-full md:w-auto bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-wrap sm:flex-nowrap gap-4 justify-between md:justify-start">
            <div className="text-center px-4">
               <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">{t("admin_reports_success")}</p>
               <p className="text-2xl font-black text-emerald-400">{totalBerhasil}</p>
            </div>
            <div className="w-px bg-slate-700 hidden sm:block"></div>
            <div className="text-center px-4">
               <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">{t("admin_reports_failed")}</p>
               <p className="text-2xl font-black text-red-400">{totalGagal}</p>
            </div>
            <div className="w-px bg-slate-700 hidden sm:block"></div>
            <div className="text-center px-4">
               <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">{t("admin_reports_ready")}</p>
               <p className="text-2xl font-black text-slate-300">{totalReady}</p>
            </div>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        {errorMsg && (
           <div className="p-4 bg-red-500/10 text-red-400 border-b border-red-500/20 text-center">
              {errorMsg}
           </div>
        )}

        {/* Toolbar Data Tabel */}
        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/30">
          <p className="text-slate-400 text-sm font-medium">
             {t("admin_reports_total_data")} <span className="text-white font-bold">{reportData.length}</span> {t("admin_reports_number_unit")}
          </p>
          <button
              onClick={handleExportExcel}
              disabled={reportData.length === 0}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-all font-medium flex items-center gap-2 whitespace-nowrap shadow-lg shadow-emerald-500/20 disabled:shadow-none w-full sm:w-auto justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
              </svg>
              {t("admin_reports_download_excel")}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-300 text-sm border-b border-slate-700">
                <th className="p-4 font-semibold whitespace-nowrap">{t("admin_reports_th_sender")}</th>
                <th className="p-4 font-semibold whitespace-nowrap">{t("admin_reports_th_target")}</th>
                <th className="p-4 font-semibold whitespace-nowrap">{t("admin_reports_th_message")}</th>
                <th className="p-4 font-semibold text-center whitespace-nowrap">{t("admin_reports_th_status")}</th>
                <th className="p-4 font-semibold text-right whitespace-nowrap">{t("admin_reports_th_time")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                    <p className="mt-4">{t("admin_reports_loading")}</p>
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {t("admin_reports_empty")}
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 font-medium text-slate-200 whitespace-nowrap">{item.senderNumber}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{item.targetNumber}</td>
                    <td className="p-4 text-slate-400 max-w-sm truncate" title={item.messageText}>
                      {item.messageText}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${getStatusColor(item.status === 'TERPAKAI' ? 'SUKSES' : item.status)}`}>
                        {item.status === 'TERPAKAI' ? t("admin_reports_success") : (item.status === "SUKSES" ? t("admin_reports_success") : (item.status === "GAGAL" ? t("admin_reports_failed") : (item.status === "READY" ? t("admin_reports_ready") : item.status)))}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-right text-xs whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-700 bg-slate-900/30 flex items-center justify-between">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              {t("admin_targets_prev")}</button>
            <span className="text-slate-400 text-sm">
              {t("admin_targets_page")} <strong className="text-white">{currentPage}</strong> {t("admin_targets_of")} <strong className="text-white">{totalPages}</strong>
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              {t("admin_targets_next")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
