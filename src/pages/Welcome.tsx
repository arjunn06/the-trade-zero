import { WelcomeScreen } from '@/components/WelcomeScreen';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    // Mark welcome as completed in localStorage
    localStorage.setItem('welcome-completed', 'true');
  };

  return <WelcomeScreen onComplete={handleComplete} />;
};

export default Welcome;