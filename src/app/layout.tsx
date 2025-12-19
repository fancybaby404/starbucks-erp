"use client";
import React from 'react';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/ToastProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { usePathname } from 'next/navigation';
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  // Hide sidebar on public/customer pages
  // Hide sidebar on public/customer pages
  const hideSidebar = pathname === '/login' || pathname === '/support' || pathname === '/' || pathname === '/self-service' || !pathname.startsWith('/customerservice');

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--sb-bg)] text-[var(--sb-dark)] font-sans antialiased">
        <div className="flex min-h-screen">
          {!hideSidebar && <Sidebar />}
          
          {/* Main Content Area */}
          <div className={`flex-1 flex flex-col transition-all duration-300 ${!hideSidebar ? 'ml-64' : 'ml-0'}`}>
            <main className={`flex-1 overflow-y-auto h-screen ${pathname === '/support' ? 'p-0' : 'p-8'}`}>
              <ToastProvider> 
                <AuthProvider>
                   {children}
                </AuthProvider>
              </ToastProvider>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
