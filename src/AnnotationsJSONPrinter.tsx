import { useHelpers } from '@remirror/react';

const AnnotationsJSONPrinter = () => {
	const { getAnnotations } = useHelpers(true);

	const annotations = getAnnotations();

	return (
		<pre>
			<code>{JSON.stringify(annotations, null, 2)}</code>
		</pre>
	);
};

export default AnnotationsJSONPrinter;
