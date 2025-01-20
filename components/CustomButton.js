// components/CustomButton.js
import React from 'react';
import { Button } from 'native-base';

const CustomButton = ({ onPress, title, variant }) => {
  const bgColor = variant === 'primary' ? '#6B46C1' : 'white';
  const textColor = variant === 'primary' ? 'white' : '#6B46C1';
  const borderColor = variant === 'primary' ? 'transparent' : '#6B46C1';

  return (
    <Button
      onPress={onPress}
      rounded="full"
      _text={{ color: textColor, fontSize: "md" }}
      bg={bgColor}
      borderWidth={1}
      borderColor={borderColor}
      _hover={{
        bg: variant === 'primary' ? '#553C9A' : 'white',
      }}
      _pressed={{
        bg: variant === 'primary' ? '#553C9A' : 'white',
        _text: { color: textColor },
      }}
    >
      {title}
    </Button>
  );
};

export default CustomButton;
