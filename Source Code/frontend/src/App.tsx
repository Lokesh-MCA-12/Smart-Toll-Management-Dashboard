import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  CircleDollarSign,
  TrendingUp,
  History,
  Settings,
  Bell,
  CheckCircle2,
  AlertCircle,
  Database,
  Search
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import GateSimulator from './components/GateSimulator';

interface Plaza {
  id: number;
  name: string;
  acronym: string;
  sequence: number;
}

interface Account {
  id: number;
  rfidTag: string;
  ownerName: string;
  licensePlate: string;
  vehicleClass: number;
  balance: number;
}

interface ActiveTrip {
  rfidTag: string;
  ownerName: string;
  licensePlate: string;
  vehicleClass: number;
  entryPlaza: string;
  entryTime: string;
}

interface Transaction {
  id: number;
  rfidTag: string;
  licensePlate: string;
  vehicleClass: number;
  entryPlaza: string;
  exitPlaza: string;
  chargedAmount: number;
  timestamp: string;
  status: string;
  ownerName?: string;
}

interface Rate {
  id: number;
  entryPlaza: string;
  exitPlaza: string;
  rateClass1: number;
  rateClass2: number;
  rateClass3: number;
}

interface Analytics {
  totalRevenue: number;
  totalTransactions: number;
  activeTransitsCount: number;
  vehicleClassDistribution: { class: number; count: number }[];
  trafficByEntry: { plaza: string; count: number }[];
  trafficByExit: { plaza: string; count: number }[];
}

export default function App() {
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0,
    totalTransactions: 0,
    activeTransitsCount: 0,
    vehicleClassDistribution: [],
    trafficByEntry: [],
    trafficByExit: [],
  });

  const [liveFeed, setLiveFeed] = useState<{ id: string; message: string; timestamp: Date; type: 'entry' | 'exit' | 'info' | 'error' }[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'rates' | 'logs'>('overview');
  
  // Rate Editing state
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [rateForm1, setRateForm1] = useState('');
  const [rateForm2, setRateForm2] = useState('');
  const [rateForm3, setRateForm3] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPlazas = () => fetch('/api/plazas').then(r => r.json()).then(setPlazas);
  const fetchAccounts = () => fetch('/api/accounts').then(r => r.json()).then(setAccounts);
  const fetchActiveTrips = () => fetch('/api/simulator/active').then(r => r.json()).then(setActiveTrips);
  const fetchTransactions = () => fetch('/api/transactions').then(r => r.json()).then(setTransactions);
  const fetchRates = () => fetch('/api/rates').then(r => r.json()).then(setRates);
  const fetchAnalytics = () => fetch('/api/analytics/summary').then(r => r.json()).then(setAnalytics);

  useEffect(() => {
    fetchPlazas();
    fetchAccounts();
    fetchActiveTrips();
    fetchTransactions();
    fetchRates();
    fetchAnalytics();

    // SSE EventSource setup for real-time dashboard connection
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      const time = new Date();

      if (parsed.type === 'VEHICLE_ENTERED') {
        const payload = parsed.data;
        const msg = `🚗 Vehicle [${payload.licensePlate}] entered NLEX at ${payload.entryPlaza} Lane ${Math.floor(Math.random() * 3) + 1}`;
        setLiveFeed(prev => [{ id: `${time.getTime()}-entry`, message: msg, timestamp: time, type: 'entry' }, ...prev.slice(0, 49)]);
        fetchActiveTrips();
        fetchAnalytics();
      }

      if (parsed.type === 'VEHICLE_EXITED') {
        const payload = parsed.data;
        const isSuccess = payload.status === 'COMPLETED';
        let msg = '';
        if (isSuccess) {
          msg = `✅ [RFID Charge] Vehicle [${payload.licensePlate}] exited at ${payload.exitPlaza}. Paid ₱${payload.chargedAmount.toFixed(2)}`;
        } else {
          msg = `❌ [BLOCKED] Vehicle [${payload.licensePlate}] insufficient balance at ${payload.exitPlaza}. Charge ₱${payload.chargedAmount.toFixed(2)} declined.`;
        }

        setLiveFeed(prev => [{
          id: `${time.getTime()}-exit`,
          message: msg,
          timestamp: time,
          type: isSuccess ? 'exit' : 'error'
        }, ...prev.slice(0, 49)]);

        fetchTransactions();
        fetchActiveTrips();
        fetchAccounts();
        fetchAnalytics();
      }

      if (parsed.type === 'RATE_UPDATED') {
        const payload = parsed.data;
        const msg = `⚙️ Toll rates updated between ${payload.entryPlaza} and ${payload.exitPlaza}`;
        setLiveFeed(prev => [{ id: `${time.getTime()}-rate`, message: msg, timestamp: time, type: 'info' }, ...prev.slice(0, 49)]);
        fetchRates();
      }

      if (parsed.type === 'BALANCE_TOPPED_UP') {
        const payload = parsed.data;
        const msg = `💸 Wallet top-up for ${payload.ownerName}. New Balance: ₱${payload.balance.toFixed(2)}`;
        setLiveFeed(prev => [{ id: `${time.getTime()}-topup`, message: msg, timestamp: time, type: 'info' }, ...prev.slice(0, 49)]);
        fetchAccounts();
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection error", err);
    };

    // System initialized log
    setLiveFeed([{ id: 'init', message: '📡 Connected to Smart Toll Cloud Central Engine. Awaiting RFID transactions...', timestamp: new Date(), type: 'info' }]);

    return () => {
      eventSource.close();
    };
  }, []);

  const handleUpdateRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;
    try {
      const res = await fetch('/api/rates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRate.id,
          rateClass1: parseFloat(rateForm1),
          rateClass2: parseFloat(rateForm2),
          rateClass3: parseFloat(rateForm3)
        })
      });
      if (res.ok) {
        setEditingRate(null);
        fetchRates();
      }
    } catch (error) {
      console.error("Failed to update rate", error);
    }
  };

  const startEditingRate = (rate: Rate) => {
    setEditingRate(rate);
    setRateForm1(rate.rateClass1.toString());
    setRateForm2(rate.rateClass2.toString());
    setRateForm3(rate.rateClass3.toString());
  };

  // Prepare chart data
  const classPieData = analytics.vehicleClassDistribution.map(item => {
    const name = item.class === 1 ? 'Class 1 (Cars)' : item.class === 2 ? 'Class 2 (Buses/Trucks)' : 'Class 3 (Heavy)';
    return { name, value: item.count };
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  const entryBarData = analytics.trafficByEntry.slice(0, 5).map(item => ({
    name: item.plaza,
    Vehicles: item.count
  }));

  // Filtering rates
  const filteredRates = rates.filter(r => 
    r.entryPlaza.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.exitPlaza.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-6">
      
      {/* Top Banner & Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#334155] pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600/20 text-blue-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/30">
              NLEX Segment
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-[#94a3b8]">Live Engine Connected</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1">Smart Toll Dashboard</h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            Real-time toll analytics, vehicle monitoring, and rate matrix controls.
          </p>
        </div>

        {/* Tab Selector */}
        <nav className="flex bg-[#1e293b] p-1.5 rounded-xl border border-[#334155] gap-1 self-start">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition ${activeTab === 'overview' ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20' : 'text-[#94a3b8] hover:text-white'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition ${activeTab === 'rates' ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20' : 'text-[#94a3b8] hover:text-white'}`}
          >
            Rates Matrix
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition ${activeTab === 'logs' ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20' : 'text-[#94a3b8] hover:text-white'}`}
          >
            Transit Logs
          </button>
        </nav>
      </header>

      {/* Metrics Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider block">Total Revenue</span>
            <span className="text-2xl font-black text-white mt-1 block">₱{analytics.totalRevenue.toFixed(2)}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CircleDollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider block">Transactions</span>
            <span className="text-2xl font-black text-white mt-1 block">{analytics.totalTransactions}</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider block">Active Transits</span>
            <span className="text-2xl font-black text-[#60a5fa] mt-1 block">{analytics.activeTransitsCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider block">Toll Plazas</span>
            <span className="text-2xl font-black text-white mt-1 block">{plazas.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Database className="h-6 w-6" />
          </div>
        </div>

      </section>

      {/* Main Tab Views */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Center Content: Charts & Simulator */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Lane Simulator Component */}
            <GateSimulator
              plazas={plazas}
              accounts={accounts}
              activeTrips={activeTrips}
              onActionTriggered={() => {
                fetchAnalytics();
                fetchTransactions();
              }}
              fetchAccounts={fetchAccounts}
              fetchActiveTrips={fetchActiveTrips}
            />

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Traffic Chart */}
              <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-[#3b82f6]" /> Top Entry Toll Plazas
                </h3>
                {entryBarData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={entryBarData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                        <Bar dataKey="Vehicles" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                    No traffic data available. Simulate exit transits first.
                  </div>
                )}
              </div>

              {/* Class Distribution Chart */}
              <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <Layers className="h-4 w-4 text-emerald-400" /> Vehicle Class Mix
                </h3>
                {classPieData.length > 0 ? (
                  <div className="h-64 flex flex-col justify-between">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={classPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {classPieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-[10px] uppercase font-bold text-slate-400">
                      {classPieData.map((entry, idx) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                          <span>{entry.name.split(' ')[0] + ' ' + entry.name.split(' ')[1]} ({entry.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                    No traffic class data.
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Right Content: Live Activity Feed */}
          <div className="space-y-6">
            
            <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-5 h-[calc(100%-0px)] flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#334155]">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-blue-400 animate-swing" /> Live Telemetry Feed
                </h3>
                <span className="text-[10px] font-bold bg-blue-950/60 border border-blue-800 text-blue-300 px-2 py-0.5 rounded-full">
                  Real Time
                </span>
              </div>

              {/* Feed List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px] lg:max-h-[640px]">
                {liveFeed.map(feed => (
                  <div
                    key={feed.id}
                    className={`p-3 rounded-lg border text-xs leading-relaxed transition ${
                      feed.type === 'entry'
                        ? 'bg-blue-950/20 border-blue-900/60 text-blue-200'
                        : feed.type === 'exit'
                        ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-200'
                        : feed.type === 'error'
                        ? 'bg-red-950/20 border-red-900/60 text-red-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold flex items-center gap-1 uppercase text-[10px] tracking-wide">
                        {feed.type === 'entry' && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                        {feed.type === 'exit' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        {feed.type === 'error' && <AlertCircle className="h-3 w-3 text-red-400" />}
                        {feed.type === 'info' && <Database className="h-3 w-3 text-slate-400" />}
                        {feed.type}
                      </span>
                      <span className="text-[9px] text-[#64748b] font-mono">
                        {feed.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-medium">{feed.message}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* View: Rates Matrix Control */}
      {activeTab === 'rates' && (
        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#334155] pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-400" /> Rates Matrix Controller
              </h2>
              <p className="text-xs text-[#94a3b8] mt-1">
                Dynamically update segment pricing matrices. Changes propagate instantly to active booths.
              </p>
            </div>
            
            {/* Search Rates */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search segment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0f172a] border border-[#334155] text-slate-200 text-xs rounded-lg pl-9 pr-4 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {editingRate && (
            <form onSubmit={handleUpdateRateSubmit} className="mb-6 p-4 bg-[#0f172a]/60 border border-blue-900 rounded-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
                <span className="text-xs font-bold text-blue-300">
                  Update Rates: {editingRate.entryPlaza} to {editingRate.exitPlaza}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingRate(null)}
                  className="text-xs text-slate-500 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#94a3b8] mb-1">Class 1 Rate (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateForm1}
                    onChange={(e) => setRateForm1(e.target.value)}
                    className="bg-[#1e293b] border border-[#475569] text-white text-xs rounded-lg p-2.5 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#94a3b8] mb-1">Class 2 Rate (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateForm2}
                    onChange={(e) => setRateForm2(e.target.value)}
                    className="bg-[#1e293b] border border-[#475569] text-white text-xs rounded-lg p-2.5 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#94a3b8] mb-1">Class 3 Rate (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateForm3}
                    onChange={(e) => setRateForm3(e.target.value)}
                    className="bg-[#1e293b] border border-[#475569] text-white text-xs rounded-lg p-2.5 w-full"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Save Rate Changes
              </button>
            </form>
          )}

          {/* Rates Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#334155] text-[#94a3b8] uppercase text-[10px] font-bold">
                  <th className="py-3 px-4">Segment Connection</th>
                  <th className="py-3 px-4 text-center">Class 1 Rate</th>
                  <th className="py-3 px-4 text-center">Class 2 Rate</th>
                  <th className="py-3 px-4 text-center">Class 3 Rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/40 text-slate-200">
                {filteredRates.slice(0, 50).map(rate => (
                  <tr key={rate.id} className="hover:bg-[#1e293b]/20">
                    <td className="py-3.5 px-4 font-semibold">
                      <span className="text-[#3b82f6]">{rate.entryPlaza}</span>
                      <span className="text-slate-500 mx-2">↔</span>
                      <span className="text-emerald-400">{rate.exitPlaza}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">₱{rate.rateClass1.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center font-semibold">₱{rate.rateClass2.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center font-semibold">₱{rate.rateClass3.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => startEditingRate(rate)}
                        className="text-xs bg-[#334155] hover:bg-[#475569] text-white px-3 py-1 rounded transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View: Transit Logs / History */}
      {activeTab === 'logs' && (
        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-[#334155] pb-4">
            <History className="h-5 w-5 text-blue-400" /> Historical Passage Registry
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#334155] text-[#94a3b8] uppercase text-[10px] font-bold">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">RFID Tag</th>
                  <th className="py-3 px-4">Plate No.</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Entry Gate</th>
                  <th className="py-3 px-4">Exit Gate</th>
                  <th className="py-3 px-4 text-center">Toll Fee</th>
                  <th className="py-3 px-4 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/40 text-slate-200">
                {transactions.length > 0 ? (
                  transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-[#1e293b]/20">
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-300">{tx.rfidTag}</td>
                      <td className="py-3 px-4 font-bold">{tx.licensePlate}</td>
                      <td className="py-3 px-4">Class {tx.vehicleClass}</td>
                      <td className="py-3 px-4">{tx.entryPlaza}</td>
                      <td className="py-3 px-4">{tx.exitPlaza}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-100">
                        ₱{tx.chargedAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${
                            tx.status === 'COMPLETED'
                              ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400'
                              : 'bg-red-950/40 border-red-900 text-red-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                      No transactions recorded in system database. Run simulated transits to populate records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
