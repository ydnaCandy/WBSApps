import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Settings, Users, Settings2, Folders, UserCircle2, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { api, useAppContext } from '../context/AppContext';

export default function Sidebar() {
  const { currentUser, logout, projects, currentProject, setCurrentProject, isAdmin, refreshProjects } = useAppContext();
  const [isOpen, setIsOpen] = useState(true);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/api/v1/projects', { name: newProjectName.trim(), description: '' });
      setNewProjectName('');
      setIsAddingProject(false);
      await refreshProjects();
    } catch (err) {
      console.error(err);
      alert('プロジェクトの作成に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className={`bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 shadow-lg transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className={`p-4 border-b border-slate-700/50 flex items-center ${isOpen ? 'justify-between' : 'justify-center'} relative`}>
        {isOpen && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <LayoutDashboard className="w-6 h-6 text-blue-400 shrink-0" />
            <h1 className="text-xl font-semibold text-white tracking-tight shrink-0 whitespace-nowrap">WBS Manager</h1>
          </div>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-slate-400 hover:text-white transition-colors shrink-0"
          title={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        >
          {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
      </div>

      {/* ログインユーザー表示 */}
      <div className={`p-4 border-b border-slate-700/50 ${!isOpen && 'hidden'}`}>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <UserCircle2 className="w-3 h-3" />
          ログインユーザー
        </label>
        <div className="flex items-center justify-between">
          <div className="truncate text-sm font-medium text-slate-200" title={currentUser?.name}>
            {currentUser?.name}
          </div>
          <button 
            onClick={logout}
            className="text-xs font-medium text-slate-400 hover:text-red-400 transition-colors shrink-0"
          >
            ログアウト
          </button>
        </div>
        
        {isAdmin && (
          <div className="mt-2 text-xs text-amber-500 font-medium px-2 py-1 bg-amber-500/10 rounded-full inline-block">
            管理者権限あり
          </div>
        )}
      </div>

      {/* プロジェクト切り替え */}
      <div className={`p-4 border-b border-slate-700/50 flex-1 overflow-y-auto ${!isOpen && 'hidden'}`}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Folders className="w-3 h-3" />
            プロジェクト
          </label>
          <button 
            onClick={() => setIsAddingProject(true)}
            className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            title="新規プロジェクト作成"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {isAddingProject && (
          <form onSubmit={handleAddProject} className="mb-3 flex gap-1">
            <input 
              type="text" 
              autoFocus
              className="flex-1 px-2 py-1.5 bg-slate-950 text-slate-200 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
              placeholder="プロジェクト名"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              disabled={isSubmitting}
            />
            <button 
              type="submit"
              disabled={isSubmitting || !newProjectName.trim()}
              className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              作成
            </button>
            <button 
              type="button"
              onClick={() => setIsAddingProject(false)}
              className="px-2 py-1.5 bg-slate-800 text-slate-400 rounded text-xs hover:bg-slate-700 hover:text-slate-200"
            >
              取消
            </button>
          </form>
        )}

        {projects.length === 0 ? (
          <div className="text-sm text-slate-500 p-2 text-center border font-medium border-slate-800 border-dashed rounded-lg bg-slate-800/10 mt-2">参加中プロジェクトなし</div>
        ) : (
          <div className="space-y-1">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setCurrentProject(p)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  currentProject?.id === p.id 
                    ? 'bg-blue-600 text-white font-medium shadow-sm' 
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className="truncate">{p.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 折りたたみ時のアイコン群 (開いているときは非表示) */}
      {!isOpen && (
        <div className="flex-1 flex flex-col items-center py-4 space-y-4">
          <button title="プロジェクト" className="p-2 rounded-md bg-slate-800 text-blue-400 hover:text-white transition-colors">
            <Folders className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="p-4 space-y-1 overflow-x-hidden">
        <NavLink 
          to="/wbs" 
          title="WBSビュー"
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50'
            } ${!isOpen && 'justify-center px-0'}`
          }
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {isOpen && <span className="whitespace-nowrap">WBSビュー</span>}
        </NavLink>
        
        <div className="pt-2 mt-2 border-t border-slate-700/50">
          {isOpen && (
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-3 whitespace-nowrap">
              設定管理
            </div>
          )}
          <NavLink 
            to="/settings/members" 
            title="メンバー管理"
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50'
              } ${!isOpen && 'justify-center px-0 mt-2'}`
            }
          >
            <Users className="w-4 h-4 shrink-0" />
            {isOpen && <span className="whitespace-nowrap">メンバー管理</span>}
          </NavLink>
          <NavLink 
            to="/settings/statuses" 
            title="ステータスマスタ管理"
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50'
              } ${!isOpen && 'justify-center px-0 mt-2'}`
            }
          >
            <Settings2 className="w-4 h-4 shrink-0" />
            {isOpen && <span className="whitespace-nowrap">ステータスマスタ</span>}
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}
