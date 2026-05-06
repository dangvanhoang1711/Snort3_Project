const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/data/alerts.db');

db.serialize(() => {
  // Delete all old incorrect entries
  db.run("DELETE FROM alerts WHERE attack_type = 'SYN Scan'", (err) => console.log("Deleted SYN Scan"));
  db.run("DELETE FROM alerts WHERE attack_type = 'SQL Injection'", (err) => console.log("Deleted SQL Injection"));
  db.run("DELETE FROM alerts WHERE attack_type = 'Reverse Shell'", (err) => console.log("Deleted Reverse Shell"));
  
  // Run VACUUM to clean up
  db.run("VACUUM", (err) => console.log("Vacuum done"));
  
  // Show final
  db.all("SELECT rule_sid, attack_type, severity, COUNT(*) as cnt FROM alerts WHERE rule_sid >= 1000001 AND rule_sid <= 1000007 GROUP BY rule_sid", [], (err, rows) => {
    console.log("\n✅ Final mappings:");
    rows.forEach(r => console.log(`  SID ${r.rule_sid}: ${r.attack_type} (${r.severity}) - ${r.cnt} records`));
    db.close(() => process.exit(0));
  });
});