import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/theme';

type TabConfig = {
  name: string;
  label: string;
  icon: ReturnType<typeof require>;
  isCenter?: boolean;
};

const TABS: TabConfig[] = [
  { name: 'index',   label: 'Inicio',  icon: require('../assets/images/tab-inicio.png') },
  { name: 'map',     label: 'Mapa',    icon: require('../assets/images/tab-mapa.png') },
  { name: 'split',   label: 'Dividir', icon: require('../assets/images/tab-dividir.png'), isCenter: true },
  { name: 'for-you', label: 'Para Ti', icon: require('../assets/images/tab-para-ti.png') },
  { name: 'profile', label: 'Tu',      icon: require('../assets/images/tab-tu.png') },
];

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const currentOptions = descriptors[state.routes[state.index].key].options as any;
  if (currentOptions.tabBarHidden) return null;

  return (
    <View
      style={[styles.outer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}
      pointerEvents="box-none"
    >
      <BlurView intensity={30} tint="dark" style={styles.bar}>
        {state.routes.map((route, index) => {
          const config = TABS.find(t => t.name === route.name);
          if (!config) return null;
          const focused = state.index === index;

          const onPress = () => {
            if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (config.isCenter) {
            return (
              <View key={route.key} style={styles.centerWrapper}>
                <TouchableOpacity
                  style={styles.centerBtn}
                  onPress={onPress}
                  activeOpacity={0.85}
                  hitSlop={{ top: 20, left: 10, right: 10, bottom: 0 }}
                >
                  <Image source={config.icon} style={styles.icon} />
                </TouchableOpacity>
                <Text style={[styles.label, { color: focused ? Colors.primary : Colors.inactive }]}>
                  {config.label}
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity key={route.key} style={styles.tab} onPress={onPress} activeOpacity={0.7}>
              <Image
                source={config.icon}
                style={[styles.icon, { opacity: focused ? 1 : 0.4 }]}
              />
              <Text style={[styles.label, { color: focused ? Colors.primary : Colors.inactive }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 27, 50, 0.65)',
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 32,
    height: 64,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.2)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    height: 80,
  },
  centerBtn: {
    position: 'absolute',
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 16,
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
