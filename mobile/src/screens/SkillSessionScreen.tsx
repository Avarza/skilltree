import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { errorMessage } from '../api/client';
import { usePractice, useRecordSession, type Practice } from '../api/practice';
import { useSetNodeStatus, useTree } from '../api/trees';
import {
  AppText,
  Button,
  Card,
  Row,
  Segmented,
  hexAlpha,
} from '../components/ui';
import type { RootScreenProps } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { ErrorState } from './shared';

type Tab = 'lesson' | 'tasks' | 'quiz';
const MIN_SESSION_SECONDS = 30;

export function SkillSessionScreen({
  route,
  navigation,
}: RootScreenProps<'SkillSession'>) {
  const { treeId, nodeId } = route.params;
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const tree = useTree(treeId);
  const practice = usePractice(treeId, nodeId);
  const setStatus = useSetNodeStatus(treeId);
  const recordSession = useRecordSession(treeId, nodeId);
  const node = tree.data?.nodes.find(n => n.id === nodeId);

  const timer = useFocusTimer();
  const [tab, setTab] = useState<Tab>('lesson');
  const [done, setDone] = useState<boolean[]>([]);
  const [quizPassed, setQuizPassed] = useState(false);
  const [finished, setFinished] = useState(false);

  // Make sure the node is marked as started when a session opens.
  const startedRef = useRef(false);
  useEffect(() => {
    if (node?.status === 'AVAILABLE' && !startedRef.current) {
      startedRef.current = true;
      setStatus.mutate({ nodeId, status: 'IN_PROGRESS' });
    }
  }, [node?.status, nodeId, setStatus]);

  useEffect(() => {
    if (practice.data) {
      setDone(d => (d.length ? d : practice.data.tasks.map(() => false)));
      setQuizPassed(practice.data.quiz.length === 0);
    }
  }, [practice.data]);

  const saveTime = useCallback(async () => {
    const seconds = timer.stop();
    if (seconds >= MIN_SESSION_SECONDS) {
      try {
        await recordSession.mutateAsync(Math.min(seconds, 4 * 3600));
      } catch {
        // time tracking is best-effort; never block the learner on it
      }
    }
  }, [timer, recordSession]);

  const close = async () => {
    await saveTime();
    navigation.goBack();
  };

  const complete = async () => {
    await saveTime();
    setStatus.mutate(
      { nodeId, status: 'COMPLETED' },
      {
        onSuccess: () => {
          setFinished(true);
          setTimeout(() => navigation.goBack(), 1600);
        },
        onError: e =>
          Alert.alert('Could not complete the skill', errorMessage(e)),
      },
    );
  };

  const tasksDone = done.length > 0 && done.every(Boolean);
  const canComplete = tasksDone && quizPassed;
  const p = practice.data;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <SafeAreaView
        edges={['top']}
        style={{ paddingHorizontal: 20, paddingBottom: 8 }}
      >
        <Row gap={12}>
          <View style={{ flex: 1 }}>
            <AppText
              variant="overline"
              color={t.colors.textSecondary}
              numberOfLines={1}
            >
              {tree.data?.title.toUpperCase() ?? 'SKILL'} · PRACTICE
            </AppText>
            <AppText variant="title" numberOfLines={1}>
              {node?.title ?? '…'}
            </AppText>
          </View>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close session"
            style={[
              styles.close,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
              },
            ]}
          >
            <X size={20} color={t.colors.textPrimary} />
          </Pressable>
        </Row>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 140,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <FocusTimerCard timer={timer} goalMinutes={p?.suggestedMinutes ?? 25} />

        {practice.isPending ? (
          <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}>
            <ActivityIndicator color={t.colors.primary} />
            <AppText variant="bodyStrong">Preparing your session…</AppText>
            <AppText
              variant="caption"
              color={t.colors.textSecondary}
              style={{ textAlign: 'center' }}
            >
              Claude is writing a short lesson, tasks and a quiz for this skill.
              It's saved, so next time it opens instantly.
            </AppText>
          </Card>
        ) : null}
        {practice.isError ? (
          <ErrorState
            error={practice.error}
            onRetry={() => practice.refetch()}
          />
        ) : null}

        {p ? (
          <>
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'lesson', label: 'Lesson' },
                {
                  value: 'tasks',
                  label: `Tasks ${done.filter(Boolean).length}/${
                    p.tasks.length
                  }`,
                },
                ...(p.quiz.length
                  ? [
                      {
                        value: 'quiz' as const,
                        label: quizPassed ? 'Quiz ✓' : 'Quiz',
                      },
                    ]
                  : []),
              ]}
            />
            {tab === 'lesson' ? (
              <Lesson
                key="lesson"
                text={p.lesson}
                onNext={() => setTab('tasks')}
              />
            ) : null}
            {tab === 'tasks' ? (
              <Tasks
                key="tasks"
                tasks={p.tasks}
                done={done}
                onToggle={i =>
                  setDone(d => d.map((v, j) => (j === i ? !v : v)))
                }
                onNext={p.quiz.length ? () => setTab('quiz') : undefined}
              />
            ) : null}
            {tab === 'quiz' && p.quiz.length ? (
              <Quiz
                key="quiz"
                quiz={p.quiz}
                onPassed={() => setQuizPassed(true)}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {p && node ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: t.colors.background,
              borderColor: t.colors.border,
            },
          ]}
        >
          <Button
            label={
              canComplete
                ? `Complete · +${node.xp} XP`
                : !tasksDone
                ? 'Finish all tasks to complete'
                : 'Pass the quiz to complete'
            }
            icon={canComplete ? Trophy : undefined}
            onPress={complete}
            disabled={!canComplete}
            loading={setStatus.isPending}
          />
        </View>
      ) : null}

      {finished && node ? <SuccessOverlay xp={node.xp} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Focus timer

function useFocusTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const base = useRef(0); // seconds accumulated before the current run
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      return;
    }
    // Derive from timestamps (not tick counting) so time stays correct when the JS thread is busy.
    const id = setInterval(() => {
      setElapsed(
        base.current +
          Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000),
      );
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  return useMemo(
    () => ({
      running,
      elapsed,
      start() {
        startedAt.current = Date.now();
        setRunning(true);
      },
      pause() {
        if (startedAt.current) {
          base.current += Math.floor((Date.now() - startedAt.current) / 1000);
        }
        startedAt.current = null;
        setElapsed(base.current);
        setRunning(false);
      },
      /** Stops the timer and returns the total focused seconds. */
      stop() {
        const total =
          base.current +
          (startedAt.current
            ? Math.floor((Date.now() - startedAt.current) / 1000)
            : 0);
        base.current = total;
        startedAt.current = null;
        setRunning(false);
        setElapsed(total);
        return total;
      },
    }),
    [running, elapsed],
  );
}

function FocusTimerCard({
  timer,
  goalMinutes,
}: {
  timer: ReturnType<typeof useFocusTimer>;
  goalMinutes: number;
}) {
  const t = useTheme();
  const R = 54;
  const C = 2 * Math.PI * R;
  const goal = goalMinutes * 60;
  const pct = Math.min(1, timer.elapsed / goal);
  const mm = String(Math.floor(timer.elapsed / 60)).padStart(2, '0');
  const ss = String(timer.elapsed % 60).padStart(2, '0');
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <View
        style={{
          width: 128,
          height: 128,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={128} height={128} style={StyleSheet.absoluteFill}>
          <Circle
            cx={64}
            cy={64}
            r={R}
            stroke={t.colors.surfaceMuted}
            strokeWidth={8}
            fill="none"
          />
          <Circle
            cx={64}
            cy={64}
            r={R}
            stroke={pct >= 1 ? t.colors.nodeCompleted : t.colors.primary}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            strokeDashoffset={C * (1 - pct)}
            transform="rotate(-90 64 64)"
          />
        </Svg>
        <AppText variant="title" style={{ fontVariant: ['tabular-nums'] }}>
          {mm}:{ss}
        </AppText>
        <AppText variant="overline" color={t.colors.textSecondary}>
          of {goalMinutes} min
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        <AppText variant="headline">Focus timer</AppText>
        <AppText variant="caption" color={t.colors.textSecondary}>
          {timer.running
            ? 'Stay with it — your time counts toward your weekly study chart.'
            : timer.elapsed
            ? 'Paused. Pick up where you left off.'
            : 'Start the timer when you begin practising.'}
        </AppText>
        <Button
          label={
            timer.running ? 'Pause' : timer.elapsed ? 'Resume' : 'Start focus'
          }
          icon={timer.running ? Pause : Play}
          size="small"
          variant={timer.running ? 'secondary' : 'primary'}
          onPress={timer.running ? timer.pause : timer.start}
        />
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Lesson, tasks, quiz

function Lesson({ text, onNext }: { text: string; onNext: () => void }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(280)} style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <Row>
          <Sparkles size={18} color={t.colors.primary} />
          <AppText variant="headline">Key idea</AppText>
        </Row>
        {text.split(/\n\s*\n/).map((para, i) => (
          <AppText key={i} variant="body" color={t.colors.textSecondary}>
            {para.trim()}
          </AppText>
        ))}
      </Card>
      <Button
        label="Got it — show tasks"
        variant="secondary"
        onPress={onNext}
      />
    </Animated.View>
  );
}

function Tasks({
  tasks,
  done,
  onToggle,
  onNext,
}: {
  tasks: string[];
  done: boolean[];
  onToggle: (i: number) => void;
  onNext?: () => void;
}) {
  const t = useTheme();
  const all = done.length > 0 && done.every(Boolean);
  return (
    <Animated.View entering={FadeInDown.duration(280)} style={{ gap: 10 }}>
      {tasks.map((task, i) => {
        const checked = !!done[i];
        return (
          <Pressable
            key={i}
            onPress={() => onToggle(i)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            {({ pressed }) => (
              <Card
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  opacity: pressed ? 0.8 : 1,
                  borderColor: checked
                    ? hexAlpha(t.colors.nodeCompleted, 0.5)
                    : t.colors.border,
                }}
              >
                <View
                  style={[
                    styles.check,
                    {
                      borderColor: checked
                        ? t.colors.nodeCompleted
                        : t.colors.border,
                      backgroundColor: checked
                        ? t.colors.nodeCompleted
                        : 'transparent',
                    },
                  ]}
                >
                  {checked ? (
                    <Animated.View entering={ZoomIn.springify().damping(12)}>
                      <Check size={16} color="#04161C" strokeWidth={3} />
                    </Animated.View>
                  ) : null}
                </View>
                <AppText
                  variant="body"
                  style={{
                    flex: 1,
                    textDecorationLine: checked ? 'line-through' : 'none',
                  }}
                  color={
                    checked ? t.colors.textSecondary : t.colors.textPrimary
                  }
                >
                  {task}
                </AppText>
              </Card>
            )}
          </Pressable>
        );
      })}
      {all && onNext ? (
        <Animated.View entering={FadeIn}>
          <Button
            label="Nice! Take the quiz"
            variant="secondary"
            onPress={onNext}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function Quiz({
  quiz,
  onPassed,
}: {
  quiz: Practice['quiz'];
  onPassed: () => void;
}) {
  const t = useTheme();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const needed = Math.ceil((quiz.length * 2) / 3);
  const q = quiz[index];

  const pick = (i: number) => {
    if (picked !== null) {
      return;
    }
    setPicked(i);
    if (i === q.correctIndex) {
      setScore(s => s + 1);
    }
  };
  const next = () => {
    if (index + 1 < quiz.length) {
      setIndex(index + 1);
      setPicked(null);
    } else {
      setOver(true);
      if (score >= needed) {
        onPassed();
      }
    }
  };
  const retry = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setOver(false);
  };

  if (over) {
    const passed = score >= needed;
    return (
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
          <LinearGradient
            colors={
              passed
                ? t.gradient
                : [t.colors.surfaceMuted, t.colors.surfaceMuted]
            }
            style={styles.medal}
          >
            {passed ? (
              <Trophy size={28} color="#04161C" />
            ) : (
              <RotateCcw size={26} color={t.colors.textSecondary} />
            )}
          </LinearGradient>
          <AppText variant="title">
            {score} / {quiz.length} correct
          </AppText>
          <AppText
            variant="body"
            color={t.colors.textSecondary}
            style={{ textAlign: 'center' }}
          >
            {passed
              ? 'Quiz passed — you can complete the skill.'
              : `You need ${needed} correct answers. Review the lesson and try again.`}
          </AppText>
          {!passed ? (
            <Button
              label="Try again"
              variant="secondary"
              size="small"
              icon={RotateCcw}
              onPress={retry}
            />
          ) : null}
        </Card>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      key={index}
      entering={FadeInDown.duration(260)}
      style={{ gap: 10 }}
    >
      <AppText variant="overline" color={t.colors.textSecondary}>
        QUESTION {index + 1} / {quiz.length}
      </AppText>
      <AppText variant="headline">{q.question}</AppText>
      {q.options.map((opt, i) => {
        const revealed = picked !== null;
        const correct = i === q.correctIndex;
        const color = !revealed
          ? t.colors.border
          : correct
          ? t.colors.nodeCompleted
          : i === picked
          ? t.colors.danger
          : t.colors.border;
        return (
          <Pressable
            key={i}
            onPress={() => pick(i)}
            disabled={revealed}
            accessibilityRole="radio"
            accessibilityState={{ selected: i === picked }}
          >
            <Card
              style={{
                paddingVertical: 14,
                borderColor: color,
                borderWidth: revealed && (correct || i === picked) ? 2 : 1,
                backgroundColor:
                  revealed && correct
                    ? hexAlpha(t.colors.nodeCompleted, 0.1)
                    : t.colors.surface,
              }}
            >
              <AppText variant="body">{opt}</AppText>
            </Card>
          </Pressable>
        );
      })}
      {picked !== null ? (
        <Animated.View entering={FadeIn.duration(220)} style={{ gap: 10 }}>
          <AppText
            variant="bodyStrong"
            color={
              picked === q.correctIndex
                ? t.colors.nodeCompleted
                : t.colors.danger
            }
          >
            {picked === q.correctIndex ? 'Correct!' : 'Not quite.'}
          </AppText>
          {q.explanation ? (
            <AppText variant="caption" color={t.colors.textSecondary}>
              {q.explanation}
            </AppText>
          ) : null}
          <Button
            label={index + 1 < quiz.length ? 'Next question' : 'See result'}
            size="small"
            onPress={next}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function SuccessOverlay({ xp }: { xp: number }) {
  const t = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: `${t.colors.background}E6` },
      ]}
    >
      <Animated.View
        entering={ZoomIn.springify().damping(10)}
        style={{ alignItems: 'center', gap: 14 }}
      >
        <LinearGradient
          colors={t.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bigMedal, { shadowColor: t.glow }]}
        >
          <Check size={56} color="#04161C" strokeWidth={3} />
        </LinearGradient>
        <AppText variant="display">Skill unlocked!</AppText>
        <AppText variant="title" color={t.colors.nodeCompleted}>
          +{xp} XP
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { alignItems: 'center', justifyContent: 'center' },
  bigMedal: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
});
