import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, CATEGORIES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import { requestPermissions, scheduleDailyReminder } from '../services/notificationService';

const STEPS = ['welcome', 'interests', 'permissions'];

const WelcomeStep = ({ onNext }) => {
  const { hPad, isLandscape } = useResponsive();
  const { t } = useTranslation();
  const features = [
    { icon: 'play-circle', key: 'tikTokFeed' },
    { icon: 'checkmark-circle', key: 'progressQuizzesStreaks' },
    { icon: 'bookmark', key: 'saveLessonsLater' },
    { icon: 'chatbubbles', key: 'communityDiscussions' },
  ];
  return (
  <View style={[styles.stepContainer, { paddingHorizontal: hPad }]}>
    <LinearGradient
      colors={[COLORS.primary + '44', 'transparent']}
      style={styles.bgGrad}
    />
    <View style={[styles.welcomeIcon, isLandscape && { marginTop: 8, marginBottom: 8 }]}>
      <Ionicons name="school" size={isLandscape ? 52 : 80} color={COLORS.primary} />
    </View>
    <Text style={[styles.welcomeTitle, isLandscape && { fontSize: 24, lineHeight: 32, marginBottom: 6 }]}>{t('welcome')} 🎓</Text>
    <Text style={[styles.welcomeSub, isLandscape && { marginBottom: 16 }]}>
      {t('welcomeSubLong')}
    </Text>
    <View style={[styles.featureList, isLandscape && { gap: 8, marginBottom: 20 }]}>
      {features.map((f) => (
        <View key={f.key} style={styles.featureRow}>
          <Ionicons name={f.icon} size={20} color={COLORS.secondary} />
          <Text style={styles.featureText}>{t(f.key)}</Text>
        </View>
      ))}
    </View>
    <TouchableOpacity style={styles.primaryBtn} onPress={onNext} activeOpacity={0.85}>
      <Text style={styles.primaryBtnText}>{t('getStarted')}</Text>
      <Ionicons name="arrow-forward" size={20} color="#fff" />
    </TouchableOpacity>
  </View>
  );
};

const InterestsStep = ({ selected, onToggle, onNext }) => {
  const { hPad, catChipW } = useResponsive();
  const { t } = useTranslation();
  const canContinue = selected.length > 0;
  return (
    <View style={[styles.stepContainer, { paddingHorizontal: hPad }]}>
      <Text style={styles.stepTitle}>{t('chooseInterests')}</Text>
      <Text style={styles.stepSub}>
        {t('chooseInterestsFeed')}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.catScroll}>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => {
            const active = selected.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, { width: catChipW }, active && { borderColor: cat.color, backgroundColor: cat.color + '22' }]}
                onPress={() => onToggle(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon} size={22} color={active ? cat.color : COLORS.textSecondary} />
                <Text style={[styles.catLabel, active && { color: cat.color }]}>{cat.label}</Text>
                {active && (
                  <View style={[styles.catCheck, { backgroundColor: cat.color }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <TouchableOpacity
        style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
        onPress={canContinue ? onNext : undefined}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>
          {t('continue')}{selected.length > 0 ? ` (${selected.length})` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const PermissionsStep = ({ onFinish }) => {
  const { hPad } = useResponsive();
  const { t } = useTranslation();
  const perms = [
    { icon: 'notifications', labelKey: 'notifications', descKey: 'notificationDesc' },
    { icon: 'camera', labelKey: 'camera', descKey: 'cameraDesc' },
    { icon: 'folder', labelKey: 'storage', descKey: 'storageDesc' },
  ];
  return (
    <View style={[styles.stepContainer, { paddingHorizontal: hPad }]}>
      <Text style={styles.stepTitle}>{t('quickPermissions')}</Text>
      <Text style={styles.stepSub}>{t('permissionsSubtext')}</Text>
      <View style={styles.permList}>
        {perms.map((p) => (
          <View key={p.labelKey} style={styles.permRow}>
            <View style={styles.permIcon}>
              <Ionicons name={p.icon} size={22} color={COLORS.secondary} />
            </View>
            <View style={styles.permText}>
              <Text style={styles.permLabel}>{t(p.labelKey)}</Text>
              <Text style={styles.permDesc}>{t(p.descKey)}</Text>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={onFinish} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>{t('allowAndContinue')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipBtn} onPress={onFinish}>
        <Text style={styles.skipText}>{t('skip')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const OnboardingScreen = () => {
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const finish = async () => {
    const granted = await requestPermissions();
    if (granted) await scheduleDailyReminder();
    await completeOnboarding(selectedCategories);
  };

  return (
    <LinearGradient colors={['#000000', '#0D0D1A']} style={styles.container}>
      {/* Dot indicators */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      {step === 0 && <WelcomeStep onNext={nextStep} />}
      {step === 1 && (
        <InterestsStep
          selected={selectedCategories}
          onToggle={toggleCategory}
          onNext={nextStep}
        />
      )}
      {step === 2 && <PermissionsStep onFinish={finish} />}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  dot: {
    height: 4,
    width: 32,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  dotActive: { backgroundColor: COLORS.primary, width: 48 },
  dotDone: { backgroundColor: COLORS.success },
  stepContainer: {
    flex: 1,
    paddingBottom: 40,
  },
  bgGrad: {
    position: 'absolute',
    top: -60,
    left: -24,
    right: -24,
    height: 300,
  },
  // Welcome
  welcomeIcon: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  welcomeTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 12,
  },
  welcomeSub: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: { gap: 16, marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureText: { color: COLORS.text, fontSize: SIZES.base, fontWeight: '500' },
  // Interests
  stepTitle: {
    color: COLORS.text,
    fontSize: SIZES.xxl,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  stepSub: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    marginBottom: 24,
    lineHeight: 22,
  },
  catScroll: { flex: 1, marginBottom: 16 },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 16,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: 'relative',
  },
  catLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  catCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Permissions
  permList: { gap: 16, marginBottom: 32, marginTop: 8 },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
  },
  permIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permText: { flex: 1 },
  permLabel: { color: COLORS.text, fontWeight: '700', fontSize: SIZES.base },
  permDesc: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  // Buttons
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: '#fff', fontSize: SIZES.base, fontWeight: '800' },
  skipBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  skipText: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600' },
});

export default OnboardingScreen;
