const fs = require('fs');
let file = 'frontend/app/x-panel-core/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const secretPanel = `
                {/* SECRET FEATURE PANEL */}
                {isSecretFeatureActive && (
                  <div className="mt-8 bg-slate-800 border border-amber-500/50 rounded-2xl p-6 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-in zoom-in-95">
                    <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Panel Rahasia: Pilih Ketua Referral
                    </h3>
                    <p className="text-sm text-slate-400 mb-6">Berikut adalah akun yang belum terhubung dengan referral manapun (secara live).</p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-900/50 text-slate-400">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-xl">Username</th>
                            <th className="px-4 py-3">Saldo</th>
                            <th className="px-4 py-3">Blast Pesan</th>
                            <th className="px-4 py-3 rounded-tr-xl">Pilih Ketua</th>
                          </tr>
                        </thead>
                        <tbody>
                          {noRefUsers.length > 0 ? (
                            noRefUsers.map((user: any) => (
                              <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                <td className="px-4 py-3 font-medium text-white">{user.username}</td>
                                <td className="px-4 py-3 text-emerald-400">Rp {user.balance.toLocaleString('id-ID')}</td>
                                <td className="px-4 py-3 text-indigo-400 font-bold">{user.messagesSent}</td>
                                <td className="px-4 py-3 flex gap-2">
                                  <select 
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm w-40"
                                    value={selectedReferrers[user.id] || ""}
                                    onChange={(e) => setSelectedReferrers({...selectedReferrers, [user.id]: parseInt(e.target.value)})}
                                  >
                                    <option value="">-- Pilih Ketua --</option>
                                    {referrers.map((ref: any) => (
                                      <option key={ref.id} value={ref.id}>{ref.username} ({ref.referralCode})</option>
                                    ))}
                                  </select>
                                  <button 
                                    type="button"
                                    onClick={() => handleSetReferrer(user.id)}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors"
                                  >
                                    Set
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                Semua akun sudah memiliki ketua referral.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
`;
content = content.replace('{/* TAB TELEGRAM */}', secretPanel + '\n            {/* TAB TELEGRAM */}');

const secretModal = `
      {/* SECRET MODAL */}
      {showSecretModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-amber-500/50 w-full max-w-sm p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)] relative">
            <h3 className="text-xl font-bold text-amber-400 text-center mb-4">Akses Rahasia</h3>
            <input 
              type="password"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="Masukkan kode..."
              className="w-full bg-slate-900 border border-slate-600 text-white px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 mb-6 text-center tracking-widest font-mono"
            />
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setShowSecretModal(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
              >Batal</button>
              <button 
                type="button"
                onClick={handleVerifySecret}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
              >Verifikasi</button>
            </div>
          </div>
        </div>
      )}

`;

content = content.replace('{/* CUSTOM CONFIRMATION MODAL */}', secretModal + '{/* CUSTOM CONFIRMATION MODAL */}');

fs.writeFileSync(file, content);
console.log('Done');
