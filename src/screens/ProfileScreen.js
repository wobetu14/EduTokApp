import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
  Alert,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES, CATEGORIES, BADGE_DEFS, PRESET_AVATARS, AGE_RANGES, GENDERS } from '../utils/constants';
import { uploadAvatar } from '../services/apiService';
import ProgressBar from '../components/ProgressBar';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import { formatTimeAgo } from '../utils/helpers';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import { scheduleDailyReminder, cancelDailyReminder, requestPermissions } from '../services/notificationService';
import { useA11y } from '../context/AccessibilityContext';
import AppText from '../components/AppText';
import { useTabBar } from '../context/TabBarContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../utils/constants';

const StatCard = ({ icon, value, label, color }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={22} color={color || COLORS.secondary} />
    <AppText style={styles.statValue}>{value}</AppText>
    <AppText style={styles.statLabel}>{label}</AppText>
  </View>
);

const SectionTitle = ({ children }) => (
  <AppText style={styles.sectionTitle}>{children}</AppText>
);

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, updateUser, changePassword } = useAuth();
  // This app is learner-only; the learner role is the "student" we show
  // demographic fields for.
  const isStudent = (user?.role ?? 'learner') === 'learner';
  const { hPad, formMaxW } = useResponsive();
  const { t } = useTranslation();
  const { fontScale, highContrast, setFontScale, setHighContrast } = useA11y();
  const { hideTabBar, showTabBar } = useTabBar();
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y - lastScrollY.current > 10) hideTabBar();
    else if (lastScrollY.current - y > 10) showTabBar();
    lastScrollY.current = y;
  };
  const {
    courses,
    organizations,
    progress,
    badges,
    getCourseProgress,
    getLessonsForCourse,
    getCertificate,
  } = useCourses();

  const handleViewCertificate = (course) => {
    // Prefer the server-issued certificate (verifiable number); fall back to client-derived
    const serverCert = getCertificate(course.id);
    if (serverCert) {
      navigation.navigate('Certificate', { certificate: serverCert });
      return;
    }

    const org = organizations.find((o) => o.id === course.organizationId);
    const issuedAt = course.lessonIds
      .map((lid) => progress.completedLessons.find((cl) => cl.lessonId === lid)?.completedAt)
      .filter(Boolean)
      .sort()
      .pop() || new Date().toISOString();
    navigation.navigate('Certificate', {
      certificate: {
        id: `cert-${course.id}-${user?.id || 'user'}`,
        studentName: user?.fullName || user?.username || 'Learner',
        courseName: course.title,
        organizationName: org?.name || 'EduTok',
        authorName: org?.name || 'EduTok',
        category: course.category,
        difficulty: course.difficulty,
        issuedAt,
      },
    });
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: user?.fullName || '', username: user?.username || '', phone: user?.phone || '',
    bio: user?.bio || '', avatar: user?.avatar || '', ageRange: user?.ageRange || '', gender: user?.gender || '',
  });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('progress');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const earnedBadgeIds = useMemo(() => new Set(badges.map((b) => b.id)), [badges]);

  const enrolledCourses = useMemo(
    () => courses.filter((c) => progress.enrolledCourses.includes(c.id)),
    [courses, progress.enrolledCourses]
  );

  const completedCourses = useMemo(
    () => enrolledCourses.filter((c) => getCourseProgress(c.id) === 100),
    [enrolledCourses, getCourseProgress]
  );

  const inProgressCourses = useMemo(
    () => enrolledCourses.filter((c) => {
      const p = getCourseProgress(c.id);
      return p > 0 && p < 100;
    }),
    [enrolledCourses, getCourseProgress]
  );

  const favoritedLessons = useMemo(() => {
    const ids = progress.favoritedLessons;
    const all = courses.flatMap((c) => getLessonsForCourse(c.id));
    return all.filter((l) => ids.includes(l.id));
  }, [progress.favoritedLessons, courses, getLessonsForCourse]);

  const totalHours = Math.round((progress.totalSeconds || 0) / 3600 * 10) / 10;

  // Analytics: weekly activity (last 6 weeks)
  const weeklyData = useMemo(() => {
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      return d.toISOString().slice(0, 10).slice(0, 7); // YYYY-MM approx week bucket
    }).reverse();
    const buckets = Object.fromEntries(weeks.map((w) => [w, 0]));
    progress.completedLessons.forEach((cl) => {
      const wk = cl.completedAt?.slice(0, 7);
      if (wk && wk in buckets) {
        const lesson = courses.flatMap((c) => getLessonsForCourse(c.id)).find((l) => l.id === cl.lessonId);
        buckets[wk] += lesson?.duration || 60;
      }
    });
    const vals = Object.values(buckets);
    const max = Math.max(...vals, 1);
    return weeks.map((w, i) => ({ label: w.slice(5), seconds: vals[i], pct: vals[i] / max }));
  }, [progress.completedLessons, courses, getLessonsForCourse]);

  const openEditModal = () => {
    setEditForm({
      fullName: user?.fullName || '', username: user?.username || '', phone: user?.phone || '',
      bio: user?.bio || '', avatar: user?.avatar || '', ageRange: user?.ageRange || '', gender: user?.gender || '',
    });
    setEditError('');
    setShowAvatarPicker(false);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (editSaving) return;
    const username = editForm.username.trim();
    const phone = editForm.phone.trim();
    if (!editForm.fullName.trim()) { setEditError(t('fullNameRequired')); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setEditError(t('usernameInvalid')); return; }
    if (phone && phone.replace(/\D/g, '').length < 7) { setEditError(t('phoneInvalid')); return; }

    setEditError('');
    setEditSaving(true);
    try {
      await updateUser({
        fullName: editForm.fullName.trim(),
        username,
        phone: phone || undefined,
        bio: editForm.bio,
        avatar: editForm.avatar,
        ...(isStudent ? { ageRange: editForm.ageRange || undefined, gender: editForm.gender || undefined } : {}),
      });
      setShowEditModal(false);
      setShowAvatarPicker(false);
    } catch (e) {
      setEditError(e?.message || t('photoUploadFailed'));
    } finally {
      setEditSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    if (uploadingAvatar) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('changeAvatar'), t('photoPermissionNeeded'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(result.assets[0]);
      setEditForm((f) => ({ ...f, avatar: url }));
      setShowAvatarPicker(false);
    } catch (e) {
      Alert.alert(t('changeAvatar'), e?.message || t('photoUploadFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openPasswordModal = () => {
    setPwForm({ current: '', next: '', confirm: '' });
    setPwError('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    const { current, next, confirm } = pwForm;
    if (!current) { setPwError(t('currentPasswordRequired')); return; }
    if (next.length < 8) { setPwError(t('passwordTooShort')); return; }
    if (next !== confirm) { setPwError(t('passwordsDontMatch')); return; }
    if (next === current) { setPwError(t('newPasswordSameAsCurrent')); return; }

    setPwError('');
    setPwSubmitting(true);
    try {
      await changePassword(current, next);
      setShowPasswordModal(false);
      // Server revoked all sessions — sign out so the user re-authenticates.
      Alert.alert(t('passwordChanged'), t('passwordChangedMsg'), [
        { text: 'OK', onPress: signOut },
      ]);
    } catch (e) {
      setPwError(e?.message || t('photoUploadFailed'));
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirmMsg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const handleLanguageToggle = async () => {
    const newLang = user?.language === 'en' ? 'am' : 'en';
    await updateUser({ language: newLang });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
      {/* Header */}
      <LinearGradient colors={['#0D0D1A', COLORS.background]} style={[styles.headerBg, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.profileHeader, { paddingHorizontal: hPad }]}>
          <Image
            source={{ uri: user?.avatar || `https://picsum.photos/seed/profile/200/200` }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <AppText style={styles.fullName}>{user?.fullName}</AppText>
            <AppText style={styles.username}>@{user?.username}</AppText>
            {user?.bio ? <AppText style={styles.bio}>{user.bio}</AppText> : null}
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={openEditModal}
          >
            <Ionicons name="pencil" size={16} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { paddingHorizontal: hPad }]}>
          <StatCard icon="trophy" value={completedCourses.length} label={t('completedStatus')} color={COLORS.success} />
          <StatCard icon="time" value={`${totalHours}h`} label={t('learnedLabel')} color={COLORS.secondary} />
          <StatCard icon="flame" value={progress.streak || 0} label={t('currentStreak')} color={COLORS.primary} />
          <StatCard icon="bookmark" value={favoritedLessons.length} label={t('savedLabel')} color="#FF9800" />
        </View>
      </LinearGradient>

      {/* Verification banner */}
      {!user?.phoneVerified && (
        <TouchableOpacity style={[styles.verifyBanner, { marginHorizontal: hPad }]}>
          <Ionicons name="warning" size={16} color={COLORS.warning} />
          <AppText style={styles.verifyText}>{t('phoneNotVerified')}</AppText>
          <Ionicons name="chevron-forward" size={14} color={COLORS.warning} />
        </TouchableOpacity>
      )}

      {/* Tab row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabScrollRow, { paddingHorizontal: hPad }]}>
        <View style={styles.tabRow}>
          {[
            { key: 'progress',  icon: 'book-outline',        label: t('progressTab') },
            { key: 'certs',     icon: 'ribbon-outline',      label: t('certsTab'), badge: completedCourses.length },
            { key: 'saved',     icon: 'bookmark-outline',    label: t('favoriteLessons') },
            { key: 'history',   icon: 'time-outline',        label: t('history') },
            { key: 'badges',    icon: 'medal-outline',       label: t('badgesTab') },
            { key: 'analytics', icon: 'stats-chart-outline', label: t('analyticsTab') },
          ].map(({ key, icon, label, badge }) => {
            const active = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(key)}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
              >
                <View>
                  <Ionicons name={icon} size={22} color={active ? COLORS.primary : COLORS.textMuted} />
                  {badge > 0 && (
                    <View style={styles.tabBadge}>
                      <AppText style={styles.tabBadgeText}>{badge > 99 ? '99+' : badge}</AppText>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Active-tab description */}
      <AppText style={[styles.tabDesc, { paddingHorizontal: hPad }]}>{t(`${activeTab}TabDesc`)}</AppText>

      {/* Tab content */}
      {activeTab === 'progress' && (
        <View style={styles.section}>
          {enrolledCourses.length === 0 ? (
            <AppText style={styles.emptyText}>{t('noEnrolledCourses')}</AppText>
          ) : (
            enrolledCourses.map((course) => {
              const p = getCourseProgress(course.id);
              return (
                <TouchableOpacity
                  key={course.id}
                  style={styles.courseRow}
                  onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: course.thumbnail }} style={styles.courseThumb} />
                  <View style={styles.courseInfo}>
                    <AppText style={styles.courseTitle} numberOfLines={2}>{course.title}</AppText>
                    <View style={styles.courseStatus}>
                      {p === 100 ? (
                        <View style={styles.completedRow}>
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                            <AppText style={styles.completedText}>{t('completedStatus')}</AppText>
                          </View>
                          <TouchableOpacity
                            style={styles.certIconBtn}
                            onPress={() => handleViewCertificate(course)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="ribbon" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                      ) : p > 0 ? (
                        <AppText style={styles.inProgressText}>{p}%</AppText>
                      ) : (
                        <AppText style={styles.notStartedText}>{t('notStarted')}</AppText>
                      )}
                    </View>
                    <ProgressBar percent={p} height={3} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {activeTab === 'certs' && (
        <View style={styles.section}>
          {completedCourses.length === 0 ? (
            <AppText style={styles.emptyText}>{t('noCertsYet')}</AppText>
          ) : (
            completedCourses.map((course) => {
              const org = organizations.find((o) => o.id === course.organizationId);
              const catInfo = CATEGORIES.find((c) => c.id === course.category);
              const issuedAt = course.lessonIds
                .map((lid) => progress.completedLessons.find((cl) => cl.lessonId === lid)?.completedAt)
                .filter(Boolean).sort().pop() || new Date().toISOString();
              const dateStr = new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              return (
                <View key={course.id} style={styles.certCard}>
                  {/* Gold top accent */}
                  <View style={styles.certCardAccent} />
                  <View style={styles.certCardBody}>
                    {/* Category chip */}
                    {catInfo && (
                      <View style={[styles.certChip, { backgroundColor: catInfo.color + '22', borderColor: catInfo.color + '66' }]}>
                        <Ionicons name={catInfo.icon} size={11} color={catInfo.color} />
                        <AppText style={[styles.certChipText, { color: catInfo.color }]}>{catInfo.label}</AppText>
                      </View>
                    )}
                    <AppText style={styles.certCardTitle} numberOfLines={2}>{course.title}</AppText>
                    <AppText style={styles.certCardOrg}>{org?.name || 'EduTok'}</AppText>
                    <View style={styles.certCardMeta}>
                      <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                      <AppText style={styles.certCardDate}>{t('issuedLabel')} {dateStr}</AppText>
                      {course.difficulty ? (
                        <View style={styles.certDiffBadge}>
                          <AppText style={styles.certDiffText}>{course.difficulty}</AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.certCardBtn}
                    onPress={() => handleViewCertificate(course)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ribbon" size={16} color="#fff" />
                    <AppText style={styles.certCardBtnText}>{t('viewAndPrint')}</AppText>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      )}

      {activeTab === 'saved' && (
        <View style={styles.section}>
          {favoritedLessons.length === 0 ? (
            <AppText style={styles.emptyText}>{t('noSavedLessons')}</AppText>
          ) : (
            favoritedLessons.map((lesson) => (
              <View key={lesson.id} style={styles.savedRow}>
                <Image source={{ uri: lesson.thumbnail }} style={styles.savedThumb} />
                <View style={styles.savedInfo}>
                  <AppText style={styles.savedTitle} numberOfLines={2}>{lesson.title}</AppText>
                  <View style={styles.savedMeta}>
                    <Ionicons name="bookmark" size={12} color={COLORS.secondary} />
                    <AppText style={styles.savedType}>{lesson.type}</AppText>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 'history' && (
        <View style={styles.section}>
          {progress.completedLessons.length === 0 ? (
            <AppText style={styles.emptyText}>{t('noCompletedLessons')}</AppText>
          ) : (
            [...progress.completedLessons].reverse().slice(0, 20).map((cl, i) => {
              const lesson = courses.flatMap((c) => getLessonsForCourse(c.id)).find((l) => l.id === cl.lessonId);
              if (!lesson) return null;
              return (
                <View key={cl.lessonId + i} style={styles.historyRow}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  </View>
                  <View style={styles.historyInfo}>
                    <AppText style={styles.historyTitle} numberOfLines={1}>{lesson.title}</AppText>
                    <AppText style={styles.historyTime}>{formatTimeAgo(cl.completedAt)}</AppText>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Badges tab */}
      {activeTab === 'badges' && (
        <View style={styles.section}>
          <AppText style={styles.badgesSubtitle}>{earnedBadgeIds.size}/{BADGE_DEFS.length} {t('badgesEarned')}</AppText>
          <View style={styles.badgesGrid}>
            {BADGE_DEFS.map((def) => {
              const earned = badges.find((b) => b.id === def.id);
              const isEarned = !!earned;
              return (
                <TouchableOpacity
                  key={def.id}
                  style={[styles.badgeCard, !isEarned && styles.badgeCardLocked]}
                  onPress={() => isEarned && setSelectedBadge({ def, earned })}
                  activeOpacity={isEarned ? 0.75 : 1}
                >
                  <View style={[styles.badgeIconWrap, { backgroundColor: def.color + (isEarned ? '33' : '11') }]}>
                    <Ionicons name={def.icon} size={28} color={isEarned ? def.color : COLORS.textMuted} />
                    {!isEarned && (
                      <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
                      </View>
                    )}
                  </View>
                  <AppText style={[styles.badgeLabel, !isEarned && styles.badgeLabelLocked]} numberOfLines={2}>
                    {t(def.labelKey)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Analytics tab */}
      {activeTab === 'analytics' && (
        <View style={styles.section}>
          <AppText style={styles.analyticsTitle}>{t('weeklyTime')}</AppText>
          <View style={styles.chartContainer}>
            {weeklyData.map((w, i) => (
              <View key={i} style={styles.chartBarWrap}>
                <View style={[styles.chartBar, { height: Math.max(4, Math.round(w.pct * 80)) }]} />
                <AppText style={styles.chartLabel}>{w.label}</AppText>
              </View>
            ))}
          </View>
          <AppText style={[styles.analyticsTitle, { marginTop: 16 }]}>{t('courseBreakdown')}</AppText>
          {enrolledCourses.length === 0 ? (
            <AppText style={styles.emptyText}>{t('noEnrolledCourses')}</AppText>
          ) : (
            enrolledCourses.map((course) => {
              const pct = getCourseProgress(course.id);
              const done = progress.completedLessons.filter((cl) => cl.courseId === course.id).length;
              return (
                <View key={course.id} style={styles.analyticsRow}>
                  <AppText style={styles.analyticsCourseTitle} numberOfLines={1}>{course.title}</AppText>
                  <View style={styles.analyticsBarRow}>
                    <ProgressBar percent={pct} height={6} />
                    <AppText style={styles.analyticsPct}>{done}/{course.lessonIds.length}</AppText>
                  </View>
                </View>
              );
            })
          )}
          <AppText style={[styles.analyticsTitle, { marginTop: 16 }]}>{t('quizHistory')}</AppText>
          {progress.passedQuizzes.length === 0 ? (
            <AppText style={styles.emptyText}>{t('noQuizzesYet')}</AppText>
          ) : (
            [...progress.passedQuizzes].reverse().slice(0, 10).map((q, i) => (
              <View key={q.quizId + i} style={styles.quizHistRow}>
                <View style={styles.quizHistIcon}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                </View>
                <View style={styles.quizHistInfo}>
                  <AppText style={styles.quizHistScore}>{t('scoreLabel')}: {q.score}%</AppText>
                  <AppText style={styles.quizHistDate}>{formatTimeAgo(q.passedAt)}</AppText>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Settings */}
      <SectionTitle>{t('settings')}</SectionTitle>
      <View style={[styles.settingsSection, { marginHorizontal: hPad }]}>
        <View style={styles.settingRow}>
          <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
          <AppText style={styles.settingLabel}>{t('notifications')}</AppText>
          <Switch
            value={user?.notificationsEnabled ?? true}
            onValueChange={async (val) => {
              await updateUser({ notificationsEnabled: val });
              if (val) {
                const granted = await requestPermissions();
                if (granted) await scheduleDailyReminder();
              } else {
                await cancelDailyReminder();
              }
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.settingRow}>
          <Ionicons name="language-outline" size={20} color={COLORS.textSecondary} />
          <AppText style={styles.settingLabel}>{t('language')}</AppText>
          <TouchableOpacity style={styles.langToggle} onPress={handleLanguageToggle}>
            <AppText style={styles.langToggleText}>{user?.language === 'am' ? 'አማርኛ' : 'English'}</AppText>
            <Ionicons name="swap-horizontal" size={14} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.settingRow}>
          <Ionicons name={user?.phoneVerified ? 'shield-checkmark' : 'shield-outline'} size={20} color={user?.phoneVerified ? COLORS.success : COLORS.warning} />
          <AppText style={styles.settingLabel}>{t('phoneVerification')}</AppText>
          <AppText style={[styles.verifyStatus, { color: user?.phoneVerified ? COLORS.success : COLORS.warning }]}>
            {user?.phoneVerified ? t('verified') : t('notVerified')}
          </AppText>
        </View>
        <TouchableOpacity style={styles.settingRow} onPress={openPasswordModal} activeOpacity={0.7}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
          <AppText style={styles.settingLabel}>{t('changePassword')}</AppText>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.settingRow}>
          <Ionicons name="text" size={20} color={COLORS.textSecondary} />
          <AppText style={styles.settingLabel}>{t('fontSize')}</AppText>
          <View style={styles.fontSizeBtns}>
            {[{ key: 'sm', label: 'A' }, { key: 'md', label: 'A' }, { key: 'lg', label: 'A' }].map(({ key, label }, i) => (
              <TouchableOpacity
                key={key}
                style={[styles.fontBtn, fontScale === key && styles.fontBtnActive]}
                onPress={() => setFontScale(key)}
              >
                <AppText style={[styles.fontBtnText, { fontSize: 10 + i * 2 }, fontScale === key && styles.fontBtnTextActive]}>{label}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="contrast-outline" size={20} color={COLORS.textSecondary} />
          <AppText style={styles.settingLabel}>{t('highContrastMode')}</AppText>
          <Switch
            value={highContrast}
            onValueChange={setHighContrast}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <TouchableOpacity style={[styles.signOutBtn, { marginHorizontal: hPad }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <AppText style={styles.signOutText}>{t('signOut')}</AppText>
      </TouchableOpacity>

      <View style={{ height: 100 }} />

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowEditModal(false); setShowAvatarPicker(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { maxWidth: formMaxW, width: '100%', alignSelf: 'center' }]}>
            <View style={styles.editModalHeader}>
              <AppText style={styles.editModalTitle}>{t('editProfile')}</AppText>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setShowAvatarPicker(false); }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.editScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Avatar: tap to upload a real photo from the device */}
              <TouchableOpacity style={styles.avatarPickerBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
                <View>
                  <Image
                    source={{ uri: editForm.avatar || user?.avatar || `https://picsum.photos/seed/profile/200/200` }}
                    style={styles.editAvatar}
                  />
                  {uploadingAvatar && (
                    <View style={styles.avatarUploadOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  <View style={styles.editAvatarBadge}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                </View>
                <AppText style={styles.changeAvatarText}>
                  {uploadingAvatar ? t('uploadingPhoto') : t('uploadPhoto')}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAvatarPicker((v) => !v)} style={styles.presetToggle}>
                <Ionicons name="grid-outline" size={14} color={COLORS.secondary} />
                <AppText style={styles.presetToggleText}>{t('chooseAPreset')}</AppText>
              </TouchableOpacity>
              {showAvatarPicker && (
                <View style={styles.avatarGridWrap}>
                  {PRESET_AVATARS.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => { setEditForm((f) => ({ ...f, avatar: item })); setShowAvatarPicker(false); }}
                      style={[styles.avatarOption, editForm.avatar === item && styles.avatarOptionSelected]}
                    >
                      <Image source={{ uri: item }} style={styles.avatarOptionImg} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <AppText style={styles.editLabel}>{t('fullName')}</AppText>
              <TextInput
                style={styles.editInput}
                value={editForm.fullName}
                onChangeText={(v) => setEditForm((f) => ({ ...f, fullName: v }))}
                placeholder={t('yourFullNamePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
              />

              <AppText style={styles.editLabel}>{t('username')}</AppText>
              <TextInput
                style={styles.editInput}
                value={editForm.username}
                onChangeText={(v) => setEditForm((f) => ({ ...f, username: v }))}
                placeholder={t('username')}
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <AppText style={styles.fieldHint}>{t('usernameHint')}</AppText>

              <AppText style={styles.editLabel}>{t('phoneNumber')}</AppText>
              <TextInput
                style={styles.editInput}
                value={editForm.phone}
                onChangeText={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                placeholder={t('phoneNumber')}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
              <AppText style={styles.fieldHint}>{t('phoneChangeHint')}</AppText>

              <AppText style={styles.editLabel}>{t('bioLabel')}</AppText>
              <TextInput
                style={[styles.editInput, styles.editTextarea]}
                value={editForm.bio}
                onChangeText={(v) => setEditForm((f) => ({ ...f, bio: v }))}
                placeholder={t('aboutYourselfPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={160}
              />

              {isStudent && (
                <>
                  <AppText style={styles.editLabel}>{t('ageRangeLabel')}</AppText>
                  <View style={styles.chipWrap}>
                    {AGE_RANGES.map((a) => {
                      const sel = editForm.ageRange === a.key;
                      return (
                        <TouchableOpacity
                          key={a.key}
                          style={[styles.choiceChip, sel && styles.choiceChipActive]}
                          onPress={() => setEditForm((f) => ({ ...f, ageRange: sel ? '' : a.key }))}
                          activeOpacity={0.8}
                        >
                          <AppText style={[styles.choiceChipText, sel && styles.choiceChipTextActive]}>{a.label}</AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <AppText style={styles.editLabel}>{t('genderLabel')}</AppText>
                  <View style={styles.chipWrap}>
                    {GENDERS.map((g) => {
                      const sel = editForm.gender === g.key;
                      return (
                        <TouchableOpacity
                          key={g.key}
                          style={[styles.choiceChip, styles.genderChip, sel && styles.choiceChipActive]}
                          onPress={() => setEditForm((f) => ({ ...f, gender: sel ? '' : g.key }))}
                          activeOpacity={0.8}
                        >
                          <AppText style={[styles.choiceChipText, sel && styles.choiceChipTextActive]}>{t(g.labelKey)}</AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            {!!editError && <AppText style={styles.pwError}>{editError}</AppText>}
            <TouchableOpacity
              style={[styles.saveBtn, editSaving && { opacity: 0.6 }]}
              onPress={handleSaveProfile}
              disabled={editSaving}
            >
              {editSaving
                ? <ActivityIndicator color="#fff" />
                : <AppText style={styles.saveBtnText}>{t('saveChanges')}</AppText>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { maxWidth: formMaxW, width: '100%', alignSelf: 'center' }]}>
            <View style={styles.editModalHeader}>
              <AppText style={styles.editModalTitle}>{t('changePassword')}</AppText>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <AppText style={styles.editLabel}>{t('currentPassword')}</AppText>
            <TextInput
              style={styles.editInput}
              value={pwForm.current}
              onChangeText={(v) => setPwForm((f) => ({ ...f, current: v }))}
              placeholder={t('currentPassword')}
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
            <AppText style={styles.editLabel}>{t('newPassword')}</AppText>
            <TextInput
              style={styles.editInput}
              value={pwForm.next}
              onChangeText={(v) => setPwForm((f) => ({ ...f, next: v }))}
              placeholder={t('newPassword')}
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
            <AppText style={styles.editLabel}>{t('confirmPassword')}</AppText>
            <TextInput
              style={styles.editInput}
              value={pwForm.confirm}
              onChangeText={(v) => setPwForm((f) => ({ ...f, confirm: v }))}
              placeholder={t('confirmPassword')}
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
            {!!pwError && <AppText style={styles.pwError}>{pwError}</AppText>}
            <TouchableOpacity
              style={[styles.saveBtn, pwSubmitting && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={pwSubmitting}
            >
              {pwSubmitting
                ? <ActivityIndicator color="#fff" />
                : <AppText style={styles.saveBtnText}>{t('changePasswordCta')}</AppText>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Badge detail modal */}
      <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
        <TouchableOpacity style={styles.badgeModalOverlay} activeOpacity={1} onPress={() => setSelectedBadge(null)}>
          {selectedBadge && (
            <View style={styles.badgeDetail}>
              <View style={[styles.badgeDetailIcon, { backgroundColor: selectedBadge.def.color + '33' }]}>
                <Ionicons name={selectedBadge.def.icon} size={48} color={selectedBadge.def.color} />
              </View>
              <AppText style={styles.badgeDetailLabel}>{t(selectedBadge.def.labelKey)}</AppText>
              <AppText style={styles.badgeDetailDate}>
                {t('earnedOn')} {new Date(selectedBadge.earned.earnedAt).toLocaleDateString()}
              </AppText>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
      <View style={{ height: TAB_BAR_HEIGHT + insets.bottom }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBg: { paddingBottom: 8 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileInfo: { flex: 1, gap: 3 },
  fullName: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '800' },
  username: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  bio: { color: COLORS.textSecondary, fontSize: SIZES.sm, lineHeight: 20, marginTop: 4 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  statValue: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warning + '22',
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.warning + '66',
  },
  verifyText: { flex: 1, color: COLORS.warning, fontSize: SIZES.sm, fontWeight: '600' },
  tab: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabBadge: {
    position: 'absolute',
    top: -7,
    right: -12,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  tabDesc: { color: COLORS.textMuted, fontSize: SIZES.xs, fontWeight: '500', paddingTop: 12, paddingBottom: 2 },
  section: { padding: 16, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.sm, textAlign: 'center', paddingTop: 24 },
  courseRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  courseThumb: { width: 80, height: 80, backgroundColor: COLORS.surface },
  courseInfo: { flex: 1, padding: 10, justifyContent: 'center', gap: 6 },
  courseTitle: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '700', lineHeight: 18 },
  courseStatus: { flexDirection: 'row', alignItems: 'center' },
  completedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completedText: { color: COLORS.success, fontSize: SIZES.xs, fontWeight: '700' },
  certIconBtn: { padding: 2 },
  // Certs tab
  certCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D4AF3744',
  },
  certCardAccent: { height: 3, backgroundColor: '#D4AF37' },
  certCardBody: { padding: 14, gap: 6 },
  certChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 2,
  },
  certChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  certCardTitle: { color: COLORS.text, fontSize: SIZES.base, fontWeight: '700', lineHeight: 20 },
  certCardOrg: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  certCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  certCardDate: { color: COLORS.textMuted, fontSize: SIZES.xs, flex: 1 },
  certDiffBadge: { backgroundColor: COLORS.surface, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  certDiffText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600' },
  certCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
  },
  certCardBtnText: { color: '#fff', fontWeight: '700', fontSize: SIZES.sm },
  inProgressText: { color: COLORS.secondary, fontSize: SIZES.xs, fontWeight: '600' },
  notStartedText: { color: COLORS.textMuted, fontSize: SIZES.xs },
  savedRow: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden' },
  savedThumb: { width: 70, height: 70, backgroundColor: COLORS.surface },
  savedInfo: { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  savedTitle: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '700', lineHeight: 18 },
  savedMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedType: { color: COLORS.secondary, fontSize: SIZES.xs, fontWeight: '600', textTransform: 'capitalize' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success + '22', alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyTitle: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '600' },
  historyTime: { color: COLORS.textMuted, fontSize: SIZES.xs },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  settingsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: { flex: 1, color: COLORS.text, fontSize: SIZES.sm, fontWeight: '500' },
  langToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  langToggleText: { color: COLORS.secondary, fontSize: SIZES.sm, fontWeight: '700' },
  verifyStatus: { fontSize: SIZES.xs, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.error + '22',
    borderWidth: 1,
    borderColor: COLORS.error + '55',
  },
  signOutText: { color: COLORS.error, fontWeight: '700', fontSize: SIZES.base },
  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  editModal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  editScroll: { flexShrink: 1 },
  fieldHint: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: -6, marginBottom: 12 },
  avatarGridWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  choiceChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: SIZES.borderRadiusFull,
    backgroundColor: COLORS.cardAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  genderChip: { minWidth: 80, alignItems: 'center' },
  choiceChipActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  choiceChipText: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '600' },
  choiceChipTextActive: { color: COLORS.primary },
  editModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  editModalTitle: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '700' },
  editLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600', marginBottom: 6 },
  editInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: SIZES.base,
    marginBottom: 16,
  },
  editTextarea: { height: 90, textAlignVertical: 'top' },
  avatarPickerBtn: { alignItems: 'center', marginBottom: 8, position: 'relative' },
  editAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.card },
  avatarUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  editAvatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.card,
  },
  changeAvatarText: { color: COLORS.secondary, fontSize: SIZES.xs, fontWeight: '600', marginTop: 4 },
  presetToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 5, marginBottom: 12 },
  presetToggleText: { color: COLORS.secondary, fontSize: SIZES.xs, fontWeight: '600' },
  pwError: { color: COLORS.error, fontSize: SIZES.xs, marginBottom: 8, marginTop: 2 },
  avatarOption: { width: '22%', margin: '1.5%', borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  avatarOptionSelected: { borderColor: COLORS.secondary },
  avatarOptionImg: { width: '100%', aspectRatio: 1 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  // Badges
  badgesSubtitle: { color: COLORS.textMuted, fontSize: SIZES.sm, marginBottom: 8, textAlign: 'center' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { width: '30%', alignItems: 'center', gap: 6 },
  badgeCardLocked: { opacity: 0.45 },
  badgeIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  lockOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.card, borderRadius: 8, padding: 2 },
  badgeLabel: { color: COLORS.text, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  badgeLabelLocked: { color: COLORS.textMuted },
  badgeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  badgeDetail: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, alignItems: 'center', gap: 12, width: 240 },
  badgeDetailIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  badgeDetailLabel: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '800', textAlign: 'center' },
  badgeDetailDate: { color: COLORS.textMuted, fontSize: SIZES.xs },
  // Analytics
  analyticsTitle: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '700', marginBottom: 10 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6, marginBottom: 8 },
  chartBarWrap: { flex: 1, alignItems: 'center', gap: 4 },
  chartBar: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 4, minHeight: 4 },
  chartLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600' },
  analyticsRow: { gap: 6, marginBottom: 10 },
  analyticsCourseTitle: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '600' },
  analyticsBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyticsPct: { color: COLORS.textMuted, fontSize: SIZES.xs, width: 36, textAlign: 'right' },
  quizHistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  quizHistIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.success + '22', alignItems: 'center', justifyContent: 'center' },
  quizHistInfo: { flex: 1 },
  quizHistScore: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '600' },
  quizHistDate: { color: COLORS.textMuted, fontSize: SIZES.xs },
  // Accessibility settings
  fontSizeBtns: { flexDirection: 'row', gap: 6 },
  fontBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  fontBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  fontBtnText: { color: COLORS.textSecondary, fontWeight: '700' },
  fontBtnTextActive: { color: '#fff' },
  tabScrollRow: { marginTop: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabRow: { flexDirection: 'row', paddingTop: 12, gap: 4 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: SIZES.base },
});

export default ProfileScreen;
