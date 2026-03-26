import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function TaskFormModal({ isOpen, onClose, onSubmit, editingTask = null, parentTask = null }) {
  const { statuses, users } = useAppContext();
  
  const [formData, setFormData] = useState({
    title: '',
    level: 1,
    parent_id: null,
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
    status_id: '',
    assignee_id: '',
    progress: 0,
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setFormData({
          title: editingTask.title || '',
          level: editingTask.level || 1,
          parent_id: editingTask.parent_id || null,
          planned_start: editingTask.planned_start || '',
          planned_end: editingTask.planned_end || '',
          actual_start: editingTask.actual_start || '',
          actual_end: editingTask.actual_end || '',
          status_id: editingTask.status_id || '',
          assignee_id: editingTask.assignee_id || '',
          progress: editingTask.progress || 0,
          notes: editingTask.notes || ''
        });
      } else if (parentTask) {
        setFormData({
          title: '',
          level: parentTask.level + 1,
          parent_id: parentTask.id,
          planned_start: '',
          planned_end: '',
          actual_start: '',
          actual_end: '',
          status_id: '',
          assignee_id: '',
          progress: 0,
          notes: ''
        });
      } else {
        // 新規ルートタスク (Level 1)
        setFormData({
          title: '',
          level: 1,
          parent_id: null,
          planned_start: '',
          planned_end: '',
          actual_start: '',
          actual_end: '',
          status_id: '',
          assignee_id: '',
          progress: 0,
          notes: ''
        });
      }
    }
  }, [isOpen, editingTask, parentTask]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 空文字の場合はnullとして送るためのクリーニング
    const dataToSubmit = { ...formData };
    if (!dataToSubmit.status_id) dataToSubmit.status_id = null;
    if (!dataToSubmit.assignee_id) dataToSubmit.assignee_id = null;
    if (!dataToSubmit.planned_start) dataToSubmit.planned_start = null;
    if (!dataToSubmit.planned_end) dataToSubmit.planned_end = null;
    if (!dataToSubmit.actual_start) dataToSubmit.actual_start = null;
    if (!dataToSubmit.actual_end) dataToSubmit.actual_end = null;
    // 数値変換
    dataToSubmit.progress = parseInt(dataToSubmit.progress, 10) || 0;

    onSubmit(dataToSubmit);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isNew = !editingTask;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-semibold text-slate-800">
            {isNew ? 'タスク新規作成' : 'タスク編集'}
            {parentTask && <span className="text-sm font-normal text-slate-500 ml-2">(親: {parentTask.title})</span>}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">タイトル <span className="text-red-500">*</span></label>
            <input 
              required
              type="text" 
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="要件定義、実装など..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">開始予定日</label>
              <input 
                type="date" 
                name="planned_start"
                value={formData.planned_start}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">終了予定日</label>
              <input 
                type="date" 
                name="planned_end"
                value={formData.planned_end}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">実績開始日</label>
              <input 
                type="date" 
                name="actual_start"
                value={formData.actual_start}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">実績終了日</label>
              <input 
                type="date" 
                name="actual_end"
                value={formData.actual_end}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
              <select
                name="status_id"
                value={formData.status_id}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">未設定</option>
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
              <select
                name="assignee_id"
                value={formData.assignee_id}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">未割当</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">進捗 (%)</label>
            <div className="flex items-center gap-3">
              <input 
                type="range"
                name="progress"
                min="0" max="100" step="10"
                value={formData.progress}
                onChange={handleChange}
                className="flex-1 accent-blue-600"
              />
              <span className="text-sm font-medium text-slate-700 w-12 text-right">{formData.progress}%</span>
            </div>
          </div>

        </form>

        <footer className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            キャンセル
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            {isNew ? '作成する' : '保存する'}
          </button>
        </footer>
      </div>
    </div>
  );
}
