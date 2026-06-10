import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Animated, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

const VideoPlayer = ({ videoUri, active, onProgress }) => {
  const [userPaused, setUserPaused]   = useState(false);
  const [loading,    setLoading]      = useState(true);
  const [flashedIcon, setFlashedIcon] = useState('pause');
  const iconOpacity = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop                   = true;
    p.timeUpdateEventInterval = 1; // emit timeUpdate every 1 s
    if (active) p.play();
  });

  // Sync play / pause with parent active flag and user tap
  useEffect(() => {
    if (!player) return;
    const shouldPlay = active && !userPaused;
    if (shouldPlay) { player.play();  }
    else            { player.pause(); }
  }, [active, userPaused]);

  // Loading state: clear spinner once the player has buffered enough to play
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setLoading(false);
      if (status === 'loading')     setLoading(true);
    });
    return () => sub.remove();
  }, [player]);

  // Progress: report 0–1 fraction via onProgress
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (player.duration > 0) {
        onProgress?.(currentTime / player.duration);
      }
    });
    return () => sub.remove();
  }, [player, onProgress]);

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
        <VideoView
          player={player}
          style={styles.fill}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ isFullscreenButtonHidden: true }}
        />

        {/* Spinner while buffering */}
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
          </View>
        )}

        {/* Tap-to-pause/play flash icon */}
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
