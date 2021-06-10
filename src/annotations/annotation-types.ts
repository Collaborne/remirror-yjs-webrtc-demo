import type { AcceptUndefined } from '@remirror/core';

export type GetStyle<Type extends Annotation> = (
	annotations: Array<OmitText<Type>>,
) => string | undefined;

export interface MapLike<V> {
	clear?(): void;
	delete(key: string): any;
	forEach(
		callbackfn: (value: V, key: string, map: MapLike<V>) => void,
		thisArg?: any,
	): void;
	get(key: string): V | undefined;
	has(key: string): boolean;
	set(key: string, value: V): any;
	readonly size: number;
}

export interface AnnotationOptions<Type extends Annotation = Annotation> {
	/**
	 * Method to calculate styles for a segment with one or more annotations
	 *
	 * @remarks
	 *
	 * This can be used e.g. to assign different shades of a color depending on
	 * the amount of annotations in a segment.
	 */
	getStyle?: GetStyle<Type>;

	/**
	 * Allows to format the text returned for each annotation.
	 *
	 * When `blockSeparator` is given, it will be inserted whenever a new
	 * block node is started.
	 *
	 * @see ProsemirrorNode.textBetween
	 */
	blockSeparator?: AcceptUndefined<string>;

	map?: MapLike<Type>;

	transformPosition?(pos: number): number;

	transformPositionBeforeRender?(pos: number): number | null;
}

export interface Annotation {
	/**
	 * Unique identifier of the annotation
	 */
	id: string;

	/**
	 * Document position where the annotation starts.
	 */
	from: number;

	/**
	 * Document position where the annotation ends.
	 */
	to: number;

	/**
	 * Plain text of what is annotated, i.e. content between from->start.
	 * This allows applications fetching the annotation to work with them without
	 * having to query Prosemirror for the text.
	 */
	text: string;

	/**
	 * Classname added to the annotation when it's rendered. This can be used
	 * e.g. to have annotations in different colors
	 */
	className?: string;
}

/**
 * Remove the text field from an annotation.
 */
export type OmitText<Type extends Annotation> = Omit<Type, 'text'>;

/**
 * Get the data of the annotation without the fields managed by ProseMirror.
 */
export type GetData<Type extends Annotation> = Omit<
	OmitText<Type>,
	'from' | 'to'
>;
