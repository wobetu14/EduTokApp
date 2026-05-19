import React, { useEffect, useState, useCallback } from 'react';
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

const CommentItem = ({ item }) => (
  <View style={styles.commentRow}>
    <Image
      source={{ uri: item.avatar || `https://picsum.photos/seed/${item.userId}/40/40` }}
      style={styles.avatar}
    />
    <View style={styles.bubble}>
      <View style={styles.nameRow}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
      <Text style={styles.commentText}>{item.text}</Text>
    </View>
  </View>
);

const CommentThread = ({ lessonId, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.fetchComments(lessonId).then((c) => {
      setComments(c);
      setLoading(false);
    });
  }, [lessonId]);

  const handlePost = useCallback(async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    const updated = await api.postComment(
      lessonId,
      user.id,
      user.username,
      user.avatar,
      text.trim()
    );
    setComments(updated);
    setText('');
    setPosting(false);
  }, [text, posting, lessonId, user]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color="#444" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommentItem item={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No comments yet. Be the first!</Text>
          }
        />
      )}
      <View style={styles.inputRow}>
        <Image
          source={{ uri: user?.avatar || `https://picsum.photos/seed/me/40/40` }}
          style={styles.inputAvatar}
        />
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
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
