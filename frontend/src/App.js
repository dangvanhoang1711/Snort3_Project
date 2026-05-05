import React from 'react';
import './App.css';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { ShieldAlert, Activity, Database, Crosshair, Eye } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Dữ liệu mẫu cho biểu đồ đường (Trend)
const trendData = [
  { time: '00:00', alerts: 20 }, { time: '04:00', alerts: 40 },
  { time: '08:00', alerts: 85 }, { time: '12:00', alerts: 35 },
  { time: '16:00', alerts: 90 }, { time: '20:00', alerts: 45 },
  { time: '23:59', alerts: 30 },
];

// Dữ liệu mẫu cho biểu đồ tròn (Attack Types)
const pieData = [
  { name: 'SYN Scan', value: 400 },
  { name: 'SQLi', value: 300 },
  { name: 'XSS', value: 200 },
  { name: 'Brute Force', value: 100 },
];
const COLORS = ['#ff4d4f', '#ffa940', '#ffec3d', '#73d13d'];

function App() {
  return (
    <div className="dashboard-container p-4">
      <Container fluid>
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="text-primary font-weight-bold">SNORT <span className="text-white">DASHBOARD</span></h2>
          <Badge bg="success" className="p-2"><div className="d-flex align-items-center"><div className="spinner-grow spinner-grow-sm me-2" role="status"></div>LIVE UPDATING</div></Badge>
        </div>

        {/* Thẻ chỉ số nhanh */}
        <Row className="g-3 mb-4">
          <StatCard title="Tổng Cảnh Báo" value="1,248" trend="+23%" icon={<ShieldAlert color="#ff4d4f" size={30}/>} />
          <StatCard title="Tấn Công Hôm Nay" value="342" trend="+18%" icon={<Crosshair color="#ffa940" size={30}/>} />
          <StatCard title="IP Tấn Công" value="24" trend="+9%" icon={<Activity color="#73d13d" size={30}/>} />
          <StatCard title="Hệ Thống Rules" value="156" trend="Ổn định" icon={<Database color="#40a9ff" size={30}/>} />
        </Row>

        {/* Biểu đồ Section */}
        <Row className="mb-4 g-3">
          <Col lg={8}>
            <Card className="custom-card p-3 h-100">
              <h5 className="mb-4">Xu hướng tấn công (24h)</h5>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="time" stroke="#8b949e" />
                    <YAxis stroke="#8b949e" />
                    <Tooltip contentStyle={{backgroundColor: '#161b22', border: '1px solid #30363d'}} />
                    <Area type="monotone" dataKey="alerts" stroke="#ff4d4f" fillOpacity={1} fill="url(#colorAlerts)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          <Col lg={4}>
            <Card className="custom-card p-3 h-100 text-center">
              <h5>Phân loại tấn công</h5>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="d-flex justify-content-around mt-2">
                {pieData.map((item, i) => <small key={i} style={{color: COLORS[i]}}>{item.name}</small>)}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Bảng dữ liệu */}
        <Card className="custom-card border-0">
          <Card.Header className="bg-transparent border-secondary py-3">
            <h5 className="mb-0">Cảnh báo thời gian thực</h5>
          </Card.Header>
          <Card.Body>
            <Table responsive borderless className="align-middle">
              <thead>
                <tr className="text-secondary border-bottom border-secondary">
                  <th>Thời gian</th>
                  <th>IP Nguồn</th>
                  <th>IP Đích</th>
                  <th>Loại tấn công</th>
                  <th>Mức độ</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                <AlertRow time="2026-05-05 13:40:01" src="192.168.1.105" dst="192.168.1.2" type="SYN Scan Detected" level="High" />
                <AlertRow time="2026-05-05 13:38:22" src="10.0.0.15" dst="192.168.1.10" type="SQL Injection" level="High" />
                <AlertRow time="2026-05-05 13:35:10" src="172.16.0.5" dst="192.168.1.2" type="ICMP Flood" level="Medium" />
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

// Component nhỏ cho dòng bảng
const AlertRow = ({ time, src, dst, type, level }) => (
  <tr className="border-bottom border-secondary-subtle">
    <td>{time}</td>
    <td className="text-info">{src}</td>
    <td>{dst}</td>
    <td>{type}</td>
    <td><Badge bg={level === 'High' ? 'danger' : 'warning'}>{level}</Badge></td>
    <td><Eye size={18} className="text-primary cursor-pointer" /></td>
  </tr>
);

// Component cho Card chỉ số
const StatCard = ({ title, value, trend, icon }) => (
  <Col md={3}>
    <Card className="custom-card p-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <p className="text-secondary mb-1 small uppercase">{title}</p>
          <h3 className="mb-0 font-weight-bold">{value}</h3>
          <small className="text-success">{trend} <span className="text-secondary">so với hôm qua</span></small>
        </div>
        <div className="p-2 bg-dark rounded-3">{icon}</div>
      </div>
    </Card>
  </Col>
);

export default App;