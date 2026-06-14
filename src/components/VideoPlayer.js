import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

const VideoPlayer = ({ videoUri, active, onProgress }) => {
  const [userPaused, setUserPaused]   = useState(false);
  const [loading,    setLoading]      = useState(true);
  const [flashedIcon, setFlashedIcon] = useState('pause');
  const iconOpacity = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop                   = true;
    p.timeUpdateEventInterval = 0.25; // emit timeUpdate ~4×/s for a smooth bar
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

  // Progress: report a clamped 0–1 fraction via onProgress. The timeUpdate
  // payload carries `duration`, which is reliable; reading player.duration
  // mid-event can still be NaN/0 before the source is ready (which silently
  // froze the progress bar). Fall back to the property only if the payload
  // duration is missing.
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('timeUpdate', ({ currentTime, duration }) => {
      const total = duration > 0 ? duration : player.duration;
      if (total > 0) {
        const frac = Math.min(1, Math.max(0, currentTime / total));
        onProgress?.(frac);
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

  // Always toggleable — gating on `active` could permanently swallow taps if a
  // parent ever left its transition flag false (play/pause felt "broken")
  const handleTap = () => {
    if (!userPaused) { setUserPaused(true);  flash('pause'); }
    else             { setUserPaused(false); flash('play');  }
  };

  if (!videoUri) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {/* contain = full frame always visible (no horizontal cropping),
          matching the object-fit behavior of image lessons */}
      <VideoView
        player={player}
        style={styles.fill}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{ isFullscreenButtonHidden: true }}
      />

      {/* Transparent tap layer ON TOP of the native video surface. The native
          player view swallows touches on some platforms, so a Touchable
          wrapping it never fires — an overlay receives taps reliably. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap} />

      {/* Spinner while buffering */}
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
        </View>
      )}

      {/* Persistent play icon while paused — makes the paused state obvious */}
      {userPaused && !loading && (
        <View style={styles.iconOverlay} pointerEvents="none">
          <View style={styles.iconCircle}>
            <Ionicons name="play" size={44} color="#fff" />
          </View>
        </View>
      )}

      {/* Tap-to-pause/play flash icon */}
      {!userPaused && (
        <Animated.View
          style={[styles.iconOverlay, { opacity: iconOpacity }]}
          pointerEvents="none"
        >
          <View style={styles.iconCircle}>
            <Ionicons name={flashedIcon} size={44} color="#fff" />
          </View>
        </Animated.View>
      )}
    </View>
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
