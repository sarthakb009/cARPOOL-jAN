import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import LottieView from 'lottie-react-native';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const roadAnimation = useRef(new Animated.Value(0)).current;
  const carAnimation = useRef(new Animated.Value(0)).current;
  const animation = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(roadAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.timing(carAnimation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.outBack,
        useNativeDriver: true,
      }),
    ]).start();

    // Start the Lottie animation
    animation.current?.play();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, roadAnimation, carAnimation, navigation]);

  const roadTranslate = roadAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const carTranslate = carAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View style={[styles.animationContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Svg height="200" width="300" viewBox="0 0 300 200">
          {/* Road */}
          <Animated.View style={{ transform: [{ translateX: roadTranslate }] }}>
            <Path
              d="M0 150 Q150 120 300 150"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M0 160 Q150 130 300 160"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
          </Animated.View>

          {/* Car body */}
          <Animated.View style={{ transform: [{ translateX: carTranslate }] }}>
            <Path
              d="M50 130 L70 130 Q90 130 100 120 L120 100 Q130 90 140 90 L160 90 Q180 90 190 100 L210 120 Q220 130 240 130 L260 130 Q270 130 270 140 L270 150 Q270 160 260 160 L60 160 Q50 160 50 150 Z"
              fill="white"
            />
            {/* Windows */}
            <Path
              d="M100 120 L120 100 Q130 90 140 90 L160 90 Q180 90 190 100 L210 120"
              stroke="black"
              strokeWidth="2"
              fill="none"
            />
            {/* Wheels */}
            <Circle cx="90" cy="160" r="20" fill="black" />
            <Circle cx="220" cy="160" r="20" fill="black" />
            <Circle cx="90" cy="160" r="10" fill="white" />
            <Circle cx="220" cy="160" r="10" fill="white" />
          </Animated.View>
        </Svg>
      </Animated.View>

      <LottieView
        autoPlay
        ref={animation}
        style={styles.lottieAnimation}
        source={require('../assets/splash.json')}
      />

      <Animated.Text style={[styles.appName, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        EcoR 
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
        Journey together, impact the planet
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  animationContainer: {
    marginBottom: 30,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  appName: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tagline: {
    color: 'white',
    fontSize: 16,
    fontStyle: 'italic',
  },
});

export default SplashScreen;