const fs = require('fs');
let content = fs.readFileSync('frontend/app/x-panel-core/reports/page.tsx', 'utf8');

// Use useLanguage
content = content.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";\nimport { useLanguage } from "../../../contexts/LanguageContext";');
content = content.replace('const router = useRouter();', 'const router = useRouter();\n  const { t } = useLanguage();');

// Excel labels
content = content.replace('"No": index + 1', '[`${t("admin_reports_excel_no")}`]: index + 1');
content = content.replace('"Nomor Pengirim": item.senderNumber', '[`${t("admin_reports_excel_sender")}`]: item.senderNumber');
content = content.replace('"Nomor Target": item.targetNumber', '[`${t("admin_reports_excel_target")}`]: item.targetNumber');
content = content.replace('"Pesan": item.messageText', '[`${t("admin_reports_excel_message")}`]: item.messageText');
content = content.replace('"Status": item.status === \'TERPAKAI\' ? \'SUKSES\' : item.status', '[`${t("admin_reports_excel_status")}`]: item.status === \'TERPAKAI\' ? t("admin_reports_success") : (item.status === "SUKSES" ? t("admin_reports_success") : (item.status === "GAGAL" ? t("admin_reports_failed") : (item.status === "READY" ? t("admin_reports_ready") : item.status)))');

// Excel summary
content = content.replace('["RINGKASAN KAMPANYE", ""]', '[t("admin_reports_excel_summary_title"), ""]');
content = content.replace('["Berhasil", totalBerhasil]', '[t("admin_reports_excel_summary_success"), totalBerhasil]');
content = content.replace('["Gagal", totalGagal]', '[t("admin_reports_excel_summary_failed"), totalGagal]');
content = content.replace('["Ready / Antre", totalReady]', '[t("admin_reports_excel_summary_ready"), totalReady]');
content = content.replace('["Total Keseluruhan", reportData.length]', '[t("admin_reports_excel_summary_total"), reportData.length]');

// Page UI
content = content.replace('<h1 className="text-2xl font-bold text-white mb-2">Laporan Pengiriman</h1>', '<h1 className="text-2xl font-bold text-white mb-2">{t("admin_reports_title")}</h1>');
content = content.replace('<p className="text-slate-400 mb-4">Pilih kampanye untuk melihat detail atau unduh laporan Excel.</p>', '<p className="text-slate-400 mb-4">{t("admin_reports_desc")}</p>');
content = content.replace('<option value="" disabled>-- Pilih Kampanye --</option>', '<option value="" disabled>{t("admin_reports_select_camp_placeholder")}</option>');

content = content.replace('<p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Berhasil</p>', '<p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">{t("admin_reports_success")}</p>');
content = content.replace('<p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Gagal</p>', '<p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">{t("admin_reports_failed")}</p>');
content = content.replace('<p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Ready</p>', '<p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">{t("admin_reports_ready")}</p>');

content = content.replace('Total Data: <span className="text-white font-bold">{reportData.length}</span> nomor', '{t("admin_reports_total_data")} <span className="text-white font-bold">{reportData.length}</span> {t("admin_reports_number_unit")}');
content = content.replace('Download Excel', '{t("admin_reports_download_excel")}');

// Table Headers
content = content.replace('<th className="p-4 font-semibold whitespace-nowrap">Pengirim</th>', '<th className="p-4 font-semibold whitespace-nowrap">{t("admin_reports_th_sender")}</th>');
content = content.replace('<th className="p-4 font-semibold whitespace-nowrap">Target</th>', '<th className="p-4 font-semibold whitespace-nowrap">{t("admin_reports_th_target")}</th>');
content = content.replace('<th className="p-4 font-semibold whitespace-nowrap">Pesan</th>', '<th className="p-4 font-semibold whitespace-nowrap">{t("admin_reports_th_message")}</th>');
content = content.replace('<th className="p-4 font-semibold text-center whitespace-nowrap">Status</th>', '<th className="p-4 font-semibold text-center whitespace-nowrap">{t("admin_reports_th_status")}</th>');
content = content.replace('<th className="p-4 font-semibold text-right whitespace-nowrap">Waktu</th>', '<th className="p-4 font-semibold text-right whitespace-nowrap">{t("admin_reports_th_time")}</th>');

// Loading/Empty
content = content.replace('<p className="mt-4">Memuat data laporan...</p>', '<p className="mt-4">{t("admin_reports_loading")}</p>');
content = content.replace('Belum ada data target / riwayat pengiriman untuk kampanye ini.', '{t("admin_reports_empty")}');

// Table Row Status
content = content.replace('{item.status === \'TERPAKAI\' ? \'SUKSES\' : item.status}', '{item.status === \'TERPAKAI\' ? t("admin_reports_success") : (item.status === "SUKSES" ? t("admin_reports_success") : (item.status === "GAGAL" ? t("admin_reports_failed") : (item.status === "READY" ? t("admin_reports_ready") : item.status)))}');

// Pagination
content = content.replace(/Sebelumnya\s*<\/button>/, '{t("admin_targets_prev")}</button>');
content = content.replace(/Selanjutnya\s*<\/button>/, '{t("admin_targets_next")}</button>');
content = content.replace('Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong>', '{t("admin_targets_page")} <strong className="text-white">{currentPage}</strong> {t("admin_targets_of")} <strong className="text-white">{totalPages}</strong>');

fs.writeFileSync('frontend/app/x-panel-core/reports/page.tsx', content);
