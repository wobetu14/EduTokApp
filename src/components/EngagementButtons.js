import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Share, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { formatLargeNumber } from '../utils/helpers';
import AppText from './AppText';

const ActionBtn = ({ icon, activeIcon, isActive, count, color, onPress, label }) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    onPress?.();
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isActive ? activeIcon : icon}
          size={32}
          color={isActive ? color : '#fff'}
        />
      </Animated.View>
      {count != null && (
        <AppText style={styles.count}>{formatLargeNumber(count)}</AppText>
      )}
      {label && <AppText style={styles.label}>{label}</AppText>}
    </TouchableOpacity>
  );
};

const EngagementButtons = ({
  isLiked,
  isFavorited,
  likesCount = 0,
  favoritesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  onLike,
  onFavorite,
  onComment,
  onShare,
  onEnroll,
  onOpenCourse,
  isEnrolled,
  courseThumbnail,
  showEnroll = false,
  showShare = true,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {showEnroll && (
        isEnrolled ? (
          <TouchableOpacity
            style={styles.enrolledThumb}
            onPress={onOpenCourse}
            activeOpacity={0.85}
            disabled={!onOpenCourse}
          >
            {courseThumbnail ? (
              <Image source={{ uri: courseThumbnail }} style={styles.enrolledThumbImg} resizeMode="cover" />
            ) : (
              <View style={[styles.enrolledThumbImg, styles.enrolledThumbFallback]}>
                <Ionicons name="checkmark" size={22} color={COLORS.success} />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.enrollBtn} onPress={onEnroll} activeOpacity={0.85}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )
      )}
      <ActionBtn
        icon="heart-outline"
        activeIcon="heart"
        isActive={isLiked}
        count={likesCount}
        color={COLORS.primary}
        onPress={onLike}
      />
      <ActionBtn
        icon="bookmark-outline"
        activeIcon="bookmark"
        isActive={isFavorited}
        count={favoritesCount}
        color={COLORS.secondary}
        onPress={onFavorite}
      />
      <ActionBtn
        icon="chatbubble-outline"
        activeIcon="chatbubble"
        isActive={false}
        count={commentsCount}
        color={COLORS.secondary}
        onPress={onComment}
      />
      {showShare && (
        <ActionBtn
          icon="share-social-outline"
          activeIcon="share-social"
          isActive={false}
          count={sharesCount}
          color={COLORS.secondary}
          onPress={onShare}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
  },
  btn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  count: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  enrollBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  enrolledThumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  enrolledThumbImg: {
    width: '100%',
    height: '100%',
  },
  enrolledThumbFallback: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EngagementButtons;
