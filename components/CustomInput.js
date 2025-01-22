import React from 'react';
import { Input, Icon } from 'native-base';

const CustomInput = ({ leftIcon, ...props }) => {
  return (
    <Input
      InputLeftElement={
        leftIcon ? <Icon as={leftIcon} size="sm" ml={2} color="gray.400" /> : null
      }
      variant="filled"
      bg="gray.100"
      _focus={{
        bg: "gray.200",
        borderColor: "gray.400",
      }}
      {...props}
    />
  );
};

export default CustomInput;