// utils/themedStyles.ts
import { ThemeColors, ThemeMode } from '@/hooks/useTheme';
import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const createThemedStyles = (colors: ThemeColors, mode: ThemeMode) => {
  return StyleSheet.create({
    // Note Editor Styles
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
    },
    loadingContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    lottieAnimation: {
      width: 200,
      height: 200,
    },
    loadingText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginTop: 24,
      textAlign: 'center',
    },
    loadingSubtext: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconButton: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerRight: {
      flexDirection: 'row',
      gap: 12,
    },
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      paddingBottom: 98,
    },
    titleInput: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 8,
      minHeight: 60,
    },
    propertiesSection: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    propertyRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    propertyKey: {
      flex: 0.4,
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    propertyValue: {
      flex: 0.6,
      color: colors.text,
      fontSize: 14,
    },
    addPropertyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      marginTop: 4,
    },
    addPropertyText: {
      color: colors.textTertiary,
      fontSize: 14,
      marginLeft: 6,
    },
    editorWrapper: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
      minHeight: 400,
    },
    richEditor: {
      flex: 1,
      minHeight: 300,
    },
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34,
      paddingHorizontal: 20,
    },
    bottomSheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.textTertiary,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    bottomSheetTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemDisabled: {
      opacity: 0.5,
    },
    menuItemText: {
      color: colors.text,
      fontSize: 16,
      marginLeft: 16,
    },
    collaboratorItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    collaboratorAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 12,
    },
    collaboratorName: {
      color: colors.text,
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    metadataModal: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      width: width * 0.9,
      maxWidth: 400,
      maxHeight: '80%',
    },
    metadataHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    metadataTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    metadataContent: {
      padding: 20,
    },
    metadataItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    metadataTextContainer: {
      flex: 1,
      marginLeft: 12,
    },
    metadataLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    metadataValue: {
      fontSize: 14,
      color: colors.text,
    },
    toolbar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      marginBottom: 20,
    },
  });
};

// Toolbar specific themed styles
export const createToolbarThemedStyles = (colors: ThemeColors, mode: ThemeMode) => {
  return StyleSheet.create({
    toolbarContainer: {
      backgroundColor: colors.toolbarBackground,
      borderRadius: 40,
      paddingVertical: 1,
      maxHeight: 60,
      marginHorizontal: 5,
      marginVertical: 8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    scrollContent: {
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    richToolbar: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      minHeight: 50,
      flexDirection: 'row',
    },
    selectedButton: {
      backgroundColor: colors.activeButton,
      borderRadius: 6,
    },
    customButton: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 5,
      borderRadius: 6,
      position: 'relative',
    },
    activeButton: {
      backgroundColor: colors.activeButton,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    formatText: {
      color: colors.text,
      fontSize: 18,
    },
    activeText: {
      color: colors.activeText,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorPickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      width: 320,
      maxHeight: 500,
    },
    colorPickerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    colorPickerSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 16,
      textAlign: 'center',
    },
    colorGridContainer: {
      maxHeight: 350,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    colorSwatch: {
      width: 50,
      height: 50,
      borderRadius: 8,
      margin: 6,
      borderWidth: 2,
      borderColor: mode === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    whiteBorder: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: mode === 'light' ? '#cbd5e1' : '#64748b',
    },
    modalCloseButton: {
      backgroundColor: colors.primaryLight,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    modalCloseButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    linkModalContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      width: 320,
    },
    linkModalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
      textAlign: 'center',
    },
    linkInput: {
      backgroundColor: mode === 'light' ? colors.surfaceSecondary : 'rgba(255, 255, 255, 0.1)',
      borderRadius: 8,
      padding: 12,
      color: colors.text,
      marginBottom: 12,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    linkModalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    linkModalButtonCancel: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    linkModalButtonInsert: {
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
    },
    linkModalButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    imagePickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      width: 320,
    },
    imagePickerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 20,
      textAlign: 'center',
    },
    imagePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: mode === 'light' ? colors.primary : 'rgba(96, 165, 250, 0.3)',
    },
    imagePickerButtonCancel: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    imagePickerButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 12,
    },
  });
};