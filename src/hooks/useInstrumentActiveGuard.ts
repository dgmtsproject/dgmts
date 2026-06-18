import { useEffect, useState } from 'react';
import { fetchInstrumentActiveStatus } from '../utils/instrumentActive';

export function useInstrumentActiveGuard(instrumentId: string) {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchInstrumentActiveStatus(instrumentId).then((active) => {
      if (!cancelled) {
        setIsActive(active);
        setChecking(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [instrumentId]);

  return {
    isActive,
    checking,
    isInactive: isActive === false,
  };
}
