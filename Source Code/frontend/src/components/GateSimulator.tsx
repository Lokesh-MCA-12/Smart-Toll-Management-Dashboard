import React, { useState, useEffect } from 'react';
import { Play, LogIn, LogOut, Plus, DollarSign, RefreshCw, Car, ShieldAlert } from 'lucide-react';

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

interface GateSimulatorProps {
  plazas: Plaza[];
  onActionTriggered: () => void;
  activeTrips: ActiveTrip[];
  accounts: Account[];
  fetchAccounts: () => void;
  fetchActiveTrips: () => void;
}

export default function GateSimulator({
  plazas,
  onActionTriggered,
  activeTrips,
  accounts,
  fetchAccounts,
  fetchActiveTrips,
}: GateSimulatorProps) {
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedEntryPlaza, setSelectedEntryPlaza] = useState('');
  const [selectedExitPlaza, setSelectedExitPlaza] = useState('');

  // Top Up Form state
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // New Account state
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newClass, setNewClass] = useState('1');
  const [newBalance, setNewBalance] = useState('500');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentAccount = accounts.find(a => a.rfidTag === selectedTag);
  const currentTrip = activeTrips.find(t => t.rfidTag === selectedTag);

  useEffect(() => {
    if (accounts.length > 0 && !selectedTag) {
      setSelectedTag(accounts[0].rfidTag);
    }
  }, [accounts, selectedTag]);

  useEffect(() => {
    if (plazas.length > 0) {
      if (!selectedEntryPlaza) setSelectedEntryPlaza(plazas[0].acronym);
      if (!selectedExitPlaza) {
        // Default exit plaza different from entry
        const other = plazas.find(p => p.acronym !== plazas[0].acronym);
        setSelectedExitPlaza(other ? other.acronym : plazas[0].acronym);
      }
    }
  }, [plazas, selectedEntryPlaza, selectedExitPlaza]);

  const handleEntrySimulation = async () => {
    if (!selectedTag || !selectedEntryPlaza) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/simulator/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidTag: selectedTag, entryPlaza: selectedEntryPlaza }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to simulate entry');

      setSuccessMsg(`RFID Tag ${selectedTag} scanned at ${selectedEntryPlaza} Entrance!`);
      onActionTriggered();
      fetchActiveTrips();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExitSimulation = async () => {
    if (!selectedTag || !selectedExitPlaza) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/simulator/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidTag: selectedTag, exitPlaza: selectedExitPlaza }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to simulate exit');

      if (data.transaction && data.transaction.status === 'INSUFFICIENT_FUNDS') {
        setError(`TRANSACTION DENIED: Insufficient wallet balance for Class ${currentAccount?.vehicleClass} vehicle.`);
      } else {
        setSuccessMsg(`Toll exit processing complete. Charged: ₱${data.transaction.chargedAmount.toFixed(2)}.`);
      }

      onActionTriggered();
      fetchAccounts();
      fetchActiveTrips();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTag || !topUpAmount || isNaN(parseFloat(topUpAmount))) return;
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/accounts/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidTag: selectedTag, amount: parseFloat(topUpAmount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to top-up');

      setSuccessMsg(`Successfully topped-up ₱${parseFloat(topUpAmount).toFixed(2)}!`);
      setTopUpAmount('');
      setIsTopUpOpen(false);
      fetchAccounts();
      onActionTriggered();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag || !newOwner || !newPlate) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfidTag: newTag,
          ownerName: newOwner,
          licensePlate: newPlate,
          vehicleClass: parseInt(newClass),
          balance: parseFloat(newBalance || '0'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register account');

      setSuccessMsg(`Registered account for ${newOwner} (Tag: ${newTag}) successfully!`);
      setSelectedTag(newTag);
      setNewTag('');
      setNewOwner('');
      setNewPlate('');
      setNewClass('1');
      setNewBalance('500');
      setIsNewAccountOpen(false);
      fetchAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-6 backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Play className="text-[#3b82f6] h-5 w-5 fill-[#3b82f6]" /> Live Lane Simulator
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsTopUpOpen(!isTopUpOpen)}
            className="flex items-center gap-1 text-xs bg-[#0f766e] hover:bg-[#0d9488] text-white px-3 py-1.5 rounded-lg font-semibold transition"
          >
            <DollarSign className="h-3.5 w-3.5" /> Top Up
          </button>
          <button
            onClick={() => setIsNewAccountOpen(!isNewAccountOpen)}
            className="flex items-center gap-1 text-xs bg-[#1d4ed8] hover:bg-[#2563eb] text-white px-3 py-1.5 rounded-lg font-semibold transition"
          >
            <Plus className="h-3.5 w-3.5" /> Register Tag
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 text-red-200 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-sm px-4 py-3 rounded-lg">
          {successMsg}
        </div>
      )}

      {/* MODAL: Top Up */}
      {isTopUpOpen && (
        <form onSubmit={handleTopUpSubmit} className="mb-6 p-4 bg-[#0f172a]/60 border border-[#334155] rounded-lg">
          <div className="text-sm font-semibold mb-2 text-[#94a3b8]">Top Up wallet for {currentAccount?.ownerName}</div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount (₱)"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="bg-[#1e293b] border border-[#475569] text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
              required
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 rounded-lg transition"
            >
              Submit
            </button>
          </div>
        </form>
      )}

      {/* MODAL: Register Tag */}
      {isNewAccountOpen && (
        <form onSubmit={handleCreateAccountSubmit} className="mb-6 p-4 bg-[#0f172a]/60 border border-[#334155] rounded-lg space-y-3">
          <div className="text-sm font-bold text-[#e2e8f0] border-b border-[#334155] pb-1.5">Register New RFID Tag</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#94a3b8] mb-1">RFID Tag Code</label>
              <input
                type="text"
                placeholder="RFID10005"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="bg-[#1e293b] border border-[#475569] text-white text-xs rounded-lg p-2 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Owner Name</label>
              <input
                type="text"
                placeholder="Pedro Penduko"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="bg-[#1e293b] border border-[#475569] text-white text-xs rounded-lg p-2 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Plate Number</label>
              <input
                type="text"
                placeholder="ABC-1234"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value)}
                className="bg-[#1e293b] border border-[#475569] text-white text-xs rounded-lg p-2 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Vehicle Class</label>
              <select
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="bg-[#1e293b] border border-[#475569] text-white text-xs rounded-lg p-2 w-full"
              >
                <option value="1">Class 1 (Car/SUV)</option>
                <option value="2">Class 2 (Bus/Truck)</option>
                <option value="3">Class 3 (Heavy Truck)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Initial Balance (₱)</label>
            <input
              type="number"
              placeholder="500"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="bg-[#1e293b] border border-[#475569] text-white text-xs rounded-lg p-2 w-full"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewAccountOpen(false)}
              className="text-xs text-[#94a3b8] hover:text-white px-3 py-1.5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
            >
              Register
            </button>
          </div>
        </form>
      )}

      {/* Vehicle Selector */}
      <div className="mb-6">
        <label className="block text-xs uppercase font-bold text-[#94a3b8] mb-2 flex items-center gap-1.5">
          <Car className="h-3.5 w-3.5" /> Select Active Test Vehicle
        </label>
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="bg-[#0f172a] border border-[#334155] text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          {accounts.map(account => (
            <option key={account.id} value={account.rfidTag}>
              {account.ownerName} ({account.rfidTag}) - {account.licensePlate} [Class {account.vehicleClass}]
            </option>
          ))}
        </select>
      </div>

      {/* Selected Vehicle State */}
      {currentAccount && (
        <div className="bg-[#0f172a]/40 border border-[#334155]/60 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[10px] text-[#64748b] uppercase font-bold">Plate Number</div>
              <div className="font-semibold text-white mt-0.5">{currentAccount.licensePlate}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#64748b] uppercase font-bold">Class</div>
              <div className="font-semibold text-white mt-0.5">
                Class {currentAccount.vehicleClass} ({currentAccount.vehicleClass === 1 ? 'Car/SUV' : currentAccount.vehicleClass === 2 ? 'Bus/Medium Truck' : 'Heavy Truck'})
              </div>
            </div>
            <div className="col-span-2 border-t border-[#1e293b] pt-2 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-[#64748b] uppercase font-bold">RFID Balance</div>
                <div className={`text-lg font-black mt-0.5 ${currentAccount.balance < 100 ? 'text-red-400' : 'text-emerald-400'}`}>
                  ₱{currentAccount.balance.toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-[#64748b] uppercase font-bold">Transit Status</span>
                {currentTrip ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/60 text-blue-200 border border-blue-800 mt-1">
                    Entered {currentTrip.entryPlaza}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 mt-1">
                    At Rest (Idle)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry/Exit Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Entry Lane Card */}
        <div className={`p-4 rounded-xl border ${!currentTrip ? 'bg-blue-950/20 border-blue-800/50' : 'bg-slate-900/20 border-[#334155] opacity-50'}`}>
          <div className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-1.5">
            <LogIn className="h-4 w-4" /> Simulate Entry Gate
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Select Entry Plaza</label>
              <select
                value={selectedEntryPlaza}
                disabled={!!currentTrip || loading}
                onChange={(e) => setSelectedEntryPlaza(e.target.value)}
                className="bg-[#0f172a] border border-[#334155] text-white text-xs rounded-lg p-2 w-full focus:ring-blue-500 focus:border-blue-500"
              >
                {plazas.map(p => (
                  <option key={p.id} value={p.acronym}>
                    {p.name} ({p.acronym})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleEntrySimulation}
              disabled={!!currentTrip || loading}
              className="w-full bg-[#2563eb] hover:bg-[#3b82f6] disabled:bg-[#1e293b] disabled:text-[#64748b] text-white text-xs font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-1.5"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Scan RFID Entry
            </button>
          </div>
        </div>

        {/* Exit Lane Card */}
        <div className={`p-4 rounded-xl border ${currentTrip ? 'bg-emerald-950/20 border-emerald-800/50 glow-active' : 'bg-slate-900/20 border-[#334155] opacity-50'}`}>
          <div className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-1.5">
            <LogOut className="h-4 w-4" /> Simulate Exit Gate
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Select Exit Plaza</label>
              <select
                value={selectedExitPlaza}
                disabled={!currentTrip || loading}
                onChange={(e) => setSelectedExitPlaza(e.target.value)}
                className="bg-[#0f172a] border border-[#334155] text-white text-xs rounded-lg p-2 w-full focus:ring-emerald-500 focus:border-emerald-500"
              >
                {plazas
                  .filter(p => p.acronym !== currentTrip?.entryPlaza)
                  .map(p => (
                    <option key={p.id} value={p.acronym}>
                      {p.name} ({p.acronym})
                    </option>
                  ))}
              </select>
            </div>
            <button
              onClick={handleExitSimulation}
              disabled={!currentTrip || loading}
              className="w-full bg-[#10b981] hover:bg-[#34d399] disabled:bg-[#1e293b] disabled:text-[#64748b] text-white text-xs font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-1.5"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Scan RFID Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
