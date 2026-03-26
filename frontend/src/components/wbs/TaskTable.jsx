import React from 'react';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function TaskTable({ visibleTasks, expandedIds, toggleExpand, onTaskAdd, onTaskClick }) {
  const { statuses, users, isAdmin } = useAppContext();

  // マスタから名前を取得するヘルパー
  const getStatusName = (id) => statuses.find(s => s.id === id)?.name || '未設定';
  const getStatusColor = (id) => statuses.find(s => s.id === id)?.color || '#e2e8f0';
  const getUserName = (id) => users.find(u => u.id === id)?.name || '未割当';

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-x-auto">
      {/* テーブルヘッダー (最小幅を確保して横スクロール可能に) */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase shrink-0 min-w-max">
        <div className="w-64 p-3 border-r border-slate-200 truncate shrink-0">タスク名</div>
        <div className="w-24 p-3 border-r border-slate-200 text-center shrink-0">開始(予定)</div>
        <div className="w-24 p-3 border-r border-slate-200 text-center shrink-0">開始(実績)</div>
        <div className="w-24 p-3 border-r border-slate-200 text-center shrink-0">終了(予定)</div>
        <div className="w-24 p-3 border-r border-slate-200 text-center shrink-0">終了(実績)</div>
        <div className="w-24 p-3 border-r border-slate-200 shrink-0">ステータス</div>
        <div className="w-16 p-3 border-r border-slate-200 text-right shrink-0">進捗</div>
        <div className="w-32 p-3 shrink-0">担当者</div>
      </div>

      {/* テーブルボディ */}
      <div 
        className="flex-1 overflow-y-auto min-w-max pb-16"
        onClick={() => onTaskClick && onTaskClick(null)}
      >
        {visibleTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">タスクが存在しません。</div>
        ) : (
          visibleTasks.map((task) => {
            const isExpanded = expandedIds.has(task.id);
            const paddingLeft = task.level === 1 ? 12 : task.level === 2 ? 32 : 52;
            const canEdit = isAdmin || task.level === 3; // L1,L2は管理者のみ、L3は誰でも

            return (
              <div 
                key={task.id} 
                className={`flex border-b border-slate-100 items-center hover:bg-slate-50 transition-colors group ${task.level === 1 ? 'bg-slate-50/50 font-medium' : ''}`}
                style={{ height: '40px' }}
              >
                {/* タスク名列 */}
                <div 
                  onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                  className="w-64 border-r border-slate-100 flex items-center h-full truncate shrink-0 cursor-pointer group-hover:bg-blue-50/30 transition-colors"
                  style={{ paddingLeft: `${paddingLeft}px` }}
                >
                  <div className="w-5 flex justify-center mr-1">
                    {(task.has_children || task.level < 3) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                        className="p-0.5 rounded hover:bg-slate-200 text-slate-400"
                        title={isExpanded ? "折りたたむ" : "展開する"}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  
                  {/* アイコン類 */}
                  <div className="truncate flex-1 text-sm text-slate-800" title={task.title}>
                    {task.title}
                  </div>

                  {/* ホバー時アクション */}
                  {canEdit && (
                    <div className="hidden group-hover:flex items-center gap-1 pr-2">
                       <button onClick={(e) => { e.stopPropagation(); onTaskAdd(task); }} className="text-slate-400 hover:text-blue-500" title="子タスク追加">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 予定開始 */}
                <div className="w-24 border-r border-slate-100 h-full flex items-center justify-center text-xs text-slate-600 shrink-0 tabular-nums">
                  {task.planned_start ? task.planned_start.replace('2026-','\'26-') : '-'}
                </div>
                {/* 実績開始 */}
                <div className="w-24 border-r border-slate-100 h-full flex items-center justify-center text-xs text-slate-500 shrink-0 bg-slate-50/30 tabular-nums">
                  {task.actual_start ? task.actual_start.replace('2026-','\'26-') : '-'}
                </div>
                {/* 予定終了 */}
                <div className="w-24 border-r border-slate-100 h-full flex items-center justify-center text-xs text-slate-600 shrink-0 tabular-nums">
                  {task.planned_end ? task.planned_end.replace('2026-','\'26-') : '-'}
                </div>
                {/* 実績終了 */}
                <div className="w-24 border-r border-slate-100 h-full flex items-center justify-center text-xs text-slate-500 shrink-0 bg-slate-50/30 tabular-nums">
                  {task.actual_end ? task.actual_end.replace('2026-','\'26-') : '-'}
                </div>
                
                {/* ステータス */}
                <div className="w-24 border-r border-slate-100 h-full flex items-center px-2 shrink-0">
                  {task.status_id ? (
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium border truncate w-full text-center"
                      style={{ 
                        backgroundColor: `${getStatusColor(task.status_id)}20`, 
                        color: getStatusColor(task.status_id),
                        borderColor: `${getStatusColor(task.status_id)}40` 
                      }}
                    >
                      {getStatusName(task.status_id)}
                    </span>
                  ) : <span className="text-xs text-slate-400 w-full text-center">-</span>}
                </div>
                {/* 進捗 */}
                <div className="w-16 border-r border-slate-100 h-full flex items-center justify-end px-3 text-xs text-slate-600 shrink-0">
                  {task.progress}%
                </div>
                {/* 担当者 */}
                <div className="w-32 h-full flex items-center px-3 text-xs text-slate-600 truncate shrink-0" title={getUserName(task.assignee_id)}>
                  {getUserName(task.assignee_id)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
