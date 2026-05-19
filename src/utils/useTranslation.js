import { useAuth } from '../context/AuthContext';
import { t, setLanguage } from './i18n';

// Synchronously updates the module-level language so that t() calls in the
// same render cycle (including child components) use the correct language.
// Reading user.language from AuthContext ensures a re-render whenever the
// user toggles the language preference.
export const useTranslation = () => {
  const { user } = useAuth();
  setLanguage(user?.language || 'en');
  return { t };
};

export default useTranslation;
