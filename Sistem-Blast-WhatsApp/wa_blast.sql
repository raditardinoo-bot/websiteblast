-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Waktu pembuatan: 25 Jun 2026 pada 15.05
-- Versi server: 8.0.30
-- Versi PHP: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `wa_blast`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `appsetting`
--

CREATE TABLE `appsetting` (
  `id` int NOT NULL DEFAULT '1',
  `appName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TRYWSBLAST',
  `logoUrl` text COLLATE utf8mb4_unicode_ci,
  `rewardPerMessage` double NOT NULL DEFAULT '50',
  `allowedBanks` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BCA,BNI,BRI,MANDIRI,BSI',
  `updatedAt` datetime(3) NOT NULL,
  `allowedEWallets` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DANA,OVO,GOPAY,LINKAJA,SHOPEEPAY',
  `minWithdrawalBank` double NOT NULL DEFAULT '50000',
  `minWithdrawalEwallet` double NOT NULL DEFAULT '10000',
  `csType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WA',
  `csValue` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '628123456789',
  `telegramBotToken` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telegramChatId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ruleProfileName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Nama Pegawai - TRYWSBLAST',
  `ruleProfilePhotoUrl` text COLLATE utf8mb4_unicode_ci,
  `referralRewardRegular` double NOT NULL DEFAULT '50',
  `referralRewardVip` double NOT NULL DEFAULT '200',
  `popupEnabledBlast` tinyint(1) NOT NULL DEFAULT '1',
  `popupEnabledDashboard` tinyint(1) NOT NULL DEFAULT '1',
  `popupMediaUrls` text COLLATE utf8mb4_unicode_ci,
  `popupText` text COLLATE utf8mb4_unicode_ci,
  `popupType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IMAGE',
  `bgImageUrl` text COLLATE utf8mb4_unicode_ci,
  `bgThemeType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DEFAULT'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `appsetting`
--

INSERT INTO `appsetting` (`id`, `appName`, `logoUrl`, `rewardPerMessage`, `allowedBanks`, `updatedAt`, `allowedEWallets`, `minWithdrawalBank`, `minWithdrawalEwallet`, `csType`, `csValue`, `telegramBotToken`, `telegramChatId`, `ruleProfileName`, `ruleProfilePhotoUrl`, `referralRewardRegular`, `referralRewardVip`, `popupEnabledBlast`, `popupEnabledDashboard`, `popupMediaUrls`, `popupText`, `popupType`, `bgImageUrl`, `bgThemeType`) VALUES
(1, 'TRYWSBLAST', '/uploads/logo-1781696150028.jpeg', 600, 'BCA,BNI,BRI,MANDIRI', '2026-06-24 20:30:00.938', 'DANA,OVO,GOPAY', 100000, 10000, 'WA', '6282218927865', 'YOUR_TELEGRAM_BOT_TOKEN_HERE', '5409710235', 'Nama Pegawai - TRYWSBLAST', '/uploads/logo-1782278350660.jpeg', 50, 200, 1, 1, '[\"https://youtu.be/rWNaiEttNM8?si=wzfe8BDb4Pp2Z5sV\"]', 'Wajib Mengganti Username dan Foto Profil Akun WhatsApp Sesuai Dengan Aturan\r\nJika Tidak Patuh Saldo Akun Anda Tidak Bisa di Cairkan', 'VIDEO', '/uploads/logo-1782332915771.jpg', 'DEFAULT');

-- --------------------------------------------------------

--
-- Struktur dari tabel `campaign`
--

CREATE TABLE `campaign` (
  `id` int NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `messageTemplate` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `mediaUrl` text COLLATE utf8mb4_unicode_ci,
  `linkText` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linkUrl` text COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','PAUSED','COMPLETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `campaign`
--

INSERT INTO `campaign` (`id`, `name`, `messageTemplate`, `mediaUrl`, `linkText`, `linkUrl`, `status`, `createdAt`, `updatedAt`) VALUES
(1, 'Undangan', '🌐 CN TECHNO - JASA PEMBUATAN WEBSITE\r\n\r\nHalo {{phone}},\r\n\r\nKami melihat bahwa bisnis saat ini membutuhkan kehadiran online yang profesional untuk menjangkau lebih banyak pelanggan.\r\n\r\n🚀 Kami menyediakan layanan:\r\n✅ Website Company Profile\r\n✅ Website UMKM & Toko Online\r\n✅ Landing Page Promosi\r\n✅ Website Sekolah & Organisasi\r\n✅ Website Custom Sesuai Kebutuhan\r\n\r\n🎁 Promo spesial bulan ini:\r\n\r\n* Harga terjangkau\r\n* Desain responsif (HP & PC)\r\n* Gratis konsultasi\r\n* Support setelah website selesai\r\n\r\n🌐 Portfolio & Informasi:\r\nhttps://cntechno.my.id/\r\n\r\n💬 Ingin website untuk usaha, toko, atau perusahaan Anda?\r\nHubungi kami sekarang dan konsultasikan kebutuhan Anda secara gratis.\r\n\r\nTerima kasih.\r\nCN TECHNO\r\nSolusi Website Profesional untuk Bisnis Anda\r\n', '/uploads/campaigns/camp-1781723214968.jpeg', 'Daftar Sekarang', 'https://cntechno.my.id/', 'PAUSED', '2026-06-17 12:06:36.931', '2026-06-24 05:54:46.121'),
(3, 'testing', 'tes ini pesan tes saja', '/uploads/campaigns/camp-1782280482986.jpeg', 'klik disini', 'https://wahatsppp.com', 'PAUSED', '2026-06-24 05:54:42.999', '2026-06-24 18:02:03.051'),
(4, 'diskon promosi', 'terimakasih', '/uploads/campaigns/camp-1782307773190.jpeg', 'daftar sekarang', 'https://goggle.com', 'ACTIVE', '2026-06-24 13:29:33.228', '2026-06-24 18:02:03.079');

-- --------------------------------------------------------

--
-- Struktur dari tabel `targetnumber`
--

CREATE TABLE `targetnumber` (
  `id` int NOT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('READY','TERPAKAI') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'READY',
  `waSessionId` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `campaignId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `user`
--

CREATE TABLE `user` (
  `id` int NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('ADMIN','USER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `balance` double NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `bankAccount` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankOwner` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `referralCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referredBy` int DEFAULT NULL,
  `referralEarnings` double NOT NULL DEFAULT '0',
  `referralMessageCount` int NOT NULL DEFAULT '0',
  `tier` enum('REGULAR','VIP') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REGULAR',
  `messagesSent` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `user`
--

INSERT INTO `user` (`id`, `name`, `username`, `email`, `password`, `role`, `balance`, `createdAt`, `updatedAt`, `bankAccount`, `bankName`, `bankOwner`, `bankType`, `isActive`, `referralCode`, `referredBy`, `referralEarnings`, `referralMessageCount`, `tier`, `messagesSent`) VALUES
(1, 'Administrator', 'admin', NULL, '$2b$10$qpqCvCSGOzFi942J92mG6ONEzOEspe845FqoKAaO.5qmpey0b62oO', 'ADMIN', 0, '2026-06-17 11:11:29.327', '2026-06-17 11:11:29.327', NULL, NULL, NULL, NULL, 1, NULL, NULL, 0, 0, 'REGULAR', 0),
(2, 'Test User', 'testuser', NULL, '$2b$10$qpqCvCSGOzFi942J92mG6ONEzOEspe845FqoKAaO.5qmpey0b62oO', 'USER', 13850, '2026-06-17 11:11:29.362', '2026-06-24 06:24:21.190', '082229281176', 'DANA', 'Muhammad Rizqi', 'EWALLET', 1, NULL, NULL, 0, 0, 'REGULAR', 0);

-- --------------------------------------------------------

--
-- Struktur dari tabel `wasession`
--

CREATE TABLE `wasession` (
  `id` int NOT NULL,
  `userId` int NOT NULL,
  `sessionName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('CONNECTED','DISCONNECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DISCONNECTED',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `withdrawal`
--

CREATE TABLE `withdrawal` (
  `id` int NOT NULL,
  `userId` int NOT NULL,
  `amount` double NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `bankAccount` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankOwner` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejectReason` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `appsetting`
--
ALTER TABLE `appsetting`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `campaign`
--
ALTER TABLE `campaign`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `targetnumber`
--
ALTER TABLE `targetnumber`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TargetNumber_waSessionId_fkey` (`waSessionId`),
  ADD KEY `TargetNumber_campaignId_fkey` (`campaignId`);

--
-- Indeks untuk tabel `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_username_key` (`username`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD UNIQUE KEY `User_referralCode_key` (`referralCode`),
  ADD KEY `User_referredBy_fkey` (`referredBy`);

--
-- Indeks untuk tabel `wasession`
--
ALTER TABLE `wasession`
  ADD PRIMARY KEY (`id`),
  ADD KEY `WaSession_userId_fkey` (`userId`);

--
-- Indeks untuk tabel `withdrawal`
--
ALTER TABLE `withdrawal`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Withdrawal_userId_fkey` (`userId`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `campaign`
--
ALTER TABLE `campaign`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `targetnumber`
--
ALTER TABLE `targetnumber`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `user`
--
ALTER TABLE `user`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `wasession`
--
ALTER TABLE `wasession`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT untuk tabel `withdrawal`
--
ALTER TABLE `withdrawal`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `targetnumber`
--
ALTER TABLE `targetnumber`
  ADD CONSTRAINT `TargetNumber_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaign` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TargetNumber_waSessionId_fkey` FOREIGN KEY (`waSessionId`) REFERENCES `wasession` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `User_referredBy_fkey` FOREIGN KEY (`referredBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `wasession`
--
ALTER TABLE `wasession`
  ADD CONSTRAINT `WaSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `withdrawal`
--
ALTER TABLE `withdrawal`
  ADD CONSTRAINT `Withdrawal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
