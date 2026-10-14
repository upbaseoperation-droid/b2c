'use client';

import React from 'react';
import {
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';
import {
  Avatar,
  Button,
  EmptyState,
  Panel,
  Person,
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

  const dealsMap = React.useMemo(() => {
    const map = new Map<string, BookingDealItem>();
    for (const d of deals) {
      if (d.dealCode) map.set(d.dealCode, d);
    }
    return map;
  }, [deals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-surface border border-line">
        <div className="flex items-center gap-3">
          <Avatar name={currentUser.name} src={currentUser.larkAvatarUrl} size={36} />
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Xin chào, {currentUser.name}
            </h2>
            <p className="text-xs text-ink-3">
              {currentUser.roleTitle} · Hôm nay có <span className="font-semibold text-ink">{criticalCount + warningCount}</span> việc cần xử lý
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToTaskDelegation && (
            <Button variant="secondary" size="sm" icon={ClipboardList} onClick={onNavigateToTaskDelegation}>
              Giao việc &amp; Định mức Task
            </Button>
          )}
          {onNavigateToAirSync && (
            <Button variant="primary" size="sm" onClick={onNavigateToAirSync}>
              Lịch air tuần &amp; độ đồng loạt
            </Button>
          )}
          {onNavigateToInputPlan && (
            <Button variant="secondary" size="sm" onClick={onNavigateToInputPlan}>
              Xem kế hoạch tháng
            </Button>
          )}
        </div>
      </div>

      <StatRow>
        <Stat
          label="Khẩn cấp"
          value={criticalCount}
          tone={criticalCount > 0 ? 'critical' : undefined}
          note="Cần xử lý ngay theo hạn SLA"
        />
        <Stat
          label="Trong ngày"
          value={warningCount}
          tone={warningCount > 0 ? 'warning' : undefined}
          note="Đang trong khung giờ cam kết"
        />
        <Stat
          label="Đã hoàn tất"
          value={doneCount}
          tone="positive"
          note="Đạt cam kết SLA"
        />
        <Stat
          label="Tổng đầu việc"
          value={relevantTasks.length}
          note={currentUser.roleTitle}
        />
      </StatRow>

      <Panel
        flush
        title={`Nhiệm vụ cần xử lý (${relevantTasks.length})`}
        description="Sắp xếp theo thứ tự ưu tiên SLA và định mức độ khó Task"
      >
        <div className="divide-y divide-line">
          {relevantTasks.length === 0 ? (
            <EmptyState
              title="Không có công việc tồn đọng"
              description="Các đầu việc trong ngày đã được xử lý xong."
            />
          ) : (
            relevantTasks.map((task) => {
              const matchedDeal = task.dealCode ? dealsMap.get(task.dealCode) : undefined;
              return (
                <div
                  key={task.id}
                  className={`px-4 py-3.5 hover:bg-canvas transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.urgency === 'done' ? 'opacity-60 bg-canvas' : 'bg-surface'
                  }`}
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
                        <span className="text-2xs px-1.5 py-0.5 rounded font-medium bg-sunken text-ink-2 border border-line">
                          {task.team}
                        </span>
                        {task.difficultyLabel && (
                          <span className="text-2xs px-1.5 py-0.5 rounded font-semibold bg-accent-soft text-accent border border-accent/20">
                            {task.difficultyLabel}
                            {typeof task.difficultyMultiplier === 'number'
                              ? ` · Hệ số ${task.difficultyMultiplier.toFixed(2).replace('.', ',')}`
                              : ''}
                          </span>
                        )}
                        {task.assignmentRole && (
                          <span className="text-2xs px-1.5 py-0.5 rounded font-medium bg-canvas text-ink-2 border border-line">
                            {ROLE_SHORT_LABELS[task.assignmentRole]}
                            {typeof task.contributionWeightPct === 'number' ? ` · ${task.contributionWeightPct}%` : ''}
                          </span>
                        )}
                        {typeof task.calculatedWorkloadPoints === 'number' && (
                          <span className="text-2xs font-mono font-semibold text-ink-2">
                            {task.calculatedWorkloadPoints.toFixed(1)} điểm WL
                          </span>
                        )}
                      </div>

                      {task.expectedDeliverable && (
                        <div className="text-2xs text-ink-3 truncate">
                          Đầu ra: <span className="text-ink-2">{task.expectedDeliverable}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3">
                        <Person name={task.pic} size={18} />
                        {task.storeName && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-ink-2">{task.storeName}</span>
                          </>
                        )}
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
