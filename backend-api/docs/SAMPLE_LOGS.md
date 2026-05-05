# Sample Snort alert_csv lines

Example CSV line format:

timestamp, pkt_num, proto, pkt_gen, pkt_len, dir, src_ap, dst_ap, rule, action

Example:

2026-05-05 12:34:56.789012,1234,TCP,eth0,74,->,192.168.1.2:54321,192.168.2.2:80,[1:2000001:0] ET SCAN Nmap SYN scan,alert

Another example (no ports):

2026-05-05 12:34:57.123456,1235,ICMP,eth0,84,->,192.168.1.3,192.168.2.2,[1:2000006:0] ICMP flood detected,alert
