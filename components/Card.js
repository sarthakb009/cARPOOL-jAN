// components/Card.js
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Box, Text, Icon } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';

const Card = ({ title, iconName, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <Box
        bg="#E8EAF6"
        shadow={5}
        borderRadius="lg"
        p={6}
        alignItems="center"
        style={styles.cardContent}
      >
        <Box
          bg="#FFF"
          borderRadius="full"
          width={16}
          height={16}
          justifyContent="center"
          alignItems="center"
          mb={4}
        >
          <Icon as={MaterialIcons} name={iconName} size="xl" color="#6B46C1" />
        </Box>
        <Text fontSize="lg" color="coolGray.800" textAlign="center" fontWeight="bold">
          {title}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '90%',
    marginVertical: 10,
    alignSelf: 'center',
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Card;
