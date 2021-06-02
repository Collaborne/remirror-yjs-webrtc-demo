import random from './random';

const colors = [
	'#357a8d',
	'#205a6d',
	'#86afbb',
	'#c2d7dd',
	'#bbb350',
	'#a29835',
	'#d6d196',
	'#ec7f48',
	'#e35f2e',
	'#9973d2',
	'#f9d9c8',
	'#d1505f',
	'#Be3541',
	'#e3969f',
	'#f1cbcf',
	'#8a6a8a',
	'#6a4b6a',
	'#b9a6b9',
	'#dcd2dc',
	'#7d916b',
	'#5d724c',
	'#b1bda6',
	'#d8ded3',
	'#eacc8a',
	'#e0b86a',
	'#a1888b',
	'#83686b',
	'#c7b8b9',
];

const getRandomColor = (seed: string): string => {
	return random(colors, seed);
};

export default getRandomColor;
