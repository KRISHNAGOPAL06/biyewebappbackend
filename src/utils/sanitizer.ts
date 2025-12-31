export class Sanitizer {
  static sanitizeMessage(content: string): string {
    if (!content) return '';

    let sanitized = content.trim();

    sanitized = sanitized.replace(/[<>]/g, (match) => {
      return match === '<' ? '&lt;' : '&gt;';
    });

    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    sanitized = sanitized.substring(0, 5000);

    return sanitized;
  }

  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  }

  static stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }

  static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  static removeControlCharacters(text: string): string {
    return text.replace(/[\x00-\x1F\x7F]/g, '');
  }
}

export const sanitizeMessage = Sanitizer.sanitizeMessage;
export const escapeHtml = Sanitizer.escapeHtml;
export const stripHtml = Sanitizer.stripHtml;
