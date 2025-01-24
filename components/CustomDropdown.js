// components/CustomDropdown.js
import React from 'react';
import { Select, CheckIcon } from 'native-base';

const CustomDropdown = ({ selectedValue, onValueChange, items, placeholder }) => {
  return (
    <Select
      selectedValue={selectedValue}
      minWidth="200"
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      _selectedItem={{
        bg: "blue.500",
        endIcon: <CheckIcon size="5" />,
      }}
      mt={1}
      onValueChange={onValueChange}
    >
      {items.map((item, index) => (
        <Select.Item key={index} label={item.label} value={item.value} />
      ))}
    </Select>
  );
};

export default CustomDropdown;
