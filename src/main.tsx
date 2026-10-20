import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { AIChatProvider } from './context/AIChatContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <AIChatProvider>
      <App />
    </AIChatProvider>
  </AuthProvider>
);
