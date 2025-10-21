import BottomNavigation from '@/components/Interface/nav-bar';
import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

type Screen = 'notes' | 'quiz' | 'planner' | 'friendlist';

// Global state to track if animation has been shown
let hasShownAnimation = false;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shouldAnimate, setShouldAnimate] = useState(!hasShownAnimation);
  const { userData } = useAuth();

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get first name from username
  const getFirstName = () => {
    if (!userData?.username) return 'User';
    // Split by space and get first part
    return userData.username.split(' ')[0];
  };

  const greeting = getGreeting();
  const firstName = getFirstName();

  // Animation values - initialize based on whether we should animate
  const fadeAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(shouldAnimate ? 50 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(shouldAnimate ? 0.8 : 1)).current;
  const logoFadeAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const logoRotateAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  
  // Individual letter animations for greeting text - recreate when greeting changes
  const [letterAnims, setLetterAnims] = useState(() => 
    greeting.split('').map(() => new Animated.Value(shouldAnimate ? 0 : 1))
  );

  // Update letter animations when greeting changes
  useEffect(() => {
    setLetterAnims(greeting.split('').map(() => new Animated.Value(shouldAnimate ? 0 : 1)));
  }, [greeting]);
  
  // Module button animations
  const moduleAnims = useRef([
    new Animated.Value(shouldAnimate ? 0 : 1),
    new Animated.Value(shouldAnimate ? 0 : 1),
    new Animated.Value(shouldAnimate ? 0 : 1),
    new Animated.Value(shouldAnimate ? 0 : 1),
  ]).current;

  const bottomNavAnim = useRef(new Animated.Value(shouldAnimate ? 100 : 0)).current;

  useEffect(() => {
    if (fontsLoaded && shouldAnimate) {
      startAnimations();
      // Mark animation as shown
      hasShownAnimation = true;
    }
  }, [fontsLoaded, shouldAnimate]);

  const startAnimations = () => {
    // Main container fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Logo animation
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();

    // Letter animations with stagger
    const letterAnimations = letterAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50, // 50ms delay between each letter
        useNativeDriver: true,
      })
    );

    Animated.sequence([
      Animated.delay(200), // Wait for container to start appearing
      Animated.parallel(letterAnimations),
    ]).start();

    // Module buttons with stagger
    const moduleAnimations = moduleAnims.map((anim, index) =>
      Animated.spring(anim, {
        toValue: 1,
        delay: 600 + (index * 150), // Start after letters, stagger by 150ms
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    );

    Animated.parallel(moduleAnimations).start();

    // Bottom navigation slide up
    Animated.timing(bottomNavAnim, {
      toValue: 0,
      duration: 600,
      delay: 1000,
      useNativeDriver: true,
    }).start();
  };

  const renderAnimatedText = () => {
    return (
      <View style={styles.textContainer}>
        <View style={styles.welcomeContainer}>
          {greeting.split('').map((letter, index) => (
            <Animated.Text
              key={index}
              style={[
                styles.welcome,
                // Adjust font size for "Good Afternoon" to fit better
                greeting === 'Good Afternoon' && styles.welcomeSmaller,
                {
                  opacity: letterAnims[index],
                  transform: [
                    {
                      translateY: letterAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                    {
                      scale: letterAnims[index].interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.5, 1.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </Animated.Text>
          ))}
        </View>
        <Animated.Text 
          style={[
            styles.motto,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          It's time to lock in, {firstName}.
        </Animated.Text>
      </View>
    );
  };

  if (!fontsLoaded) {
    return null; // or a loading spinner
  }

  return (
    <LinearGradient
      colors={['#0f2c45ff','#324762' ]}
      start={{x: 0, y: 0}}
      end={{ x: 0, y: 1 }}
      style={{ 
        flex: 1}}>
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          }}
        >
          <View style={styles.headerContainer}>
            <Animated.View style={styles.logoContainer}>
              <Animated.Image
                source={require('../../assets/images/logo.png')} // Update this path to your logo
                style={[
                  styles.logo,
                  {
                    opacity: logoFadeAnim,
                    transform: [
                      {
                        rotate: logoRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['180deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
                resizeMode="contain"
              />
            </Animated.View>
            {renderAnimatedText()}
          </View>
          
          <Animated.View 
            style={[
              styles.divider,
              {
                opacity: fadeAnim,
                transform: [{ scaleX: fadeAnim }],
              }
            ]} 
          />

          <Animated.Text 
            style={[
              styles.sectionTitle,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            Activities
          </Animated.Text>
        </Animated.View>

        <View style={styles.grid}>
          <AnimatedModuleButton 
            title="notes" 
            color={["#FF999A", "#EE007F"] as const}
            image={require('../../assets/images/notes_img.png')} 
            onPress={() => router.push('./Notes/notes')}
            animValue={moduleAnims[0]}
          />
          <AnimatedModuleButton 
            title="quiz" 
            color={["#F2CD41", "#E77F00" ] as const}
            image={require('../../assets/images/quiz_img.png')} 
            onPress={() => router.push('./Quiz/quiz')}
            animValue={moduleAnims[1]}
          />
          <AnimatedModuleButton 
            title="planner" 
            color={["#63DC9A", "#52C72B"] as const}
            image={require('../../assets/images/planner_img.png')} 
            onPress={() => router.push('./Planner/planner')}
            animValue={moduleAnims[2]}
          />
          <AnimatedModuleButton 
            title="friendlist" 
            color={["#6ADBCE", "#568CD2"] as const}
            image={require('../../assets/images/social_img.png')} 
            onPress={() => router.push('./Friends/friendlist')}
            animValue={moduleAnims[3]}
          />
        </View>

        <AnimatedBottomNavigation animValue={bottomNavAnim} />
      </SafeAreaView>
    </LinearGradient>
  );
}

type ModuleButtonProps = {
  title: Screen;
  color: readonly [string, string, ...string[]];
  image: any;
  onPress: () => void;
  animValue: Animated.Value;
};

const AnimatedModuleButton = ({ title, color, image, onPress, animValue }: ModuleButtonProps) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: animValue,
        transform: [
          {
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
          {
            scale: Animated.multiply(animValue, scaleValue),
          },
        ],
      }}
    >
      <TouchableOpacity 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={color}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.moduleButton}
        >
        <Image source={image} style={[styles.moduleImage]} resizeMode="contain" />
        <Text style={styles.moduleText}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedBottomNavigation = ({ animValue }: { animValue: Animated.Value }) => {
  return (
    <Animated.View 
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        transform: [{ translateY: animValue }],
      }}
    >
      <BottomNavigation/>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '3%',
    marginTop: '3%'
  },
  logoContainer: {
    marginRight: 15,
  },
  logo: {
    width: width * 0.20,
    height: width * 0.20,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  welcomeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  welcome: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: width * 0.14,
    color: 'white',
    lineHeight: 50,
  },
  welcomeSmaller: {
    fontSize: width * 0.11,
    lineHeight: 44,
  },
  motto: {
    color: '#D3D3D3',
    marginTop: 2,
    fontSize: width * 0.04,
    fontFamily: 'Montserrat_400Regular'
  },
  divider: {
    borderBottomColor: '#D3D3D3',
    borderBottomWidth: 1,
    marginVertical: '5%',
    marginBottom: '5%',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Montserrat_400Regular',
    paddingHorizontal: '4%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: '2%',
    marginTop: '5%'
  },
  moduleButton: {
    width: width * 0.38,
    height: height * 0.228,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  moduleText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
    fontFamily: 'Montserrat_400Regular'
  },
  moduleImage: {
    width: '60%',
    height: '50%',
    marginBottom: '4%',
  },
});