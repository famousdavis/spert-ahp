import { useState } from 'react';

const SESSION_KEY = 'ahp/sessionUserId';

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useSession(): { userId: string } {
  const [userId] = useState(getOrCreateSessionId);
  return { userId };
}
