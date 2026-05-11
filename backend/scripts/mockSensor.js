const axios = require('axios');

const API = 'http://localhost:5000/api/telemetry';

// ── Bin configurations ────────────────────────────────────────
// Each bin has different fill rate to simulate real usage patterns
const bins = [
  { id: 'MED-001', fullness: 15, fillRate: 2.5,  label: 'Surgery Ward'       },
  { id: 'MED-002', fullness: 60, fillRate: 1.0,  label: 'Therapy Dept'       },
  { id: 'MED-003', fullness: 40, fillRate: 3.5,  label: 'ICU'                },
  { id: 'MED-004', fullness: 78, fillRate: 0.8,  label: 'Pediatrics'         },
  { id: 'MED-005', fullness: 25, fillRate: 1.8,  label: 'Emergency Room'     },
];

console.log('🚀 Mock sensor started — simulating 5 medical waste containers');
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

// ── Simulation tick ───────────────────────────────────────────
setInterval(async () => {
  for (const bin of bins) {
    // Add fill rate + small random noise
    const noise = (Math.random() - 0.3) * 1.5; // slight variance
    bin.fullness += bin.fillRate + noise;

    // Reset when emptied (simulates collection)
    if (bin.fullness >= 100) {
      console.log(`\n✅ ${bin.id} COLLECTED — reset to 5%\n`);
      bin.fullness = 5 + Math.random() * 10;
    }

    // Clamp to 0-100
    bin.fullness = Math.max(0, Math.min(100, bin.fullness));

    await sendReading(bin);
  }
}, 50000); // every 5 seconds