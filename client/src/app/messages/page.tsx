'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MessagesIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('pocono_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.role === 'HOST') {
          router.replace('/host/messages');
          return;
        } else if (u.role === 'ADMIN') {
          router.replace('/admin/messages');
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-8 text-xs font-bold text-[#4f5962]">
      Redirecting to messages...
    </div>
  );
}
