import { useMemo } from 'react';
import { Doc } from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import getRandomColor from '../utils/getRandomColor';

export interface User {
	name: string;
	[x: string]: any;
}

function useYjsAwareness(user: User, doc: Doc): awarenessProtocol.Awareness {
	return useMemo(() => {
		const awareness = new awarenessProtocol.Awareness(doc);
		awareness.setLocalStateField('user', {
			name: user.name,
			color: getRandomColor(user.name),
		});
		return awareness;
	}, [user.name, doc]);
}

export default useYjsAwareness;
