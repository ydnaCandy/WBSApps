import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import WbsContainer from './components/wbs/WbsContainer';
import SettingsLayout from './components/settings/SettingsLayout';
import Login from './pages/Login';

function MainLayout() {
  const { currentUser } = useAppContext();
  
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground w-full">
      {/* 左側のサイドバー */}
      <Sidebar />
      
      {/* 右側のメインコンテンツ領域 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
        <Routes>
          {/* プロジェクト・タスク管理画面 */}
          <Route path="/wbs" element={<WbsContainer />} />
          
          {/* 各種設定画面の親ルーティング */}
          <Route path="/settings/*" element={<SettingsLayout />} />
          
          <Route path="/login" element={<Navigate to="/wbs" replace />} />
          
          {/* デフォルトはWBSへ */}
          <Route path="/" element={<Navigate to="/wbs" replace />} />
          <Route path="*" element={<Navigate to="/wbs" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <MainLayout />
      </Router>
    </AppProvider>
  );
}

export default App;
