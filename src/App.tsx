import React, { useMemo, useCallback } from 'react';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import UserProvider, { User } from './UserProvider';
import Editor from './Editor';
import getRandomUserName from './utils/getRandomUserName';

interface Document {
	body: string;
}

const api = axios.create({
	baseURL: 'https://60b9308780400f00177b6434.mockapi.io/yjs-webrtc/v1/',
	headers: { 'Content-Type': 'application/json' },
});

function App() {
	const currentUser: User = useMemo(() => {
		const id = uuid();
		return {
			id,
			name: getRandomUserName(id),
		};
	}, []);

	const handleFetch = useCallback(async () => {
		const response = await api.get<Document>('documents/1');
		return response.data.body;
	}, []);

	const handleSave = useCallback(async body => {
		await api.put('/documents/1', {
			body,
		});
	}, []);

	return (
		<UserProvider.Provider value={currentUser}>
			<div className="app">
				<Editor onFetch={handleFetch} onSave={handleSave} />
			</div>
		</UserProvider.Provider>
	);
}

export default App;
