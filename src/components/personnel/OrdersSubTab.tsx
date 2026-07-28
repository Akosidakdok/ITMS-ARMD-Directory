import React from 'react';
import { Personnel } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { FileText, Calendar } from 'lucide-react';
import { Badge } from '../common/Badge';

interface OrdersSubTabProps {
  personnel: Personnel;
}

export const OrdersSubTab: React.FC<OrdersSubTabProps> = ({ personnel }) => {
  const { ordersList } = useAuthRole();

  const relatedOrders = ordersList.filter(o => 
    o.subject.toLowerCase().includes(personnel.lastName.toLowerCase()) ||
    o.description?.toLowerCase().includes(personnel.lastName.toLowerCase()) ||
    o.subject.toLowerCase().includes(personnel.badgeNo.toLowerCase()) ||
    (o.orderNumber && o.orderNumber.toLowerCase().includes('045')) ||
    o.orderType === 'Assignment Order'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Issued Administrative Orders & Directives
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Special orders, movement orders, and official commendations affecting personnel</p>
        </div>
      </div>

      {relatedOrders.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-xs font-semibold">No direct orders indexed for this personnel record.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relatedOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="sm">
                    {ord.orderType}
                  </Badge>
                  <span className="text-xs font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                </div>

                <Badge variant={ord.status === 'Active' ? 'success' : 'neutral'} size="sm">
                  {ord.status}
                </Badge>
              </div>

              <h4 className="text-sm font-bold text-blue-700 leading-snug">{ord.subject}</h4>

              {ord.description && (
                <p className="text-xs text-slate-900 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">
                  {ord.description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5 font-mono text-slate-700 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" /> Effective: {ord.effectiveDate}
                </span>
                <span className="font-semibold text-slate-700">
                  By Order of: <span className="text-blue-700 font-bold">{ord.signatory}</span> ({ord.signatoryTitle})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


