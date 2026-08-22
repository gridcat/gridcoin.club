import React from 'react';
import { plausibleClass } from '@/lib/plausible';
import { CopyableValue } from './CopyableValue';

interface DonationAddressProps {
  address: string;
}

// The address is always visible and selectable, so this works without JS.
// The copy button is a progressive enhancement layered on top.
export function DonationAddress({ address }: DonationAddressProps) {
  return (
    <CopyableValue
      value={address}
      copyLabel="Copy donation address"
      trackingClass={plausibleClass('Donate Copy', { from: 'about' })}
    />
  );
}
