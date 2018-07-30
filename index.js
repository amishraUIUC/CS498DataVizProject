const CSV_FILEPATH = 'mcaps2009to2018.csv';

const COLORS = ['red', 'blue', 'green', 'purple', 'orange'];

const MARGIN = {
	top: 20,
	right: 50,
	bottom: 50,
	left: 50
};

const SVG_WIDTH = window.innerWidth - window.innerWidth * 0.40
const SVG_HEIGHT = window.innerHeight - window.innerHeight * 0.25;
const WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

const x = d3.scaleUtc().range([0, WIDTH]);
const y = d3.scaleLinear().range([HEIGHT, 0]);

function svgClicked(){
	const mouseCoords = d3.mouse(this);

	if (
		mouseCoords[0] <= MARGIN.left ||
		mouseCoords[0] >= WIDTH + MARGIN.left
	) return;

	const labelData = Object.keys(dataElements).map((company, i) => {
		const element = dataElements[company];
		const pathLength = element.getTotalLength();

		let position;
		for (let i = 0; i < pathLength; i++){
			position = element.getPointAtLength(i + MARGIN.left);

			if (position.x < mouseCoords[0] - MARGIN.left) continue;
			break;
		}

		return {
			x: mouseCoords[0] - MARGIN.left,
			y: position.y,
			value: Math.round(y.invert(position.y)) + MARGIN.bottom,
			fill: COLORS[i % COLORS.length]
		};
	});

	svg.selectAll('.highlight-point').remove();
	svg.selectAll('.highlight-point')
		.data(labelData)
		.enter()
		.append('circle')
			.attr('class', 'highlight-point')
			.attr('r', 4)
			.attr('cx', d => d.x)
			.attr('cy', d => d.y)
			.attr('fill', d => d.fill)
			.attr('stroke', 'black')

	svg.selectAll('.highlight-label').remove();
	svg.selectAll('.highlight-label')
		.data(labelData)
		.enter()
		.append('text')
			.attr('class', 'highlight-label')
			.attr('transform', d => 'translate(' + (d.x + 5) + ', ' + d.y + ')')
			.attr('dy', '.35em')
			.attr('text-anchor', 'start')
			.text(d => d.value);

	const year = new Date(Math.round(x.invert(mouseCoords[0] - MARGIN.left))).getFullYear();

	const yearElement = d3.select('.summary-year[data-year="' + year + '"]');
	if (!yearElement) return;

	d3.select('#summary-initial')
		.style('display', 'none');
	d3.selectAll('.summary-year')
		.style('display', 'none');

	yearElement.style('display', 'block');
}

const svg = d3.select('#market-capitalization-graph')
	.attr('width', WIDTH + MARGIN.left + MARGIN.right)
	.attr('height', HEIGHT + MARGIN.top + MARGIN.bottom)
	.attr('preserveAspectRatio', 'xMaxYMid meet')
	.attr('viewBox', '0 0 ' + SVG_WIDTH + ' ' + SVG_HEIGHT)
	.on('click', svgClicked)
.append('g')
	.attr('transform', 'translate(' + MARGIN.left + ', ' + MARGIN.top + ')');


d3.select('#reset-button').on('click', () => {
	svg.selectAll('.highlight-point').remove();
	svg.selectAll('.highlight-label').remove();

	d3.selectAll('.summary-year')
		.style('display', 'none');
	d3.select('#summary-initial')
		.style('display', 'block');
});

let dataElements = {}
d3.csv(CSV_FILEPATH).then(data => {
	const xDomain = [];
	const yDomain = [];
	const dataMap = data.reduce((map, row) => {
		Object.keys(row).filter(col => col !== 'Year').forEach(col => {
			if (!map[col]) map[col] = [];

			const obj = {
				date: new Date(Number(row['Year']), 0, 1),
				value: parseFloat(row[col])
			};

			xDomain.push(obj.date);
			yDomain.push(obj.value);

			map[col].push(obj);
		});

		return map;
	}, {});

	x.domain(d3.extent(xDomain.concat(new Date(xDomain.slice(-1)[0].getFullYear(), 6))));
	y.domain(d3.extent(yDomain));

	const lineLabels = Object.keys(dataMap).map((company, i) => {
		dataElements[company] = svg.append('path')
			.attr('class', 'line')
			.style('stroke', COLORS[i % COLORS.length])
			.attr('d', d3.line()
				.x(d => x(d.date))
				.y(d => y(d.value))
				.curve(d3.curveLinear)(dataMap[company])
			).node()

		return {
			fx: WIDTH + 3,
			targetY: y(dataMap[company].slice(-1)[0].value),
			value: company
		};
	});

	const force = d3.forceSimulation()
		.nodes(lineLabels)
		.force('collide', d3.forceCollide(10))
		.force('y', d3.forceY(d => d.targetY).strength(1))
		.stop()

	for (let i = 0; i < 25; i++) force.tick();

	svg.selectAll('.line-label')
		.data(lineLabels)
		.enter()
		.append('text')
      .attr('transform', d => 'translate(' + d.x + ', ' + d.y + ')')
      .attr('dy', '.35em')
      .attr('text-anchor', 'start')
      .text(d => d.value);

	// X-Axis
	svg.append('g')
		.attr('class', 'axis')
		.attr('transform', 'translate(0, ' + HEIGHT + ')')
		.call(d3.axisBottom().scale(x));
			
	svg.append('text')
		.attr('text-anchor', 'middle')
		.attr('transform', 'translate('+ (WIDTH/2) + ', ' + (HEIGHT + MARGIN.bottom - MARGIN.bottom / 3) + ')')
		.text('Time (in yrs)');

  svg.append('g')			
		.attr('class', 'grid')
		.attr('transform', 'translate(0, ' + HEIGHT + ')')
		.call(d3.axisBottom(x).ticks(x.ticks().length).tickSize(-HEIGHT).tickFormat(''));


	// Y-Axis
	svg.append('g')
		.attr('class', 'axis')
		.call(d3.axisLeft().scale(y));
			
	svg.append('text')
		.attr('transform', 'rotate(-90)')
		.attr('y', 0 - MARGIN.left)
		.attr('x', 0 - (HEIGHT / 2))
		.attr('dy', '1em')
		.style('text-anchor', 'middle')
		.text('Market capitalization');   
			
	svg.append('g')			
		.attr('class', 'grid')
		.call(d3.axisLeft(y).ticks(y.ticks().length).tickSize(-WIDTH).tickFormat(''));
});