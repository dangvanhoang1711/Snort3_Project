const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/data/alerts.db');

const updates = [
  [1000001, 'SYN Scan Detected', 'high'],
  [1000002, 'NULL Scan Detected', 'high'],
  [1000003, 'XMAS Scan Detected', 'high'],
  [1000004, 'FIN Scan Detected', 'high'],
  [1000005, 'Stealth Scan Detected', 'high'],
  [1000006, 'SYN Flood Detected', 'high'],
  [1000007, 'Port Scan Detected', 'high']
];

db.serialize(() => {
  let count = 0;
  for (const [sid, type, sev] of updates) {
    db.run('UPDATE alerts SET attack_type = ?, severity = ? WHERE rule_sid = ?', [type, sev, sid], (err) => {
      if (!err) {
        console.log(`Updated SID ${sid}: ${type}`);
        count++;
      }
    });
  }
  db.all('SELECT rule_sid, attack_type, severity FROM alerts WHERE rule_sid >= 1000001 AND rule_sid <= 1000007 GROUP BY rule_sid', [], (err, rows) => {
    console.log('\nCurrent mappings:');
    rows.forEach(r => console.log(`  SID ${r.rule_sid}: ${r.attack_type} (${r.severity})`));
    db.close(() => process.exit(0));
  });
});