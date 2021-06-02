import random from './random';

const users = [
	'Ollie Ewing',
	'Charles Hays',
	'Jim Bean',
	'Richard Reeves',
	'Frank Graves',
	'Grant Emerson',
	'Charles Yates',
	'Ian Sims',
	'Herbert Warren',
	'Martin Noel',
	'Billy Long',
	'Douglas Giles',
	'Stephen Knight',
	'Brendan Cook',
	'Robert Evans',
	'Mathew Richard',
	'Drew Chase',
	'Adeline Barrera',
	'Estelle Turner',
	'Velma Beasley',
	'Irene Goodwin',
	'Jeanette Jones',
	'Robin Flowers',
	'Pamela Spears',
	'Kristin Alford',
	'Charlotte Stone',
	'Kirsten Turner',
];

const getRandomUserName = (seed: string): string => {
	return random(users, seed);
};

export default getRandomUserName;
