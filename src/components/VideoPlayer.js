import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Animated, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const VideoPlayer = ({ videoUri, active, onProgress }) => {
  const videoRef   = useRef(null);
  const [userPaused, setUserPaused] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [flashedIcon, setFlashedIcon] = useState('pause');
  const iconOpacity = useRef(new Animated.Value(0)).current;

  const isPlaying = active && !userPaused;

  // Sync play/pause with the active + userPaused state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.playAsync().catch(() => {}); }
    else           { videoRef.current.pauseAsync().catch(() => {}); }
  }, [isPlaying]);

  const flash = (name) => {
    setFlashedIcon(name);
    iconOpacity.setValue(1);
    Animated.timing(iconOpacity, {
      toValue: 0, duration: 700, delay: 350, useNativeDriver: true,
    }).start();
  };

  const handleTap = () => {
    if (!active) return;
    if (!userPaused) { setUserPaused(true);  flash('pause'); }
    else             { setUserPaused(false); flash('play');  }
  };

  if (!videoUri) return <View style={styles.container} />;

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.container}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.fill}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isPlaying}
          useNativeControls={false}
          onPlaybackStatusUpdate={(s) => {
            if (s.isLoaded) {
              setLoading(false);
              if (s.durationMillis > 0) {
                onProgress?.(s.positionMillis / s.durationMillis);
              }
            }
          }}
        />

        {/* Loading spinner — shown until video is ready */}
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
          </View>
        )}

        {/* Play/Pause flash icon */}
        <Animated.View
          style={[styles.iconOverlay, { opacity: iconOpacity }]}
          pointerEvents="none"
        >
          <View style={styles.iconCircle}>
            <Ionicons name={flashedIcon} size={44} color="#fff" />
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fill: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VideoPlayer;
