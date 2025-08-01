"use client"

import { useState, useEffect } from 'react';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    subscription: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Sprawdź czy przeglądarka obsługuje powiadomienia push
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied'
    }));

    if (isSupported) {
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
        subscription
      }));
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn('Push notifications are not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  const subscribe = async (): Promise<PushSubscription | null> => {
    if (!state.isSupported || state.permission !== 'granted') {
      return null;
    }

    setIsLoading(true);
    
    try {
      // Zarejestruj service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Utwórz subskrypcję push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: await getVapidPublicKey()
      });

      // Wyślij subskrypcję na serwer
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription
      }));

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!state.subscription) {
      return false;
    }

    setIsLoading(true);

    try {
      // Usuń subskrypcję z przeglądarki
      await state.subscription.unsubscribe();

      // Usuń subskrypcję z serwera
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state.subscription),
      });

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null
      }));

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getVapidPublicKey = async (): Promise<string> => {
    try {
      const response = await fetch('/api/push/vapid-key');
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('Error getting VAPID key:', error);
      throw error;
    }
  };

  return {
    ...state,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
