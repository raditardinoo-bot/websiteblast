const fs = require('fs');
let content = fs.readFileSync('frontend/app/x-panel-core/admins/page.tsx', 'utf8');

// useLanguage import
content = content.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";\nimport { useLanguage } from "../../../contexts/LanguageContext";');
content = content.replace('const [toastType, setToastType] = useState<"success" | "error">("success");', 'const [toastType, setToastType] = useState<"success" | "error">("success");\n  const { t } = useLanguage();');

// Title & Desc
content = content.replace('<h1 className="text-3xl font-bold text-white mb-2">Tim Manajer (Admin) 👑</h1>', '<h1 className="text-3xl font-bold text-white mb-2">{t("admin_team_title")}</h1>');
content = content.replace('<p className="text-slate-400">Atur siapa saja yang memiliki akses ke dasbor ini.</p>', '<p className="text-slate-400">{t("admin_team_desc")}</p>');
content = content.replace('Tambah Admin\n        </button>', '{t("admin_team_add_btn")}\n        </button>');

// Table headers
content = content.replace('<th className="px-6 py-4">Nama Lengkap</th>', '<th className="px-6 py-4">{t("admin_team_th_name")}</th>');
content = content.replace('<th className="px-6 py-4">Username</th>', '<th className="px-6 py-4">{t("admin_team_th_username")}</th>');
content = content.replace('<th className="px-6 py-4 text-center">Aksi</th>', '<th className="px-6 py-4 text-center">{t("admin_team_th_action")}</th>');

// Table content
content = content.replace('Belum ada admin lain', '{t("admin_team_empty")}');

// Modal headers
content = content.replace("{editId ? 'Edit Admin' : 'Tambah Admin Baru'}", '{editId ? t("admin_team_modal_edit") : t("admin_team_modal_add")}');

// Form labels
content = content.replace('<label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Nama Lengkap</label>', '<label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">{t("admin_team_form_name")}</label>');
content = content.replace('<label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Username (Untuk Login)</label>', '<label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">{t("admin_team_form_username")}</label>');
content = content.replace("Password {editId && '(Kosongkan jika tak diubah)'}", '{t("admin_team_form_password")} {editId && t("admin_team_form_pass_edit")}');

// Buttons
content = content.replace(/>\s*Batal\s*<\/button>/g, '>{t("admin_modal_cancel")}</button>');
content = content.replace(/>\s*Simpan\s*<\/button>/g, '>{t("admin_team_btn_save")}</button>');

// Toasts & Confirmations
content = content.replace('"Hapus akun admin ini?"', 't("admin_team_confirm_del")');
content = content.replace('"Admin berhasil dihapus"', 't("admin_team_toast_del_success")');
content = content.replace('"Gagal menghapus admin"', 't("admin_team_toast_del_fail")');
content = content.replace('"Koneksi gagal"', 't("admin_withdraw_toast_conn_fail")'); // reusing translation
content = content.replace('"Gagal memuat admin"', 't("admin_team_toast_load_fail")');
content = content.replace('"Password wajib diisi untuk admin baru"', 't("admin_team_toast_pass_req")');
content = content.replace('"Berhasil menyimpan"', 't("admin_team_toast_save_success")');
content = content.replace('"Gagal menyimpan"', 't("admin_team_toast_save_fail")');

fs.writeFileSync('frontend/app/x-panel-core/admins/page.tsx', content);
