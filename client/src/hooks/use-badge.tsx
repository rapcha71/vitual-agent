import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

export function useBadge() {
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread/count'],
    enabled: !!user,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const count = typeof unreadCount === 'object' ? unreadCount.count : unreadCount;
    
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch((error: any) => {
          console.log('Error setting badge:', error);
        });
      } else {
        (navigator as any).clearAppBadge().catch((error: any) => {
          console.log('Error clearing badge:', error);
        });
      }
    }
  }, [unreadCount]);

  return typeof unreadCount === 'object' ? unreadCount.count : unreadCount;
}
