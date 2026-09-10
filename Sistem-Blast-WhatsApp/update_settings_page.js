const fs = require('fs');
let content = fs.readFileSync('frontend/app/x-panel-core/settings/page.tsx', 'utf8');

// useLanguage import
content = content.replace('import { useState, useEffect, useRef, useCallback } from "react";', 'import { useState, useEffect, useRef, useCallback } from "react";\nimport { useLanguage } from "../../../contexts/LanguageContext";');
content = content.replace('export default function AdminSettingsPage() {', 'export default function AdminSettingsPage() {\n  const { t } = useLanguage();');

// Tabs array
content = content.replace('label: "Identitas Web"', 'label: t("admin_settings_tab_identity")');
content = content.replace('label: "Keuangan & Reward"', 'label: t("admin_settings_tab_finance")');
content = content.replace('label: "Customer Service"', 'label: t("admin_settings_tab_cs")');
content = content.replace('label: "Notifikasi Telegram"', 'label: t("admin_settings_tab_telegram")');
content = content.replace('label: "Aturan Pekerja"', 'label: t("admin_settings_tab_rules")');
content = content.replace('label: "Pop-up"', 'label: t("admin_settings_tab_popup")');
content = content.replace('label: "Tema & Background"', 'label: t("admin_settings_tab_theme")');
content = content.replace('label: "Pembersihan Sistem"', 'label: t("admin_settings_tab_inactive")');
content = content.replace('label: "Mode Maintenance"', 'label: t("admin_settings_tab_maintenance")');

// Title & Desc
content = content.replace('<h1 className="text-3xl font-bold text-white mb-2">Pengaturan Sistem ⚙️</h1>', '<h1 className="text-3xl font-bold text-white mb-2">{t("admin_settings_title")}</h1>');
content = content.replace('<p className="text-slate-400">Kelola identitas, keuangan, dan pusat bantuan platform.</p>', '<p className="text-slate-400">{t("admin_settings_desc")}</p>');

// Identitas Tab
content = content.replace('Identitas Platform</h2', '{t("admin_settings_id_title")}</h2');
content = content.replace('Logo Utama</label', '{t("admin_settings_id_logo")}</label');
content = content.replace('Upload Logo</span', '{t("admin_settings_id_logo_upload")}</span');
content = content.replace('Ubah Foto</span', '{t("admin_settings_id_logo_change")}</span');
content = content.replace('Nama Platform (Merek)</label', '{t("admin_settings_id_name")}</label');
content = content.replace('placeholder="Contoh: BLASTER-PRO"', 'placeholder={t("admin_settings_id_name_placeholder")}');

// Keuangan Tab
content = content.replace('Upah & Bonus</h2', '{t("admin_settings_fin_wage_title")}</h2');
content = content.replace('Upah Per Pesan Sukses</label', '{t("admin_settings_fin_wage_msg")}</label');
content = content.replace('Bonus Referral (REGULAR) / Pesan</label', '{t("admin_settings_fin_wage_ref_reg")}</label');
content = content.replace('Bonus Referral (VIP) / Pesan</label', '{t("admin_settings_fin_wage_ref_vip")}</label');

content = content.replace('Klaim Saldo (Penarikan)</h2', '{t("admin_settings_fin_wd_title")}</h2');
content = content.replace('Minimal Klaim Bank</label', '{t("admin_settings_fin_wd_min_bank")}</label');
content = content.replace('Minimal Klaim e-Wallet</label', '{t("admin_settings_fin_wd_min_ewallet")}</label');
content = content.replace('Maksimal Klaim (Batas Atas Bank)</label', '{t("admin_settings_fin_wd_max_bank")}</label');
content = content.replace('Maksimal Klaim (Batas Atas e-Wallet)</label', '{t("admin_settings_fin_wd_max_ewallet")}</label');
content = content.replace('Biaya Admin (Bank)</label', '{t("admin_settings_fin_wd_fee_bank")}</label');
content = content.replace('Biaya Admin (e-Wallet)</label', '{t("admin_settings_fin_wd_fee_ewallet")}</label');

content = content.replace('Daftar Bank yang Tersedia</label', '{t("admin_settings_fin_wd_banks")}</label');
content = content.replace('Daftar e-Wallet yang Tersedia</label', '{t("admin_settings_fin_wd_ewallets")}</label');
content = content.replace(/>Pisahkan dengan koma\.</g, '>{t("admin_settings_fin_wd_banks_desc")}<');

content = content.replace('Jam Operasional Penarikan (Otomatis)\n', '{t("admin_settings_fin_wd_hours_title")}\n');
content = content.replace('Jika diaktifkan, menu penarikan di dashboard user otomatis ditutup di luar jam yang ditentukan (Menggunakan Waktu Indonesia Barat / WIB).</p>', '{t("admin_settings_fin_wd_hours_desc")}</p>');
content = content.replace('Jam Buka (WIB)</label>', '{t("admin_settings_fin_wd_hours_open")}</label>');
content = content.replace('Jam Tutup (WIB)</label>', '{t("admin_settings_fin_wd_hours_close")}</label>');

// CS Tab
content = content.replace('Customer Service (Tombol Bantuan)</h2', '{t("admin_settings_cs_title")}</h2');
content = content.replace('Tombol ini akan selalu muncul mengambang (mengikuti scroll) di sudut kanan bawah semua layar pengguna, baik sebelum login maupun sesudah masuk ke dashboard.\n', '{t("admin_settings_cs_desc")}\n');
content = content.replace('Tipe Customer Service</label', '{t("admin_settings_cs_type")}</label');
content = content.replace('Nomor WhatsApp (Logo Hijau)</option>', '{t("admin_settings_cs_type_wa")}</option>');
content = content.replace('Tautan Web Umum (Logo Biru)</option>', '{t("admin_settings_cs_type_link")}</option>');
content = content.replace('? "Nomor WhatsApp (Awali dengan 62)" : "Tautan / URL Tujuan"', '? t("admin_settings_cs_value_wa") : t("admin_settings_cs_value_link")');

// Telegram Tab
content = content.replace('Notifikasi Bot Telegram</h2', '{t("admin_settings_tg_title")}</h2');
content = content.replace('Sistem akan otomatis mengirim pesan ke Telegram Anda setiap kali ada *User* yang mengklaim dana.\n', '{t("admin_settings_tg_desc")}\n');
content = content.replace('Panduan Mendapatkan Chat ID\n', '{t("admin_settings_tg_guide_title")}\n');
content = content.replace('<li>Buat bot baru di <a href="https://t.me/BotFather" target="_blank" className="text-indigo-400 hover:underline">@BotFather</a> untuk mendapatkan <b>Token Bot</b>.</li>', '<li>{t("admin_settings_tg_guide_1")} <a href="https://t.me/BotFather" target="_blank" className="text-indigo-400 hover:underline">@BotFather</a></li>');
content = content.replace('<li>Cari bot <a href="https://t.me/userinfobot" target="_blank" className="text-indigo-400 hover:underline">@userinfobot</a> di Telegram dan tekan <b>Start</b> untuk mendapatkan <b>Chat ID</b> Anda (contoh: 123456789).</li>', '<li>{t("admin_settings_tg_guide_2")} <a href="https://t.me/userinfobot" target="_blank" className="text-indigo-400 hover:underline">@userinfobot</a></li>');
content = content.replace('<li>Cari bot Anda sendiri di Telegram, lalu tekan <b>Start</b> agar bot Anda diizinkan untuk mengirimi Anda pesan.</li>', '<li>{t("admin_settings_tg_guide_3")}</li>');

content = content.replace('Token Bot Telegram</label', '{t("admin_settings_tg_token")}</label');
content = content.replace('Chat ID Admin</label', '{t("admin_settings_tg_chatid")}</label');

content = content.replace('Fitur Up (Broadcast Channel)</h4', '{t("admin_settings_tg_broadcast_title")}</h4');
content = content.replace('Jika dimatikan, pesan WD cair/ditolak tidak akan dikirim ke Channel Publik.</p>', '{t("admin_settings_tg_broadcast_desc")}</p>');
content = content.replace('ID Channel Publik (Khusus Broadcast WD)</label', '{t("admin_settings_tg_channel_id")}</label');
content = content.replace('<strong className="text-indigo-400">INFO:</strong> Jika diisi, bot akan otomatis mengirim bukti transfer WD ke channel ini setiap kali Anda klik \'Setuju\'.<br/>', '<strong className="text-indigo-400">INFO:</strong> {t("admin_settings_tg_channel_info")}<br/>');
content = content.replace('<strong className="text-teal-400">Cara dapat ID Channel:</strong> Teruskan (Forward) salah satu pesan dari Channel Publik Anda ke bot <strong className="text-white">@userinfobot</strong> di Telegram, lalu copy ID yang muncul (biasanya berawalan <b>-100</b>).<br/>', '<strong className="text-teal-400">INFO:</strong> {t("admin_settings_tg_channel_guide")}<br/>');
content = content.replace('<span className="text-red-400 font-bold">PENTING:</span> Jangan lupa masukkan Bot Anda ke dalam Channel Publik tersebut dan angkat menjadi <b>Admin</b> agar bot bisa mengirim pesan!', '<span className="text-red-400 font-bold">PENTING:</span> {t("admin_settings_tg_channel_warn")}');

// Aturan Pekerja Tab
content = content.replace('Aturan Profil Pekerja</h2', '{t("admin_settings_rule_title")}</h2');
content = content.replace('Atur foto profil dan nama WhatsApp yang <strong className="text-red-400">wajib</strong> digunakan oleh pekerja sebelum mereka memulai pengiriman pesan. Peringatan ini akan muncul di dashboard pekerja.\n', '{t("admin_settings_rule_desc")}\n');
content = content.replace('Foto Profil Wajib</label', '{t("admin_settings_rule_photo")}</label');
content = content.replace('Ganti Foto</p', '{t("admin_settings_rule_photo_change")}</p');
content = content.replace('Upload Foto</span', '{t("admin_settings_rule_photo_upload")}</span');
content = content.replace('Nama WhatsApp Wajib</label', '{t("admin_settings_rule_name")}</label');

content = content.replace('Keamanan & Sistem</h2', '{t("admin_settings_rule_sec_title")}</h2');
content = content.replace('Deteksi Shadowban\n', '{t("admin_settings_rule_sec_shadowban")}\n');

// Popup Tab
content = content.replace('Pengaturan Pop-up & Pengumuman</h2', '{t("admin_settings_popup_title")}</h2');
content = content.replace('Pop-up Dashboard</h4', '{t("admin_settings_popup_dash")}</h4');
content = content.replace('Muncul otomatis saat user login (1x per sesi).</p>', '{t("admin_settings_popup_dash_desc")}</p>');
content = content.replace('Pop-up Pengiriman</h4', '{t("admin_settings_popup_blast")}</h4');
content = content.replace("Muncul menahan aksi saat klik 'Mulai Pengiriman'.</p>", '{t("admin_settings_popup_blast_desc")}</p>');

content = content.replace('Tipe Media Pop-up</label', '{t("admin_settings_popup_type")}</label');
content = content.replace('Gambar Slider (Bisa banyak)</option>', '{t("admin_settings_popup_type_img")}</option>');
content = content.replace('Video Tunggal (Link YouTube/Mp4)</option>', '{t("admin_settings_popup_type_vid")}</option>');
content = content.replace('Upload Gambar (Slider)</label', '{t("admin_settings_popup_img_label")}</label');
content = content.replace('Pilih beberapa foto sekaligus untuk membuat slider otomatis.</p>', '{t("admin_settings_popup_img_desc")}</p>');

content = content.replace('>Gunakan Link<', '>{t("admin_settings_popup_vid_link_opt")}<');
content = content.replace('>Upload Video<', '>{t("admin_settings_popup_vid_up_opt")}<');

content = content.replace('Link Video</label', '{t("admin_settings_popup_vid_link_label")}</label');
content = content.replace('Gunakan link embed YouTube atau link file .mp4 langsung.</p>', '{t("admin_settings_popup_vid_link_desc")}</p>');
content = content.replace('Upload File Video</label', '{t("admin_settings_popup_vid_up_label")}</label');
content = content.replace('Pastikan ukuran video tidak terlalu besar (Max 10MB disarankan) agar tidak membebani server.</p>', '{t("admin_settings_popup_vid_up_desc")}</p>');

content = content.replace('Teks Aturan / Pengumuman</label', '{t("admin_settings_popup_text")}</label');
content = content.replace('placeholder="Ketik teks pengumuman di sini..."', 'placeholder={t("admin_settings_popup_text_placeholder")}');

// Tema Tab
content = content.replace('Pengaturan Tema & Background</h2', '{t("admin_settings_theme_title")}</h2');
content = content.replace('Sesuaikan latar belakang layar Dashboard User dan Admin.</p>', '{t("admin_settings_theme_desc")}</p>');
content = content.replace('Pilih Tema Background</label', '{t("admin_settings_theme_select")}</label');
content = content.replace('Tema Default (Gelap Modern)</option>', '{t("admin_settings_theme_default")}</option>');
content = content.replace('Gunakan Foto Khusus</option>', '{t("admin_settings_theme_photo")}</option>');
content = content.replace('Upload Foto Background</label', '{t("admin_settings_theme_up_label")}</label');
content = content.replace('Belum ada foto</span', '{t("admin_settings_theme_up_empty")}</span');
content = content.replace('Preview</span', '{t("admin_settings_theme_up_preview")}</span');
content = content.replace('<p className="text-xs text-slate-500 mt-3 leading-relaxed">Format yang disarankan: JPG atau PNG.<br />Resolusi terbaik: 1920x1080 pixel.</p>', '<p className="text-xs text-slate-500 mt-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("admin_settings_theme_up_desc") }}></p>');

// Inactive Tab
content = content.replace('Pembersihan Sesi Mati (Idle)</h2', '{t("admin_settings_inac_title")}</h2');
content = content.replace('Total Perangkat Terdaftar</p', '{t("admin_settings_inac_dev_total")}</p');
content = content.replace("? totalDevices : '...'} Device</p>", "? totalDevices : '...'} {t('admin_settings_inac_dev_unit')}</p>");
content = content.replace('Ukuran Folder Sesi (Storage)</p', '{t("admin_settings_inac_folder")}</p');
content = content.replace('Fitur ini digunakan untuk <strong className="text-red-400">menghapus permanen</strong> folder WhatsApp dan data perangkat pekerja yang sudah berstatus <em>DISCONNECTED</em> berhari-hari. Ini akan melegakan <strong>Penyimpanan (Storage)</strong> VPS Anda.\n', '{t("admin_settings_inac_desc")}\n');
content = content.replace('Cari yang terputus lebih dari (Hari)</label', '{t("admin_settings_inac_search_label")}</label');
content = content.replace('? "Mengecek..." : "Cek Jumlah Perangkat"', '? t("admin_settings_inac_btn_checking") : t("admin_settings_inac_btn_check")');
content = content.replace('Hasil Pencarian:</p', '{t("admin_settings_inac_res_title")}</p');
content = content.replace('Ditemukan <span className="text-red-400 text-2xl">{inactiveCount}</span> Perangkat Mati', '{t("admin_settings_inac_res_found")} <span className="text-red-400 text-2xl">{inactiveCount}</span> {t("admin_settings_inac_res_dead")}');
content = content.replace('Menghapus data ini tidak dapat dibatalkan dan akan langsung memusnahkan folder sesi perangkat terkait.</p>', '{t("admin_settings_inac_res_warn")}</p>');
content = content.replace('Jumlah yang Ingin Dihapus (Nyicil):</label', '{t("admin_settings_inac_limit")}</label');
content = content.replace('Mulai Eksekusi 🚀\n', '{t("admin_settings_inac_btn_exec")}\n');
content = content.replace('Proses Penghapusan Berjalan...</span', '{t("admin_settings_inac_prog_title")}</span');
content = content.replace('/ {deleteLimit} Dihapus</span', '/ {deleteLimit} {t("admin_settings_inac_prog_deleted")}</span');
content = content.replace('? "Menghentikan..." : "⏹ Stop (Jeda)"', '? t("admin_settings_inac_btn_stopping") : t("admin_settings_inac_btn_stop")');

content = content.replace('Sapu Bersih "Menunggu Tautan"</h4', '{t("admin_settings_inac_junk_title")}</h4');
content = content.replace('Hapus semua perangkat sampah yang terbuat dari klik iseng *user* tapi tidak pernah di-scan QR-nya.</p>', '{t("admin_settings_inac_junk_desc")}</p>');
content = content.replace('Bersihkan Sampah\n', '{t("admin_settings_inac_junk_btn")}\n');
content = content.replace('Reset Total (DANGER)</h4', '{t("admin_settings_inac_reset_title")}</h4');
content = content.replace('Hapus <strong>SELURUH PERANGKAT</strong> tanpa terkecuali (termasuk yang aktif/CONNECTED) dan kosongkan folder secara brutal.</p>', '<span dangerouslySetInnerHTML={{ __html: t("admin_settings_inac_reset_desc") }}></span></p>');
content = content.replace('⚠️ Sapu Bersih Semua\n', '{t("admin_settings_inac_reset_btn")}\n');

// Maintenance Tab
content = content.replace('Mode Maintenance (Perbaikan)</h2', '{t("admin_settings_maint_title")}</h2');
content = content.replace('<p className="text-sm text-slate-300 mb-6 leading-relaxed">\n                    Fitur ini digunakan untuk <strong>menutup sementara</strong> akses aplikasi bagi semua *User*. Sangat berguna ketika Anda sedang melakukan perbaikan database, update VPS, atau mengubah pengaturan penting.\n                  </p>', '<p className="text-sm text-slate-300 mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("admin_settings_maint_desc") }}></p>');
content = content.replace('Aktifkan Maintenance Mode\n', '{t("admin_settings_maint_toggle")}\n');
content = content.replace('Jika aktif, semua user biasa tidak bisa login atau otomatis ter-logout. Hanya admin yang bisa masuk.</p>', '{t("admin_settings_maint_toggle_desc")}</p>');
content = content.replace('Kode Kunci Rahasia (Bypass Key)\n', '{t("admin_settings_maint_key")}\n');
// Maintenance key desc complex replacement
content = content.replace('<p className="text-xs text-slate-500 mt-3 leading-relaxed">\n                        Jika ada user tertentu (atau Anda sendiri dengan akun user) yang harus mengakses web saat maintenance, gunakan kunci ini. <br />\n                        <strong>Cara Pakai:</strong> Pada halaman depan "Under Maintenance", klik icon <strong>Kunci</strong> transparan di pojok kanan bawah, lalu isi kunci rahasia ini beserta username & password login.\n                      </p>', '<p className="text-xs text-slate-500 mt-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("admin_settings_maint_key_desc") }}></p>');

// Save Button
content = content.replace('Menyimpan...\n', '{t("admin_settings_btn_saving")}\n');
content = content.replace('Simpan Perubahan\n', '{t("admin_settings_btn_save")}\n');

// Modals
content = content.replace('{confirmModal.title}', '{confirmModal.title === \'Sapu Bersih "Menunggu Tautan"\' ? t("admin_settings_modal_junk_title") : (confirmModal.title === \'⚠️ RESET TOTAL SEMUA SESI\' ? t("admin_settings_modal_reset_title") : confirmModal.title)}');
content = content.replace('{confirmModal.message}', '{confirmModal.message.includes(\'sampah\') ? t("admin_settings_modal_junk_msg") : t("admin_settings_modal_reset_msg")}');
content = content.replace(/>\s*Batal\s*<\/button>/g, '>{t("admin_settings_modal_btn_cancel")}</button>');
content = content.replace('? (\n                  <>\n                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>\n                    Memproses...\n                  </>\n                ) : (\n                  "Ya, Eksekusi!"\n                )}', '? (\n                  <>\n                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>\n                    {t("admin_settings_modal_btn_executing")}\n                  </>\n                ) : (\n                  t("admin_settings_modal_btn_exec")\n                )}');

content = content.replace('Sesuaikan Background (Zoom & Crop)</h3', '{t("admin_settings_crop_title")}</h3');
content = content.replace('Zoom</span', '{t("admin_settings_crop_zoom")}</span');
content = content.replace('Gunakan Foto\n', '{t("admin_settings_crop_use")}\n');

// Toasts Updates (in logic)
content = content.replace('"Pengaturan berhasil disimpan!"', 't("admin_settings_toast_saved")');
content = content.replace('"Gagal menyimpan pengaturan."', 't("admin_settings_toast_save_fail")');
content = content.replace('"Koneksi ke server gagal."', 't("admin_settings_toast_conn_fail")');
content = content.replace('"Gagal mengecek data perangkat."', 't("admin_settings_toast_check_fail")');
content = content.replace('"Koneksi gagal."', 't("admin_settings_toast_conn_fail")');
content = content.replace('"Pembersihan dihentikan oleh pengguna."', 't("admin_settings_toast_clean_stop")');
content = content.replace('"Terjadi kesalahan saat menghapus data."', 't("admin_settings_toast_clean_err")');
content = content.replace('`Selesai! Berhasil menghapus ${totalDeleted} perangkat.`', '`${t("admin_settings_toast_clean_succ")} ${totalDeleted} ${t("admin_settings_toast_clean_unit")}`');
content = content.replace('"Koneksi terputus saat membersihkan."', 't("admin_settings_toast_clean_conn_err")');

fs.writeFileSync('frontend/app/x-panel-core/settings/page.tsx', content);
