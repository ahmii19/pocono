'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthModal from '@/components/AuthModal';

function LoginContent() {
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent') === 'host' ? 'host' : 'guest';
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12">
      <AuthModal
        isOpen={isOpen}
        initialMode="login"
        intent={intent}
        onClose={() => {
          setIsOpen(false);
          window.location.href = '/';
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-xs font-bold text-gray-500">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
