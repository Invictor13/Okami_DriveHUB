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
  console.error(
    '[Okami DriveHUB] Falha crítica durante a montagem inicial:',
    error
  );
  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #0b0f19; color: #f8fafc; font-family: Inter, system-ui, sans-serif; padding: 24px;">
      <div style="max-width: 480px; width: 100%; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 69, 84, 0.3); border-radius: 20px; padding: 28px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <div style="display: inline-flex; width: 44px; height: 44px; border-radius: 50%; background: rgba(255, 69, 84, 0.15); color: #ff4554; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px;">!</div>
        <h2 style="font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0 0 8px 0;">Falha na Inicialização</h2>
        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.5;">Ocorreu uma falha inesperada durante a montagem inicial da aplicação. Tente recarregar a página.</p>
        <button onclick="window.location.reload()" style="background: #00d2ff; color: #090d14; border: none; padding: 10px 22px; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer;">Recarregar Aplicação</button>
      </div>
    </div>
  `;
}
