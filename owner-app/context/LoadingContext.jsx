import React, { createContext, useState, useMemo } from 'react';

export const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  // useMemo is used here for performance optimization
  const value = useMemo(() => ({
    isLoading,
    showSpinner: () => setIsLoading(true),
    hideSpinner: () => setIsLoading(false),
  }), [isLoading]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};