import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Text } from './Text';
import { lightTheme, darkTheme, spacing } from '../../theme';

type ToastType = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode; isDark?: boolean }> = ({ children, isDark }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const idRef = useRef(1);
  const opacity = useRef(new Animated.Value(0)).current;

  const processQueue = useCallback(() => {
    if (queue.length === 0) return;
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setQueue((q) => q.slice(1));
        });
      }, 1800);
    });
  }, [opacity, queue.length]);

  React.useEffect(() => {
    if (queue.length === 1) {
      processQueue();
    }
  }, [queue.length, processQueue]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = idRef.current++;
    setQueue((q) => (q.length === 0 ? [{ id, message, type }] : [...q, { id, message, type }]));
  }, []);

  const ctx = useMemo(() => ({ show }), [show]);

  const current = queue[0];

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {current && (
        <Animated.View style={[styles.container, { opacity }]}> 
          <View style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ color: theme.text }}>{current.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[6],
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 10,
    borderWidth: 1,
  },
});
