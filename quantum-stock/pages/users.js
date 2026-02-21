import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, CheckCircle, AlertCircle, Key, User, X } from 'lucide-react';
import Layout from '../components/Layout';

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState(null);

  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user'
  });

  const [editForm, setEditForm] = useState({
    username: '',
    name: '',
    role: 'user'
  });

  const [passwordForm, setPasswordForm] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    } else if (session.user?.role !== 'admin') {
      router.push('/search');
    }
  }, [session, router]);

  useEffect(() => {
    if (session) {
      loadUsers();
    }
  }, [session]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        credentials: 'include'
      });
      const data = await res.json();
      setUsers(data.items || []);
    } catch (error) {
      console.error('加载用户失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(createForm)
      });
      if (res.ok) {
        showMessage('success', '用户创建成功');
        setShowCreateModal(false);
        setCreateForm({ username: '', password: '', name: '', role: 'user' });
        loadUsers();
      } else {
        const err = await res.json();
        showMessage('error', err.detail || '创建失败');
      }
    } catch (error) {
      showMessage('error', '创建失败');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        showMessage('success', '用户更新成功');
        setShowEditModal(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        const err = await res.json();
        showMessage('error', err.detail || '更新失败');
      }
    } catch (error) {
      showMessage('error', '更新失败');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwordForm)
      });
      if (res.ok) {
        showMessage('success', '密码修改成功');
        setShowPasswordModal(false);
        setSelectedUser(null);
      } else {
        const err = await res.json();
        showMessage('error', err.detail || '密码修改失败');
      }
    } catch (error) {
      showMessage('error', '密码修改失败');
    }
  };

  const handleDelete = async (username) => {
    if (!confirm('确定要删除用户 ' + username + ' 吗？')) return;
    try {
      const res = await fetch('/api/users/' + username, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        showMessage('success', '用户删除成功');
        loadUsers();
      } else {
        showMessage('error', '删除失败');
      }
    } catch (error) {
      showMessage('error', '删除失败');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({ username: user.username, name: user.name || '', role: user.role || 'user' });
    setShowEditModal(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordForm({ username: user.username, password: '' });
    setShowPasswordModal(true);
  };

  if (!session) {
    return null;
  }

  return (
    <Layout headerIcon="search" breadcrumbItems={[{ label: '用户管理' }]}>
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                用户管理
              </h1>
            </div>
          </div>
        </div>

        {message && (
          <div className={'mb-6 p-4 rounded-xl border ' + (message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700')}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 inline mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 inline mr-2" />
            )}
            {message.text}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-medium text-slate-500">用户列表</h2>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium"
            >
              <Plus className="h-4 w-4" />
              创建用户
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">用户名</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">姓名</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">角色</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">创建时间</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-500">
                      加载中...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-500">
                      暂无用户
                    </td>
                  </tr>
                ) : (
                  users.map((user, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-800 font-medium">{user.username}</td>
                      <td className="py-2 px-3 text-slate-600">{user.name || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {user.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500">{user.created_at}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.username)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">创建用户</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    用户名
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    密码
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    姓名（可选）
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    角色
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="user">普通用户（仅黄金股池）</option>
                    <option value="admin">管理员（全部功能）</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-colors font-medium"
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Edit2 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">编辑用户</h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    用户名（不可修改）
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editForm.username}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    姓名
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    角色
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="user">普通用户（仅黄金股池）</option>
                    <option value="admin">管理员（全部功能）</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-colors font-medium"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPasswordModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Key className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">修改密码</h3>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    用户名（不可修改）
                  </label>
                  <input
                    type="text"
                    disabled
                    value={passwordForm.username}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    新密码
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
                  >
                    确认
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
