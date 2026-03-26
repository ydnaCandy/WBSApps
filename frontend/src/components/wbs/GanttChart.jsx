import React, { useMemo, useRef, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

export default function GanttChart({ visibleTasks, startDate, endDate, onTaskChange, viewMode = 'planned' }) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  
  // ガントチャートの表示期間（デフォルトは今日から3ヶ月間等）
  const chartStart = startDate ? dayjs(startDate).subtract(7, 'day') : dayjs().startOf('month');
  const chartEnd = endDate ? dayjs(endDate).add(14, 'day') : dayjs().add(2, 'month').endOf('month');
  
  const totalDays = chartEnd.diff(chartStart, 'day');
  const cellWidth = 24; // 1日あたりのピクセル幅

  // --- ドラッグ操作用ステート ---
  const [dragState, setDragState] = useState({
    active: false,
    taskId: null,
    actionType: null, // 'move' | 'resize-start' | 'resize-end' | 'progress'
    startX: 0,
    currentX: 0,
    initialTaskStart: null,
    initialTaskEnd: null,
    initialProgress: 0,
  });

  // ドラッグ中のプレビューステート（各タスクの一時的な状態を保持）
  const [taskPreviews, setTaskPreviews] = useState({});

  // 表示モードに応じたフィールド名のヘルパー
  const startField = viewMode === 'actual' ? 'actual_start' : 'planned_start';
  const endField = viewMode === 'actual' ? 'actual_end' : 'planned_end';

  // 外部からの更新でプレビューを同期
  useEffect(() => {
    if (!dragState.active) {
      setTaskPreviews({});
    }
  }, [visibleTasks, dragState.active]);


  // 日付ヘッダーの生成
  const headers = useMemo(() => {
    const days = [];
    const months = [];
    let currentMonth = null;
    let daysInMonth = 0;

    for (let i = 0; i <= totalDays; i++) {
      const d = chartStart.add(i, 'day');
      days.push({
        date: d,
        isWeekend: d.day() === 0 || d.day() === 6,
        isToday: d.isSame(dayjs(), 'day')
      });

      const monthLabel = d.format('YYYY年 M月');
      if (currentMonth !== monthLabel) {
        if (currentMonth) {
          months.push({ label: currentMonth, days: daysInMonth });
        }
        currentMonth = monthLabel;
        daysInMonth = 1;
      } else {
        daysInMonth++;
      }
    }
    if (currentMonth) {
      months.push({ label: currentMonth, days: daysInMonth });
    }
    return { days, months };
  }, [chartStart, totalDays]);


  // --- ドラッグイベントハンドラ ---
  const handleMouseDown = (e, task, actionType) => {
    e.stopPropagation();
    if (!task[startField] || !task[endField]) return;

    setDragState({
      active: true,
      taskId: task.id,
      actionType,
      startX: e.clientX,
      currentX: e.clientX,
      initialTaskStart: dayjs(task[startField]),
      initialTaskEnd: dayjs(task[endField]),
      initialProgress: task.progress || 0,
    });

    setTaskPreviews({
      [task.id]: {
        [startField]: task[startField],
        [endField]: task[endField],
        progress: task.progress || 0
      }
    });

    // テキスト選択などを防ぐ
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState.active || !dragState.taskId) return;
      
      const dx = e.clientX - dragState.startX;
      const daysDiff = Math.floor(dx / cellWidth); // マウスの移動ピクセルを日数に換算 (離散値)
      
      if (daysDiff === 0 && dragState.actionType !== 'progress') return;

      const preview = { ...taskPreviews[dragState.taskId] };
      const start = dragState.initialTaskStart;
      const end = dragState.initialTaskEnd;

      if (dragState.actionType === 'move') {
        preview[startField] = start.add(daysDiff, 'day').format('YYYY-MM-DD');
        preview[endField] = end.add(daysDiff, 'day').format('YYYY-MM-DD');
      } else if (dragState.actionType === 'resize-start') {
        const newStart = start.add(daysDiff, 'day');
        if (!newStart.isAfter(end)) {
          preview[startField] = newStart.format('YYYY-MM-DD');
        }
      } else if (dragState.actionType === 'resize-end') {
        const newEnd = end.add(daysDiff, 'day');
        if (!newEnd.isBefore(start)) {
          preview[endField] = newEnd.format('YYYY-MM-DD');
        }
      } else if (dragState.actionType === 'progress') {
        // 進捗変更: バー全体の幅に対するマウスの移動割合
        const durationDays = end.diff(start, 'day') + 1;
        const width = durationDays * cellWidth;
        const progressDiff = Math.round((dx / width) * 100);
        let newProgress = dragState.initialProgress + progressDiff;
        if (newProgress < 0) newProgress = 0;
        if (newProgress > 100) newProgress = 100;
        // 10%刻みにスナップ
        preview.progress = Math.round(newProgress / 10) * 10;
      }

      setTaskPreviews(prev => ({ ...prev, [dragState.taskId]: preview }));
    };

    const handleMouseUp = () => {
      if (dragState.active && dragState.taskId) {
        // 親コンポーネントに変更を通知
        const finalPreview = taskPreviews[dragState.taskId];
        if (finalPreview && onTaskChange) {
          const originalTask = visibleTasks.find(t => t.id === dragState.taskId);
          if (originalTask && (
              originalTask[startField] !== finalPreview[startField] ||
              originalTask[endField] !== finalPreview[endField] ||
              originalTask.progress !== finalPreview.progress
            )) {
            onTaskChange(dragState.taskId, finalPreview);
          }
        }
      }
      setDragState({ active: false, taskId: null, actionType: null });
      document.body.style.userSelect = '';
    };

    if (dragState.active) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, taskPreviews, cellWidth, onTaskChange, visibleTasks]);


  // タスクの描画位置・幅を計算する関数
  const getTaskStyle = (task) => {
    const renderTask = taskPreviews[task.id] 
      ? { ...task, ...taskPreviews[task.id] } 
      : task;

    if (!renderTask[startField] || !renderTask[endField]) return null;
    
    const start = dayjs(renderTask[startField]);
    const end = dayjs(renderTask[endField]);
    
    // チャート範囲外の場合は描画しない、または切り詰める
    if (end.isBefore(chartStart) || start.isAfter(chartEnd)) return null;

    const leftOffset = Math.max(0, start.diff(chartStart, 'day')) * cellWidth;
    // 日付1日分を含めるために +1 とする
    const durationDays = Math.max(1, end.diff(start, 'day') + 1);
    const width = durationDays * cellWidth;

    return { 
      left: leftOffset, 
      width,
      progress: renderTask.progress || 0
    };
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200" ref={containerRef}>
      {/* タイムラインのヘッダー */}
      <div className="shrink-0 bg-slate-50 border-b border-slate-200 sticky top-0 z-10 w-max">
        {/* 月 */}
        <div className="flex border-b border-slate-200">
          {headers.months.map((m, i) => (
            <div 
              key={i} 
              className="px-2 py-1 text-xs font-semibold text-slate-600 border-r border-slate-200 truncate"
              style={{ width: m.days * cellWidth, minWidth: m.days * cellWidth }}
            >
              {m.label}
            </div>
          ))}
        </div>
        {/* 日 */}
        <div className="flex">
          {headers.days.map((d, i) => (
            <div 
              key={i} 
              className={`flex flex-col items-center justify-center shrink-0 border-r border-slate-200 h-8
                ${d.isWeekend ? 'bg-slate-100 flex-col' : ''}
                ${d.isToday ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500'}
              `}
              style={{ width: cellWidth, minWidth: cellWidth }}
            >
              <div className="text-[10px] leading-none">{d.date.format('D')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ガントチャート描画エリア (横幅はヘッダーに合わせる) */}
      <div ref={scrollRef} className="flex-1 relative overflow-y-auto overflow-x-hidden" style={{ width: (totalDays + 1) * cellWidth }}>
        {/* 背景のグリッド線 */}
        <div className="absolute top-0 bottom-0 left-0 flex pointer-events-none">
          {headers.days.map((d, i) => (
            <div 
              key={i} 
              className={`border-r shrink-0 h-full ${d.isWeekend ? 'bg-slate-50/50 border-slate-100' : 'border-slate-100'} ${d.isToday ? 'border-r-blue-200 bg-blue-50/30' : ''}`}
              style={{ width: cellWidth, minWidth: cellWidth }}
            />
          ))}
        </div>

        {/* タスクバーの描画 */}
        <div className="absolute inset-0">
          {visibleTasks.map((task) => {
            const style = getTaskStyle(task);
            const isDragging = dragState.active && dragState.taskId === task.id;
            
            return (
              <div 
                key={task.id} 
                className={`flex items-center border-b border-slate-100/0 hover:bg-slate-50/50 transition-colors group relative ${task.level === 1 ? 'bg-slate-50/20' : ''}`}
                style={{ height: '40px', width: (totalDays + 1) * cellWidth }}
              >
                {style && (
                  <div 
                    className={`absolute h-5 rounded-md shadow-sm flex items-center overflow-hidden transition-shadow ${isDragging ? 'shadow-lg z-20 cursor-grabbing' : 'cursor-grab hover:shadow-md'}`}
                    style={{ 
                      left: style.left, 
                      width: style.width,
                      backgroundColor: viewMode === 'actual' 
                        ? (task.level === 1 ? '#94a3b8' : task.level === 2 ? '#64748b' : '#475569') // 実績モード用のトーン (スレート)
                        : (task.level === 1 ? '#cbd5e1' : task.level === 2 ? '#93c5fd' : '#3b82f6'), // 予定モード
                      top: '10px' // 40pxの高さの中央配置
                    }}
                    onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                    title={`${task.title} (${viewMode === 'actual' ? '実績' : '予定'})`}
                  >
                    {/* 進捗のハイライト */}
                    {style.progress > 0 && (
                      <div 
                        className="absolute top-0 bottom-0 left-0 bg-black/10 pointer-events-none"
                        style={{ width: `${style.progress}%` }}
                      />
                    )}
                    
                    {/* 開始リサイズ用ハンドル */}
                    <div 
                      className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-black/10 ${isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
                      onMouseDown={(e) => handleMouseDown(e, task, 'resize-start')}
                    />

                    {/* テキスト */}
                    {style.width > 40 && (
                      <span className="text-[10px] text-white font-medium px-2 truncate relative z-10 drop-shadow-sm pointer-events-none select-none">
                        {task.title} {style.progress}%
                      </span>
                    )}

                    {/* 進捗変更用スライダー (バー中間のハンドル) */}
                    <div 
                      className={`absolute top-0 bottom-0 w-3 cursor-ew-resize z-10 hidden group-hover:block hover:bg-white/30`}
                      style={{ left: `max(0px, calc(${style.progress}% - 6px))` }}
                      onMouseDown={(e) => handleMouseDown(e, task, 'progress')}
                    />

                    {/* 終了リサイズ用ハンドル */}
                    <div 
                      className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-black/10 ${isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
                      onMouseDown={(e) => handleMouseDown(e, task, 'resize-end')}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
