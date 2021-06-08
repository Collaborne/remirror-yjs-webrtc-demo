import { useMemo, useState } from 'react';
import { uniqueId } from 'remirror';
import { createCenteredAnnotationPositioner } from 'remirror/extensions';
import {
	Button,
	ComponentItem,
	ControlledDialogComponent,
	FloatingToolbar,
	PositionerPortal,
	ToolbarItemUnion,
	useCommands,
	useHelpers,
	usePositioner,
} from '@remirror/react';

const FloatingAnnotations = () => {
	const [visible, setVisible] = useState(false);
	const commands = useCommands();
	const { getAnnotationsAt } = useHelpers();
	const floatingToolbarItems = useMemo<ToolbarItemUnion[]>(
		() => [
			{
				type: ComponentItem.ToolbarButton,
				onClick: () => {
					// setVisible(true);
					commands.addAnnotation({ id: uniqueId() });
				},
				icon: 'chatNewLine',
			},
		],
		[commands],
	);

	const annotations = getAnnotationsAt();
	const label = annotations.map(annotation => annotation.text).join('\n');
	const positioner = usePositioner(
		createCenteredAnnotationPositioner(getAnnotationsAt),
		[],
	);

	return (
		<>
			<FloatingToolbar
				items={floatingToolbarItems}
				positioner="selection"
				placement="top"
			/>
			<PositionerPortal>
				<div
					style={{
						top: positioner.y + positioner.height,
						left: positioner.x,
						position: 'absolute',
						border: '1px solid black',
						whiteSpace: 'pre-line',
						background: 'white',
					}}
					ref={positioner.ref}
				>
					{label}
				</div>
			</PositionerPortal>
			<ControlledDialogComponent
				visible={visible}
				onUpdate={v => setVisible(v)}
				backdrop={true}
			>
				<Button
					onClick={() => {
						commands.addAnnotation({ id: uniqueId() });
						setVisible(false);
					}}
				>
					Done
				</Button>
			</ControlledDialogComponent>
		</>
	);
};

export default FloatingAnnotations;
