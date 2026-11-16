/**
 * SIAKAD UMRAH - Automated Secret & Credential Leak Scanner
 * 
 * Referensi Laporan PKSJ:
 * - Bab IV Subbab 4.2 Tabel 4.2: Rahasia Konfigurasi
 *   "Simpan kredensial di konfigurasi terlindungi/secret store; jangan commit ke repositori"
 * - Deliverable 3: "Memindai kebocoran password & kredensial sebelum deploy"
 * 
 * Tim PKSJ UMRAH
 */

const fs = require('fs');
const path = require('path');

// Pola RegEx untuk mendeteksi rahasia ter-hardcode
const SECRET_PATTERNS = [
  {
    name: 'Private Key Block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
    severity: 'CRITICAL'
  },
  {
    name: 'Hardcoded AWS Access Key',
    regex: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/,
    severity: 'HIGH'
  },
  {
    name: 'Hardcoded Password / Secret Assignment',
    regex: /(?:password|passwd|db_password|session_secret|api_key|client_secret)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    severity: 'HIGH'
  },
  {
    name: 'Generic API Token / Bearer Token',
    regex: /(?:bearer\s+[a-zA-Z0-9_\-\.]{20,}|ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_\-]{20})/i,
    severity: 'CRITICAL'
  },
  {
    name: 'Exposed Database Connection URI with Password',
    regex: /mysql:\/\/[^:]+:[^@]+@[^/]+/i,
    severity: 'CRITICAL'
  }
];

// File dan direktori yang diabaikan (safe list)
const DEFAULT_IGNORED = [
  'node_modules',
  '.git',
  '.env',
  '.env.local',
  '.env.example',
  'package-lock.json',
  'logs',
  'backups',
  'nginx/ssl',
  'secret-scan.js',
  'security-check.js',
  'pipeline-fail.log',
  'pipeline-pass.log',
  'test-report.md'
];

const includeInsecureTests = process.argv.includes('--include-tests');
const IGNORED_PATHS = includeInsecureTests 
  ? DEFAULT_IGNORED 
  : [...DEFAULT_IGNORED, 'security-tests/insecure'];

let totalFilesScanned = 0;
const findings = [];

function scanDirectory(dirPath, targetFilter = null) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    // Cek pengecualian
    if (IGNORED_PATHS.some(p => relPath.startsWith(p) || relPath.includes('/' + p))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath, targetFilter);
    } else if (entry.isFile()) {
      // Hanya scan file teks/kode
      const ext = path.extname(entry.name);
      const textExts = ['.js', '.json', '.yaml', '.yml', '.md', '.sql', '.html', '.ejs', '.sh', '.conf', 'Dockerfile'];
      if (!textExts.includes(ext) && !entry.name.startsWith('Dockerfile')) {
        continue;
      }

      // Jika ada target filter (misal hanya scan folder tertentu)
      if (targetFilter && !relPath.startsWith(targetFilter)) {
        continue;
      }

      totalFilesScanned++;
      scanFile(fullPath, relPath);
    }
  }
}

function scanFile(filePath, relPath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Abaikan baris komentar atau dokumentasi markdown
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('<!--')) {
        // Abaikan jika hanya contoh di komentar
        if (trimmed.includes('contoh') || trimmed.includes('Contoh') || trimmed.includes('example')) {
          return;
        }
      }

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          // Abaikan jika nilai adalah placeholder template
          if (line.includes('CHANGE_ME') || line.includes('REDACTED') || line.includes('EXAMPLE') || line.includes('DUMMY') || line.includes('your-secret-here')) {
            continue;
          }

          // Jangan laporkan jika baris mengambil dari process.env
          if (line.includes('process.env.') && !line.includes('|| \'') && !line.includes('|| "')) {
            continue;
          }

          findings.push({
            rule: pattern.name,
            severity: pattern.severity,
            file: relPath,
            line: index + 1,
            snippet: line.trim().substring(0, 80)
          });
        }
      }
    });
  } catch (err) {
    // Lewati jika binary atau unreadable
  }
}

// Main execution
const nonFlagArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const scanTarget = nonFlagArgs[0] || '.';
console.log('==============================================================');
console.log('   SIAKAD UMRAH - PEMINDAI KEBOCORAN RAHASIA (SECRET SCAN)   ');
console.log('   Referensi: Bab IV Tabel 4.2 Laporan PKSJ                   ');
console.log('==============================================================');
console.log(`🔍 Memindai direktori: ${path.resolve(scanTarget)}...\n`);

scanDirectory(scanTarget);

console.log(`📊 Hasil Pemindaian: ${totalFilesScanned} file diperiksa.`);

if (findings.length > 0) {
  console.log(`\n❌ DITEMUKAN ${findings.length} POTENSI KEBOCORAN KREDENSIAL:`);
  findings.forEach((f, idx) => {
    console.log(`\n[Temuan #${idx + 1}] [Tingkat: ${f.severity}] ${f.rule}`);
    console.log(`   Lokasi : ${f.file}:${f.line}`);
    console.log(`   Baris  : ${f.snippet}`);
  });
  console.log('\n🚫 PIPELINE DITOLAK: Kredensial rahasia dilarang disimpan langsung pada kode sumber!');
  process.exit(1);
} else {
  console.log('✅ BERSIH: Tidak ditemukan kebocoran kredensial atau password ter-hardcode.');
  console.log('   Sesuai dengan ketentuan Tabel 4.2 Laporan PKSJ.\n');
  process.exit(0);
}
