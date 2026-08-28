'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminInvoiceById } from '@/lib/api';
import {
  ArrowLeft, FileText, DollarSign, Calendar, User as UserIcon, Building2,
  ExternalLink, CheckCircle2, AlertCircle, ShieldCheck
} from 'lucide-react';

export default function AdminInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      const res = await getAdminInvoiceById(invoiceId, token);
      setInvoice(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#4f5962] text-sm font-medium">Loading invoice detail from PostgreSQL...</div>;
  }

  if (!invoice) {
    return (
      <div className="p-8 bg-white border border-[#e5e7eb] rounded-md text-center space-y-4 shadow-sm max-w-2xl mx-auto">
        <AlertCircle className="w-8 h-8 text-[#f15e75] mx-auto" />
        <h2 className="text-xl font-bold text-[#2b2b2b]">Invoice Not Found</h2>
        <p className="text-xs text-[#6b7280]">No invoice matching ID "{invoiceId}" exists in PostgreSQL.</p>
        <Link href="/admin/invoices" className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] text-white rounded-md text-xs font-bold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices List</span>
        </Link>
      </div>
    );
  }

  const userName = (invoice.user?.firstName || invoice.user?.lastName)
    ? `${invoice.user?.firstName || ''} ${invoice.user?.lastName || ''}`.trim()
    : invoice.user?.email;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/invoices"
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Invoice #{invoice.id}</h1>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  invoice.paymentStatus === 1
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : invoice.paymentStatus === 2
                    ? 'bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {invoice.paymentStatus === 1 ? 'PAID' : invoice.paymentStatus === 2 ? 'FAILED' : 'PENDING'}
              </span>
            </div>
            <p className="text-xs text-[#6b7280]">Created on {new Date(invoice.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
          Historical Ledger Immutable
        </span>
      </div>

      {/* Main Detail Card */}
      <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-6 text-xs text-[#4f5962]">
        {/* Top Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-[#e5e7eb] pb-4">
          <div>
            <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Invoice Type</span>
            <span className="text-sm font-extrabold text-[#2b2b2b] uppercase">{invoice.invoiceType || 'Reservation'}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Total Amount</span>
            <span className="text-lg font-extrabold text-[#f15e75]">${Number(invoice.totalAmount).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Payment Gateway</span>
            <span className="text-sm font-bold text-[#2b2b2b]">{invoice.paymentGateway || 'Standard Gateway'}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Payment Reference</span>
            <span className="text-xs font-mono text-[#6b7280]">{invoice.paymentReference || 'N/A'}</span>
          </div>
        </div>

        {/* User & Reservation Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* User Info */}
          <div className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-md space-y-2">
            <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Billed User / Customer</span>
            {invoice.user ? (
              <div>
                <h5 className="font-bold text-[#2b2b2b] text-sm">{userName}</h5>
                <p className="text-[11px] text-[#6b7280] mb-2">{invoice.user.email}</p>
                <Link
                  href={`/admin/users/${invoice.user.id}`}
                  className="text-[11px] text-[#f15e75] font-bold hover:underline flex items-center gap-1"
                >
                  <span>View Customer Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <span className="text-gray-400">User Unassigned</span>
            )}
          </div>

          {/* Reservation / Listing Info */}
          <div className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-md space-y-2">
            <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Related Booking / Property</span>
            {invoice.reservation ? (
              <div>
                <h5 className="font-bold text-[#2b2b2b] text-sm">{invoice.reservation.property?.title || 'Booked Rental'}</h5>
                <p className="text-[10px] text-[#6b7280] font-mono mb-2">Reservation ID: {invoice.reservation.id}</p>
                <Link
                  href={`/admin/reservations/${invoice.reservation.id}`}
                  className="text-[11px] text-[#f15e75] font-bold hover:underline flex items-center gap-1"
                >
                  <span>View Reservation Detail</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <span className="text-gray-400">No Reservation Attached (Direct Listing or Membership Fee)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
