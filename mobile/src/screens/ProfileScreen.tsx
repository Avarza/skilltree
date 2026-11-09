import { LogOut, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { API_URL } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { AppText, Button, Card, Row, Screen } from '../components/ui';
import { useConfig } from '../config/ConfigProvider';
import { useTheme } from '../theme/theme';
import { Avatar } from './shared';

export function ProfileScreen() {
  const t = useTheme();
  const { user, logout } = useAuth();
  const { snapshot, source, refresh } = useConfig();
  const name = user?.displayName || user?.email.split('@')[0] || '';
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 12 }}>
        <Avatar name={name} size={88} />
        <AppText variant="title">{name}</AppText>
        <AppText variant="body" color={t.colors.textSecondary}>
          {user?.email}
        </AppText>
      </View>
      <Card style={{ gap: 10 }}>
        <AppText variant="headline">App configuration</AppText>
        <InfoRow
          label="Content release"
          value={
            snapshot.version > 0 ? `v${snapshot.version}` : 'built-in defaults'
          }
        />
        <InfoRow label="Loaded from" value={source} />
        <InfoRow label="Theme" value={snapshot.theme.name} />
        <InfoRow label="Server" value={API_URL} />
        <Button
          label="Check for updates"
          variant="secondary"
          size="small"
          icon={RefreshCw}
          onPress={refresh}
        />
      </Card>
      <Button label="Sign out" variant="ghost" icon={LogOut} onPress={logout} />
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <AppText variant="caption" color={t.colors.textSecondary}>
        {label}
      </AppText>
      <AppText
        variant="caption"
        numberOfLines={1}
        style={{ flexShrink: 1, textAlign: 'right' }}
      >
        {value}
      </AppText>
    </Row>
  );
}
