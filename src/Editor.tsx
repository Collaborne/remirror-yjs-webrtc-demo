import React, { useCallback } from 'react';
import { Doc } from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import {
	EditorComponent,
	Remirror,
	ThemeProvider,
	useRemirror,
} from '@remirror/react';
import { YjsExtension } from 'remirror/extensions';
import { ProsemirrorDevTools } from '@remirror/dev';
import useCurrentUser from './hooks/useCurrentUser';
import getRandomColor from './utils/getRandomColor';
import 'remirror/styles/all.css';

const ROOM_NAME = 'remirror-yjs-webrtc-demo-room';

function App() {
	const currentUser = useCurrentUser();

	const createExtensions = useCallback(() => {
		const ydoc = new Doc();
		const awareness = new awarenessProtocol.Awareness(ydoc);
		awareness.setLocalStateField('user', {
			objectId: currentUser.id,
			name: currentUser.name,
			color: getRandomColor(currentUser.name),
		});

		// @ts-ignore opts param seems to expect ALL options
		const provider = new WebrtcProvider(ROOM_NAME, ydoc, {
			awareness,
		});

		return [
			new YjsExtension({
				getProvider: () => provider,
			}),
		];
	}, [currentUser]);

	const { manager } = useRemirror({
		extensions: createExtensions,
	});

	return (
		<ThemeProvider>
			<Remirror manager={manager}>
				<EditorComponent />
				<ProsemirrorDevTools />
			</Remirror>
		</ThemeProvider>
	);
}

export default App;
