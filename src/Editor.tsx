import React, { useRef, useCallback, useState, useEffect } from 'react';
import { RemirrorJSON, areStatesEqual } from 'remirror';
import {
	EditorComponent,
	Remirror,
	ThemeProvider,
	useRemirror,
} from '@remirror/react';
import { YjsExtension } from 'remirror/extensions';
import { ProsemirrorDevTools } from '@remirror/dev';
import { useDebouncedCallback } from 'use-debounce';
import useCurrentUser from './hooks/useCurrentUser';
import useWebRtcProvider from './hooks/useWebRtcProvider';
import useObservableListener from './hooks/useObservableListener';
import 'remirror/styles/all.css';

interface EditorProps {
	onFetch: Function;
	onSave: Function;
}

const TIMEOUT = 3000 + Math.floor(Math.random() * 7000);

const Status = ({ success = false }) => (
	<span className={`status ${success ? 'success' : ''}`}>&nbsp;</span>
);

function Editor({ onFetch, onSave }: EditorProps) {
	const usedFallbackRef = useRef<boolean>(false);
	const currentUser = useCurrentUser();
	const provider = useWebRtcProvider(currentUser);

	const [clientCount, setClientCount] = useState<number>(0);
	const [isSynced, setIsSynced] = useState<boolean>(false);
	const [docState, setDocState] = useState<RemirrorJSON>();

	const handleChange = useCallback(
		({ state, tr }) => {
			if (tr?.docChanged) {
				setDocState(state.toJSON().doc);
			}
		},
		[setDocState],
	);

	const handleSave = useCallback(
		newDocState => {
			onSave(JSON.stringify(newDocState));
			const meta = provider.doc.getMap('meta');
			meta.set('lastSaved', Date.now());
		},
		[onSave, provider.doc],
	);

	const handleSaveDebounced = useDebouncedCallback(handleSave, TIMEOUT);

	const handlePeersChange = useCallback(
		({ webrtcPeers }) => {
			setClientCount(webrtcPeers.length);
		},
		[setClientCount],
	);

	useObservableListener('peers', handlePeersChange, provider);

	const handleSynced = useCallback(
		({ synced }) => {
			setIsSynced(synced);
		},
		[setIsSynced],
	);

	useObservableListener('synced', handleSynced, provider);

	useEffect(() => {
		if (isSynced) {
			handleSaveDebounced(docState);
		}
	}, [isSynced, docState]);

	const handleYDocUpdate = useCallback(() => {
		handleSaveDebounced.cancel();
	}, []);

	useObservableListener('update', handleYDocUpdate, provider.doc);

	const createExtensions = useCallback(() => {
		return [
			new YjsExtension({
				getProvider: () => provider,
			}),
		];
	}, [provider]);

	const { manager, getContext } = useRemirror({
		extensions: createExtensions,
	});

	useEffect(() => {
		const fetchFallback = async () => {
			const res = await onFetch();
			getContext()?.setContent(JSON.parse(res));
			usedFallbackRef.current = true;
		};
		if (!usedFallbackRef.current && provider.connected && clientCount === 0) {
			fetchFallback();
		}
	}, [onFetch, provider.connected, clientCount]);

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

export default Editor;
