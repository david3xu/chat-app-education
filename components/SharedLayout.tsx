"use client";

import Sidebar from '@/components/Sidebar';

interface SharedLayoutProps {
  children: React.ReactNode;
}

export default function SharedLayout({ children }: SharedLayoutProps) {
  return (
    <div className="bg-gray-900 min-h-screen flex relative">
      <Sidebar />
      <div className="flex-1 p-4 flex flex-col items-center">
        <div className="w-full max-w-[800px] flex flex-col h-[calc(100vh-100px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
