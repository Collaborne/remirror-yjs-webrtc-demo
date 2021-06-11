import React from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { YjsExtension } from 'remirror/extensions';
import { Remirror, ThemeProvider, useRemirror } from '@remirror/react';
import 'remirror/styles/all.css';

const ydoc = new Y.Doc();

function BasicEditor() {
	const { manager } = useRemirror({
		extensions: () => [
			new YjsExtension({
				getProvider: () => new WebrtcProvider('my-room', ydoc),
			}),
		],
	});

	return (
		<ThemeProvider>
			<Remirror manager={manager} autoRender />
		</ThemeProvider>
	);
}

export default BasicEditor;
