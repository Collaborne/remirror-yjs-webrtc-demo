import React, { useRef, useCallback, useState, useEffect } from 'react';
import { RemirrorJSON } from 'remirror';
import {
	EditorComponent,
	Remirror,
	ThemeProvider,
	useRemirror,
} from '@remirror/react';
import { YjsExtension } from 'remirror/extensions';
import { ProsemirrorDevTools } from '@remirror/dev';
import { Map } from 'yjs';
import { useDebouncedCallback } from 'use-debounce';
import { AnnotationExtension, Annotation } from './annotations';
import useCurrentUser from './hooks/useCurrentUser';
import useWebRtcProvider from './hooks/useWebRtcProvider';
import useObservableListener from './hooks/useObservableListener';
import FloatingAnnotations from './FloatingAnnotations';
import 'remirror/styles/all.css';

interface EditorProps {
	documentId: string;
	onFetch: Function;
	onSave: Function;
}

const TIMEOUT = 3000 + Math.floor(Math.random() * 7000);

const Status = ({ success = false }) => (
	<span className={`status ${success ? 'success' : ''}`}>&nbsp;</span>
);

function Editor({ documentId, onFetch, onSave }: EditorProps) {
	const usedFallbackRef = useRef<boolean>(false);
	const currentUser = useCurrentUser();
	const provider = useWebRtcProvider(currentUser, documentId);

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
			if (isSynced || clientCount === 0) {
				onSave(documentId, JSON.stringify(newDocState));
				const meta = provider.doc.getMap('meta');
				meta.set('lastSaved', Date.now());
			}
		},
		[onSave, documentId, provider.doc, isSynced, clientCount],
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
		handleSaveDebounced(docState);
	}, [handleSaveDebounced, docState]);

	const handleYDocUpdate = useCallback(() => {
		handleSaveDebounced.cancel();
	}, [handleSaveDebounced]);

	useObservableListener('update', handleYDocUpdate, provider.doc);

	const createExtensions = useCallback(() => {
		const annotationsMap: Map<Annotation> = provider.doc.getMap('annotations');
		return [
			new YjsExtension({
				getProvider: () => provider,
			}),
			new AnnotationExtension({
				map: annotationsMap,
			}),
		];
	}, [provider]);

	const { manager, getContext } = useRemirror({
		extensions: createExtensions,
	});

	useEffect(() => {
		if (usedFallbackRef.current) return;

		const fetchFallback = async () => {
			if (provider.connected && clientCount === 0) {
				const res = await onFetch(documentId);
				getContext()?.setContent(JSON.parse(res));
			}
			usedFallbackRef.current = true;
		};

		const timeoutId = window.setTimeout(fetchFallback, 1000);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [onFetch, documentId, provider.connected, clientCount, getContext]);

	return (
		<ThemeProvider>
			<Remirror manager={manager} onChange={handleChange}>
				<EditorComponent />
				<FloatingAnnotations />
				<ProsemirrorDevTools />
				<div className="info-box">
					<p className="info">Connected clients: {clientCount + 1}</p>
					<p className="info">
						Synced: <Status success={isSynced || clientCount === 0} />
					</p>
				</div>
			</Remirror>
		</ThemeProvider>
	);
}

export default Editor;
