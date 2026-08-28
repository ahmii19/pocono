'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import HostNav from '@/components/HostNav';
import Link from 'next/link';
import ChatWindow from '@/components/chat/ChatWindow';
import { ArrowLeft } from 'lucide-react';

export default function DedicatedConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const threadId = params.id as string;
  const fromParam = searchParams.get('from');

  const [userRole, setUserRole] = useState<string>('GUEST');

  useEffect(() => {
    const userStr = localStorage.getItem('pocono_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.role) setUserRole(u.role);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const getBackHref = () => {
    if (fromParam === 'host' || userRole === 'HOST') {
      return '/host/messages';
    }
    if (fromParam === 'guest-messages') {
      return '/dashboard?tab=messages';
    }
    if (userRole === 'ADMIN') {
      return '/admin/messages';
    }
    return '/dashboard?tab=messages';
  };

  const getBackLabel = () => {
    if (fromParam === 'host' || userRole === 'HOST') {
      return 'Back to Host Inquiries';
    }
    if (fromParam === 'guest-messages') {
      return 'Back to Guest Messages';
    }
    if (userRole === 'ADMIN') {
      return 'Back to Admin Inbox';
    }
    return 'Back to Guest Dashboard';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      {/* Render HostNav only for HOST users */}
      {userRole === 'HOST' && <HostNav />}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Simple Breadcrumb / Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={getBackHref()}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#4f5962] hover:text-[#f15e75] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{getBackLabel()}</span>
          </Link>
        </div>

        {/* Reusable Full Chat Window Component */}
        <ChatWindow
          threadId={threadId}
          backHref={getBackHref()}
          backLabel={getBackLabel()}
        />
      </main>
    </div>
  );
}
