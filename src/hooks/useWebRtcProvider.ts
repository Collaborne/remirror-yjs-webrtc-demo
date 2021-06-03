import { useMemo } from 'react';
import { Doc } from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import useYjsAwareness, { User } from './useYjsAwareness';

// This should probably be the document guid?
const ROOM_NAME = 'remirror-yjs-webrtc-demo-room';
const ydoc = new Doc();

function useWebRtcProvider(user: User) {
	const awareness = useYjsAwareness(user, ydoc);

	return useMemo(() => {
		// @ts-ignore opts param seems to expect ALL options
		return new WebrtcProvider(ROOM_NAME, ydoc, {
			awareness,
		});
	}, [awareness]);
}

export default useWebRtcProvider;
