import React from 'react';
import { PremiumButton } from '@aether/ui';

interface LocalPremiumButtonProps extends React.ComponentProps<typeof PremiumButton> {}

export const ForwardedPremiumButton: React.FC<LocalPremiumButtonProps> = (props) => {
  return <PremiumButton themeContext="admin" {...props} />;
};

export default ForwardedPremiumButton;
