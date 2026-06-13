import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Share, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { COLORS, SIZES } from '../utils/constants';
import AppText from './AppText';
import { useTranslation } from '../utils/useTranslation';
import { useToast } from '../context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bottom-sheet share dialog with a copyable link plus the native share sheet.
// `message` is the human-readable blurb; `url` is the shareable link.
const ShareSheet = ({ visible, onClose, title, message, url, onShared }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const handleNativeShare = async () => {
    try {
      // url is honoured by the iOS share sheet; appending it to the message
      // ensures the link travels on Android too (where `url` is ignored).
      const result = await Share.share({ message: `${message}\n${url}`, url, title });
      if (result.action === Share.sharedAction) onShared?.();
    } catch (_) {}
    onClose();
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(url);
      showToast(t('linkCopied'));
      onShared?.();
    } catch (_) {}
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={styles.handle} />
          <AppText style={styles.title}>{t('shareTitle')}</AppText>

          <View style={styles.linkBox}>
            <Ionicons name="link-outline" size={16} color={COLORS.textMuted} />
            <AppText style={styles.linkText} numberOfLines={1}>{url}</AppText>
          </View>

          <TouchableOpacity style={styles.action} onPress={handleCopy} activeOpacity={0.8}>
            <Ionicons name="copy-outline" size={20} color={COLORS.text} />
            <AppText style={styles.actionText}>{t('copyLink')}</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, styles.primaryAction]}
            onPress={handleNativeShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
            <AppText style={styles.primaryActionText}>{t('shareVia')}</AppText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.cardAlt,
    borderRadius: 12,
    paddingVertical: 14,
  },
  actionText: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});

export default ShareSheet;
