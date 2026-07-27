import React from "react";
import { Badge } from "@/components/ui/badge";

type Status = 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'on_hold' | 'pending' | 'completed';

interface StatusBadgeProps {
  status: Status | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariantInfo = (s: string) => {
    switch (s.toLowerCase()) {
      case 'draft':
        return { label: 'Draft', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200' };
      case 'submitted':
        return { label: 'Submitted', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' };
      case 'under_review':
        return { label: 'Under Review', color: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' };
      case 'accepted':
        return { label: 'Accepted', color: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' };
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' };
      case 'on_hold':
        return { label: 'On Hold', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200' };
      case 'pending':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200' };
      case 'completed':
        return { label: 'Completed', color: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' };
      case 'accept':
        return { label: 'Accept', color: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' };
      case 'accept_minor_review':
        return { label: 'Accept – Minor Review', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' };
      case 'accept_major_review':
        return { label: 'Accept – Major Review', color: 'bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-200' };
      case 'reject':
        return { label: 'Reject', color: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' };
      case 'revise':
        return { label: 'Revise & Resubmit', color: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' };
      default:
        return { label: s.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200' };
    }
  };

  const { label, color } = getVariantInfo(status);

  return (
    <Badge variant="outline" className={`${color} capitalize ${className || ''}`}>
      {label}
    </Badge>
  );
}
