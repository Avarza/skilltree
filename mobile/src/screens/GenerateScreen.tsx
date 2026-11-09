import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Flame, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { ApiError, errorMessage } from '../api/client';
import { useCreateFromTemplate, useGenerateTree } from '../api/trees';
import type { Level } from '../api/types';
import { iconForTree } from '../components/icons';
import {
  AppText,
  Button,
  Card,
  Row,
  Screen,
  Segmented,
  TextField,
  hexAlpha,
} from '../components/ui';
import { useConfig } from '../config/ConfigProvider';
import type { TabScreenProps } from '../navigation/types';
import { useTheme } from '../theme/theme';

export function GenerateScreen({ navigation }: TabScreenProps<'Generate'>) {
  const t = useTheme();
  const { snapshot } = useConfig();
  const ai = snapshot.config.aiGeneration;
  const generate = useGenerateTree();
  const fromTemplate = useCreateFromTemplate();
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState<Level>('beginner');
  const [startingSlug, setStartingSlug] = useState<string | null>(null);

  const submit = () =>
    generate.mutate(
      {
        topic: topic.trim(),
        goal: goal.trim() || undefined,
        level,
        locale: snapshot.config.defaultLocale,
      },
      {
        onSuccess: tree => {
          setTopic('');
          setGoal('');
          navigation.navigate('TreeDetail', { treeId: tree.id });
        },
      },
    );

  const start = (slug: string) => {
    setStartingSlug(slug);
    fromTemplate.mutate(slug, {
      onSuccess: tree => navigation.navigate('TreeDetail', { treeId: tree.id }),
      onSettled: () => setStartingSlug(null),
    });
  };

  const genError = generate.error
    ? generate.error instanceof ApiError &&
      generate.error.code === 'ai_daily_limit'
      ? `You've used all ${ai.dailyLimitPerUser} AI generations for today. Try a template or come back tomorrow.`
      : errorMessage(generate.error)
    : null;

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : undefined}
        style={{ gap: 14 }}
      >
        <Card
          style={{
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 20,
            paddingTop: 22,
            borderColor: hexAlpha(t.glow, 0.35),
            shadowColor: t.glow,
            shadowOpacity: 0.18,
            shadowRadius: 30,
          }}
        >
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
            <Sparkles size={28} color="#04161C" />
          </LinearGradient>
          <AppText
            variant="title"
            style={{ fontSize: 24, lineHeight: 30, textAlign: 'center' }}
          >
            Build your skill tree
          </AppText>
          <AppText
            variant="body"
            color={t.colors.textSecondary}
            style={{ textAlign: 'center' }}
          >
            Tell us what you want to master — Claude maps the path, you level
            up.
          </AppText>
          {ai.enabled ? (
            <>
              <TextField
                label="What do you want to learn?"
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g. TypeScript for React developers"
                maxLength={200}
                helper="Be specific — it gives a sharper tree"
              />
              <TextField
                label="Your goal"
                value={goal}
                onChangeText={setGoal}
                placeholder="e.g. ship my own side project"
                maxLength={300}
              />
              <View style={{ alignSelf: 'stretch', gap: 6 }}>
                <AppText variant="caption" color={t.colors.textSecondary}>
                  Current level
                </AppText>
                <Segmented<Level>
                  value={level}
                  onChange={setLevel}
                  options={[
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' },
                  ]}
                />
              </View>
              {genError ? (
                <AppText
                  variant="caption"
                  color={t.colors.danger}
                  accessibilityRole="alert"
                  style={{ alignSelf: 'stretch' }}
                >
                  {genError}
                </AppText>
              ) : null}
              <Button
                label={
                  generate.isPending
                    ? 'Growing your tree…'
                    : 'Generate my skill tree'
                }
                icon={Sparkles}
                onPress={submit}
                loading={generate.isPending}
                disabled={topic.trim().length < 2}
                style={{ alignSelf: 'stretch' }}
              />
              <Row gap={6}>
                <Flame size={14} color={t.colors.nodeInProgress} />
                <AppText variant="caption" color={t.colors.textSecondary}>
                  Up to {ai.dailyLimitPerUser} AI trees per day · max{' '}
                  {ai.maxNodes} skills
                </AppText>
              </Row>
            </>
          ) : (
            <AppText
              variant="bodyStrong"
              color={t.colors.nodeInProgress}
              style={{ textAlign: 'center' }}
            >
              AI generation is paused right now. Start from a template below.
            </AppText>
          )}
        </Card>
      </KeyboardAvoidingView>

      {snapshot.templates.length > 0 ? (
        <>
          <Row>
            <BookOpen size={18} color={t.colors.primary} />
            <AppText variant="headline">Start from a template</AppText>
          </Row>
          {snapshot.templates.map(tpl => {
            const Icon = iconForTree({
              title: tpl.title,
              source: 'TEMPLATE',
              icon: tpl.icon,
            });
            return (
              <Card
                key={tpl.slug}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: hexAlpha(t.colors.primary, 0.12),
                  }}
                >
                  <Icon size={22} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong">{tpl.title}</AppText>
                  <AppText variant="caption" color={t.colors.textSecondary}>
                    {tpl.nodes.length} skills · {tpl.category}
                  </AppText>
                </View>
                <Button
                  label="Start"
                  size="small"
                  variant="secondary"
                  onPress={() => start(tpl.slug)}
                  loading={startingSlug === tpl.slug}
                  disabled={!!startingSlug}
                />
              </Card>
            );
          })}
          {fromTemplate.error ? (
            <AppText variant="caption" color={t.colors.danger}>
              {errorMessage(fromTemplate.error)}
            </AppText>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
