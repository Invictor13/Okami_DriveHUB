import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root não encontrado no documento.');
}

try {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  // Captura exclusivamente falhas síncronas na inicialização do DOM.
  // Erros em tempo de renderização dos componentes React são interceptados pelo ErrorBoundary.
  console.error('[Okami DriveHUB] Falha síncrona no bootstrap do DOM:', error);
}
