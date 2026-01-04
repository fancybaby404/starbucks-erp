"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { Lock, User, Coffee, ArrowRight } from "lucide-react";

import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { user, error: authError } = await auth.login(email, password);

    if (authError || !user) {
      setError(authError || "Login failed");
      setLoading(false);
      return;
    }

    // Redirect based on role
    if (user.role === 'EMPLOYEE') {
      router.push("/customerservice");
    } else {
      router.push("/support");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sb-cream)] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Brand Side (Hidden on mobile) */}
        <div className="hidden md:flex flex-col justify-center items-center bg-[var(--sb-green)] text-white w-1/2 p-12 text-center">
           <div className="w-32 h-32 relative mb-6 bg-white rounded-full flex items-center justify-center shadow-lg">
             <div className="relative w-24 h-24">
                <Image src="/starbucks_logo.svg" alt="Starbucks" fill className="object-contain" />
             </div>
           </div>
           <h1 className="text-4xl font-bold mb-4">Starbucks Support</h1>
           <p className="opacity-90 text-lg max-w-xs leading-relaxed">Log in to manage tickets or get help with your orders.</p>
        </div>

        {/* Form Side */}
        <div className="flex-1 p-12 md:p-16 flex flex-col justify-center">
           <h2 className="text-2xl font-bold text-[var(--sb-dark)] mb-1">Welcome Back</h2>
           <p className="text-gray-500 text-sm mb-8">Please enter your details to sign in.</p>

           <form onSubmit={handleLogin} className="space-y-6">
             <div>
               <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Email</label>
               <div className="relative">
                 <User className="absolute left-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
                 <input 
                   className="w-full border border-gray-300 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)] focus:border-transparent transition-all" 
                   type="email" 
                   placeholder="name@example.com"
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   required
                 />
               </div>
             </div>

             <div>
               <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Password</label>
               <div className="relative">
                 <Lock className="absolute left-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
                 <input 
                   className="w-full border border-gray-300 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)] focus:border-transparent transition-all" 
                   type="password" 
                   placeholder="••••••••"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   required
                 />
               </div>
             </div>

             {error && <p className="text-red-500 text-sm">{error}</p>}

             <button 
               type="submit" 
               disabled={loading}
               className="w-full bg-[var(--sb-green)] text-white py-3 rounded-lg font-bold hover:brightness-110 transition flex items-center justify-center gap-2"
             >
               {loading ? "Signing in..." : <>Sign In <ArrowRight size={18} /></>}
             </button>
           </form>

           <div className="mt-6 text-center text-xs text-gray-400">
             <p>Employee: admin@starbucks.com / password</p>
           </div>
        </div>
      </div>
    </div>
  );
}
