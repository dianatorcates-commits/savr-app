import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxStars?: number;
  starSize?: number;
}

export function StarRating({ rating, onRatingChange, maxStars = 5, starSize = 32 }: StarRatingProps) {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          activeOpacity={0.7}
          onPress={() => onRatingChange(i)}
          style={styles.starButton}
        >
          <Text style={[styles.star, { fontSize: starSize, color: i <= rating ? '#FFD700' : 'rgba(255,255,255,0.3)' }]}>
            {i <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return <View style={styles.container}>{renderStars()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    lineHeight: 40,
  },
});
