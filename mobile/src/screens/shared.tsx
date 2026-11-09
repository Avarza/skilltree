import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';

import { errorMessage } from '../api/client';
import { AppText, Button, Card } from '../components/ui';
import { useTheme } from '../theme/theme';

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const t = useTheme();
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0]!.toUpperCase())
      .join('') || '?';
  return (
    <LinearGradient
      colors={t.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: t.colors.surface,
      }}
    >
      <AppText variant={size > 72 ? 'display' : size > 50 ? 'title' : 'bodyStrong'} color="#04161C">
        {initials}
      </AppText>
    </LinearGradient>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: 'center', gap: 10 }}>
      <AppText
        variant="body"
        color={t.colors.textSecondary}
        style={{ textAlign: 'center' }}
      >
        {errorMessage(error)}
      </AppText>
      <Button
        label="Try again"
        variant="secondary"
        size="small"
        onPress={onRetry}
      />
    </Card>
  );
}
