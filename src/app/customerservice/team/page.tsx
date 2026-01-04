"use client";
import React, { useState } from "react";
import { useAgents } from "@/lib/data";
import { Plus, Mail, Shield, UserPlus, Trash2, Search, ArrowUpDown, User, X, Lock, Check } from "lucide-react";

export default function TeamPage() {
    const { agents, addEmployee, deleteEmployee } = useAgents();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'Name' | 'Status'>('Name');

     const isOnline = (lastSeen?: string) => {
        if (!lastSeen) return false;
        const diff = new Date().getTime() - new Date(lastSeen).getTime();
        return diff < 5 * 60 * 1000; // 5 mins
    };

    // Filter and Sort Logic
    const filteredAgents = agents
        .filter(agent => {
            const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  agent.email.toLowerCase().includes(searchQuery.toLowerCase());
            
            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'Status') {
                const isAOnline = isOnline(a.lastSeen);
                const isBOnline = isOnline(b.lastSeen);
                if (isAOnline && !isBOnline) return -1;
                if (!isAOnline && isBOnline) return 1;
                return 0;
            }
            return a.name.localeCompare(b.name);
        });

    return (
        <div className="space-y-6 h-full flex flex-col p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-none gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--sb-dark)] flex items-center gap-2">
                        Team Management
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border">
                            {agents.length} Employees
                        </span>
                    </h1>
                    <p className="text-gray-500 text-sm">Manage access and roles for support staff.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-[var(--sb-green)] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:brightness-110 shadow-md transition-all whitespace-nowrap"
                >
                    <Plus size={16} /> Add Employee
                </button>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)] focus:bg-white transition"
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {/* Role filters removed as requested */}
                    
                    {/* Sort Toggle */}
                    <button 
                        onClick={() => setSortBy(prev => prev === 'Name' ? 'Status' : 'Name')}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--sb-dark)] font-medium px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    >
                        <ArrowUpDown size={16} />
                        Sort by {sortBy}
                    </button>
                </div>
            </div>

            {/* Content: Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                {filteredAgents.map((agent) => {
                    const online = isOnline(agent.lastSeen);
                    return (
                        <div key={agent.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative animate-in fade-in duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 border border-white shadow-sm">
                                        {agent.name.charAt(0).toUpperCase()}
                                    </div>
                                    {online && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>}
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                        agent.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-50 text-gray-600 border-gray-100'
                                    }`}>
                                        {agent.role}
                                    </span>
                                    <button 
                                        onClick={async () => {
                                            if (confirm(`Are you sure you want to delete ${agent.name}?`)) {
                                                await deleteEmployee(agent.id);
                                            }
                                        }}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove User"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-[var(--sb-dark)] truncate">{agent.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 mb-4">
                                <Mail size={14} />
                                <span className="truncate">{agent.email}</span>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                    <span className={online ? 'text-green-700 font-medium' : 'text-gray-400'}>
                                        {online ? 'Active Now' : 'Offline'}
                                    </span>
                                </div>
                                <span className="text-gray-400 font-mono">ID: {agent.id.slice(0,6)}</span>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State */}
                {filteredAgents.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                        <User size={48} className="mb-4 opacity-20" />
                        <p>No team members found matching your filters.</p>
                        <button onClick={() => {setSearchQuery('');}} className="text-[var(--sb-green)] text-sm font-bold mt-2 hover:underline">
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {isAddModalOpen && (
                <AddEmployeeModal 
                    onClose={() => setIsAddModalOpen(false)} 
                    onAdd={async (data) => {
                        await addEmployee(data.email, data.name, data.password, data.role);
                        setIsAddModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}

function AddEmployeeModal({ onClose, onAdd }: { onClose: () => void, onAdd: (data: any) => Promise<void> }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "EMPLOYEE"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await onAdd(formData);
        } catch (err: any) {
            setError(err.message || "Failed to add employee");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900">Add New Employee</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <Shield size={14} /> {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                required
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--sb-green)] focus:border-transparent outline-none"
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                required
                                type="email"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--sb-green)] focus:border-transparent outline-none"
                                placeholder="e.g. john@starbucks.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                required
                                type="password"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--sb-green)] focus:border-transparent outline-none"
                                placeholder="••••••••"
                                minLength={6}
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Role</label>
                        <select 
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--sb-green)] focus:border-transparent outline-none bg-white"
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="EMPLOYEE">Employee (Standard Access)</option>
                            <option value="ADMIN">Admin (Full Access)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-2.5 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 py-2.5 font-bold text-white bg-[var(--sb-green)] hover:brightness-110 rounded-lg shadow-md transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Create Account <Check size={16} /></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
