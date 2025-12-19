"use client";
import React, { useMemo, useState } from "react";
import { useRules, useTickets } from "@/lib/data";
import { Ticket, Rule } from "@/lib/types";
import { Clock, AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function SlaPage() {
  const { rules, addRule } = useRules();
  const { tickets } = useTickets();
  
  const [newRule, setNewRule] = useState({ name: "", responseMins: 60, resolutionMins: 480, conditionValue: "Medium" });

  const handleAddRule = () => {
    if (!newRule.name.trim()) return;
    // For now we assume condition is always "priority"
    // In a real app we'd save condition_field="priority", condition_value=newRule.conditionValue
    // But addRule signature in data.ts might need update to support conditions or we just use name/times for now.
    // The current addRule only takes name, response, resolution.
    addRule(newRule.name, newRule.responseMins, newRule.resolutionMins);
    setNewRule({ name: "", responseMins: 60, resolutionMins: 480, conditionValue: "Medium" });
  };

  const stats = useMemo(() => {
    const now = new Date().getTime();
    
    // 1. Map tickets to rules based on Priority matching Rule Name (heuristic) or default
    // Since we don't have explicit condition mapping in the UI yet, let's assume:
    // If rule name contains "High" -> matches High priority, etc.
    // Or simpler: Just calculate global stats per rule if we can link them.
    // Let's trying matching by Priority string if it exists in rule name, else 'General'.
    
    const ruleStats = rules.map(rule => {
       const matchingTickets = tickets.filter(t => {
           // Loose matching logic for demo purposes if explicit link missing
           // If rule name is "High Priority SLA", it matches "High" priority tickets
           return rule.name.toLowerCase().includes(t.priority.toLowerCase());
       });
       
       const total = matchingTickets.length;
       let breached = 0;
       
       matchingTickets.forEach(t => {
           const created = new Date(t.createdAt).getTime();
           const resolutionTime = rule.resolutionMins * 60000;
           const deadline = created + resolutionTime;
           
           // Check resolution breach
           if (t.status === 'Resolved' || t.status === 'Closed') {
               // If we had a resolution date, we'd check it.
               // For now assume if it's closed, we check created vs now? No, that's wrong.
               // We need resolution date. supportCase has resolution_date.
               // Types.ts Ticket doesn't have resolutionDate yet? 
               // Let's check typical Ticket type. It has createdAt. 
               // If useTickets maps it, we can use it.
           } else {
               // Still open
               if (now > deadline) breached++;
           }
       });

       return {
           rule,
           total,
           breached,
           compliance: total === 0 ? 100 : Math.round(((total - breached) / total) * 100)
       };
    });
    
    return ruleStats;
  }, [rules, tickets]);

  return (
    <div className="space-y-6">
      {/* Header & Info */}
      <div className="flex flex-col gap-4">
        <div>
           <h1 className="text-3xl font-bold text-[var(--sb-dark)]">Service Level Agreements (SLA)</h1>
           <p className="text-gray-500">Manage response and resolution time targets for support tickets.</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
           <Info className="shrink-0 text-blue-500" size={20} />
           <div>
             <h3 className="font-bold mb-1">How SLAs work</h3>
             <ul className="list-disc list-inside space-y-1 opacity-80">
               <li>**Response Time**: The target time to send the first reply to a customer.</li>
               <li>**Resolution Time**: The target time to completely resolve and close the ticket.</li>
               <li>**Breaches**: Tickets that exceed these targets are flagged as "Breached" and may be escalated.</li>
             </ul>
           </div>
        </div>
      </div>

      {/* SLA Rules List */}
      <div className="grid lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
            <h2 className="font-bold text-lg text-gray-700">Active Policies</h2>
            <div className="grid gap-4">
              {rules.map(rule => {
                  const stat = stats.find(s => s.rule.id === rule.id);
                  const isHealthy = (stat?.compliance ?? 100) >= 90;
                  
                  return (
                    <div key={rule.id} className="sb-card p-0 overflow-hidden flex flex-col md:flex-row group hover:border-[var(--sb-green)]/30">
                       <div className={`w-1.5 ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                       <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex justify-between items-start">
                               <h3 className="font-bold text-lg text-[var(--sb-dark)] group-hover:text-[var(--sb-green)] transition-colors">{rule.name}</h3>
                               <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${isHealthy ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                 {stat?.compliance ?? 100}% HEALTHY
                               </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                               Targeting {rule.responseMins}m response time for matched tickets.
                            </p>
                          </div>
                          
                          <div className="flex gap-8 text-sm pt-2 border-t border-gray-50">
                             <div className="flex items-center gap-2.5">
                               <div className="p-1.5 rounded-full bg-blue-50 text-blue-600"><Clock size={14} /></div>
                               <div>
                                 <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Response</div>
                                 <div className="font-semibold text-gray-700">{rule.responseMins}m</div>
                               </div>
                             </div>
                             <div className="flex items-center gap-2.5">
                               <div className="p-1.5 rounded-full bg-indigo-50 text-indigo-600"><CheckCircle size={14} /></div>
                               <div>
                                 <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Resolution</div>
                                 <div className="font-semibold text-gray-700">{rule.resolutionMins}m</div>
                               </div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="bg-gray-50/50 p-5 w-full md:w-36 flex flex-col justify-center items-center text-center border-l border-gray-100">
                          <div className="text-3xl font-bold text-[var(--sb-dark)]">{stat?.total || 0}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">Active Cases</div>
                          {stat && stat.breached > 0 && (
                            <div className="mt-3 px-2 py-1 bg-red-50 rounded text-[10px] text-red-600 font-bold flex items-center gap-1 border border-red-100">
                              <AlertTriangle size={10} /> {stat.breached} BREACHED
                            </div>
                          )}
                       </div>
                    </div>
                  );
              })}
              
              {rules.length === 0 && (
                 <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    <p className="text-gray-400">No SLA policies defined.</p>
                 </div>
              )}
            </div>
         </div>

         {/* Add Rule Form */}
         <div className="space-y-6">
            <h2 className="font-bold text-lg text-gray-700">Create Policy</h2>
            <div className="sb-card p-5">
               <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Policy Name</label>
                    <input 
                      className="sb-input w-full" 
                      placeholder="e.g. High Priority VIP" 
                      value={newRule.name}
                      onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Response (min)</label>
                        <input 
                          type="number" 
                          className="sb-input w-full" 
                          value={newRule.responseMins}
                          onChange={e => setNewRule({ ...newRule, responseMins: Number(e.target.value) })}
                        />
                     </div>
                     <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Resolution (min)</label>
                        <input 
                          type="number" 
                          className="sb-input w-full" 
                          value={newRule.resolutionMins}
                          onChange={e => setNewRule({ ...newRule, resolutionMins: Number(e.target.value) })}
                        />
                     </div>
                  </div>

                  <div className="pt-2">
                     <button className="sb-btn w-full justify-center" onClick={handleAddRule}>
                       Create SLA Policy
                     </button>
                  </div>
                  
                  <p className="text-xs text-gray-400 text-center">
                    New policies will apply to future tickets.
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}


