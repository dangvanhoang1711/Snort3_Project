# Snort3_Project
## Snort3 IDS Dashboard

## 1. Project Overview

**Mini-SOC** (Security Operations Center) là hệ thống giám sát an ninh mạng thu nhỏ, tích hợp Snort3 IDS với giao diện dashboard trực quan, xử lý logs gần thời gian thực và hiển thị cảnh báo tấn công theo mô hình SOC thực tế.

---

## 2. Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18, Chart.js, Bootstrap 5, Socket.IO Client |
| **Backend** | Node.js 18, Express.js, SQLite (better-sqlite3) |
| **Real-time** | Socket.IO, Server-Sent Events (SSE) |
| **IDS Engine** | Snort3 |
| **Container** | Docker, Docker Compose, Nginx |
| **Platform** | Windows (host) + Ubuntu (Snort3 VM) |

---

## 3. Architecture

### 3.1 System Architecture

```
+--------------------------------------------------------------------------+
|                         UBUNTU SNORT3 VM                                  |
|                                                                            |
|   Snort3 IDS +--------> alert_csv.txt +--------> Shared Folder          |
|   (VM)                                         (C:\SnortLogsData)      |
+--------------------------------------------------------------------------+
                                    |
                                    | Volume Mount
                                    V
+--------------------------------------------------------------------------+
|                        DOCKER CONTAINER (Windows)                         |
|                                                                            |
|   +---------------------+    +----------------------+                    |
|   | stream-forwarder.js|--->|   Backend API        |                    |
|   | (Polling 2s)       |    |   (Express)          |                    |
|   +---------------------+    +-----------+----------+                    |
|                                        |                                 |
|                                        V                                 |
|                             +---------------------+                      |
|                             |   SQLite Database   |                      |
|                             | (alerts_aggregated) |                      |
|                             +---------------------+                      |
|                                        |                                 |
|                                        V                                 |
|                             +---------------------+                      |
|                             |    Socket.IO        |                      |
|                             |   (Real-time)       |                      |
|                             +-----------+----------+                     |
+--------------------------------------------------------------------------+
                                        |
                                        V
+--------------------------------------------------------------------------+
|                        FRONTEND (React + Nginx)                           |
|                                                                            |
|   Dashboard <---- Socket.IO <---- Real-time alerts                      |
|   - Stats Cards (Total Alerts, Threats, Attackers)                      |
|   - Charts (Line, Pie, Doughnut, Bar)                                   |
|   - Alerts Table (pagination, filter, search)                           |
|   - Alert Detail Modal                                                  |
+--------------------------------------------------------------------------+
```

### 3.2 Data Flow

1. **Snort3 IDS** phát hiện tấn công + ghi vào `alert_csv.log`
2. **Stream-forwarder** đọc log liên tục (polling mỗi 2 giây)
3. **Aggregator** xử lý micro-batching (100ms) + deduplication
4. **Backend API** nhận logs + lưu SQLite (bảng `alerts_aggregated`)
5. **Socket.IO** push real-time đến Frontend
6. **Dashboard** hiển thị stats, charts, alerts table

---

## 4. Database Schema

```sql
CREATE TABLE alerts_aggregated (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  src_ip TEXT,
  dst_ip TEXT,
  dst_port INTEGER,
  attack_type TEXT,
  rule_sid INTEGER,
  severity TEXT,
  action TEXT,
  proto TEXT,
  count INTEGER DEFAULT 1,
  first_seen INTEGER,
  last_seen INTEGER
);
```

**Aggregation Logic:**
- Group by: `src_ip + dst_ip + attack_type`
- Mỗi group lưu tổng `count` packets
- Realtime update mỗi 100ms (micro-batching)

---

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | Danh sách alerts (phân trang) |
| POST | `/api/logs` | Nhận logs mới (authenticated) |
| GET | `/api/stats` | Stats theo type, IP |
| GET | `/api/stats/overview` | Tổng quan dashboard (SOC metrics) |
| GET | `/api/stats/hourly` | Dữ liệu theo giờ (24h) - cho Line Chart |
| GET | `/api/logs/attack-types` | Danh sách attack types |
| POST | `/api/ingest` | Nhận logs (authenticated) |
| GET | `/api/stream` | SSE real-time stream |

---

## 6. Features

### 6.1 Core Features

- **Real-time monitoring** - Cập nhật mỗi 10s, push qua Socket.IO
- **Aggregation** - Gộp duplicate packets (fingerprint = src_ip + dst_ip + attack_type)
- **SOC Metrics**:
  - Tổng cảnh báo (all events)
  - Phát hiện đe dọa (HIGH severity + DROP action)
  - Đã chặn / Cho phép
  - So sánh với ngày hôm qua (% change)

### 6.2 Dashboard Charts

- **Line Chart**: Xu hướng tấn công 24h (mỗi giờ)
- **Doughnut Chart**: Phân bổ mức độ nguy hiểm (HIGH/MEDIUM/LOW)
- **Pie Chart**: Loại hình tấn công (attack types)
- **Bar Chart**: Top 10 IP tấn công nhiều nhất

### 6.3 Alerts Table

- Phân trang (20 items/trang)
- Filter theo: Severity, Action, IP Nguồn, IP Đích, Attack Type
- Search text
- Modal chi tiết alert

---

## 7. Snort3 Rules

### 7.1 SID Mapping (khớp với backend)

| SID | Attack Type | Severity | Action |
|-----|-------------|----------|--------|
| 1000001 | SYN Scan Detected | HIGH | drop |
| 1000002 | NULL Scan Detected | HIGH | drop |
| 1000003 | XMAS Scan Detected | HIGH | drop |
| 1000004 | FIN Scan Detected | HIGH | drop |
| 1000005 | Stealth Scan Detected | HIGH | drop |
| 1000006 | SYN Flood Detected | HIGH | drop |
| 1000007 | Port Scan Detected | HIGH | drop |
| 1000101 | ICMP Sweep Detected | MEDIUM | drop |
| 1000102 | ICMP Flood Detected | MEDIUM | drop |
| 1000103 | UDP Flood Detected | MEDIUM | drop |
| 1000104 | DNS Query Anomaly | MEDIUM | alert |
| 1000105 | ARP Spoofing Detected | MEDIUM | alert |
| 1000106 | Ping of Death Detected | MEDIUM | drop |
| 1000100 | ICMP Ping Allowed | LOW | pass |

### 7.2 Rule Statistics

- **HIGH**: 7 rules (TCP scans: SYN, NULL, XMAS, FIN, Stealth, SYN Flood, Port Scan)
- **MEDIUM**: 6 rules (ICMP: Sweep, Flood, Ping of Death; UDP Flood; DNS; ARP)
- **LOW**: 1 rule (ICMP Ping Allowed)

---

## 8. Docker Services

```yaml
version: '3.8'
services:
  backend:
    container_name: minisoc_backend
    ports:
      - "4000:4000"
    volumes:
      - ../backend-data:/data
      - C:/SnortLogsData:/app/snort-logs
    command: >
      sh -c "node tools/snort-csv-forwarder.js & node index.js"
    networks:
      - soc-network

  frontend:
    container_name: minisoc_frontend
    ports:
      - "3000:80"
    networks:
      - soc-network

networks:
  soc-network:
    driver: bridge
```

---

## 9. Running the Project

### 9.1 Prerequisites

- Docker Desktop (Windows)
- Ubuntu VM với Snort3 đã cài đặt
- Shared folder giữa Windows và Ubuntu

### 9.2 Steps

```bash
# 1. Clone project
git clone <repo-url>

# 2. Build & Run
cd docker
docker-compose up --build

# 3. Copy rules lên Ubuntu
scp rules/snort3-custom.rules user@ubuntu:/etc/snort/rules/

# 4. Test Snort3
sudo snort -c ~/snort3/lua/snort.lua -T

# 5. Access Dashboard
Frontend: http://localhost:3000
Backend:  http://localhost:4000
```

---

## 10. Project Structure

```
Snort3_Project/
+-- backend-api/
|   +-- index.js                    # Express server
|   +-- src/
|   |   +-- db/index.js             # SQLite connection
|   |   +-- routes/index.js        # API endpoints
|   |   +-- services/
|   |   |   +-- aggregator.js      # Micro-batching
|   |   |   +-- sid-map.js         # SID mapping
|   |   |   +-- parser.js           # Log parser
|   |   +-- middleware/auth.js     # API Key auth
|   +-- tools/
|       +-- stream-forwarder.js    # Log forwarder
|       +-- generate-test-data.js
+-- frontend/
|   +-- src/
|   |   +-- App.js                 # Main dashboard
|   |   +-- App.css                # Dark theme styles
|   |   +-- api/client.js         # API client
|   +-- package.json
+-- docker/
|   +-- docker-compose.yml
|   +-- backend.Dockerfile
|   +-- frontend.Dockerfile
+-- rules/
|   +-- snort3-custom.rules        # Snort3 rules (14 rules)
+-- Report.md
+-- README.md
```

---

## 11. Demo Data & Testing

- **Test data generator**: `backend-api/tools/generate-test-data.js`
- **Current Stats**: ~6000+ events, multiple attack types
- **Attack Types Detected**: FIN Scan, NULL Scan, XMAS Scan, SYN Scan, Stealth Scan, SYN Flood, Port Scan, ICMP Sweep, ICMP Flood

---

## 12. Limitations & Future Work

### Current Limitations

- Chạy trên môi trường phát triển (dev mode)
- Chưa có authentication cho dashboard
- Chưa tích hợp với hệ thống email/SMS alert

### Future Improvements

- [ ] Thêm user authentication (JWT)
- [ ] Tích hợp email/SMS notifications
- [ ] Thêm threat intelligence (IP reputation)
- [ ] Tích hợp ELK Stack cho log analysis
- [ ] Auto-blocking IP với fail2ban
- [ ] Mobile app cho SOC team

---

## 13. Conclusion

**Mini-SOC** đã xây dựng thành công một hệ thống giám sát an ninh mạng cơ bản với:

- Giao diện dashboard trực quan (Dark theme, animations)
- Xử lý logs gần thời gian thực (100ms micro-batching)
- Tích hợp Snort3 với 14 rules tùy chỉnh
- SOC-style metrics (tổng cảnh báo, phát hiện đe dọa, đã chặn/cho phép)
- Docker container hóa dễ deploy

Hệ thống có thể được mở rộng để trở thành giải pháp SOC thực tế cho doanh nghiệp vừa và nhỏ.

---

**Created**: May 2026  
**Project**: Snort3 IDS Dashboard - Mini-SOC
