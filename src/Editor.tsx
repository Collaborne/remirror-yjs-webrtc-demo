import React, { useCallback, useState, useEffect } from 'react';
import { RemirrorJSON } from 'remirror';
import {
	EditorComponent,
	Remirror,
	ThemeProvider,
	useRemirror,
} from '@remirror/react';
import { YjsExtension } from 'remirror/extensions';
import { ProsemirrorDevTools } from '@remirror/dev';
import { useDebounce } from 'use-debounce';
import useCurrentUser from './hooks/useCurrentUser';
import useWebRtcProvider from './hooks/useWebRtcProvider';
import useObservableListener from './hooks/useObservableListener';
import 'remirror/styles/all.css';

const Status = ({ success = false }) => (
	<span className={`status ${success ? 'success' : ''}`}>&nbsp;</span>
);

function App() {
	const currentUser = useCurrentUser();
	const provider = useWebRtcProvider(currentUser);

	const [clientCount, setClientCount] = useState<number>(0);
	const [isSynced, setIsSynced] = useState<boolean>(false);
	const [docState, setDocState] = useState<RemirrorJSON>();
	const [debouncedDocState] = useDebounce(docState, 3000);

	const handleChange = useCallback(
		({ state, tr }) => {
			if (tr?.docChanged) {
				setDocState(state.toJSON().doc);
			}
		},
		[setDocState],
	);

	const handlePeers = useCallback(
		({ webrtcPeers }) => {
			setClientCount(webrtcPeers.length);
		},
		[setClientCount],
	);

	useObservableListener('peers', handlePeers, provider);

	const handleSynced = useCallback(
		({ synced }) => {
			setIsSynced(synced);
		},
		[setIsSynced],
	);

	useObservableListener('synced', handleSynced, provider);

	useEffect(() => {
		const chanceOfSaving = 1 / clientCount;
		if (isSynced && debouncedDocState && Math.random() < chanceOfSaving) {
			console.log('Saving', JSON.stringify(debouncedDocState));
		} else {
			console.log('Not saving');
		}
	}, [isSynced, clientCount, debouncedDocState]);

	const createExtensions = useCallback(() => {
		return [
			new YjsExtension({
				getProvider: () => provider,
			}),
		];
	}, [provider]);

	const { manager } = useRemirror({
		extensions: createExtensions,
	});

	return (
		<ThemeProvider>
			<Remirror manager={manager} onChange={handleChange}>
				<EditorComponent />
				<ProsemirrorDevTools />
				<p className="info">
					Synced: <Status success={isSynced} />
				</p>
				<p className="info">Connected clients: {clientCount + 1}</p>
			</Remirror>
		</ThemeProvider>
	);
}

export default App;
