import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, BADGE_DEFS } from '../utils/constants';
import { useTranslation } from '../utils/useTranslation';
import AppText from './AppText';

const { width: W, height: H } = Dimensions.get('window');
const PARTICLE_COUNT = 24;
const COLORS_LIST = ['#FE2C55', '#25F4EE', '#FFD700', '#FF5722', '#9C27B0', '#4CAF50'];

const Particle = ({ anim, x, color, size }) => {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-20, H * 0.85] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View
      style={[
        styles.particle,
        { left: x, width: size, height: size, backgroundColor: color, borderRadius: size / 4, opacity, transform: [{ translateY }, { rotate }] },
      ]}
    />
  );
};

// `badges` is an array of { id } (or strings) of newly-earned badges.
const BadgeCelebration = ({ badges = [], onFinish }) => {
  const { t } = useTranslation();
  const anims = useRef(Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0))).current;
  const visible = badges.length > 0;

  // Resolve each earned badge to its definition (icon/color/label).
  const defs = useMemo(
    () =>
      badges
        .map((b) => BADGE_DEFS.find((d) => d.id === (b.id ?? b)))
        .filter(Boolean),
    [badges]
  );

  const particles = useMemo(() => (
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: Math.random() * (W - 20),
      color: COLORS_LIST[i % COLORS_LIST.length],
      size: 8 + Math.floor(Math.random() * 8),
    }))
  ), []);

  useEffect(() => {
    if (!visible) return;
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      40,
      anims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 1800 + Math.random() * 600, useNativeDriver: true })
      )
    ).start();
    const timer = setTimeout(onFinish, 3500);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || defs.length === 0) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onFinish}>
      <View style={styles.overlay}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {particles.map((p, i) => (
            <Particle key={i} anim={anims[i]} x={p.x} color={p.color} size={p.size} />
          ))}
        </View>

        <View style={styles.card}>
          <AppText style={styles.title}>{t('badgeUnlocked')}</AppText>
          <View style={styles.badgeList}>
            {defs.map((def) => (
              <View key={def.id} style={styles.badgeRow}>
                <View style={[styles.iconWrap, { backgroundColor: def.color + '33' }]}>
                  <Ionicons name={def.icon} size={36} color={def.color} />
                </View>
                <AppText style={styles.badgeLabel}>{t(def.labelKey)}</AppText>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={onFinish}>
            <AppText style={styles.btnText}>{t('keepGoing')}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', top: 0 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: Math.min(W - 48, 340),
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    gap: 16,
  },
  title: { color: COLORS.text, fontSize: SIZES.xl, fontWeight: '900', textAlign: 'center' },
  badgeList: { gap: 14, alignItems: 'center' },
  badgeRow: { alignItems: 'center', gap: 8 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  badgeLabel: { color: COLORS.text, fontSize: SIZES.base, fontWeight: '700', textAlign: 'center' },
  btn: { marginTop: 4, backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: SIZES.base },
});

export default BadgeCelebration;
