import { describe, it, expect } from 'vitest';
import {
  sanitizeFileName,
  sanitizeHtmlText,
  sanitizeUrl,
  validateCanonicalId,
} from '@/utils/sanitizers';

describe('Mecanismos de Segurança e Sanitização (PR03)', () => {
  describe('sanitizeFileName', () => {
    it('preserva nomes comuns de arquivos e caracteres acentuados legítimos', () => {
      const original = 'Apresentação Financeira — Março 2026.docx';
      expect(sanitizeFileName(original)).toBe(
        'Apresentação Financeira — Março 2026.docx'
      );
    });

    it('remove tags HTML simples de nomes de arquivos', () => {
      const malicious = '<b>Documento Importante</b>.pdf';
      expect(sanitizeFileName(malicious)).toBe('Documento Importante.pdf');
    });

    it('neutraliza tentativas agressivas de injeção de script via nome de arquivo', () => {
      const payload = '<script>alert("XSS")</script>arquivo.txt';
      expect(sanitizeFileName(payload)).toBe('alert("XSS")arquivo.txt');
    });

    it('remove caracteres de controle não imprimíveis e tags/delimitadores soltos', () => {
      const tainted = 'relatorio\x00\x1F\x7F<teste>.pdf';
      expect(sanitizeFileName(tainted)).toBe('relatorio.pdf');

      const looseChars = 'relatorio <arquivo> teste > final.pdf';
      expect(sanitizeFileName(looseChars)).toBe('relatorio teste final.pdf');
    });

    it('retorna fallback seguro para entradas vazias, nulas ou compostas apenas de tags', () => {
      expect(sanitizeFileName('')).toBe('Arquivo sem nome');
      expect(sanitizeFileName(null)).toBe('Arquivo sem nome');
      expect(sanitizeFileName('   ')).toBe('Arquivo sem nome');
      expect(sanitizeFileName('<script></script>')).toBe('Arquivo sem nome');
    });
  });

  describe('sanitizeHtmlText', () => {
    it('escapa adequadamente entidades HTML perigosas', () => {
      const raw = '<div class="alert" id=\'x\'>& 1 < 2 > 0</div>';
      const escaped = sanitizeHtmlText(raw);
      expect(escaped).toBe(
        '&lt;div class=&quot;alert&quot; id=&#39;x&#39;&gt;&amp; 1 &lt; 2 &gt; 0&lt;/div&gt;'
      );
    });

    it('retorna string vazia para entrada vazia ou indefinida', () => {
      expect(sanitizeHtmlText('')).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('aceita URLs HTTPS válidas e canônicas', () => {
      const valid = 'https://drive.google.com/file/d/12345/view';
      expect(sanitizeUrl(valid)).toBe(
        'https://drive.google.com/file/d/12345/view'
      );
    });

    it('aceita URLs HTTP válidas', () => {
      const valid = 'http://example.com/api';
      expect(sanitizeUrl(valid)).toBe('http://example.com/api');
    });

    it('rejeita e neutraliza categoricamente URLs com protocolo javascript:', () => {
      const attack = 'javascript:alert(document.cookie)';
      expect(sanitizeUrl(attack)).toBeNull();
    });

    it('rejeita URLs com protocolo data: perigosas', () => {
      const attack = 'data:text/html,<script>alert(1)</script>';
      expect(sanitizeUrl(attack)).toBeNull();
    });

    it('rejeita URLs malformadas ou com protocolos não autorizados (ex: vbscript:, file:)', () => {
      expect(sanitizeUrl('vbscript:msgbox("hello")')).toBeNull();
      expect(sanitizeUrl('file:///C:/passwords.txt')).toBeNull();
      expect(sanitizeUrl('htt p://invalido')).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl(null)).toBeNull();
    });
  });

  describe('validateCanonicalId', () => {
    it('preserva o ID canônico opaco do Google Drive sem alteração', () => {
      const canonicalId = '1i-cuf6nPHsCom3xpBfJS-iIJu5ZtkTw-';
      expect(validateCanonicalId(canonicalId)).toBe(
        '1i-cuf6nPHsCom3xpBfJS-iIJu5ZtkTw-'
      );
    });

    it('rejeita identificadores nulos, vazios ou formados apenas por espaços', () => {
      expect(validateCanonicalId('')).toBeNull();
      expect(validateCanonicalId('   ')).toBeNull();
      expect(validateCanonicalId(null)).toBeNull();
      expect(validateCanonicalId(12345)).toBeNull();
    });
  });
});
