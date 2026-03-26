import React, { useState } from 'react';
import { api, useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setCurrentUser } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !name)) return;
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await api.post('/api/v1/users', { name, email, password });
      }
      const res = await api.post('/api/v1/auth/login', { email, password });
      setCurrentUser(res.data);
      navigate('/wbs', { replace: true });
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err.response?.data?.detail || 'ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-slate-50 w-full h-full min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">WBS Manager</h2>
          <p className="text-slate-500 mt-2 text-sm">アカウント情報を入力してください</p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center shadow-sm">
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {isRegistering && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">名前</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-slate-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">メールアドレス</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-1.5">パスワード</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '処理中...' : (isRegistering ? 'アカウント作成' : 'ログイン')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
          >
            {isRegistering ? 'すでにアカウントをお持ちの方 (ログイン)' : 'アカウントをお持ちでない方 (新規登録)'}
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          <p>テスト用アカウント</p>
          <p className="mt-1">管理者: admin@example.com / password123</p>
          <p>一般: member@example.com / password123</p>
        </div>
      </div>
    </div>
  );
}
