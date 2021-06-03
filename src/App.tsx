import React, { useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import UserProvider, { User } from './UserProvider';
import Editor from './Editor';
import getRandomUserName from './utils/getRandomUserName';

function App() {
	const currentUser: User = useMemo(() => {
		const id = uuid();
		return {
			id,
			name: getRandomUserName(id),
		};
	}, []);

	return (
		<UserProvider.Provider value={currentUser}>
			<div className="app">
				<Editor />
			</div>
		</UserProvider.Provider>
	);
}

export default App;
