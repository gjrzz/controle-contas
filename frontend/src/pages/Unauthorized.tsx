import { useNavigate } from 'react-router-dom';

export function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Acesso Negado</h2>
      <p className="text-gray-500 mb-6">Você não tem permissão para acessar esta página.</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="bg-[#57489c] hover:bg-[#57489c]/85 text-white font-medium py-2 px-6 rounded-lg transition-colors"
      >
        Voltar ao Dashboard
      </button>
    </div>
  );
}
