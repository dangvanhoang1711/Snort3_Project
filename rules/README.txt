# ========================================================
# Cách cấu hình Snort3 sử dụng rules này
# ========================================================

# 1. Thêm rules vào snort3 config

# Trong file snort.conf hoặc snort.lua, thêm:

# Cách 1: Include rules file
# var RULE_PATH /etc/snort/rules
# include $RULE_PATH/snort3-custom.rules

# Cách 2: Inline trong config
# Trong section "outputs" hoặc "rules", thêm các rules trực tiếp

# 2. Chạy Snort3 với rules

# Test config
# snort -c /etc/snort/snort.lua -T

# Chạy inline mode (chặn packet)
# snort -c /etc/snort/snort.lua -i <interface> --daq inline -s

# Chạy với log
# snort -c /etc/snort/snort.lua -i eth0 -A fast -l /var/log/snort

# 3. Log output format cho CSV

# Trong snort.lua, cấu hình output:
# output alert_csv: /var/log/snort/alert_csv.txt timestamp,pkt_num,proto,pkt_gen,pkt_len,dir,src_ap,dst_ap,rule,sid,classification

# ========================================================
# Chi tiết các rules
# ========================================================

# --- HIGH SEVERITY (Sid: 1000001-1000007) ---
# 1000001 - SYN Scan: flags:S + detection_filter (count 20, 3s)
# 1000002 - NULL Scan: flags:0 (no flags)
# 1000003 - XMAS Scan: flags:FPU (FIN+PSH+URG)
# 1000004 - FIN Scan: flags:F
# 1000005 - Stealth Scan: flags:SF (SYN+FIN)
# 1000006 - SYN Flood: detection_filter count 50, 1s
# 1000007 - Port Scan: detection_filter count 100, 10s

# --- MEDIUM SEVERITY (Sid: 1000101-1000106) ---
# 1000101 - ICMP Sweep: detection_filter count 30, 5s
# 1000102 - ICMP Flood: detection_filter count 50, 1s
# 1000103 - UDP Flood: detection_filter count 100, 2s
# 1000104 - DNS Query Anomaly: suspicious DNS patterns
# 1000105 - ARP Spoofing: unusual ARP behavior
# 1000106 - Ping of Death: large ICMP packets

# --- LOW SEVERITY (Sid: 1000100) ---
# 1000100 - ICMP Ping Allowed: normal ICMP echo

# ========================================================
# Snort3 Syntax Notes
# ========================================================

# - "drop" trong Snort2 -> "block" trong Snort3
# - "flow:stateless" -> removed (dùng mặc định)
# - detection_filter: track by_src,count N,seconds M
# - block = log + drop
# - alert = log only

# ========================================================