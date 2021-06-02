import { useContext } from 'react';
import UserProvider, { User } from '../UserProvider';

function useCurrentUser(): User {
	return useContext(UserProvider);
}

export default useCurrentUser;
