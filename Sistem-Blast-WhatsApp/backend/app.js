require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");
const campaignsRoutes = require("./routes/campaigns");

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Membiarkan frontend memuat gambar
}));

// Konfigurasi agar IP asli user terbaca saat dibalik Nginx/Cloudflare
app.set('trust proxy', 1);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 1000, // Limit setiap IP maksimal 1000 request
  message: "Terlalu banyak permintaan, coba lagi nanti."
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit spesifik untuk endpoint login/register agar tidak di brute-force
  message: "Terlalu banyak percobaan login/register, silakan coba lagi setelah 15 menit."
});

const path = require("path");

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/campaigns", campaignsRoutes);
app.use("/api/targets", require("./routes/targets"));
app.use("/api/users", require("./routes/users"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/user-dashboard", require("./routes/userDashboard"));
app.use("/api/devices", require("./routes/devices"));
app.use("/api/withdrawals", require("./routes/withdrawals"));
app.use("/api/referrals", require("./routes/referrals"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/monitor", require("./routes/monitor"));

app.get("/", (req, res) => {
  res.send("Backend TRYWSBLAST is running 🚀");
});

const { initRedis } = require("./services/redisClient");
const { initializeSessions } = require("./services/whatsappService");
const { initBot } = require("./services/telegramBot");

const PORT = process.env.PORT || 5000;

async function startServer() {
  await initRedis();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeSessions();
    initBot();
  });
}

startServer().catch(err => {
  console.error("Gagal menjalankan server:", err);
});