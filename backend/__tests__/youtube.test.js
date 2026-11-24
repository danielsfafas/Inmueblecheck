import { describe, it, expect } from '@jest/globals';
import { extractYouTubeId, isYouTubeUrl, getYouTubeEmbedUrl, isYouTubeShort } from '../src/utils/youtube.js';

describe('YouTube URL Validation', () => {
  describe('extractYouTubeId', () => {
    it('debe extraer ID de URL youtube.com/watch', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('debe extraer ID de URL youtu.be', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('debe extraer ID de URL youtube.com/shorts', () => {
      const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('debe rechazar URLs que no son de YouTube', () => {
      expect(extractYouTubeId('https://vimeo.com/123456')).toBeNull();
      expect(extractYouTubeId('https://facebook.com/video/123')).toBeNull();
      expect(extractYouTubeId('not a url')).toBeNull();
    });

    it('debe manejar valores inválidos', () => {
      expect(extractYouTubeId(null)).toBeNull();
      expect(extractYouTubeId(undefined)).toBeNull();
      expect(extractYouTubeId('')).toBeNull();
      expect(extractYouTubeId(123)).toBeNull();
    });

    it('debe rechazar IDs de YouTube inválidos (muy cortos)', () => {
      expect(extractYouTubeId('https://youtube.com/watch?v=abc')).toBeNull();
      expect(extractYouTubeId('https://youtube.com/watch?v=short')).toBeNull();
    });
  });

  describe('isYouTubeUrl', () => {
    it('debe validar URLs de YouTube correctas', () => {
      expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    });

    it('debe rechazar URLs no-YouTube', () => {
      expect(isYouTubeUrl('https://vimeo.com/123')).toBe(false);
      expect(isYouTubeUrl('not a url')).toBe(false);
      expect(isYouTubeUrl('')).toBe(false);
    });
  });

  describe('getYouTubeEmbedUrl', () => {
    it('debe generar URL de embed con youtube-nocookie.com', () => {
      const embedUrl = getYouTubeEmbedUrl('dQw4w9WgXcQ');
      expect(embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
      expect(embedUrl).toContain('youtube-nocookie.com');
    });
  });

  describe('isYouTubeShort', () => {
    it('debe detectar YouTube Shorts', () => {
      expect(isYouTubeShort('https://www.youtube.com/shorts/abc12345678')).toBe(true);
    });

    it('debe rechazar videos normales', () => {
      expect(isYouTubeShort('https://www.youtube.com/watch?v=abc12345678')).toBe(false);
      expect(isYouTubeShort('https://youtu.be/abc12345678')).toBe(false);
    });
  });
});
