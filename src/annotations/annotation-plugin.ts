import { assert, TransactionProps } from '@remirror/core';
import { Decoration, DecorationSet } from '@remirror/pm/view';

import {
	ActionType,
	AddAnnotationAction,
	RemoveAnnotationsAction,
	SetAnnotationsAction,
	UpdateAnnotationAction,
} from './annotation-actions';
import { toSegments } from './annotation-segments';
import type {
	Annotation,
	GetStyle,
	OmitText,
	AnnotationMap,
} from './annotation-types';

interface ApplyProps extends TransactionProps {
	action: any;
}

export class AnnotationState<Type extends Annotation = Annotation> {
	/**
	 * Decorations are computed based on the annotations. The state contains a
	 * copy of the decoration for performance optimization.
	 */
	decorationSet = DecorationSet.empty;

	constructor(
		private readonly getStyle: GetStyle<Type>,
		public annotations: AnnotationMap<OmitText<Type>>,
	) {}

	apply({ tr, action }: ApplyProps): this {
		const actionType = action?.type;

		if (!action && !tr.docChanged) {
			return this;
		}

		// Adjust annotation positions based on changes in the editor, e.g.
		// if new text was added before the decoration
		this.annotations.forEach(function (annotation, id, map) {
			// -1 indicates that the annotation isn't extended when the user types
			// at the end of the annotation
			const from = tr.mapping.map(annotation.from, -1);
			const to = tr.mapping.map(annotation.to, -1);

			if (from === to) {
				// Remove annotations for which all containing content was deleted
				map.delete(id);
			} else {
				// TODO: this is causing issues, what is it for?
				// map.set(id, { ...annotation, from, to })
			}
		});

		let hasModifications = false;

		if (actionType === ActionType.ADD_ANNOTATION) {
			const addAction = action as AddAnnotationAction<Type>;
			const { id } = addAction.annotationData;
			this.annotations.set(id, {
				...addAction.annotationData,
				from: addAction.from,
				to: addAction.to,
			} as OmitText<Type>);
			hasModifications = true;
		}

		if (actionType === ActionType.UPDATE_ANNOTATION) {
			const updateAction = action as UpdateAnnotationAction<Type>;
			assert(this.annotations.has(updateAction.annotationId));

			this.annotations.set(updateAction.annotationId, {
				...this.annotations.get(updateAction.annotationId),
				...updateAction.annotationData,
			} as OmitText<Type>);
			hasModifications = true;
		}

		if (actionType === ActionType.REMOVE_ANNOTATIONS) {
			const removeAction = action as RemoveAnnotationsAction;
			removeAction.annotationIds.forEach(id => {
				this.annotations.delete(id);
			});
			hasModifications = true;
		}

		if (actionType === ActionType.SET_ANNOTATIONS) {
			const setAction = action as SetAnnotationsAction<Type>;
			if (this.annotations.clear) this.annotations.clear();
			// YJS maps don't support clear
			this.annotations.forEach(function (_, id, map) {
				map.delete(id);
			});

			setAction.annotations.forEach(annotation => {
				const { id } = annotation;
				this.annotations.set(id, annotation);
			});
			hasModifications = true;
		}

		if (actionType === ActionType.REDRAW_ANNOTATIONS) {
			hasModifications = true;
		}

		if (hasModifications) {
			// Recalculate decorations when annotations changed
			const decos = toSegments(this.annotations).map(segment => {
				const classNames = segment.annotations
					.map(a => a.className)
					.filter(className => className);
				const style = this.getStyle(segment.annotations);

				return Decoration.inline(segment.from, segment.to, {
					class: classNames.length > 0 ? classNames.join(' ') : undefined,
					style,
				});
			});

			this.decorationSet = DecorationSet.create(tr.doc, decos);
		} else {
			// Performance optimization: Adjust decoration positions based on changes
			// in the editor, e.g. if new text was added before the decoration
			this.decorationSet = this.decorationSet.map(tr.mapping, tr.doc);
		}

		return this;
	}
}
