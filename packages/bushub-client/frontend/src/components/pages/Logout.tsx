import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

export default function Logout() {
  const navigate = useNavigate();
  const { setIsLoggedIn } = useAuth();
  useEffect(() => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    setIsLoggedIn(false);
    navigate('/login', { replace: true });
  }, [navigate, setIsLoggedIn]);
  return null;
}
