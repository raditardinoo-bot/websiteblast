"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Activity, Server, Zap, Database, Clock, RefreshCw } from "lucide-react";

function DeviceRow({ stat, idx, rankPrefix = "#" }: { stat: any, idx: number, rankPrefix?: string }) {
  const prevSent = useRef(stat.sent);
  const prevFailed = useRef(stat.failed);
  const prevInvalid = useRef(stat.invalid);
  const [highlightClass, setHighlightClass] = useState("");

  useEffect(() => {
    let timer: any;
    if (stat.sent > prevSent.current) {
      setHighlightClass("bg-emerald-600 transition-none");
      timer = setTimeout(() => setHighlightClass("transition-colors duration-1000 bg-transparent"), 500);
    } else if (stat.failed > prevFailed.current || stat.invalid > prevInvalid.current) {
      setHighlightClass("bg-rose-600 transition-none");
      timer = setTimeout(() => setHighlightClass("transition-colors duration-1000 bg-transparent"), 500);
    }
    
    prevSent.current = stat.sent;
    prevFailed.current = stat.failed;
    prevInvalid.current = stat.invalid;

    return () => clearTimeout(timer);
  }, [stat.sent, stat.failed, stat.invalid]);

  return (
    <tr className={`hover:bg-slate-700/30 transition-colors ${highlightClass}`}>
      <td className="px-4 py-3 text-slate-400 font-bold">{rankPrefix}{idx + 1}</td>
      <td className="px-4 py-3">
        <div className="text-slate-300 font-medium flex items-center gap-2">
          {stat.sessionName.startsWith('Device') ? 'Belum Tertaut' : '+' + stat.sessionName}
          <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{stat.status}</span>
        </div>
        <div className="text-xs text-slate-500">{stat.user?.username || 'Unknown'}</div>
      </td>
      <td className="px-4 py-3 text-rose-500 font-bold text-center">{stat.failed || 0}</td>
      <td className="px-4 py-3 text-emerald-400 font-bold text-right">{stat.sent || 0}</td>
    </tr>
  );
}

export default function EngineMonitorPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [mpsHistory, setMpsHistory] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("admin_token") : null;
    if (!token) {
      router.push("/x-panel-core/login");
      return;
    }

    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/monitor`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
          setMpsHistory(prev => {
            const newHistory = [...prev, data.mps || 0];
            if (newHistory.length > 10) newHistory.shift();
            return newHistory;
          });
        } else {
          setError("Gagal mengambil metrik");
        }
      } catch (err) {
        setError("Koneksi API terputus");
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000); // Polling tiap 1 detik

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-mono p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
              <Activity className="w-6 h-6 animate-pulse" />
              LIVE ENGINE MONITOR
            </h1>
            <p className="text-sm text-slate-500 mt-1">Real-time Node.js Worker Telemetry</p>
          </div>
          <button 
            onClick={() => router.push("/x-panel-core")}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors"
          >
            Kembali ke Dasbor
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-400 p-4 rounded mb-6 text-sm">
            [ERROR] {error}
          </div>
        )}

        {!metrics ? (
          <div className="flex items-center justify-center py-20 text-emerald-500">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="ml-3">Menghubungkan ke Mesin...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded">
                <div className="flex items-center gap-2 text-slate-400 mb-2 text-xs uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-yellow-400" /> Kecepatan Tembak
                </div>
                <div className="text-3xl font-bold text-white">
                  {metrics.mps} <span className="text-sm font-normal text-slate-500">msg/sec</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">10 detik terakhir: <span className="text-yellow-400 font-bold">{mpsHistory.reduce((a, b) => a + b, 0)} msg</span></div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded">
                <div className="flex items-center gap-2 text-slate-400 mb-2 text-xs uppercase tracking-wider">
                  <Server className="w-4 h-4 text-blue-400" /> Pekerja Aktif (HP)
                </div>
                <div className="text-3xl font-bold text-white">
                  {metrics.activeDevices} <span className="text-sm font-normal text-slate-500">devices</span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded">
                <div className="flex items-center gap-2 text-slate-400 mb-2 text-xs uppercase tracking-wider">
                  <Database className="w-4 h-4 text-emerald-400" /> Sisa Target di Pool
                </div>
                <div className="text-3xl font-bold text-white">
                  {metrics.poolSize} <span className="text-sm font-normal text-slate-500">nomor</span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded">
                <div className="flex items-center gap-2 text-slate-400 mb-2 text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-purple-400" /> Waktu Serok (Fill Pool)
                </div>
                <div className="text-3xl font-bold text-white">
                  {metrics.lastFillMs} <span className="text-sm font-normal text-slate-500">ms</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Ditarik: {metrics.lastFillTaken} data</div>
              </div>
            </div>

            {/* Top 10 & Bottom 3 Leaderboards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TOP 10 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="font-bold text-emerald-400 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    TOP 10 PERANGKAT
                  </h3>
                  <p className="text-xs text-slate-500">Perangkat dengan pesan sukses terbanyak (All-Time).</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800 text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Rank</th>
                        <th className="px-4 py-3 font-medium">User / Nama Perangkat</th>
                        <th className="px-4 py-3 font-medium text-center">Gagal (Error)</th>
                        <th className="px-4 py-3 font-medium text-right">Sukses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {metrics.top10 && metrics.top10.length > 0 ? (
                        metrics.top10.map((stat: any, idx: number) => (
                          <DeviceRow key={stat.id} stat={stat} idx={idx} rankPrefix="#" />
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                            Belum ada data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BOTTOM 5 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="font-bold text-rose-400 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    TOP 5 TERBAWAH
                  </h3>
                  <p className="text-xs text-slate-500">Perangkat paling lambat/sedikit memproses (All-Time).</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800 text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Rank</th>
                        <th className="px-4 py-3 font-medium">User / Nama Perangkat</th>
                        <th className="px-4 py-3 font-medium text-center">Gagal (Error)</th>
                        <th className="px-4 py-3 font-medium text-right">Sukses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {metrics.bottom5 && metrics.bottom5.length > 0 ? (
                        metrics.bottom5.map((stat: any, idx: number) => (
                          <DeviceRow key={stat.id} stat={stat} idx={idx} rankPrefix="-" />
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                            Belum ada data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Memory Profiler */}
            {metrics.memory && (
              <div className="bg-slate-800/50 border border-slate-700 rounded overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-200">MEMORY PROFILER</h3>
                    <p className="text-xs text-slate-500">Pemantauan RAM Worker & Node.js secara Real-Time</p>
                  </div>
                  <div className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">
                    Active Sessions: {metrics.memory.sessions}
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">RSS (Total RAM)</div>
                    <div className="text-xl font-bold text-emerald-400">{metrics.memory.memory.rss}</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Heap Used</div>
                    <div className="text-xl font-bold text-blue-400">{metrics.memory.memory.heapUsed}</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Heap Total</div>
                    <div className="text-xl font-bold text-slate-300">{metrics.memory.memory.heapTotal}</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Active Requests</div>
                    <div className="text-xl font-bold text-yellow-400">{metrics.memory.activeRequests}</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Active Handles</div>
                    <div className="text-xl font-bold text-purple-400">{metrics.memory.activeHandles}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Terminal Log Output simulation */}
            <div className="bg-black/50 border border-slate-800 rounded p-4">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-widest">System Output</div>
              <div className="text-sm text-green-500/80 break-all space-y-1">
                <div>{'>'} Koneksi Redis Metrics stabil...</div>
                <div>{'>'} Menunggu instruksi selanjutnya...</div>
                {metrics.activeDevices > 0 && (
                  <div className="text-emerald-400">
                    {'>'} Memproses {metrics.mps} pesan per detik menggunakan {metrics.activeDevices} perangkat aktif.
                  </div>
                )}
                {metrics.lastFillMs > 1000 && (
                  <div className="text-yellow-400">
                    {'>'} [PERINGATAN] Database melambat! Waktu query: {metrics.lastFillMs}ms.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
