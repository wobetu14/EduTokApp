import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, DIFFICULTY } from '../utils/constants';
import { formatLargeNumber, truncateText } from '../utils/helpers';
import AppText from './AppText';

const CourseCard = ({ course, organization, onPress, style }) => {
  const diff = DIFFICULTY[course.difficulty] || DIFFICULTY.Beginner;

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: course.thumbnail }} style={styles.thumbnail} />
      <View style={styles.difficultyBadge}>
        <AppText style={[styles.difficultyText, { color: diff.color }]}>{diff.label}</AppText>
      </View>
      <View style={styles.info}>
        <AppText style={styles.title} numberOfLines={2}>{course.title}</AppText>
        {organization && (
          <View style={styles.orgRow}>
            <Ionicons name="business" size={11} color={COLORS.textMuted} />
            <AppText style={styles.orgName} numberOfLines={1}>{organization.name}</AppText>
          </View>
        )}
        <AppText style={styles.desc} numberOfLines={2}>
          {truncateText(course.description, 70)}
        </AppText>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="book-outline" size={12} color={COLORS.textSecondary} />
            <AppText style={styles.metaText}>{course.lessonIds.length} lessons</AppText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="heart-outline" size={12} color={COLORS.textSecondary} />
            <AppText style={styles.metaText}>{formatLargeNumber(course.likesCount)}</AppText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={COLORS.textSecondary} />
            <AppText style={styles.metaText}>{formatLargeNumber(course.enrolledCount)}</AppText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.surface,
  },
  difficultyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.overlayDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.borderRadiusFull,
  },
  difficultyText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  info: {
    padding: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  orgName: {
    color: COLORS.secondary,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  desc: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    lineHeight: 18,
    marginBottom: 10,
  },
  meta: {
    flexDirection: 'row',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
  },
});

export default CourseCard;
