export interface CursorData {
  id: string;
  createdAt: Date;
}

export interface PaginationResult<T> {
  data: T[];
  nextCursor: string | null;
}

export function encodeCursor(data: CursorData): string {
  const payload = {
    id: data.id,
    createdAt: data.createdAt.toISOString(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);
    return {
      id: payload.id,
      createdAt: new Date(payload.createdAt),
    };
  } catch (error) {
    return null;
  }
}

export function createPaginationResult<T extends { id: string; createdAt: Date }>(
  data: T[],
  limit: number
): PaginationResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore && data[limit - 1] ? encodeCursor(data[limit - 1]) : null;

  return {
    data: items,
    nextCursor,
  };
}
