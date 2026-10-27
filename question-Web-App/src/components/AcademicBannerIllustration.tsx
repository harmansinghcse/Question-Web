import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Clean vector illustration of stacked academic books with a graduation cap
 * and study plant, matching the Question Web reference design.
 */
export default function AcademicBannerIllustration({ size = 110 }: { size?: number }) {
  const scale = size / 110;

  return (
    <View style={[styles.container, { width: 110 * scale, height: 110 * scale, transform: [{ scale }] }]}>
      {/* Background Soft Glow */}
      <View style={styles.glowCircle} />

      {/* Mini Plant on left */}
      <View style={styles.plantContainer}>
        <View style={styles.plantPot} />
        <View style={styles.leaf1} />
        <View style={styles.leaf2} />
      </View>

      {/* Stack of Books */}
      <View style={styles.booksStack}>
        {/* Bottom Book (Blue/Cyan) */}
        <View style={styles.bookBottom}>
          <View style={styles.bookSpineBlue} />
          <View style={styles.bookPages} />
          <View style={styles.bookRibbon} />
        </View>

        {/* Middle Book (Coral/Peach) */}
        <View style={styles.bookMiddle}>
          <View style={styles.bookSpineCoral} />
          <View style={styles.bookPagesSmall} />
        </View>

        {/* Top Book (Violet/Indigo) */}
        <View style={styles.bookTop}>
          <View style={styles.bookSpineViolet} />
          <View style={styles.bookPagesTiny} />
        </View>
      </View>

      {/* Graduation Cap on top */}
      <View style={styles.mortarboardWrapper}>
        <View style={styles.mortarboardDiamond}>
          <Ionicons name="school" size={44} color="#1E1B4B" />
        </View>
      </View>

      {/* Floating Sparkles */}
      <View style={styles.sparkle1}>
        <Ionicons name="sparkles" size={13} color="#FBBF24" />
      </View>
      <View style={styles.sparkle2}>
        <Ionicons name="sparkles" size={10} color="#C4B5FD" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  booksStack: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
  },
  bookBottom: {
    width: 78,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#2563EB',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  bookSpineBlue: {
    position: 'absolute',
    left: 4,
    top: 2,
    bottom: 2,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
  bookPages: {
    position: 'absolute',
    right: 3,
    top: 2,
    bottom: 2,
    width: 60,
    backgroundColor: '#FEF9C3',
    borderRadius: 1,
  },
  bookRibbon: {
    position: 'absolute',
    left: 22,
    top: -2,
    bottom: -2,
    width: 3,
    backgroundColor: '#F59E0B',
  },
  bookMiddle: {
    width: 66,
    height: 13,
    borderRadius: 3,
    backgroundColor: '#F472B6',
    borderWidth: 1,
    borderColor: '#EC4899',
    position: 'relative',
    marginTop: -2,
    justifyContent: 'center',
  },
  bookSpineCoral: {
    position: 'absolute',
    left: 4,
    top: 2,
    bottom: 2,
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  bookPagesSmall: {
    position: 'absolute',
    right: 3,
    top: 2,
    bottom: 2,
    width: 50,
    backgroundColor: '#FFFBEB',
  },
  bookTop: {
    width: 56,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    borderWidth: 1,
    borderColor: '#7C3AED',
    position: 'relative',
    marginTop: -2,
    justifyContent: 'center',
  },
  bookSpineViolet: {
    position: 'absolute',
    left: 3,
    top: 2,
    bottom: 2,
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  bookPagesTiny: {
    position: 'absolute',
    right: 3,
    top: 2,
    bottom: 2,
    width: 42,
    backgroundColor: '#FDF4FF',
  },
  mortarboardWrapper: {
    position: 'absolute',
    top: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mortarboardDiamond: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    alignItems: 'center',
  },
  plantPot: {
    width: 14,
    height: 13,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#FB923C',
    borderTopWidth: 2,
    borderTopColor: '#EA580C',
  },
  leaf1: {
    position: 'absolute',
    top: -8,
    left: 0,
    width: 7,
    height: 10,
    borderTopLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: '#10B981',
    transform: [{ rotate: '-20deg' }],
  },
  leaf2: {
    position: 'absolute',
    top: -7,
    right: 0,
    width: 7,
    height: 10,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 6,
    backgroundColor: '#34D399',
    transform: [{ rotate: '25deg' }],
  },
  sparkle1: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  sparkle2: {
    position: 'absolute',
    top: 24,
    left: 4,
  },
});
