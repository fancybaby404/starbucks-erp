"use client";
import React, { useState } from "react";
import { useAgents } from "@/lib/data";
import { Plus, Search, User, Mail, Shield, Trash2, X, Check, Lock } from "lucide-react";

export default function TeamPage() {
    const { agents, addEmployee, deleteEmployee } = useAgents();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filter agents
    const filteredAgents = agents.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
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

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--sb-green)] transition" />
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)] focus:bg-white transition"
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[var(--sb-green)] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:brightness-110 shadow-md transition-all whitespace-nowrap"
                    >
                        <Plus size={16} /> Add Employee
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white border rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 sticky top-0 z-10 text-xs uppercase text-gray-500 font-bold tracking-wider backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4 border-b">Employee</th>
                            <th className="px-6 py-4 border-b">Role</th>
                            <th className="px-6 py-4 border-b">Status</th>
                            <th className="px-6 py-4 border-b text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredAgents.length > 0 ? (
                            filteredAgents.map(agent => (
                                <tr key={agent.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 border border-white shadow-sm ring-1 ring-gray-100">
                                                {agent.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{agent.name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Mail size={10} /> {agent.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            agent.role === 'ADMIN' 
                                            ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                            : 'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                            <Shield size={10} />
                                            {agent.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const lastSeen = agent.lastSeen ? new Date(agent.lastSeen) : null;
                                            const isOnline = lastSeen && (Date.now() - lastSeen.getTime() < 5 * 60 * 1000);
                                            
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                    isOnline 
                                                    ? "bg-green-50 text-green-700 border-green-100" 
                                                    : "bg-gray-50 text-gray-500 border-gray-100"
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
                                                    {isOnline ? "Active" : "Offline"}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" 
                                            title="Delete Employee"
                                            onClick={async () => {
                                                if (confirm(`Are you sure you want to delete ${agent.name}?`)) {
                                                    await deleteEmployee(agent.id);
                                                }
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="py-20 text-center text-gray-400">
                                    <p>No employees found matching "{searchQuery}"</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Employee Modal */}
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
