import { useState, useEffect, useCallback } from 'react';
import { Plugins, GeolocationPosition, GeolocationOptions } from '@capacitor/core';
import { AvailableResult, notAvailable, FeatureNotAvailableError } from '../util/models';
import { isFeatureAvailable } from '../util/feature-check';

interface GetCurrentPositionResult extends AvailableResult {
  error?: any,
  currentPosition?: GeolocationPosition
  getPosition: (options?: GeolocationOptions) => void
};

interface GeoWatchPositionResult extends AvailableResult {
  error?: any;
  currentPosition?: GeolocationPosition;
  startWatch: (options?: GeolocationOptions) => void;
  clearWatch: () => void;
};

export const availableFeatures = {
  getCurrentPosition: isFeatureAvailable('Geolocation', 'getCurrentPosition'),
  watchPosition: isFeatureAvailable('Geolocation', 'watchPosition')
}

export function useCurrentPosition(options?: GeolocationOptions): GetCurrentPositionResult {
  const { Geolocation } = Plugins;

  if (!availableFeatures.getCurrentPosition) {
    return {
      getPosition: () => { throw new FeatureNotAvailableError() },
      ...notAvailable
    }
  }

  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition>();
  const [error, setError] = useState();

  const getPosition = async (newOptions?: GeolocationOptions) => {
    let called = false;

    // we use watchPosition here and grab the first result because getCurrentPosition currently has some issues
    const id = Geolocation.watchPosition(newOptions || options || {}, (pos: GeolocationPosition, err) => {
      // watchPosition will sometimes fire updates quickly, 
      // so we check here to make sure its only called one per getPosition invocation
      if (!called) {
        
        if (err) {
          setError(err);
        }

        setCurrentPosition(pos);

        // run on next tick so id will be defined
        setTimeout(() => Geolocation.clearWatch({ id }), 0);
        called = true;
      }
    });

  };

  useEffect(() => {
    getPosition(options);
  }, [options]);

  return {
    error,
    currentPosition,
    getPosition,
    isAvailable: true
  }
}

export function useWatchPosition(): GeoWatchPositionResult {
  const { Geolocation } = Plugins;

  if (!availableFeatures.watchPosition) {
    return {
      clearWatch: () => { throw new FeatureNotAvailableError() },
      startWatch: () => { throw new FeatureNotAvailableError() },
      ...notAvailable
    };
  }

  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition>();
  const [watchId, setWatchId] = useState('');
  const [error, setError] = useState();

  const clearWatch = () => {
    if (watchId) {
      Geolocation.clearWatch({ id: watchId });
      setWatchId('');
    }
  }

  const startWatch = (options?: GeolocationOptions) => {
    if (!watchId) {
      const id = Geolocation.watchPosition(options || {}, (pos: GeolocationPosition, err) => {
        if (err) {
          setError(err);
        }
        setCurrentPosition(pos);
      });
      setWatchId(id);
    }
  }

  return {
    error,
    currentPosition,
    clearWatch,
    startWatch,
    isAvailable: true
  };
}
