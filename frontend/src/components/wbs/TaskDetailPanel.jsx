import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Paperclip, AlignLeft, Trash2, Plus, Loader2, Save } from 'lucide-react';
import { useAppContext, api } from '../../context/AppContext';

export default function TaskDetailPanel({ task, onClose, onTaskUpdate }) {
  const { statuses, users } = useAppContext();
  const [deliverables, setDeliverables] = useState([]);
  const [isAddingDeliv, setIsAddingDeliv] = useState(false);
  const [delivName, setDelivName] = useState('');
  const [delivUrl, setDelivUrl] = useState('');
  const [delivLoading, setDelivLoading] = useState(false);

  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        planned_start: task.planned_start || '',
        planned_end: task.planned_end || '',
        actual_start: task.actual_start || '',
        actual_end: task.actual_end || '',
        status_id: task.status_id || '',
        assignee_id: task.assignee_id || '',
        progress: task.progress || 0,
        notes: task.notes || ''
      });
      setDeliverables(task.deliverables || []);
      setIsAddingDeliv(false);
      setDelivName('');
      setDelivUrl('');
    }
  }, [task]);

  if (!task) return null;

  const handleAddDeliverable = async (e) => {
    e.preventDefault();
    if (!delivName || !delivUrl) return;
    setDelivLoading(true);
    try {
      const res = await api.post(`/api/v1/tasks/${task.id}/deliverables`, { name: delivName, url: delivUrl });
      setDeliverables([...deliverables, res.data]);
      setIsAddingDeliv(false);
      setDelivName('');
      setDelivUrl('');
      if (onTaskUpdate) onTaskUpdate();
    } catch (err) {
      console.error(err);
      alert('成果物の追加に失敗しました。');
    } finally {
      setDelivLoading(false);
    }
  };

  const handleDeleteDeliverable = async (id) => {
    if (!window.confirm("この成果物リンクを削除しますか？")) return;
    try {
      await api.delete(`/api/v1/deliverables/${id}`);
      setDeliverables(deliverables.filter(d => d.id !== id));
      if (onTaskUpdate) onTaskUpdate();
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました。');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveTask = async () => {
    setIsSaving(true);
    try {
      const dataToSubmit = { ...formData };
      if (!dataToSubmit.status_id) dataToSubmit.status_id = null;
      if (!dataToSubmit.assignee_id) dataToSubmit.assignee_id = null;
      if (!dataToSubmit.planned_start) dataToSubmit.planned_start = null;
      if (!dataToSubmit.planned_end) dataToSubmit.planned_end = null;
      if (!dataToSubmit.actual_start) dataToSubmit.actual_start = null;
      if (!dataToSubmit.actual_end) dataToSubmit.actual_end = null;
      dataToSubmit.progress = parseInt(dataToSubmit.progress, 10) || 0;

      await api.patch(`/api/v1/tasks/${task.id}`, dataToSubmit);
      if (onTaskUpdate) await onTaskUpdate();
      // Toast message could be added here
    } catch (err) {
      console.error(err);
      alert('タスクの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute inset-y-0 right-0 w-96 bg-white shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300">
      <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800 text-lg">タスク詳細</h3>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center justify-between">
            <span>Level {task.level}</span>
          </div>
          <input 
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="タスク名"
            className="w-full text-xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent py-1 rounded-none transition-colors"
          />
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <label className="block text-slate-500 text-xs mb-1 font-medium">ステータス</label>
              <select
                name="status_id"
                value={formData.status_id}
                onChange={handleChange}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">未設定</option>
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-xs mb-1 font-medium">担当者</label>
              <select
                name="assignee_id"
                value={formData.assignee_id}
                onChange={handleChange}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">未割当</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <label className="block text-slate-500 text-xs mb-1 font-medium">開始(予定)</label>
              <input 
                type="date" 
                name="planned_start"
                value={formData.planned_start}
                onChange={handleChange}
                className="w-full bg-white border border-slate-200 rounded p-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs mb-1 font-medium">終了(予定)</label>
              <input 
                type="date" 
                name="planned_end"
                value={formData.planned_end}
                onChange={handleChange}
                className="w-full bg-white border border-slate-200 rounded p-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs mb-1 font-medium">開始(実績)</label>
              <input 
                type="date" 
                name="actual_start"
                value={formData.actual_start}
                onChange={handleChange}
                className="w-full bg-white border border-slate-200 rounded p-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs mb-1 font-medium">終了(実績)</label>
              <input 
                type="date" 
                name="actual_end"
                value={formData.actual_end}
                onChange={handleChange}
                className="w-full bg-white border border-slate-200 rounded p-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-500 text-xs mb-1 font-medium">進捗 ({formData.progress}%)</label>
              <input 
                type="range"
                name="progress"
                min="0" max="100" step="10"
                value={formData.progress}
                onChange={handleChange}
                className="w-full accent-blue-600"
              />
            </div>
          </div>
        </div>

        {/* 備考セクション */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium">
            <AlignLeft className="w-4 h-4 text-slate-400" />
            <h3>備考・メモ</h3>
          </div>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full text-sm border border-slate-200 rounded-md p-3 min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 resize-y bg-slate-50"
            placeholder="タスクに関する詳細な説明やメモを記載..."
          />
        </div>

        {/* 成果物セクション */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Paperclip className="w-4 h-4 text-slate-400" />
              <h3>成果物リンク (保存先)</h3>
            </div>
          </div>
          
          {(!deliverables || deliverables.length === 0) ? (
            <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded border border-slate-100 border-dashed mb-3">
              成果物はまだ登録されていません。
            </p>
          ) : (
            <ul className="space-y-2 mb-3">
              {deliverables.map(d => (
                <li key={d.id} className="text-sm flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1 block pr-2" title={d.url}>
                    {d.name}
                  </a>
                  <button 
                    onClick={() => handleDeleteDeliverable(d.id)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors shrink-0"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isAddingDeliv ? (
            <form onSubmit={handleAddDeliverable} className="bg-slate-50 p-3 rounded border border-slate-200 mt-2 space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <div>
                <input 
                  type="text" 
                  placeholder="表示名 (例: 要件定義書)" 
                  required
                  value={delivName}
                  onChange={e => setDelivName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <input 
                  type="url" 
                  placeholder="URL (例: https://docs.google.com/...)" 
                  required
                  value={delivUrl}
                  onChange={e => setDelivUrl(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button 
                  type="button" 
                  onClick={() => setIsAddingDeliv(false)}
                  className="text-xs text-slate-500 px-3 py-1.5 hover:bg-slate-200 rounded transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  disabled={delivLoading}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  {delivLoading && <Loader2 className="w-3 h-3 animate-spin"/>}
                  保存する
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setIsAddingDeliv(true)}
              className="mt-1 text-xs text-blue-600 font-medium px-3 py-1.5 rounded hover:bg-blue-50 transition-colors border border-blue-200 border-dashed w-full flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> リンクを追加
            </button>
          )}
        </div>

        {/* コメントセクション */}
        <div className="pt-4 border-t border-slate-100 pb-8">
          <div className="flex items-center gap-2 mb-3 text-slate-700 font-medium">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h3>コメント</h3>
          </div>
          <div className="space-y-4">
            <p className="text-xs text-slate-500 italic text-center py-4 bg-slate-50 rounded">コメントはありません</p>
            <div className="mt-4 flex gap-2">
              <input 
                type="text" 
                placeholder="コメントを入力..." 
                className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 outline-none focus:border-blue-500"
              />
              <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded shadow-sm hover:bg-blue-700 font-medium">
                送信
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 保存エリア */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
        <button 
          onClick={handleSaveTask}
          disabled={isSaving}
          className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          変更を保存
        </button>
      </div>
    </div>
  );
}
