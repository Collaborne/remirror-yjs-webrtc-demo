import { useCurrentSelection, useHelpers } from '@remirror/react';

const AnnotationsJSONPrinter = () => {
	const { from, to } = useCurrentSelection();
	const { getAnnotations } = useHelpers(true);

	const annotations = getAnnotations();

	return (
		<pre>
			<code>
				Selection: {from}-{to}
			</code>
			<br />
			<code>{JSON.stringify(annotations, null, 2)}</code>
		</pre>
	);
};

export default AnnotationsJSONPrinter;
