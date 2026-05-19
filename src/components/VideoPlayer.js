import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

const VideoPlayer = ({ videoUri, active, onProgress }) => {
  const videoRef = useRef(null);
  // Track user-initiated pause separately from slide-transition pausing
  const [userPaused, setUserPaused] = useState(false);
  const [flashedIcon, setFlashedIcon] = useState('pause');
  const iconOpacity = useRef(new Animated.Value(0)).current;

  const isPlaying = active && !userPaused;

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isPlaying]);

  const flash = (name) => {
    setFlashedIcon(name);
    iconOpacity.setValue(1);
    Animated.timing(iconOpacity, {
      toValue: 0,
      duration: 700,
      delay: 350,
      useNativeDriver: true,
    }).start();
  };

  const handleTap = () => {
    if (!active) return;
    if (!userPaused) {
      setUserPaused(true);
      flash('pause');
    } else {
      setUserPaused(false);
      flash('play');
    }
  };

  const handleStatus = (status) => {
    if (status.isLoaded && status.durationMillis > 0) {
      onProgress?.(status.positionMillis / status.durationMillis);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.container}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={handleStatus}
          useNativeControls={false}
        />
        {/* Brief play/pause icon flash on tap */}
        <Animated.View style={[styles.iconOverlay, { opacity: iconOpacity }]} pointerEvents="none">
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  iconOverlay: {
    position: 'absolute',
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
