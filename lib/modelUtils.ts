export const DEFAULT_MODEL = process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'llama3.1:latest';

export const formatModelName = (modelValue: string) => {
  return modelValue?.split(':')[0] || DEFAULT_MODEL;
};

export const getFullModelName = (modelValue: string) => {
  if (!modelValue) return DEFAULT_MODEL;
  const baseModel = modelValue.replace(':latest', '');
  return `${baseModel}:latest`;
};

export const getCurrentModel = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedModel') || DEFAULT_MODEL;
  }
  return DEFAULT_MODEL;
};
