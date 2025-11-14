// components/RichTextEditor/DrawingScreen.tsx (Fixed Zoom/Draw Crash)
import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import React, { useCallback, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    GestureResponderEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fixed canvas size
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface Point {
  x: number;
  y: number;
}

interface PathData {
  path: SkPath;
  color: string;
  width: number;
}

interface DrawingScreenProps {
  onComplete: (imageUri: string) => void;
  onCancel: () => void;
}

// Smooth curve helper using Catmull-Rom spline
const createSmoothPath = (points: Point[]): SkPath => {
  const path = Skia.Path.Make();
  
  if (points.length === 0) return path;
  if (points.length === 1) {
    path.moveTo(points[0].x, points[0].y);
    path.lineTo(points[0].x, points[0].y);
    return path;
  }
  if (points.length === 2) {
    path.moveTo(points[0].x, points[0].y);
    path.lineTo(points[1].x, points[1].y);
    return path;
  }

  // Start path
  path.moveTo(points[0].x, points[0].y);

  // Use quadratic bezier curves for smoothing
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    // Calculate control point (midpoint)
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    
    if (i === 0) {
      // First segment: line to midpoint
      path.lineTo(midX, midY);
    } else {
      // Use quadratic curve with current point as control
      path.quadTo(current.x, current.y, midX, midY);
    }
  }
  
  // Final segment to last point
  const lastPoint = points[points.length - 1];
  const secondLast = points[points.length - 2];
  path.quadTo(secondLast.x, secondLast.y, lastPoint.x, lastPoint.y);

  return path;
};

const DrawingScreen: React.FC<DrawingScreenProps> = ({ onComplete, onCancel }) => {
  // Canvas view ref for capturing
  const canvasViewRef = useRef<View>(null);
  const canvasContainerRef = useRef<View>(null);
  
  // Store canvas container measurements
  const canvasContainerLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Drawing state
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [penColor] = useState('#000000');
  const [penWidth] = useState(4);
  
  // Track drawing state
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);

  // Zoom/Pan state - using regular refs for values accessed in touch handlers
  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);
  
  // Shared values for animations only
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Track if we're in drawing mode or zoom mode - USE SHARED VALUE
  const isDrawingMode = useSharedValue(1); // 1 = true, 0 = false
  const [debugInfo, setDebugInfo] = useState('');

  // Sync function to update refs from shared values
  const syncTransformValues = useCallback((newScale: number, newTranslateX: number, newTranslateY: number) => {
    scaleRef.current = newScale;
    translateXRef.current = newTranslateX;
    translateYRef.current = newTranslateY;
  }, []);

  // Function to enable drawing mode
  const enableDrawingMode = useCallback(() => {
    isDrawingMode.value = 1;
    console.log('✅ Drawing mode enabled');
  }, [isDrawingMode]);

  // Function to disable drawing mode
  const disableDrawingMode = useCallback(() => {
    isDrawingMode.value = 0;
    console.log('⏸️ Drawing mode disabled');
  }, [isDrawingMode]);

  // Pan gesture for zoom/pan
  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      'worklet';
      console.log('🔄 Pan gesture started - disabling drawing');
      isDrawingMode.value = 0;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
      runOnJS(syncTransformValues)(scale.value, translateX.value, translateY.value);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(syncTransformValues)(scale.value, translateX.value, translateY.value);
      // Re-enable drawing mode immediately
      isDrawingMode.value = 1;
      console.log('✅ Pan gesture ended - drawing mode enabled');
    })
    .onFinalize(() => {
      'worklet';
      // Ensure drawing mode is re-enabled even if gesture is cancelled
      isDrawingMode.value = 1;
    });

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      console.log('🔍 Pinch gesture started - disabling drawing');
      isDrawingMode.value = 0;
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newScale = savedScale.value * event.scale;
      scale.value = Math.max(0.5, Math.min(newScale, 4));
      runOnJS(syncTransformValues)(scale.value, translateX.value, translateY.value);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(syncTransformValues)(scale.value, translateX.value, translateY.value);
      // Re-enable drawing mode immediately
      isDrawingMode.value = 1;
      console.log('✅ Pinch gesture ended - drawing mode enabled');
    })
    .onFinalize(() => {
      'worklet';
      // Ensure drawing mode is re-enabled even if gesture is cancelled
      isDrawingMode.value = 1;
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated style for canvas
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Handle touch for drawing - use pageX/Y for absolute positioning
  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    try {
      // Check if we're in gesture mode
      if (isDrawingMode.value === 0) {
        console.log('⏸️ Touch ignored - gesture in progress');
        return;
      }

      const nativeEvent = event.nativeEvent;
      
      // MUST use pageX/pageY (absolute screen coordinates)
      const pageX = nativeEvent.pageX;
      const pageY = nativeEvent.pageY;

      // Validate coordinates
      if (typeof pageX !== 'number' || typeof pageY !== 'number' || 
          isNaN(pageX) || isNaN(pageY)) {
        console.log('❌ Invalid touch coordinates');
        return;
      }
      
      // Convert from screen coordinates to container-relative coordinates
      const touchX = pageX - canvasContainerLayout.current.x;
      const touchY = pageY - canvasContainerLayout.current.y;
      
      // The canvas is centered in the container
      const containerWidth = canvasContainerLayout.current.width || SCREEN_WIDTH;
      const containerHeight = canvasContainerLayout.current.height || SCREEN_HEIGHT;
      
      const scaledCanvasWidth = CANVAS_WIDTH * scaleRef.current;
      const scaledCanvasHeight = CANVAS_HEIGHT * scaleRef.current;
      
      // Canvas top-left position in container (accounting for translate and centering)
      const canvasOriginX = (containerWidth - scaledCanvasWidth) / 2 + translateXRef.current;
      const canvasOriginY = (containerHeight - scaledCanvasHeight) / 2 + translateYRef.current;
      
      // Convert touch to canvas coordinates
      const canvasX = (touchX - canvasOriginX) / scaleRef.current;
      const canvasY = (touchY - canvasOriginY) / scaleRef.current;
      
      console.log('👆 Touch start:', { 
        pageX: pageX.toFixed(1),
        pageY: pageY.toFixed(1),
        containerX: canvasContainerLayout.current.x.toFixed(1),
        containerY: canvasContainerLayout.current.y.toFixed(1),
        touchX: touchX.toFixed(1),
        touchY: touchY.toFixed(1),
        canvasOriginX: canvasOriginX.toFixed(1),
        canvasOriginY: canvasOriginY.toFixed(1),
        canvasX: canvasX.toFixed(1), 
        canvasY: canvasY.toFixed(1), 
        scale: scaleRef.current.toFixed(2),
        translate: `(${translateXRef.current.toFixed(1)}, ${translateYRef.current.toFixed(1)})`
      });
      
      // Check if touch is within canvas bounds
      if (canvasX >= 0 && canvasX <= CANVAS_WIDTH && canvasY >= 0 && canvasY <= CANVAS_HEIGHT) {
        isDrawingRef.current = true;
        currentPointsRef.current = [{ x: canvasX, y: canvasY }];
        
        // Create initial path
        const path = Skia.Path.Make();
        path.moveTo(canvasX, canvasY);
        setCurrentPath(path);
        
        setDebugInfo(`Started at (${Math.round(canvasX)}, ${Math.round(canvasY)})`);
        console.log('✏️ Drawing started');
      } else {
        console.log('❌ Touch outside canvas bounds', { canvasX: canvasX.toFixed(1), canvasY: canvasY.toFixed(1) });
      }
    } catch (error) {
      console.error('❌ Error in handleTouchStart:', error);
      isDrawingRef.current = false;
      setCurrentPath(null);
      currentPointsRef.current = [];
    }
  }, []);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    try {
      if (isDrawingMode.value === 0 || !isDrawingRef.current) {
        return;
      }

      const nativeEvent = event.nativeEvent;
      
      // MUST use pageX/pageY (absolute screen coordinates)
      const pageX = nativeEvent.pageX;
      const pageY = nativeEvent.pageY;

      // Validate coordinates
      if (typeof pageX !== 'number' || typeof pageY !== 'number' || 
          isNaN(pageX) || isNaN(pageY)) {
        return;
      }
      
      // Convert from screen coordinates to container-relative coordinates
      const touchX = pageX - canvasContainerLayout.current.x;
      const touchY = pageY - canvasContainerLayout.current.y;
      
      // The canvas is centered in the container
      const containerWidth = canvasContainerLayout.current.width || SCREEN_WIDTH;
      const containerHeight = canvasContainerLayout.current.height || SCREEN_HEIGHT;
      
      const scaledCanvasWidth = CANVAS_WIDTH * scaleRef.current;
      const scaledCanvasHeight = CANVAS_HEIGHT * scaleRef.current;
      
      // Canvas top-left position in container (accounting for translate and centering)
      const canvasOriginX = (containerWidth - scaledCanvasWidth) / 2 + translateXRef.current;
      const canvasOriginY = (containerHeight - scaledCanvasHeight) / 2 + translateYRef.current;
      
      // Convert touch to canvas coordinates
      const canvasX = (touchX - canvasOriginX) / scaleRef.current;
      const canvasY = (touchY - canvasOriginY) / scaleRef.current;
      
      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(CANVAS_WIDTH, canvasX));
      const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT, canvasY));
      
      // Add point to array
      currentPointsRef.current.push({ x: clampedX, y: clampedY });
      
      // Create smooth path with all points
      const smoothPath = createSmoothPath(currentPointsRef.current);
      setCurrentPath(smoothPath);
      
      if (currentPointsRef.current.length % 10 === 0) {
        console.log('📝 Drawing... points:', currentPointsRef.current.length);
      }
    } catch (error) {
      console.error('❌ Error in handleTouchMove:', error);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    try {
      console.log('🖐️ Touch ended');
      
      if (isDrawingMode.value === 0 || !isDrawingRef.current) {
        console.log('⏸️ Touch end ignored - not drawing');
        isDrawingRef.current = false;
        setCurrentPath(null);
        currentPointsRef.current = [];
        return;
      }

      const pointCount = currentPointsRef.current.length;
      console.log('💾 Saving path with', pointCount, 'points');

      if (pointCount > 0) {
        // Create final smooth path
        const finalPath = createSmoothPath(currentPointsRef.current);
        
        // Save to paths array
        setPaths(prev => {
          const newPaths = [...prev, {
            path: finalPath,
            color: penColor,
            width: penWidth,
          }];
          console.log('✅ Path saved. Total paths:', newPaths.length);
          return newPaths;
        });
      }
      
      // Reset drawing state
      isDrawingRef.current = false;
      setCurrentPath(null);
      currentPointsRef.current = [];
      setDebugInfo(`Saved path with ${pointCount} points`);
    } catch (error) {
      console.error('❌ Error in handleTouchEnd:', error);
      isDrawingRef.current = false;
      setCurrentPath(null);
      currentPointsRef.current = [];
    }
  }, [penColor, penWidth]);

  // Clear canvas
  const handleClear = () => {
    Alert.alert(
      'Clear Canvas',
      'Are you sure you want to clear all drawings?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ Clearing canvas');
            setPaths([]);
            setCurrentPath(null);
            isDrawingRef.current = false;
            currentPointsRef.current = [];
          }
        }
      ]
    );
  };

  // Undo last stroke
  const handleUndo = () => {
    if (paths.length > 0) {
      console.log('↩️ Undo - removing last path');
      setPaths(prev => prev.slice(0, -1));
    }
  };

  // Reset zoom and pan
  const handleResetView = () => {
    console.log('🔄 Resetting view');
    scale.value = withTiming(1, { duration: 300 });
    translateX.value = withTiming(0, { duration: 300 });
    translateY.value = withTiming(0, { duration: 300 });
    // Update refs immediately
    scaleRef.current = 1;
    translateXRef.current = 0;
    translateYRef.current = 0;
  };

  // Export drawing as image
  const handleDone = async () => {
    try {
      console.log('💾 Exporting drawing...');
      
      if (paths.length === 0) {
        Alert.alert('Empty Canvas', 'Please draw something before saving.');
        return;
      }

      if (!canvasViewRef.current) {
        Alert.alert('Error', 'Canvas not ready');
        return;
      }

      // Use react-native-view-shot to capture the canvas
      const uri = await captureRef(canvasViewRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });

      console.log('✅ Drawing exported:', uri);
      onComplete(uri);
    } catch (error) {
      console.error('❌ Error capturing canvas:', error);
      Alert.alert('Error', 'Failed to save drawing');
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Draw</Text>
          
          <TouchableOpacity onPress={handleDone} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Done</Text>
            <Ionicons name="checkmark" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Canvas Area */}
        <View 
          ref={canvasContainerRef} 
          style={styles.canvasContainer}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            canvasContainerLayout.current = { x, y, width, height };
            console.log('📐 Canvas container layout:', { x, y, width, height });
          }}
        >
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
              <View
                ref={canvasViewRef}
                style={[styles.canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }]}
                collapsable={false}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                <Canvas
                  style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
                >
                  {/* Render completed paths */}
                  {paths.map((pathData, index) => (
                    <Path
                      key={`path-${index}`}
                      path={pathData.path}
                      color={pathData.color}
                      style="stroke"
                      strokeWidth={pathData.width}
                      strokeCap="round"
                      strokeJoin="round"
                    />
                  ))}
                  
                  {/* Render current drawing path */}
                  {currentPath && (
                    <Path
                      path={currentPath}
                      color={penColor}
                      style="stroke"
                      strokeWidth={penWidth}
                      strokeCap="round"
                      strokeJoin="round"
                    />
                  )}
                </Canvas>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={handleUndo} style={styles.toolButton} disabled={paths.length === 0}>
            <Ionicons name="arrow-undo" size={24} color={paths.length === 0 ? '#666' : '#ffffff'} />
            <Text style={[styles.toolButtonText, paths.length === 0 && styles.toolButtonTextDisabled]}>
              Undo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResetView} style={styles.toolButton}>
            <Ionicons name="scan-outline" size={24} color="#ffffff" />
            <Text style={styles.toolButtonText}>Reset View</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClear} style={styles.toolButton} disabled={paths.length === 0}>
            <Ionicons name="trash-outline" size={24} color={paths.length === 0 ? '#666' : '#ef4444'} />
            <Text style={[styles.toolButtonText, { color: paths.length === 0 ? '#666' : '#ef4444' }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            ✏️ One finger to draw • 🤏 Two fingers to zoom/pan
          </Text>
          <Text style={[styles.instructionText, { fontSize: 12, marginTop: 4, opacity: 0.7 }]}>
            Paths: {paths.length} | Scale: {scaleRef.current.toFixed(2)}x
          </Text>
          {debugInfo && (
            <Text style={[styles.instructionText, { fontSize: 10, marginTop: 2, opacity: 0.5 }]}>
              {debugInfo}
            </Text>
          )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  canvasWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  toolButton: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  toolButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  toolButtonTextDisabled: {
    color: '#666',
  },
  instructions: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  instructionText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DrawingScreen;