import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Companies } from './pages/Companies';
import { Contracts } from './pages/Contracts';
import { Invoices } from './pages/Invoices';
import { Calendar } from './pages/Calendar';
import { Users } from './pages/Users';
import { Unauthorized } from './pages/Unauthorized';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/empresas"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO']}>
              <Companies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contratos"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO']}>
              <Contracts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faturas"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO']}>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendario"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO']}>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
