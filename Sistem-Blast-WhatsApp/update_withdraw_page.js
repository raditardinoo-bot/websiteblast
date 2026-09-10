const fs = require('fs');
let content = fs.readFileSync('frontend/app/x-panel-core/withdraw/page.tsx', 'utf8');

// useLanguage import
content = content.replace('import React, { useState, useEffect } from "react";', 'import React, { useState, useEffect } from "react";\nimport { useLanguage } from "../../../contexts/LanguageContext";');
content = content.replace('const [searchQuery, setSearchQuery] = useState("");', 'const [searchQuery, setSearchQuery] = useState("");\n  const { t } = useLanguage();');

// Title & Desc
content = content.replace('<h1 className="text-3xl font-bold text-white mb-2">Manajemen Klaim Dana 💳</h1>', '<h1 className="text-3xl font-bold text-white mb-2">{t("admin_withdraw_title")}</h1>');
content = content.replace('<p className="text-slate-400 text-sm">Validasi dan transfer pencairan dana pekerja.</p>', '<p className="text-slate-400 text-sm">{t("admin_withdraw_desc")}</p>');

// Search
content = content.replace('placeholder="Cari username / nama pekerja..."', 'placeholder={t("admin_withdraw_search")}');

// Tabs
content = content.replace(/>\s*Menunggu/g, '>{t("admin_withdraw_tab_pending")}');
content = content.replace(/>\s*Selesai\s*<\/button>/g, '>{t("admin_withdraw_tab_approved")}</button>');
content = content.replace(/>\s*Ditolak\s*<\/button>/g, '>{t("admin_withdraw_tab_rejected")}</button>');

// Table state
content = content.replace('Tidak ada data di kategori ini.', '{t("admin_withdraw_empty")}');
content = content.replace('<th className="p-4 font-bold">Tanggal</th>', '<th className="p-4 font-bold">{t("admin_withdraw_th_date")}</th>');
content = content.replace('<th className="p-4 font-bold">Pekerja</th>', '<th className="p-4 font-bold">{t("admin_withdraw_th_worker")}</th>');
content = content.replace('<th className="p-4 font-bold">Jumlah</th>', '<th className="p-4 font-bold">{t("admin_withdraw_th_amount")}</th>');
content = content.replace('<th className="p-4 font-bold">Tujuan / Rekening</th>', '<th className="p-4 font-bold">{t("admin_withdraw_th_bank")}</th>');
content = content.replace('<th className="p-4 font-bold">Alasan Penolakan</th>', '<th className="p-4 font-bold">{t("admin_withdraw_th_reason")}</th>');
content = content.replace('<th className="p-4 font-bold text-right">Aksi</th>', '<th className="p-4 font-bold text-right">{t("admin_withdraw_th_action")}</th>');

// Dynamic Texts
content = content.replace('Pekerja Terhapus', '{t("admin_withdraw_deleted_worker")}');
content = content.replace('"Tidak ada alasan spesifik"', 't("admin_withdraw_no_reason")');
content = content.replace('title="Setujui & Transfer"', 'title={t("admin_withdraw_btn_approve")}');
content = content.replace('title="Tolak & Kembalikan Saldo"', 'title={t("admin_withdraw_btn_reject")}');
content = content.replace(/>\s*Memproses\.\.\.\s*</g, '>{t("admin_withdraw_processing")}<');
content = content.replace(/>\s*Tolak & Refund\s*</g, '>{t("admin_withdraw_modal_reject_btn")}<');
content = content.replace(/>\s*Sudah Ditransfer, Setujui\s*</g, '>{t("admin_withdraw_modal_approve_btn")}<');

// Reject Modal
content = content.replace('<h2 className="text-xl font-bold text-white mb-2">Tolak Permintaan Klaim Dana</h2>', '<h2 className="text-xl font-bold text-white mb-2">{t("admin_withdraw_modal_reject_title")}</h2>');
content = content.replace('<p className="text-sm text-slate-400 mb-6">Saldo akan dikembalikan utuh ke akun pekerja. Silakan isi alasan penolakan agar pekerja mengetahuinya.</p>', '<p className="text-sm text-slate-400 mb-6">{t("admin_withdraw_modal_reject_desc")}</p>');
content = content.replace('placeholder="Contoh: Nomor rekening tidak valid / Nama pemilik tidak sesuai..."', 'placeholder={t("admin_withdraw_modal_reject_placeholder")}');

// Approve Modal
content = content.replace('<h2 className="text-xl font-bold text-white">Konfirmasi Transfer</h2>', '<h2 className="text-xl font-bold text-white">{t("admin_withdraw_modal_approve_title")}</h2>');
content = content.replace('<p className="text-sm text-slate-400">Mohon periksa ulang data rekening.</p>', '<p className="text-sm text-slate-400">{t("admin_withdraw_modal_approve_desc")}</p>');
content = content.replace('>Nominal Transfer<', '>{t("admin_withdraw_modal_approve_amount")}<');
content = content.replace('>Tujuan / Rekening<', '>{t("admin_withdraw_modal_approve_bank")}<');
content = content.replace('⚠️ Peringatan: Pastikan Anda telah mentransfer dana ke rekening di atas sebelum mengklik tombol setuju.', '{t("admin_withdraw_modal_approve_warning")}');

// Toasts
content = content.replace('"Gagal memperbarui"', 't("admin_withdraw_toast_update_fail")');
content = content.replace('"Koneksi gagal"', 't("admin_withdraw_toast_conn_fail")');
content = content.replace('"Alasan penolakan wajib diisi"', 't("admin_withdraw_toast_reason_req")');

// Admin modal cancel
content = content.replace(/>\s*Batal\s*<\/button>/g, '>{t("admin_modal_cancel")}</button>');

// Ternary logic replacements for processing
content = content.replace("{isProcessing !== null ? 'Memproses...' : 'Tolak & Refund'}", '{isProcessing !== null ? t("admin_withdraw_processing") : t("admin_withdraw_modal_reject_btn")}');
content = content.replace("{isProcessing !== null ? 'Memproses...' : 'Sudah Ditransfer, Setujui'}", '{isProcessing !== null ? t("admin_withdraw_processing") : t("admin_withdraw_modal_approve_btn")}');

fs.writeFileSync('frontend/app/x-panel-core/withdraw/page.tsx', content);
