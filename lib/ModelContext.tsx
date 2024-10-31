import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_MODEL } from '@/lib/modelUtils';

type ModelContextType = {
  model: string;
  setModel: (model: string) => void;
};

const ModelContext = createContext<ModelContextType>({
  model: DEFAULT_MODEL,
  setModel: () => {}
});

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [model, setModelState] = useState<string>(DEFAULT_MODEL);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('selectedModel');
      if (savedModel) {
        setModelState(savedModel);
      } else {
        localStorage.setItem('selectedModel', DEFAULT_MODEL);
      }
    }
  }, []);

  const setModel = (newModel: string) => {
    setModelState(newModel);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedModel', newModel);
    }
  };

  return (
    <ModelContext.Provider value={{ model, setModel }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
} 