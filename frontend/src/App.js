import React, { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';
import { Container, Row, Col, Dropdown, Table, Form } from 'react-bootstrap';
import {
  AlertTriangle, Target, Shield, List, Database,
  Eye, Calendar, Search, Filter, Activity,
  Wifi, WifiOff, RefreshCw, TrendingUp, TrendingDown,
  X, Info, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast
} from 'lucide-react';
import { Line, Pie, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { getSocket } from './utils/socket';
import { getAlerts, getOverview, getStats, getHourlyStats, getAttackTypes } from './api/client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#facc15',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  lime: '#84cc16'
};

const colorArray = Object.values(COLORS);

const PER_PAGE = 20;

const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'drop', label: 'Drop' },
  { value: 'alert', label: 'Alert' },
  { value: 'pass', label: 'Pass' },
  { value: 'log', label: 'Log' },
  { value: 'reject', label: 'Reject' },
  { value: 'sdrop', label: 'Silent Drop' }
];

const SEVERITY_LEVELS = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

function App() {
  const [alerts, setAlerts] = useState([]);
  const [overview, setOverview] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [lineChartData, setLineChartData] = useState({ labels: [], datasets: [] });
  const [pieChartData, setPieChartData] = useState({ labels: [], datasets: [] });
  const [donutChartData, setDonutChartData] = useState({ labels: [], datasets: [] });
  const [barChartData, setBarChartData] = useState({ labels: [], datasets: [] });
  const [topIPs, setTopIPs] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const refreshInterval = 5000;
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [srcIpFilter, setSrcIpFilter] = useState('');
  const [dstIpFilter, setDstIpFilter] = useState('');
  const [attackTypeFilter, setAttackTypeFilter] = useState('');
  const [attackTypes, setAttackTypes] = useState([]);

  const [pagination, setPagination] = useState({
    total: 0,
    limit: PER_PAGE,
    offset: 0,
    totalPages: 0
  });

  const socketRef = useRef(null);
  const mountedRef = useRef(true);
  const paginationRef = useRef({ offset: 0, total: 0, limit: PER_PAGE, totalPages: 0 });
  const realtimeRefreshRef = useRef(null);

  const fetchData = useCallback(async (newOffset = null, overrides = {}) => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    try {
      const requestedOffset = Number.isFinite(newOffset) ? newOffset : paginationRef.current.offset;
      const currentOffset = Math.max(requestedOffset, 0);
      const filters = {
        search: searchTerm,
        severity: severityFilter,
        action: actionFilter,
        srcIp: srcIpFilter,
        dstIp: dstIpFilter,
        attackType: attackTypeFilter,
        ...overrides
      };

      const [alertsRes, overviewRes, statsRes, hourlyRes] = await Promise.all([
        getAlerts({
          limit: PER_PAGE,
          offset: currentOffset,
          search: filters.search,
          severity: filters.severity,
          action: filters.action,
          srcIp: filters.srcIp,
          dstIp: filters.dstIp,
          attackType: filters.attackType
        }),
        getOverview(),
        getStats(),
        getHourlyStats()
      ]);

      if (!mountedRef.current) return;

      setAlerts(alertsRes.results || []);
      paginationRef.current = {
        total: alertsRes.total || 0,
        limit: PER_PAGE,
        offset: currentOffset,
        totalPages: Math.ceil((alertsRes.total || 0) / PER_PAGE)
      };
      setPagination(paginationRef.current);
      setOverview(overviewRes);
      setLastUpdate(new Date());

      processCharts(alertsRes.results || [], statsRes, hourlyRes);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [searchTerm, severityFilter, actionFilter, srcIpFilter, dstIpFilter, attackTypeFilter]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshRef.current) return;
    realtimeRefreshRef.current = setTimeout(() => {
      realtimeRefreshRef.current = null;
      if (mountedRef.current) fetchData(null);
    }, 800);
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData(0);

    const socket = getSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    const handler = (alert) => {
      const incoming = { ...alert, __incoming: true };
      setAlerts((prev) => {
        if (incoming.id) {
          const existingIndex = prev.findIndex((item) => item.id === incoming.id);
          if (existingIndex !== -1) {
            const next = [...prev];
            next[existingIndex] = { ...next[existingIndex], ...incoming };
            return next;
          }
        }
        const next = [incoming, ...prev].slice(0, PER_PAGE);
        return next;
      });
      const delta = incoming.delta_count || incoming.count || 1;
      const isThreat = ['critical', 'high'].includes((incoming.severity || '').toLowerCase());
      setLastUpdate(new Date());
      setOverview((prev) => (prev ? {
        ...prev,
        total: (prev.total || 0) + delta,
        today: isThreat ? (prev.today || 0) + delta : (prev.today || 0),
        today_alerts: (prev.today_alerts || 0) + delta,
        today_blocked: (incoming.action || '').toLowerCase() === 'drop' ? (prev.today_blocked || 0) + delta : (prev.today_blocked || 0),
        today_allowed: (incoming.action || '').toLowerCase() === 'pass' ? (prev.today_allowed || 0) + delta : (prev.today_allowed || 0)
      } : null));
      setPagination((prev) => ({
        ...prev,
        total: incoming.is_update ? prev.total : prev.total + 1
      }));
      paginationRef.current = {
        ...paginationRef.current,
        total: incoming.is_update ? paginationRef.current.total : paginationRef.current.total + 1
      };
      scheduleRealtimeRefresh();
    };
    socket.on('alert:new', handler);

    const interval = setInterval(() => {
      if (mountedRef.current) fetchData(null);
    }, refreshInterval);

    return () => {
      mountedRef.current = false;
      if (socket) socket.off('alert:new', handler);
      socket.off('connect');
      socket.off('disconnect');
      if (realtimeRefreshRef.current) clearTimeout(realtimeRefreshRef.current);
      clearInterval(interval);
    };
  }, [fetchData, refreshInterval, scheduleRealtimeRefresh]);

  useEffect(() => {
    getAttackTypes().then(types => {
      if (mountedRef.current) setAttackTypes(types);
    }).catch(err => console.error('Failed to load attack types:', err));
  }, []);

  function processCharts(alertsList, stats, hourlyData) {
    let labels, data;

    if (hourlyData && hourlyData.length > 0) {
      labels = hourlyData.map(h => h.hour);
      data = hourlyData.map(h => h.count);
    } else {
      const hourBuckets = {};
      for (let i = 0; i < 24; i++) {
        hourBuckets[i] = 0;
      }

      alertsList.forEach(a => {
        if (!a.timestamp) return;
        let hour = 0;
        const ts = a.timestamp.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(ts)) {
          const d = new Date(ts.replace(' ', 'T'));
          if (!isNaN(d.getTime())) hour = d.getHours();
        } else if (/^\d{2}\/\d{2}-\d{2}:\d{2}:\d{2}/.test(ts)) {
          const parts = ts.match(/^(\d{2})\/(\d{2})-(\d{2}):\d{2}:\d{2}/);
          if (parts) hour = parseInt(parts[3]);
        }
        if (hourBuckets[hour] !== undefined) hourBuckets[hour]++;
      });

      labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      data = Array.from({ length: 24 }, (_, i) => hourBuckets[i]);
    }

    setLineChartData({
      labels,
      datasets: [{
        label: 'Attack Volume',
        data,
        borderColor: COLORS.red,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: COLORS.red,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6
      }]
    });

    if (stats && stats.byType && stats.byType.length > 0) {
      const pieLabels = stats.byType.slice(0, 8).map(i => i.attack_type || 'Unknown');
      const pieValues = stats.byType.slice(0, 8).map(i => i.count);
      setPieChartData({
        labels: pieLabels,
        datasets: [{
          data: pieValues,
          backgroundColor: colorArray,
          borderColor: '#1e293b',
          borderWidth: 2
        }]
      });
    }

    if (stats && stats.bySeverity && stats.bySeverity.length > 0) {
      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      stats.bySeverity.forEach(s => {
        const sev = (s.severity || '').toLowerCase();
        if (sev === 'critical') severityCounts.critical += s.count;
        else if (sev === 'high') severityCounts.high += s.count;
        else if (sev === 'medium') severityCounts.medium += s.count;
        else if (sev === 'low') severityCounts.low += s.count;
      });
      setDonutChartData({
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [severityCounts.critical, severityCounts.high, severityCounts.medium, severityCounts.low],
          backgroundColor: ['#7c1a1a', COLORS.red, COLORS.yellow, COLORS.green],
          borderColor: '#1e293b',
          borderWidth: 2
        }]
      });
    }

    if (stats && stats.bySrc && stats.bySrc.length > 0) {
      setTopIPs(stats.bySrc.slice(0, 10).map(item => ({
        ip: item.src_ip,
        count: item.count
      })));

      const topSrcLabels = stats.bySrc.slice(0, 8).map(item => item.src_ip);
      const topSrcValues = stats.bySrc.slice(0, 8).map(item => item.count);
      setBarChartData({
        labels: topSrcLabels,
        datasets: [{
          label: 'Attack Count',
          data: topSrcValues,
          backgroundColor: colorArray.slice(0, 8).map(c => c + '99'),
          borderColor: colorArray.slice(0, 8),
          borderWidth: 1,
          borderRadius: 6
        }]
      });
    }
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items) => `Hour: ${items[0].label}`,
          label: (item) => `Attacks: ${item.raw}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#334155', drawBorder: false },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      },
      y: {
        grid: { color: '#334155', drawBorder: false },
        ticks: { color: '#94a3b8', font: { size: 11 } },
        beginAtZero: true
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#94a3b8', padding: 12, font: { size: 11 }, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1
      }
    }
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#94a3b8', padding: 12, font: { size: 11 }, usePointStyle: true }
      }
    },
    cutout: '65%'
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#94a3b8'
      }
    },
    scales: {
      x: {
        grid: { color: '#334155' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      }
    }
  };

  const formatDate = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return (
      <span>
        <span className="time-part">{hours}</span>
        <span className="time-part">{minutes}</span>
        <span className="time-part">{seconds}</span>
        <span className="date-part">{day}/{month}/{year}</span>
      </span>
    );
  };

  const getSeverityBadge = (sev) => {
    const severity = (sev || '').toLowerCase();
    let bg = '#6b7280', color = '#fff', label = 'Info';
    if (severity === 'critical') {
      bg = '#7c1a1a'; label = 'Critical';
    } else if (severity === 'high' || severity === 'danger') {
      bg = COLORS.red; label = 'High';
    } else if (severity === 'medium' || severity === 'warning') {
      bg = COLORS.yellow; color = '#000'; label = 'Medium';
    } else if (severity === 'low' || severity === 'info') {
      bg = COLORS.green; label = 'Low';
    }
    return { bg, color, label };
  };

  const getActionLabel = (action) => {
    const actionObj = ACTIONS.find(a => a.value === action);
    return actionObj ? actionObj.label : action || '-';
  };

  const getActionBadge = (action) => {
    const act = (action || '').toLowerCase();
    let bg = '#6b7280', color = '#fff', label = action || '-';
    if (act === 'drop') { bg = COLORS.red; label = 'Drop'; }
    else if (act === 'alert') { bg = COLORS.orange; label = 'Alert'; }
    else if (act === 'pass') { bg = COLORS.green; label = 'Pass'; }
    else if (act === 'log') { bg = COLORS.blue; label = 'Log'; }
    else if (act === 'reject') { bg = COLORS.purple; label = 'Reject'; }
    else if (act === 'sdrop') { bg = '#374151'; label = 'Silent'; }
    return { bg, color, label };
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData(0);
  };

  const handleRefresh = () => {
    fetchData(0);
  };

  const handlePageChange = (newOffset) => {
    fetchData(newOffset);
  };

  const clearFilters = () => {
    const emptyFilters = { search: '', severity: '', action: '', srcIp: '', dstIp: '', attackType: '' };
    setSearchTerm('');
    setSeverityFilter('');
    setActionFilter('');
    setSrcIpFilter('');
    setDstIpFilter('');
    setAttackTypeFilter('');
    fetchData(0, emptyFilters);
  };

  const filterBySourceIp = (ip) => {
    setSrcIpFilter(ip);
    fetchData(0, { srcIp: ip });
  };

  const openAlertDetail = (alert) => {
    setSelectedAlert(alert);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAlert(null);
  };

  const getActionIcon = (action) => {
    if (action === 'drop' || action === 'block') return '🚫';
    if (action === 'alert') return '⚠️';
    if (action === 'log') return '📝';
    if (action === 'pass') return '✅';
    if (action === 'reject') return '⛔';
    if (action === 'sdrop') return '🔇';
    return '📋';
  };

  const currentPage = Math.floor(pagination.offset / PER_PAGE) + 1;
  const totalPages = pagination.totalPages;

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Page {currentPage} / {totalPages} | {pagination.total} alerts
        </div>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 1}
            title="First page"
          >
            <ChevronFirst size={16} />
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.offset - PER_PAGE)}
            disabled={currentPage === 1}
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {startPage > 1 && <span className="pagination-ellipsis">...</span>}

          {pages.map(page => (
            <button
              key={page}
              className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
              onClick={() => handlePageChange((page - 1) * PER_PAGE)}
            >
              {page}
            </button>
          ))}

          {endPage < totalPages && <span className="pagination-ellipsis">...</span>}

          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.offset + PER_PAGE)}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange((totalPages - 1) * PER_PAGE)}
            disabled={currentPage === totalPages}
            title="Last page"
          >
            <ChevronLast size={16} />
          </button>
        </div>
      </div>
    );
  };

  const hasActiveFilters = searchTerm || severityFilter || actionFilter || srcIpFilter || dstIpFilter || attackTypeFilter;

  return (
    <div className="dashboard-container">
      <Container fluid className="p-3 p-lg-4">
        <div className="header-section mb-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
            <div>
              <div className="d-flex align-items-center gap-3 mb-2">
                <h1 className="main-title">SNORT</h1>
                <span className="version-badge">v3.0</span>
              </div>
              <p className="subtitle">Network intrusion detection and monitoring platform</p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-3">
              <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div className="live-badge">
                <span className="live-dot"></span>
                <span>Live</span>
              </div>
              <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
              </button>
              <div className="current-date">
                <Calendar size={16} />
                <span>{formatDate(lastUpdate)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-row mb-4">
          <div className="stat-card stat-card-red">
            <div className="stat-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Alerts</span>
              <span className="stat-value">{overview?.total?.toLocaleString() || pagination.total.toLocaleString()}</span>
              <span className="stat-trend">
                {overview?.percent_change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {overview?.percent_change || 0}% vs yesterday
              </span>
            </div>
          </div>

          <div className="stat-card stat-card-orange">
            <div className="stat-icon">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Attacker IPs</span>
              <span className="stat-value">{overview?.attacker_ips?.toLocaleString() || 0}</span>
              <span className="stat-trend neutral">unique source addresses</span>
            </div>
          </div>

          <div className="stat-card stat-card-yellow">
            <div className="stat-icon">
              <Shield size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Threats Detected</span>
              <span className="stat-value">{overview?.today?.toLocaleString() || 0}</span>
              <span className="stat-trend neutral">high-risk events blocked</span>
            </div>
          </div>

          <div className="stat-card stat-card-blue">
            <div className="stat-icon">
              <List size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Active Rules</span>
              <span className="stat-value">{overview?.total_rules?.toLocaleString() || overview?.active_rules?.toLocaleString() || 0}</span>
              <span className="stat-trend neutral">Snort3 detection rules</span>
            </div>
          </div>

          <div className="stat-card stat-card-green">
            <div className="stat-icon">
              <Database size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Database Records</span>
              <span className="stat-value">{overview?.total?.toLocaleString() || 0}</span>
              <span className="stat-trend neutral">stored security events</span>
            </div>
          </div>
        </div>

        <div className="search-filter-bar mb-4">
          <Form onSubmit={handleSearch}>
            <div className="filter-row">
              <div className="filter-group">
                <Form.Control
                  type="text"
                  className="filter-input"
                  placeholder="Source IP"
                  value={srcIpFilter}
                  onChange={(e) => setSrcIpFilter(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <Form.Control
                  type="text"
                  className="filter-input"
                  placeholder="Destination IP"
                  value={dstIpFilter}
                  onChange={(e) => setDstIpFilter(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <Dropdown>
                  <Dropdown.Toggle variant="secondary" className="filter-dropdown-full">
                    <Filter size={14} className="me-2" />
                    {attackTypeFilter ? attackTypeFilter : 'Attack Type'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setAttackTypeFilter('')} active={attackTypeFilter === ''}>
                      All Attack Types
                    </Dropdown.Item>
                    {attackTypes.map(type => (
                      <Dropdown.Item
                        key={type}
                        onClick={() => setAttackTypeFilter(type)}
                        active={attackTypeFilter === type}
                      >
                        {type}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="filter-group">
                <Dropdown>
                  <Dropdown.Toggle variant="secondary" className="filter-dropdown-full">
                    <Filter size={14} className="me-2" />
                    {actionFilter ? ACTIONS.find(a => a.value === actionFilter)?.label : 'Action'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {ACTIONS.map(a => (
                      <Dropdown.Item
                        key={a.value}
                        onClick={() => setActionFilter(a.value)}
                        active={actionFilter === a.value}
                      >
                        {a.label}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="filter-group">
                <Dropdown>
                  <Dropdown.Toggle variant="secondary" className="filter-dropdown-full">
                    <Filter size={14} className="me-2" />
                    {severityFilter ? SEVERITY_LEVELS.find(s => s.value === severityFilter)?.label : 'Severity'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {SEVERITY_LEVELS.map(s => (
                      <Dropdown.Item
                        key={s.value}
                        onClick={() => setSeverityFilter(s.value)}
                        active={severityFilter === s.value}
                      >
                        {s.label}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="filter-group filter-actions">
                <button type="submit" className="search-btn">
                  <Search size={16} />
                  Search
                </button>
                {hasActiveFilters && (
                  <button type="button" className="clear-filters-btn" onClick={clearFilters}>
                    <X size={16} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </Form>
        </div>

        <Row className="mb-4">
          <Col lg={8} className="mb-3">
            <div className="chart-card">
              <div className="chart-header">
                <h5 className="chart-title">
                  <Activity size={18} className="me-2" />
                  Attack Volume Over Time (Last 24 Hours)
                </h5>
                <span className="chart-subtitle">Hourly attack trend from Snort3 alert telemetry</span>
              </div>
              <div className="chart-container" style={{ height: '300px' }}>
                <Line data={lineChartData} options={lineOptions} />
              </div>
            </div>
          </Col>

          <Col lg={4} className="mb-3">
            <div className="chart-card">
              <div className="chart-header">
                <h5 className="chart-title">Severity Distribution</h5>
                <span className="chart-subtitle">Alert ratio grouped by severity level</span>
              </div>
              <div className="chart-container" style={{ height: '260px' }}>
                <Doughnut data={donutChartData} options={donutOptions} />
              </div>
            </div>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col lg={5} className="mb-3">
            <div className="chart-card">
              <div className="chart-header">
                <h5 className="chart-title">Attack Categories</h5>
                <span className="chart-subtitle">Detected attack families and rule matches</span>
              </div>
              <div className="chart-container" style={{ height: '280px' }}>
                {pieChartData.labels && pieChartData.labels.length > 0 ? (
                  <Pie data={pieChartData} options={pieOptions} />
                ) : (
                  <div className="no-chart-data">No data available</div>
                )}
              </div>
            </div>
          </Col>

          <Col lg={4} className="mb-3">
            <div className="chart-card">
              <div className="chart-header">
                <h5 className="chart-title">Top 10 Attacker IPs</h5>
                <span className="chart-subtitle">Source addresses with the highest alert volume</span>
              </div>
              <div className="chart-container" style={{ height: '280px' }}>
                {barChartData.labels && barChartData.labels.length > 0 ? (
                  <Bar data={barChartData} options={barOptions} />
                ) : (
                  <div className="no-chart-data">No data available</div>
                )}
              </div>
            </div>
          </Col>

          <Col lg={3} className="mb-3">
            <div className="chart-card top-ip-card">
              <div className="chart-header">
                <h5 className="chart-title">Source IP Watchlist</h5>
                <span className="chart-subtitle">Highest-volume attacking sources</span>
              </div>
              <div className="top-ip-list-custom">
                {topIPs.map((item, idx) => (
                  <div key={idx} className="top-ip-item-custom" onClick={() => filterBySourceIp(item.ip)}>
                    <div className="ip-rank">{idx + 1}</div>
                    <div className="ip-info">
                      <span className="ip-address">{item.ip}</span>
                      <span className="ip-attacks">{item.count} events</span>
                    </div>
                    <div className="ip-bar">
                      <div
                        className="ip-bar-fill"
                        style={{
                          width: `${(item.count / (topIPs[0]?.count || 1)) * 100}%`,
                          backgroundColor: colorArray[idx % colorArray.length]
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
                {topIPs.length === 0 && (
                  <div className="no-data-custom">No data available</div>
                )}
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col lg={12} className="mb-3">
            <div className="table-card">
              <div className="table-header">
                <h5 className="chart-title">
                  <AlertTriangle size={18} className="me-2" />
                  Alert Events
                </h5>
                <span className="table-subtitle">
                  {hasActiveFilters ? `Filtered results: ${pagination.total} alerts` : `Total: ${pagination.total} alerts`}
                </span>
              </div>
              <div className="table-container">
                <Table hover variant="dark" className="alerts-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Time</th>
                      <th>Source IP</th>
                      <th>Destination IP</th>
                      <th className="protocol-col">Protocol</th>
                      <th>Attack Type</th>
                      <th>Rule (SID)</th>
                      <th className="action-col">Action</th>
                      <th className="severity-col">Severity</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, idx) => {
                      const badge = getSeverityBadge(alert.severity);
                      const actionBadge = getActionBadge(alert.action);
                      return (
                        <tr key={idx}>
                          <td><span className="row-number">{pagination.offset + idx + 1}</span></td>
                          <td className="timestamp-cell">{alert.timestamp}</td>
                          <td className="src-ip">{alert.src_ip || '-'}</td>
                          <td className="dst-ip">{alert.dst_ip || '-'}</td>
                          <td className="protocol-col"><span className="proto-cell">{alert.proto || '-'}</span></td>
                          <td className="attack-type-cell">
                            <span className="attack-type-value">
                              <span className="attack-icon">{getActionIcon(alert.action)}</span>
                              <span>{alert.attack_type || alert.rule_msg || 'Unknown'}</span>
                            </span>
                          </td>
                          <td className="sid-cell">{alert.rule_sid || '-'}</td>
                          <td className="action-col">
                            <span className="action-badge" style={{ backgroundColor: actionBadge.bg, color: actionBadge.color }}>
                              {actionBadge.label}
                            </span>
                          </td>
                          <td className="severity-col">
                            <span className="severity-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </td>
                          <td>
                            <button className="detail-btn" onClick={() => openAlertDetail(alert)}>
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {alerts.length === 0 && (
                      <tr>
                        <td colSpan="10" className="no-alerts">
                          <Info size={24} />
                          <span>No alerts found</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              {renderPagination()}
            </div>
          </Col>
        </Row>
      </Container>

      {showModal && selectedAlert && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5>Alert Details</h5>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>ID</label>
                  <span>#{selectedAlert.id}</span>
                </div>
                <div className="detail-item">
                  <label>Time</label>
                  <span>{selectedAlert.timestamp}</span>
                </div>
                <div className="detail-item">
                  <label>Source IP</label>
                  <span className="ip-highlight">{selectedAlert.src_ip || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Destination IP</label>
                  <span className="ip-highlight">{selectedAlert.dst_ip || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Protocol</label>
                  <span>{selectedAlert.proto || '-'}</span>
                </div>
                <div className="detail-item full-width">
                  <label>Attack Type</label>
                  <span>{selectedAlert.attack_type || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                  <label>Rule (SID)</label>
                  <span className="sid-highlight">{selectedAlert.rule_sid ? `SID:${selectedAlert.rule_sid}` : '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Action</label>
                  {(() => {
                    const actionBadge = getActionBadge(selectedAlert.action);
                    return (
                      <span className="action-badge" style={{ backgroundColor: actionBadge.bg, color: actionBadge.color }}>
                        {actionBadge.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="detail-item">
                  <label>Severity</label>
                  {(() => {
                    const badge = getSeverityBadge(selectedAlert.severity);
                    return (
                      <span className="severity-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    );
})()}
                </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default App;
