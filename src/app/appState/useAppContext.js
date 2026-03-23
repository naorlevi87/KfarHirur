// src/app/appState/useAppContext.js

import { useContext } from 'react';
import { AppContext } from './AppContext.jsx';

export function useAppContext() {
  const value = useContext(AppContext);
  if (value == null) {
    throw new Error('useAppContext must be used within an AppProviders tree');
  }
  return value;
}
