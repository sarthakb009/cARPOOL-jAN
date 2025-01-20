import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Icon } from 'native-base';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let iconName;
        let IconComponent = MaterialIcons;

        if (route.name === 'Home') {
          iconName = 'home';
        } else if (route.name === 'SearchRide') {
          iconName = 'search';
        } else if (route.name === 'Profile') {
          iconName = 'person';
        } else if (route.name === 'RideHistory') {
          iconName = 'history';
        }

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityStates={isFocused ? ['selected'] : []}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tab, isFocused ? styles.activeTab : null]}
          >
            <View style={[styles.iconContainer, isFocused ? styles.activeIconContainer : null]}>
              <Icon
                as={IconComponent}
                name={iconName}
                size="lg"
                color={isFocused ? '#000' : '#fff'}
              />
            </View>
            <Text style={[styles.label, isFocused ? styles.activeLabel : null]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000',
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 10,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    flex: 1,
  },
  activeTab: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 15,
    marginBottom: 5,
  },
  activeIconContainer: {
    backgroundColor: '#fff',
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeLabel: {
    color: '#000',
  },
});

export default CustomTabBar;
