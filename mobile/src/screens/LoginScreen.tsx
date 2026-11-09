import { LinearGradient } from 'expo-linear-gradient';
import { Network } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import {
  AppText,
  Button,
  Card,
  Screen,
  Segmented,
  TextField,
} from '../components/ui';
import { useTheme } from '../theme/theme';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const t = useTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort =
    mode === 'register' && password.length > 0 && password.length < 10;
  const canSubmit =
    email.includes('@') && password.length >= (mode === 'register' ? 10 : 1);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      bottomInset={40}
      contentStyle={{ flexGrow: 1, justifyContent: 'center' }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Card
          style={{
            gap: 16,
            paddingHorizontal: 20,
            paddingVertical: 24,
            borderColor: `${t.glow}59`,
            shadowColor: t.glow,
            shadowOpacity: 0.18,
            shadowRadius: 30,
          }}
        >
          <View style={{ alignItems: 'center', gap: 12 }}>
            <LinearGradient
              colors={t.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Network size={28} color="#04161C" />
            </LinearGradient>
            <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>
              SkillTree
            </AppText>
            <AppText
              variant="body"
              color={t.colors.textSecondary}
              style={{ textAlign: 'center' }}
            >
              Grow skills one node at a time.
            </AppText>
          </View>
          <Segmented<Mode>
            value={mode}
            onChange={m => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: 'login', label: 'Sign in' },
              { value: 'register', label: 'Create account' },
            ]}
          />
          {mode === 'register' ? (
            <TextField
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="How should we call you?"
              autoComplete="name"
            />
          ) : null}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={
              mode === 'register' ? 'At least 10 characters' : 'Your password'
            }
            autoComplete={
              mode === 'register' ? 'new-password' : 'current-password'
            }
            textContentType={mode === 'register' ? 'newPassword' : 'password'}
            error={tooShort ? 'Use at least 10 characters' : null}
          />
          {error ? (
            <AppText
              variant="caption"
              color={t.colors.danger}
              accessibilityRole="alert"
            >
              {error}
            </AppText>
          ) : null}
          <Button
            label={mode === 'login' ? 'Sign in' : 'Create account'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
          />
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
