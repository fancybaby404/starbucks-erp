"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function CustomerServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Auth Check
    const session = auth.getSession();
    if (!session) {
      router.push("/login");
    } else if (session.role !== 'EMPLOYEE') {
       // Optional: Redirect customer? 
    }

    // Heartbeat for "Online Agents"
    const heartbeat = async () => {
        const s = auth.getSession();
        if (s?.email) {
            try {
                await supabase?.rpc('update_last_seen', { user_email: s.email });
            } catch(e) { console.error("Heartbeat fail", e); }
        }
    };
    
    heartbeat(); // Initial
    const timer = setInterval(heartbeat, 30000); // Every 30s
    return () => clearInterval(timer);

  }, [router]);

  return (
    <div className="h-full">
        {children}
    </div>
  );
}
