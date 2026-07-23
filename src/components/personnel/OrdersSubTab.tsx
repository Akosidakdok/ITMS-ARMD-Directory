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
    o.orderNumber.toLowerCase().includes('045') ||
    o.orderType === 'Assignment Order'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Issued Administrative Orders & Directives
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Special orders, movement orders, and official commendations affecting personnel</p>
        </div>
      </div>

      {relatedOrders.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">No direct orders indexed for this personnel record.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relatedOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-5 rounded-xl glass-panel bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="sm">
                    {ord.orderType}
                  </Badge>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{ord.orderNumber}</span>
                </div>

                <Badge variant={ord.status === 'Active' ? 'success' : 'neutral'} size="sm">
                  {ord.status}
                </Badge>
              </div>

              <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 leading-snug">{ord.subject}</h4>

              {ord.description && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  {ord.description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-1.5 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Effective: {ord.effectiveDate}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  By Order of: <span className="text-blue-700 dark:text-blue-400 font-bold">{ord.signatory}</span> ({ord.signatoryTitle})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

