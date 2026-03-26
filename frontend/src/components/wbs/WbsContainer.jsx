import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Loader2 } from 'lucide-react';
import { api } from '../../context/AppContext';
import { useWbsData } from '../../hooks/useWbsData';
import TaskTable from './TaskTable';
import GanttChart from './GanttChart';
import TaskDetailPanel from './TaskDetailPanel';
import TaskFormModal from './TaskFormModal';
import dayjs from 'dayjs';

export default function WbsContainer() {
  const { currentProject } = useAppContext();
  const [rawTasks, setRawTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // 詳細パネル用
  
  // モーダル制御用
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskForModal, setEditingTaskForModal] = useState(null); 
  const [viewMode, setViewMode] = useState('planned'); // 'planned' | 'actual'

  // ペインサイズ幅 (パーセント)
  const [tableWidthPercent, setTableWidthPercent] = useState(50);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const startResize = (e) => {
    e.preventDefault();
    const handleMouseMove = (mouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidthPercent = ((mouseEvent.clientX - rect.left) / rect.width) * 100;
      if (newWidthPercent >= 20 && newWidthPercent <= 80) {
        setTableWidthPercent(newWidthPercent);
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };
  
  const [parentTaskForModal, setParentTaskForModal] = useState(null);

  const {
    expandedIds,
    setExpandedIds,
    toggleExpand,
    expandAllToLevel,
    collapseAll,
    visibleTasks
  } = useWbsData(rawTasks);

  // ツリー構築用関数。APIから取得したフラットなタスクリストから親子関係を構築。
  const buildTree = (tasks) => {
    const taskMap = new Map();
    const result = [];
    
    // まずMapに登録
    tasks.forEach(t => {
      taskMap.set(t.id, { ...t, children: [] });
    });

    tasks.forEach(t => {
      const node = taskMap.get(t.id);
      if (t.parent_id && taskMap.has(t.parent_id)) {
        taskMap.get(t.parent_id).children.push(node);
      } else {
        result.push(node);
      }
    });

    // ソート等が必要であればここで実施
    return result;
  };

  const fetchTasks = async () => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/projects/${currentProject.id}/wbs`);
      setRawTasks(buildTree(res.data));
    } catch (error) {
      console.error("Failed to fetch WBS", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTasks = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      if (expandedIds.size > 0) {
        const res = await api.get(`/api/v1/projects/${currentProject.id}/wbs?all_tasks=true`);
        setRawTasks(buildTree(res.data));
      } else {
        const res = await api.get(`/api/v1/projects/${currentProject.id}/wbs`);
        setRawTasks(buildTree(res.data));
      }
    } catch (error) {
      console.error("Failed to refresh WBS", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    setSelectedTask(null);
  }, [currentProject]);

  // 全タスクのうち、最小開始日と最大終了日を求めてガントチャートの表示範囲を決定する
  const { minDate, maxDate } = useMemo(() => {
    let min = null;
    let max = null;
    const updateMinMax = (dateStr) => {
      if (!dateStr) return;
      const d = dayjs(dateStr);
      if (!min || d.isBefore(min)) min = d;
      if (!max || d.isAfter(max)) max = d;
    };
    const process = (list) => {
      list.forEach(t => {
        updateMinMax(t.planned_start);
        updateMinMax(t.planned_end);
        updateMinMax(t.actual_start);
        updateMinMax(t.actual_end);
        if (t.children) process(t.children);
      });
    }
    process(rawTasks);
    return { 
      minDate: min ? min.toDate() : null, 
      maxDate: max ? max.toDate() : null 
    };
  }, [rawTasks]);

  // ======= タスクの追加ハンドラ =======

  // 親タスクを指定して新規作成
  const handleTaskAdd = (parentTask) => {
    setParentTaskForModal(parentTask);
    setIsModalOpen(true);
  };
  
  // ルート(Level 1)の新規作成
  const handleRootTaskAdd = () => {
    setParentTaskForModal(null);
    setIsModalOpen(true);
  };
  
  const handleTaskClick = (task) => {
    // 詳細パネルを開く
    setSelectedTask(task);
  };

  // フォームからの送信処理 (API呼び出し: 新規作成専用)
  const handleFormSubmit = async (taskData) => {
    try {
      setLoading(true);
      await api.post(`/api/v1/projects/${currentProject.id}/tasks`, taskData);
      
      setIsModalOpen(false);
      // 再取得してツリーを再構築
      await refreshTasks();
    } catch (error) {
      console.error("Failed to save task", error);
      alert("タスクの保存に失敗しました。権限がない可能性があります。");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/projects/${currentProject.id}/export`);
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wbs_export_${currentProject.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("エクスポートに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const text = await file.text();
      const tasksData = JSON.parse(text);
      if (!Array.isArray(tasksData)) throw new Error("Invalid format");
      
      await api.post(`/api/v1/projects/${currentProject.id}/import`, tasksData);
      alert("インポートが完了しました。");
      await refreshTasks();
    } catch (err) {
      console.error(err);
      alert("インポートに失敗しました。形式が正しくないか、管理者権限が必要です。");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ===================================

  // 子要素の遅延フェッチロジック (展開時に呼ばれる)
  const handleToggleExpand = async (taskId) => {
    if (expandedIds.has(taskId)) {
      toggleExpand(taskId);
      return;
    }

    const findTask = (list, id) => {
      for (const t of list) {
        if (t.id === id) return t;
        if (t.children && t.children.length > 0) {
          const found = findTask(t.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const target = findTask(rawTasks, taskId);
    if (target && target.has_children && (!target.children || target.children.length === 0)) {
      try {
        setLoading(true);
        const res = await api.get(`/api/v1/projects/${currentProject.id}/wbs?parent_id=${taskId}`);
        setRawTasks(prev => {
          const cloneList = JSON.parse(JSON.stringify(prev));
          const targetInClone = findTask(cloneList, taskId);
          if (targetInClone) {
            targetInClone.children = res.data.map(child => ({...child, children: []}));
          }
          return cloneList;
        });
      } catch (e) {
        console.error("Fetch children failed", e);
      } finally {
        setLoading(false);
      }
    }
    toggleExpand(taskId);
  };

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 text-slate-500">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-2 text-slate-700">プロジェクトが選択されていません</h2>
          <p className="text-sm">左側のサイドバーからプロジェクトを選択してください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] z-20">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{currentProject.name} <span className="text-xs font-normal px-2 py-0.5 ml-2 bg-blue-50 text-blue-600 rounded border border-blue-100">WBS</span></h2>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-slate-200 rounded overflow-hidden mr-2">
            <button
              onClick={() => setViewMode('planned')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'planned' ? 'bg-slate-200 text-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              予定
            </button>
            <button
              onClick={() => setViewMode('actual')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'actual' ? 'bg-slate-200 text-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              実績
            </button>
          </div>
          
          <div className="flex border border-slate-200 rounded mr-2 bg-white">
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-r border-slate-200 transition-colors"
            >
              インポート
            </button>
            <button 
              onClick={handleExport}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              エクスポート
            </button>
          </div>
          <button 
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            すべて折りたたむ
          </button>
          <button 
            onClick={async () => {
              try {
                setLoading(true);
                // バックエンドからプロジェクト全体の全タスクを平坦なリストとして取得する
                const res = await api.get(`/api/v1/projects/${currentProject.id}/wbs?all_tasks=true`);
                const allFetchedTasks = res.data;
                
                // 平坦なリストからツリー構造 (Level1 -> Level2 -> Level3) を構築する
                const taskMap = new Map();
                allFetchedTasks.forEach(t => {
                  taskMap.set(t.id, { ...t, children: [] });
                });
                
                const rootTasks = [];
                taskMap.forEach(t => {
                  if (t.parent_id) {
                    const parent = taskMap.get(t.parent_id);
                    if (parent) {
                      parent.children.push(t);
                    }
                  } else {
                    rootTasks.push(t);
                  }
                });

                // すべての親要素を展開状態（Expanded）にする
                const idsToExpand = allFetchedTasks.filter(t => t.has_children).map(t => t.id);
                setExpandedIds(new Set(idsToExpand));
                setRawTasks(rootTasks);
                
              } catch(e) {
                console.error(e);
                alert("タスクの全展開に失敗しました。");
              } finally {
                setLoading(false);
              }
            }}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            全展開
          </button>
          <button 
            onClick={handleRootTaskAdd}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all"
          >
            + タスク追加
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/60 z-30 transition-opacity">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-sm font-medium text-slate-700">データを処理しています...</span>
            </div>
          </div>
        )}

        <div className="flex w-full h-full" ref={containerRef}>
          {/* 左側: タスクテーブル */}
          <div 
            className="h-full overflow-hidden flex flex-col relative z-20 shadow-[1px_0_10px_0_rgba(0,0,0,0.05)] shrink-0"
            style={{ width: `${tableWidthPercent}%`, minWidth: '300px' }}
          >
            <TaskTable 
              visibleTasks={visibleTasks} 
              expandedIds={expandedIds} 
              toggleExpand={handleToggleExpand}
              onTaskAdd={handleTaskAdd}
              onTaskClick={handleTaskClick}
            />
          </div>

          {/* ドラッグハンドル */}
          <div 
            className="w-1 cursor-col-resize bg-slate-200 hover:bg-blue-400 active:bg-blue-500 z-30 transition-colors shrink-0"
            onMouseDown={startResize}
          />

          {/* 右側: ガントチャート (横スクロール対応) */}
          <div className="flex-1 h-full overflow-x-auto overflow-y-hidden flex flex-col relative bg-white">
            <GanttChart 
              visibleTasks={visibleTasks}
              startDate={minDate}
              endDate={maxDate}
              viewMode={viewMode}
              onTaskChange={async (taskId, updatedFields) => {
                try {
                  setLoading(true);
                  // 変更されたタスクを部分更新
                  const payload = {};
                  if (updatedFields.planned_start !== undefined) payload.planned_start = updatedFields.planned_start;
                  if (updatedFields.planned_end !== undefined) payload.planned_end = updatedFields.planned_end;
                  if (updatedFields.actual_start !== undefined) payload.actual_start = updatedFields.actual_start;
                  if (updatedFields.actual_end !== undefined) payload.actual_end = updatedFields.actual_end;
                  if (updatedFields.progress !== undefined) payload.progress = updatedFields.progress;
                  
                  await api.patch(`/api/v1/tasks/${taskId}`, payload);
                  await refreshTasks();
                } catch (error) {
                  console.error("Failed to update task from Gantt", error);
                  alert("タスクの更新に失敗しました。");
                } finally {
                  setLoading(false);
                }
              }}
            />
          </div>
        </div>

        {/* タスク詳細パネル */}
        <TaskDetailPanel 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onTaskUpdate={refreshTasks}
        />
        
        {/* 追加モーダル */}
        <TaskFormModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleFormSubmit}
          parentTask={parentTaskForModal}
        />
      </div>
    </div>
  );
}
