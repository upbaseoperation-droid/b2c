'use client';
import { Avatar } from '../ui';

import {
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Calculator
} from 'lucide-react';
import { SlaTask, UserProfile, BookingDealItem } from '../../lib/types';

interface CockpitViewProps {
  currentUser: UserProfile;
  tasks: SlaTask[];
  onCompleteTask: (taskId: string) => void;
  onOpenQuickBook: () => void;
  onSelectDeal: (deal: BookingDealItem) => void;
  deals: BookingDealItem[];
  onTaskActionClick?: (task: SlaTask) => void;
  onNavigateToInputPlan?: () => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  currentUser,
  tasks,
  onCompleteTask,
  onSelectDeal,
  deals,
  onTaskActionClick,
  onNavigateToInputPlan
}) => {
  const relevantTasks = tasks.filter(t => {
    if (currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') return true;
    return t.targetRole === currentUser.role || t.pic.includes(currentUser.name.split(' ')[0]);
  });

  const criticalCount = relevantTasks.filter(t => t.urgency === 'critical').length;
  const warningCount = relevantTasks.filter(t => t.urgency === 'warning' || t.urgency === 'normal').length;
  const doneCount = relevantTasks.filter(t => t.urgency === 'done').length;

  return (
    <div className="space-y-4">
      {/* User Greeting & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Avatar name={currentUser.name} src={currentUser.larkAvatarUrl} size={36} />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Xin chào, {currentUser.name}
            </h2>
            <p className="text-xs text-slate-500">
              {currentUser.roleTitle} • Hôm nay có <span className="font-semibold text-slate-800">{criticalCount + warningCount}</span> việc cần xử lý
            </p>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs">
            <span className="text-rose-700 mr-1.5 font-medium">Khẩn cấp:</span>
            <span className="font-semibold text-rose-800">{criticalCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
            <span className="text-amber-800 mr-1.5 font-medium">Trong ngày:</span>
            <span className="font-semibold text-amber-900">{warningCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
            <span className="text-emerald-700 mr-1.5 font-medium">Hoàn thành:</span>
            <span className="font-semibold text-emerald-800">{doneCount}</span>
          </div>
        </div>
      </div>



      {/* Task List */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">
            Nhiệm vụ cần xử lý ({relevantTasks.length})
          </span>
          <span className="text-xs text-slate-500">
            Sắp xếp theo thứ tự ưu tiên SLA
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {relevantTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Không có công việc nào tồn đọng.
            </div>
          ) : (
            relevantTasks.map((task) => {
              const matchedDeal = deals.find(d => d.dealCode === task.dealCode);
              return (
                <div
                  key={task.id}
                  className={`px-5 py-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.urgency === 'done' ? 'opacity-60 bg-slate-50/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => onCompleteTask(task.id)}
                      title="Đánh dấu hoàn thành"
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        task.urgency === 'done'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-blue-500 bg-white'
                      }`}
                    >
                      {task.urgency === 'done' && <CheckCircle2 className="w-3 h-3" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => onTaskActionClick && onTaskActionClick(task)}
                          className={`text-xs font-semibold cursor-pointer hover:text-blue-600 transition truncate ${
                            task.urgency === 'done'
                              ? 'line-through text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-2xs px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                          {task.team}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-2xs text-slate-500 mt-1">
                        <span>Phụ trách: <strong className="font-medium text-slate-700">{task.pic}</strong></span>
                        <span>•</span>
                        <span>Hạn xử lý: <strong className="font-medium text-slate-700">{task.deadline}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span
                      className={`text-2xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border ${
                        task.urgency === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        task.urgency === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        task.urgency === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {task.urgency === 'critical' && <AlertCircle className="w-3 h-3" />}
                      {task.remainingText}
                    </span>

                    {matchedDeal ? (
                      <button
                        onClick={() => onSelectDeal(matchedDeal)}
                        className="btn-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition"
                      >
                        <span>Hợp đồng</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onTaskActionClick && onTaskActionClick(task)}
                        className="btn-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium shadow-2xs transition"
                      >
                        <span>Chi tiết</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
