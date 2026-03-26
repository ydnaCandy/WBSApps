import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

export default function SettingsLayout() {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm z-10">
        <h2 className="text-lg font-semibold text-slate-800">アプリケーション設定</h2>
      </header>
      
      <div className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="members" element={
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-md font-medium text-slate-800 mb-4">メンバー管理</h3>
              <p className="text-sm text-slate-500">プロジェクトの参加ユーザーと管理者権限の設定</p>
              {/* 設定コンポーネントをここに実装 */}
            </div>
          } />
          
          <Route path="statuses" element={
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-md font-medium text-slate-800 mb-4">ステータスマスタ管理</h3>
              <p className="text-sm text-slate-500">タスクのステータス定義と配色の設定</p>
              {/* 設定コンポーネントをここに実装 */}
            </div>
          } />
          
          <Route path="" element={<Navigate to="members" replace />} />
        </Routes>
      </div>
    </div>
  );
}
