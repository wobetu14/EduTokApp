import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useA11y } from '../context/AccessibilityContext';

const AppText = ({ style, ...props }) => {
  const { fs } = useA11y();
  const flat = StyleSheet.flatten(style);
  const scaledStyle = flat?.fontSize
    ? { ...flat, fontSize: fs(flat.fontSize) }
    : flat;
  return <Text style={scaledStyle} {...props} />;
};

export default AppText;
