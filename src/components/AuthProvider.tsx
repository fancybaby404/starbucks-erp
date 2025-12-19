"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/support", "/", "/self-service"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if current path is public
    if (PUBLIC_PATHS.includes(pathname)) {
      setIsAuthorized(true);
      return;
    }

    // Check session
    const session = auth.getSession();
    if (!session) {
      // Redirect to login
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, router]);

  // Prevent flash of protected content
  if (!isAuthorized && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm animate-pulse">Loading auth...</div>
      </div>
    );
  }

  return <>{children}</>;
}
