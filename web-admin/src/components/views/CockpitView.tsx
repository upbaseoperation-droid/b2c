'use client';

import React from 'react';
import {
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ClipboardList,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Avatar,
  Button,
  EmptyState,
  Panel,
  Person,
  Segmented,
  Stat,
  StatRow,
  Status,
} from '../ui';
import { SlaTask, UserProfile, BookingDealItem, TaskAssignmentRoleKey } from '../../lib/types';

const ROLE_SHORT_LABELS: Record<TaskAssignmentRoleKey, string> = {
  PIC_OWNER: 'PIC / Owner',
  CO_PIC: 'Co-PIC',
  EXECUTION: 'Execution',
  SUPPORT: 'Support',
};

interface CockpitViewProps {
  currentUser: UserProfile;
  tasks: SlaTask[];
  onCompleteTask: (taskId: string) => void;
  onOpenQuickBook: () => void;
  onSelectDeal: (deal: BookingDealItem) => void;
  deals: BookingDealItem[];
  onTaskActionClick?: (task: SlaTask) => void;
  onNavigateToInputPlan?: () => void;
  onNavigateToAirSync?: () => void;
  onNavigateToTaskDelegation?: () => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  currentUser,
  tasks,
  onCompleteTask,
  onSelectDeal,
  deals,
  onTaskActionClick,
  onNavigateToInputPlan,
  onNavigateToAirSync,
  onNavigateToTaskDelegation,
}) => {
  const userFirstToken = React.useMemo(() => currentUser.name.split(' ')[0], [currentUser.name]);

  const relevantTasks = React.useMemo(() => {
    return tasks.filter(t => {
      if (currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') return true;
      return (
        t.targetRole === currentUser.role ||
        t.pic.includes(userFirstToken) ||
        currentUser.name.toLowerCase().includes(t.pic.toLowerCase())
      );
    });
  }, [tasks, currentUser.role, currentUser.name, userFirstToken]);

  const { criticalCount, warningCount, doneCount } = React.useMemo(() => {
    let crit = 0;
    let warn = 0;
    let done = 0;
    for (const t of relevantTasks) {
      if (t.urgency === 'done') done++;
      else if (t.urgency === 'critical') crit++;
      else if (t.urgency === 'warning' || t.urgency === 'normal') warn++;
    }
    return { criticalCount: crit, warningCount: warn, doneCount: done };
  }, [relevantTasks]);

  const [filterTab, setFilterTab] = React.useState<'ALL' | 'CRITICAL' | 'WARNING' | 'DONE'>('ALL');

  const displayedTasks = React.useMemo(() => {
    if (filterTab === 'CRITICAL') return relevantTasks.filter(t => t.urgency === 'critical');
    if (filterTab === 'WARNING') return relevantTasks.filter(t => t.urgency === 'warning' || t.urgency === 'normal');
    if (filterTab === 'DONE') return relevantTasks.filter(t => t.urgency === 'done');
    return relevantTasks;
  }, [relevantTasks, filterTab]);

  const dealsMap = React.useMemo(() => {
    const map = new Map<string, BookingDealItem>();
    for (const d of deals) {
      if (d.dealCode) map.set(d.dealCode, d);
    }
    return map;
  }, [deals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs text-ink-2">
          <Avatar name={currentUser.name} src={currentUser.larkAvatarUrl} size={26} />
          <span className="font-semibold text-ink">{currentUser.name}</span>
          <span className="text-ink-3">·</span>
          <span>{currentUser.roleTitle}</span>
          <span className="text-ink-3">·</span>
          <span>
            Hôm nay có <strong className="text-ink">{criticalCount + warningCount}</strong> việc cần xử lý
            {criticalCount > 0 && <strong className="text-critical ml-1">({criticalCount} khẩn cấp)</strong>}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToInputPlan && (
            <Button variant="secondary" size="sm" onClick={onNavigateToInputPlan}>
              Kế hoạch tháng
            </Button>
          )}
          {onNavigateToAirSync && (
            <Button variant="secondary" size="sm" onClick={onNavigateToAirSync}>
              Lịch lên sóng
            </Button>
          )}
          {onNavigateToTaskDelegation && (
            <Button variant="secondary" size="sm" onClick={onNavigateToTaskDelegation}>
              Giao việc & định mức
            </Button>
          )}
        </div>
      </div>

      <StatRow>
        <Stat
          label="Khẩn cấp"
          value={criticalCount}
          tone={criticalCount > 0 ? 'critical' : undefined}
          icon={AlertCircle}
        />
        <Stat
          label="Trong ngày"
          value={warningCount}
          tone={warningCount > 0 ? 'warning' : undefined}
          icon={Clock}
        />
        <Stat
          label="Đã hoàn tất"
          value={doneCount}
          tone="positive"
          icon={CheckCircle2}
        />
        <Stat
          label="Tổng đầu việc"
          value={relevantTasks.length}
          icon={ClipboardList}
        />
      </StatRow>

      <Panel
        flush
        title={`Nhiệm vụ cần xử lý (${displayedTasks.length}/${relevantTasks.length})`}
        actions={
          <Segmented
            items={[
              { key: 'ALL', label: `Tất cả (${relevantTasks.length})` },
              { key: 'CRITICAL', label: `Khẩn cấp (${criticalCount})` },
              { key: 'WARNING', label: `Trong ngày (${warningCount})` },
              { key: 'DONE', label: `Đã xong (${doneCount})` },
            ]}
            value={filterTab}
            onChange={setFilterTab}
          />
        }
      >
        <div className="divide-y divide-line">
          {displayedTasks.length === 0 ? (
            <EmptyState
              title="Không có công việc trong mục này"
              description="Các đầu việc thuộc trạng thái đã chọn đã được xử lý xong."
            />
          ) : (
            displayedTasks.map((task) => {
              const matchedDeal = task.dealCode ? dealsMap.get(task.dealCode) : undefined;
              return (
                <div
                  key={task.id}
                  className={`px-4 py-3.5 hover:bg-canvas transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.urgency === 'done' ? 'opacity-60 bg-canvas' : 'bg-surface'
                  } ${task.urgency === 'critical' ? 'border-l-2 border-critical pl-3.5' : ''}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onCompleteTask(task.id)}
                      title="Đánh dấu hoàn thành"
                      aria-label="Đánh dấu hoàn thành"
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        task.urgency === 'done'
                          ? 'bg-positive border-positive text-white'
                          : 'border-line-strong hover:border-accent bg-surface'
                      }`}
                    >
                      {task.urgency === 'done' && <CheckCircle2 className="w-3 h-3" />}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => onTaskActionClick && onTaskActionClick(task)}
                          className={`text-xs font-semibold cursor-pointer hover:text-accent transition truncate ${
                            task.urgency === 'done'
                              ? 'line-through text-ink-3'
                              : 'text-ink'
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.storeName && (
                          <span className="text-2xs font-medium text-ink-2 bg-canvas px-1.5 py-0.5 rounded border border-line">
                            {task.storeName}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3">
                        <Person name={task.pic} size={18} />
                        <span>·</span>
                        <span>{task.team}</span>
                        <span>·</span>
                        <span>Hạn xử lý: <strong className="font-medium text-ink-2">{task.deadline}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Status
                      tone={
                        task.urgency === 'critical'
                          ? 'critical'
                          : task.urgency === 'warning'
                          ? 'warning'
                          : task.urgency === 'done'
                          ? 'positive'
                          : 'neutral'
                      }
                    >
                      {task.remainingText}
                    </Status>

                    {matchedDeal ? (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={ArrowRight}
                        onClick={() => onSelectDeal(matchedDeal)}
                      >
                        Xem hợp đồng
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={ExternalLink}
                        onClick={() => onTaskActionClick && onTaskActionClick(task)}
                      >
                        Chi tiết
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
};
