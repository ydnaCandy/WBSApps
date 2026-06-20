import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// APIのベースURL設定 (FastAPIは8000ポートで動く想定)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
});

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      api.defaults.headers.common['X-User-Id'] = user.id;
      return user;
    }
    return null;
  });
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false); // 選択中のプロジェクトにおける現在のユーザーの権限
  const [isInitializing, setIsInitializing] = useState(true);

  // マスタデータ(ステータスとユーザー)を起動時に取得
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [statusRes, usersRes] = await Promise.all([
          api.get('/api/v1/statuses'),
          api.get('/api/v1/users')
        ]);
        setStatuses(statusRes.data);
        setUsers(usersRes.data);
      } catch (error) {
        console.error("Master config fetch failed", error);
      }
    };
    fetchMasterData();
  }, []);

  const fetchProjects = async (user) => {
    if (!user) {
      setProjects([]);
      setCurrentProject(null);
      setIsAdmin(false);
      setIsInitializing(false);
      return;
    }
    
    try {
      const projRes = await api.get('/api/v1/projects');
      setProjects(projRes.data);
      if (projRes.data.length > 0) {
        // 現在のプロジェクトが既にあり、リストに含まれていれば維持する
        const currentStillExists = currentProject && projRes.data.find(p => p.id === currentProject.id);
        if (!currentStillExists) {
          handleProjectChange(projRes.data[0], user.id);
        }
      } else {
        setCurrentProject(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Projects fetch failed", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setIsInitializing(false);
    }
  };

  // ログイン時や初期ロード時のプロジェクト一覧取得
  useEffect(() => {
    fetchProjects(currentUser);
  }, [currentUser]);

  const handleUserChange = (user) => {
    setCurrentUser(user);
    if (user) {
      api.defaults.headers.common['X-User-Id'] = user.id;
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      delete api.defaults.headers.common['X-User-Id'];
      localStorage.removeItem('currentUser');
    }
  };

  const handleLogout = () => {
    handleUserChange(null);
  };

  const handleProjectChange = async (project, userId = currentUser?.id) => {
    setCurrentProject(project);
    if (!userId) return;

    try {
      const membersRes = await api.get(`/api/v1/projects/${project.id}/members`);
      const me = membersRes.data.find(m => m.user_id === userId);
      setIsAdmin(me ? me.is_admin : false);
    } catch (error) {
      console.error("Project members fetch failed", error);
      setIsAdmin(false);
    }
  };

  if (isInitializing) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500">読み込み中...</div>;
  }

  return (
    <AppContext.Provider
      value={{
        users,
        currentUser,
        setCurrentUser: handleUserChange,
        logout: handleLogout,
        projects,
        currentProject,
        setCurrentProject: (p) => handleProjectChange(p, currentUser?.id),
        refreshProjects: () => fetchProjects(currentUser),
        statuses,
        isAdmin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
