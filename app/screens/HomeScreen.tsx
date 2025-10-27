import BottomNavigation from '@/components/Interface/nav-bar';
import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
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

  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const disclaimerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showDisclaimer) {
      Animated.timing(disclaimerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [showDisclaimer]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFirstName = () => {
    if (!userData?.username) return 'User';
    return userData.username.split(' ')[0];
  };

  const greeting = getGreeting();
  const firstName = getFirstName();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(shouldAnimate ? 50 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(shouldAnimate ? 0.8 : 1)).current;
  const logoFadeAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const logoRotateAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  
  const [letterAnims, setLetterAnims] = useState(() => 
    greeting.split('').map(() => new Animated.Value(shouldAnimate ? 0 : 1))
  );

  useEffect(() => {
    setLetterAnims(greeting.split('').map(() => new Animated.Value(shouldAnimate ? 0 : 1)));
  }, [greeting]);
  
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
      hasShownAnimation = true;
    }
  }, [fontsLoaded, shouldAnimate]);

  const startAnimations = () => {
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

    const letterAnimations = letterAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      })
    );

    Animated.sequence([
      Animated.delay(200),
      Animated.parallel(letterAnimations),
    ]).start();

    const moduleAnimations = moduleAnims.map((anim, index) =>
      Animated.spring(anim, {
        toValue: 1,
        delay: 600 + (index * 150),
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    );

    Animated.parallel(moduleAnimations).start();

    Animated.timing(bottomNavAnim, {
      toValue: 0,
      duration: 600,
      delay: 1000,
      useNativeDriver: true,
    }).start();
  };

  const renderAnimatedText = () => (
    <View style={styles.textContainer}>
      <View style={styles.welcomeContainer}>
        {greeting.split('').map((letter, index) => (
          <Animated.Text
            key={index}
            style={[
              styles.welcome,
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
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        It's time to lock in, {firstName}.
      </Animated.Text>
    </View>
  );

  if (!fontsLoaded) {
    return (
      <LinearGradient colors={['#0f2c45ff','#324762']} style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={{width: 100, height: 100, opacity: 0.8}}
          resizeMode="contain"
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f2c45ff','#324762']} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          <View style={styles.headerContainer}>
            <Animated.View style={styles.logoContainer}>
              <Animated.Image
                source={require('../../assets/images/logo.png')}
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
            style={[styles.divider, { opacity: fadeAnim, transform: [{ scaleX: fadeAnim }] }]} 
          />

          <Animated.Text 
            style={[styles.sectionTitle, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
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

      {/* Disclaimer Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showDisclaimer}
        onRequestClose={() => setShowDisclaimer(false)}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.disclaimerContainer, { opacity: disclaimerOpacity }]}>
            <LinearGradient
              colors={['#324762', '#0F2245']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.disclaimerBox}
            >
              <Text style={styles.disclaimerTitle}>Beta Version Notice</Text>
              <Text style={styles.disclaimerText}>
                This is a beta release of the application. Some features may be incomplete, limited in functionality, or subject to change as development progresses. We appreciate your understanding and feedback as we continue improving the app.
              </Text>

              <Pressable
                onPress={() => {
                  Animated.timing(disclaimerOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => setShowDisclaimer(false));
                }}
                style={styles.disclaimerButton}
              >
                <Text style={styles.disclaimerButtonText}>I Understand</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}

/* ------------------------------ Component Styles ------------------------------ */

const AnimatedModuleButton = ({ title, color, image, onPress, animValue }: any) => {
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
          { scale: Animated.multiply(animValue, scaleValue) },
        ],
      }}
    >
      <TouchableOpacity 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <LinearGradient colors={color} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.moduleButton}>
          <Image source={image} style={styles.moduleImage} resizeMode="contain" />
          <Text style={styles.moduleText}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedBottomNavigation = ({ animValue }: { animValue: Animated.Value }) => (
  <Animated.View 
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      transform: [{ translateY: animValue }],
    }}
  >
    <BottomNavigation />
  </Animated.View>
);

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
  disclaimerContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 25,
},
  disclaimerBox: {
    width: '100%',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
},
  disclaimerTitle: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
},
  disclaimerText: {
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: '#D3D3D3',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
},
  disclaimerButton: {
    backgroundColor: '#4E80E1',
    borderRadius: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
},
  disclaimerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
},

});