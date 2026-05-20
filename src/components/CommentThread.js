import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import { formatTimeAgo } from '../utils/helpers';
import * as api from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/useTranslation';
import AppText from './AppText';

const ReplyItem = ({ item }) => (
  <View style={styles.replyRow}>
    <Image
      source={{ uri: item.avatar || `https://picsum.photos/seed/${item.userId}/40/40` }}
      style={styles.replyAvatar}
    />
    <View style={styles.replyBubble}>
      <View style={styles.nameRow}>
        <AppText style={styles.username}>@{item.username}</AppText>
        <AppText style={styles.time}>{formatTimeAgo(item.createdAt)}</AppText>
      </View>
      <AppText style={styles.commentText}>{item.text}</AppText>
    </View>
  </View>
);

const CommentItem = ({ item, replies, onReply }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const showReplies = expanded ? replies : [];
  return (
    <View>
      <View style={styles.commentRow}>
        <Image
          source={{ uri: item.avatar || `https://picsum.photos/seed/${item.userId}/40/40` }}
          style={styles.avatar}
        />
        <View style={styles.bubble}>
          <View style={styles.nameRow}>
            <AppText style={styles.username}>@{item.username}</AppText>
            <AppText style={styles.time}>{formatTimeAgo(item.createdAt)}</AppText>
          </View>
          <AppText style={styles.commentText}>{item.text}</AppText>
          <TouchableOpacity onPress={() => onReply(item.id, item.username)} style={styles.replyBtn}>
            <Ionicons name="return-down-forward-outline" size={13} color={COLORS.textMuted} />
            <AppText style={styles.replyBtnText}>{t('reply')}</AppText>
          </TouchableOpacity>
        </View>
      </View>
      {/* Replies */}
      {replies.length > 0 && (
        <View style={styles.repliesContainer}>
          <View style={styles.replyAccent} />
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={styles.toggleReplies}>
              <AppText style={styles.toggleRepliesText}>
                {expanded ? t('hideReplies') : `${t('showReplies')} (${replies.length})`}
              </AppText>
            </TouchableOpacity>
            {showReplies.map((r) => <ReplyItem key={r.id} item={r} />)}
          </View>
        </View>
      )}
    </View>
  );
};

const CommentThread = ({ lessonId, onClose }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, username }

  useEffect(() => {
    api.fetchComments(lessonId).then((c) => {
      setComments(c);
      setLoading(false);
    });
  }, [lessonId]);

  const commentTree = useMemo(() => {
    const top = comments.filter((c) => !c.parentId);
    return top.map((c) => ({
      ...c,
      replies: comments.filter((r) => r.parentId === c.id),
    }));
  }, [comments]);

  const handleReply = useCallback((commentId, username) => {
    setReplyingTo({ commentId, username });
    setText('');
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setText('');
  }, []);

  const handlePost = useCallback(async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    let updated;
    if (replyingTo) {
      updated = await api.postReply(lessonId, replyingTo.commentId, user.id, user.username, user.avatar, text.trim());
    } else {
      updated = await api.postComment(lessonId, user.id, user.username, user.avatar, text.trim());
    }
    setComments(updated);
    setText('');
    setReplyingTo(null);
    setPosting(false);
  }, [text, posting, lessonId, user, replyingTo]);

  const topCount = commentTree.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>
          {topCount} {topCount === 1 ? t('comment') : t('comments')}
        </AppText>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color="#444" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={commentTree}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentItem
              item={item}
              replies={item.replies}
              onReply={handleReply}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <AppText style={styles.empty}>{t('noCommentsYet')}</AppText>
          }
        />
      )}

      {replyingTo && (
        <View style={styles.replyingBanner}>
          <AppText style={styles.replyingText}>{t('replyingTo')} @{replyingTo.username}</AppText>
          <TouchableOpacity onPress={cancelReply}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <Image
          source={{ uri: user?.avatar || `https://picsum.photos/seed/me/40/40` }}
          style={styles.inputAvatar}
        />
        <TextInput
          style={styles.input}
          placeholder={replyingTo ? `${t('replyingTo')} @${replyingTo.username}...` : t('addComment')}
          placeholderTextColor="#aaa"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={300}
        />
        <TouchableOpacity
          onPress={handlePost}
          disabled={!text.trim() || posting}
          style={[styles.sendBtn, (!text.trim() || posting) && styles.sendBtnDisabled]}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerTitle: {
    color: '#111',
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ebebeb',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  username: {
    color: COLORS.secondary,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  time: {
    color: '#aaa',
    fontSize: SIZES.xs,
  },
  commentText: {
    color: '#222',
    fontSize: SIZES.sm,
    lineHeight: 19,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  replyBtnText: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  repliesContainer: {
    flexDirection: 'row',
    marginLeft: 46,
    marginTop: 4,
    marginBottom: 8,
  },
  replyAccent: {
    width: 2,
    backgroundColor: COLORS.primary + '44',
    borderRadius: 1,
    marginRight: 10,
    marginTop: 2,
    marginBottom: 2,
  },
  toggleReplies: {
    paddingVertical: 4,
  },
  toggleRepliesText: {
    color: COLORS.secondary,
    fontSize: SIZES.xs,
    fontWeight: '700',
    marginBottom: 6,
  },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ebebeb',
  },
  replyBubble: {
    flex: 1,
    backgroundColor: '#eeeeee',
    borderRadius: 10,
    padding: 8,
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyingText: {
    color: '#555',
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  empty: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 40,
    fontSize: SIZES.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ebebeb',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#111',
    fontSize: SIZES.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});

export default CommentThread;
