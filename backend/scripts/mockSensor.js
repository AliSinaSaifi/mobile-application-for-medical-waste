const axios = require('axios');

const base = (process.env.BACKEND_BASE_URL || '').trim().replace(/\/+$/, '');
if (!base) {
  console.error('Set BACKEND_BASE_URL to your API root (same host as /api), e.g. https://your-service.up.railway.app');
  process.exit(1);
}

const API = `${base}/api/telemetry`;

// ── Bin configurations ────────────────────────────────────────
const bins = [
  { id: 'MED-001', fullness: 15, fillRate: 2.5,  label: 'Surgery Ward'       },
  { id: 'MED-002', fullness: 60, fillRate: 1.0,  label: 'Therapy Dept'       },
  { id: 'MED-003', fullness: 40, fillRate: 3.5,  label: 'ICU'                },
  { id: 'MED-004', fullness: 78, fillRate: 0.8,  label: 'Pediatrics'         },
  { id: 'MED-005', fullness: 25, fillRate: 1.8,  label: 'Emergency Room'     },
];

console.log('🚀 Mock sensor started — simulating 5 medical waste containers');
console.log(`   POST → ${API}`);
console.log('─'.repeat(55));
bins.forEach(b => console.log(`  ${b.id}  ${b.label.padEnd(18)} starting at ${b.fullness}%`));
console.log('─'.repeat(55));

async function sendReading(bin) {
  try {
    await axios.post(API, {
      binId:     bin.id,
      fullness:  Number(bin.fullness.toFixed(1)),
      timestamp: new Date().toISOString(),
    });
    console.log(`📡 ${bin.id} → ${bin.fullness.toFixed(1)}%  (${bin.label})`);
  } catch (err) {
    console.error(`❌ ${bin.id} failed: ${err.code || err.message}`);
  }
}

setInterval(async () => {
  for (const bin of bins) {
    const noise = (Math.random() - 0.3) * 1.5;
    bin.fullness += bin.fillRate + noise;

    if (bin.fullness >= 100) {
      console.log(`\n✅ ${bin.id} COLLECTED — reset to 5%\n`);
      bin.fullness = 5 + Math.random() * 10;
    }

    bin.fullness = Math.max(0, Math.min(100, bin.fullness));

    await sendReading(bin);
  }
}, 50000);
