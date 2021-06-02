import { createContext } from 'react';

export interface User {
	id: string;
	name: string;
}

export default createContext<User>({
	id: 'unknown',
	name: 'Unknown User',
});
