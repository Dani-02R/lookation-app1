import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  title?: string;
  subtitle?: string;
  fullscreen?: boolean;
  style?: ViewStyle;
};

export default function AppLoader({
  title = 'Buscando tu ubicación…',
  subtitle = 'Un momento por favor',
  fullscreen = true,
  style,
}: Props) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const PRIMARY = '#0082FA';
  const FG = '#FFFFFF';

  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, [dot1, dot2, dot3]);

  const dotStyle = (val: Animated.Value) => ({
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
  });

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(PRIMARY);
    }
  }, []);

  const Content = (
    <>
      {/* Pin */}
      <View style={styles.pinWrapper}>
        <View style={[styles.pin, { backgroundColor: FG }]} />
        <View style={[styles.pinShadow, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { backgroundColor: FG }, dotStyle(dot1)]} />
        <Animated.View style={[styles.dot, { backgroundColor: FG }, dotStyle(dot2)]} />
        <Animated.View style={[styles.dot, { backgroundColor: FG }, dotStyle(dot3)]} />
      </View>

      {/* Texts */}
      {title ? <Text style={[styles.title, { color: FG }]}>{title}</Text> : null}
      {subtitle ? <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.85)' }]}>{subtitle}</Text> : null}
    </>
  );

  if (fullscreen) {
    return (
      <View style={[styles.overlay, style]}>
        <SafeAreaView style={styles.safeAreaBlue}>
          <View style={styles.center}>{Content}</View>
        </SafeAreaView>
      </View>
    );
  }

  return <View style={[styles.inline, style]}>{Content}</View>;
}

// --- estilos más grandes ---
const DOT = 14;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: '#0082FA',
    zIndex: 9999,
  },
  safeAreaBlue: {
    flex: 1,
    backgroundColor: '#0082FA',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  pinWrapper: {
    alignItems: 'center',
    marginBottom: 28, // más espacio
  },
  pin: {
    width: 28,  // más grande
    height: 28,
    borderRadius: 14,
  },
  pinShadow: {
    width: 22,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24, // más espacio
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    marginHorizontal: 8,
  },

  title: {
    fontSize: 20, // más grande
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
  },
});
