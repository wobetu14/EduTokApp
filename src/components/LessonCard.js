import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, LESSON_TYPES } from '../utils/constants';
import { formatDuration } from '../utils/helpers';
import AppText from './AppText';

const LessonCard = ({ lesson, index, isCompleted, onPress, style }) => {
  const typeInfo = LESSON_TYPES[lesson.type] || LESSON_TYPES.text;

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: lesson.thumbnail }} style={styles.thumbnail} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />
      {isCompleted && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
        </View>
      )}
      <View style={styles.typeTag}>
        <Ionicons name={typeInfo.icon} size={11} color="#fff" />
        <AppText style={styles.typeText}>{typeInfo.label}</AppText>
      </View>
      <View style={styles.footer}>
        <AppText style={styles.lessonNum}>#{index + 1}</AppText>
        <AppText style={styles.title} numberOfLines={2}>{lesson.title}</AppText>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={11} color={COLORS.textSecondary} />
          <AppText style={styles.duration}>{formatDuration(lesson.duration)}</AppText>
          {lesson.hasQuiz && (
            <>
              <View style={styles.dot} />
              <Ionicons name="help-circle-outline" size={11} color={COLORS.secondary} />
              <AppText style={[styles.duration, { color: COLORS.secondary }]}>Quiz</AppText>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    aspectRatio: 3 / 4,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.card,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  typeTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.overlayDark,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: SIZES.borderRadiusFull,
  },
  typeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  lessonNum: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  duration: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: 2,
  },
});

export default LessonCard;
