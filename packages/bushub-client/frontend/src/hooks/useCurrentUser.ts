import { useContext } from 'react';

import { AuthContext } from '../contexts/AuthContext';

export const useCurrentUser = () => {
  const context = useContext(AuthContext);

  if (!context || !context.user) {
    return null;
  }

  return {
    id: context.user.id,
    username: context.user.name, // name을 username으로 매핑
    name: context.user.name,
    role: context.user.role,
    companyId: context.user.companyId,
  };
};
