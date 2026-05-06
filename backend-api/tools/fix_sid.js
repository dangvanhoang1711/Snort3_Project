const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/data/alerts.db');

console.log('Updating ALL attack types based on SID...');

db.serialize(() => {
  // Update all entries based on rule_sid
  db.run("UPDATE alerts SET attack_type = 'SYN Scan Detected', severity = 'high' WHERE rule_sid = 1000001");
  db.run("UPDATE alerts SET attack_type = 'NULL Scan Detected', severity = 'high' WHERE rule_sid = 1000002");
  db.run("UPDATE alerts SET attack_type = 'XMAS Scan Detected', severity = 'high' WHERE rule_sid = 1000003");
  db.run("UPDATE alerts SET attack_type = 'FIN Scan Detected', severity = 'high' WHERE rule_sid = 1000004");
  db.run("UPDATE alerts SET attack_type = 'Stealth Scan Detected', severity = 'high' WHERE rule_sid = 1000005");
  db.run("UPDATE alerts SET attack_type = 'SYN Flood Detected', severity = 'high' WHERE rule_sid = 1000006");
  db.run("UPDATE alerts SET attack_type = 'Port Scan Detected', severity = 'high' WHERE rule_sid = 1000007");

  // Verify
  db.all('SELECT rule_sid, attack_type, severity, COUNT(*) as cnt FROM alerts WHERE rule_sid >= 1000001 AND rule_sid <= 1000007 GROUP BY rule_sid', [], (err, rows) => {
    console.log('\n✅ Updated mappings:');
    rows.forEach(r => console.log(`  SID ${r.rule_sid}: ${r.attack_type} (${r.severity}) - ${r.cnt} records`));
    db.close(() => process.exit(0));
  });
});