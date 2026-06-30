import { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Plus, Edit, Power, KeyRound, Search } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserForm } from '../components/UserForm';
import type { Role } from '../types/auth';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  APROVADOR: 'Aprovador',
  FINANCEIRO: 'Financeiro',
};

const roleColors: Record<Role, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  OPERADOR: 'bg-blue-100 text-blue-800',
  APROVADOR: 'bg-orange-100 text-orange-800',
  FINANCEIRO: 'bg-green-100 text-green-800',
};

export function Users() {
  const { user: currentUser } = useAuth();
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [tempPassword, setTempPassword] = useState<{ userId: string; password: string } | null>(null);

  // Filtros
  const [filterSearch, setFilterSearch] = useState('');
  const [filterRole, setFilterRole] = useState<Role | ''>('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | ''>('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = users.filter((u) => {
    if (filterSearch) {
      const search = filterSearch.toLowerCase();
      if (!u.name.toLowerCase().includes(search) && !u.email.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (filterRole && u.role !== filterRole) return false;
    if (filterStatus === 'active' && !u.active) return false;
    if (filterStatus === 'inactive' && u.active) return false;
    return true;
  });

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.patch(`/users/${userId}/toggle-status`);
      success('Status do usuário alterado');
      loadUsers();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Tem certeza que deseja resetar a senha deste usuário?')) return;

    try {
      const { data } = await api.post(`/users/${userId}/reset-password`);
      setTempPassword({ userId, password: data.tempPassword });
      success('Senha resetada com sucesso');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao resetar senha');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    success('Usuário salvo com sucesso');
    handleFormClose();
    loadUsers();
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <UsersIcon size={28} />
          Usuários
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#57489c] hover:bg-[#57489c]/85 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Plus size={18} />
          Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Nome ou email..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Perfil</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as Role | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Todos</option>
              <option value="ADMIN">Administrador</option>
              <option value="OPERADOR">Operador</option>
              <option value="APROVADOR">Aprovador</option>
              <option value="FINANCEIRO">Financeiro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'active' | 'inactive' | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Senha temporária */}
      {tempPassword && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Senha temporária gerada</p>
              <p className="text-lg font-mono font-bold text-yellow-900 mt-1">{tempPassword.password}</p>
              <p className="text-xs text-yellow-700 mt-1">Anote esta senha e repasse ao usuário. Ela não será exibida novamente.</p>
            </div>
            <button
              onClick={() => setTempPassword(null)}
              className="text-yellow-700 hover:text-yellow-900 text-sm underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57489c]" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Nenhum usuário encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#242424] border-b border-[#242424]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-white">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Email</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Perfil</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Criado em</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-gray-400">(você)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                        {roleLabels[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditingUser(u); setShowForm(true); }}
                          className="p-1.5 text-gray-500 hover:text-[#57489c] hover:bg-white/70 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.active
                                ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={u.active ? 'Inativar' : 'Ativar'}
                          >
                            <Power size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Resetar senha"
                        >
                          <KeyRound size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <UserForm
          user={editingUser}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
