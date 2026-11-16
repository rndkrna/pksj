/**
 * PENGUJIAN KEAMANAN - KASUS 1: KEBOCORAN KREDENSIAL TER-HARDCODE
 * Status: SENGAJA DIBUAT TIDAK AMAN UNTUK PENGUJIAN PIPELINE
 * 
 * Pelanggaran:
 * - Tabel 4.2 Laporan PKSJ: "Jangan commit rahasia ke repositori"
 * - FW-04 & TB-3: Kredensial tidak boleh ditanam langsung di kode
 */

// ❌ PELANGGARAN KEAMANAN: Password database dan API token ter-hardcode langsung di kode
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: 'SuperSecretDatabasePassword123!', // KEBOCORAN KREDENSIAL!
  database: 'siakad_dbs'
};

const cloudApiSecret = {
  api_key: 'AIzaSyD-TESTING-UNAUTHORIZED-HARDCODED-TOKEN-1234567890', // KEBOCORAN TOKEN!
  session_secret: 'hardcoded-insecure-secret-key-123456'
};

module.exports = { dbConfig, cloudApiSecret };
