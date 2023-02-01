import weatherWisgettStyles from 'bundle-text:../styles/weather-widget.scss';
import Chart from 'chart.js/auto';

const weatherWidgetTemplate = document.createElement('template');

weatherWidgetTemplate.innerHTML = /*html*/`
<aticle class="widget">
	<div class="header-info-container">
		<h2 class="header__city">Thessaloniki</h2>
		<p class="header__date">Mon 28 Jan 2023</p>
		<div class="header-temp-container">
			<h1 class="header__temp"></h1>
			<img src="#" class="header__icon" alt="weather icon">
		</div>

		<p class="header__feels">feels like</p>
	</div>
	<div class="details-container">
		<h4 class="bold details__text">pressure <span class="details__pressure details__value"></span></h4>
		<h4 class="bold details__text">humidity <span class="details__humidity details__value"></span></h4>
		<h4 class="bold details__text">wind speed <span class="details__wind-speed details__value"></span></h4>
		<h4 class="bold details__text">wind degrees <span class="details__wind-deg details__value"></span></h4>
		<h4 class="bold details__text">clouds <span class="details__clouds details__value"></span></h4>
	</div>
	<div class="menu-container" role="menu" aria-label="Tabs for each day" aria-controls="menu">
		<button class="button selected-day" role="menuitem">TDA</button>
		<button class="button" role="menuitem">[DAY]</button>
		<button class="button" role="menuitem">[DAY]</button>
		<button class="button" role="menuitem">[DAY]</button>
		<button class="button" role="menuitem">[DAY]</button>
		<button class="button" role="menuitem">[DAY]</button>
		<button class="button" role="menuitem">[DAY]</button>
		<button class="button" role="menuitem">[DAY]</button>
	</div>
	<div class="chart-container">
		<canvas id="myChart"></canvas>
	</div>
	<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
 </aticle>
`;

const url = 'https://api.openweathermap.org/data/2.5/onecall?lat=40.58725980318928&lon=22.948223362612612&exclude=hourly,minutely&appid=11b0499bd13ab56063de7565a440eb97&units=metric';
const reqFieldsFilter = [ 'dt', 'temp', 'feels_like', 'pressure', 'humidity', 'wind_speed', 'wind_deg', 'clouds', 'weather'];

export default class WeatherWidgetDrx extends HTMLElement {

	constructor() {
		super();
		// const todayButton = this.shadowRoot.querySelector('button:first-child');

		this.attachShadow({mode: 'open'});
		// how to use scss with a web compoent
		// https://github.com/parcel-bundler/parcel/discussions/5847
		const style = document.createElement('style');
		this.shadowRoot.appendChild(style);
		style.textContent = weatherWisgettStyles;

		// Using 'cloneNode(true)' enable to re-use the component multiple times in page.
		// https://stackoverflow.com/q/69054340/7889584
		this.shadowRoot.appendChild(weatherWidgetTemplate.content.cloneNode(true));
		this.dayButtons = this.shadowRoot.querySelectorAll('.button');


	}

	// ..:: Utility functions ::..
	/**
	 * Gets the mean temperature if available (applies for future dates)
	 * @param {Object} temp
	 * @returns {String} the mean value of day & night temperature
	 */
	getMeanTemp(temp) {
		let result = temp;
		if (temp.day && temp.night) {
			result = ((temp.day + temp.night) / 2);
		}
		return result.toFixed(1);
	}

	/**
	 * Converts unix timestamp to human readable date.
	 * @param {String} unixTime datetime in unix format.
	 * @returns {Date} a JS Date object.
	 */
	unixTimeToDate(unixTime) {
		return new Date(unixTime * 1000);
	}

	/**
	 * Gets the name of the day from the unix date provided.
	 * @param {String} unixDate the date of the day to get the name of, in unix format
	 * @returns {String} the name of the day in text as provided by the api
	 */
	getNameOfDay(unixDate) {
		const date = this.unixTimeToDate(unixDate);
		return date.toString().split(' ')[0];
	}

	/**
	 * Retrieves the data with a GET request.
	 * @param {String} requestURL the request url to API
	 * @returns {Promise<Object>} the response.
	 */
	async requestData(requestURL) {
		let json;
		console.log("REQUEST URL", requestURL);
		try {
			const response = await fetch(requestURL, {method: 'GET'});
			if (!response.ok) {
				throw new Error('Response not ok. Status: ', response.statusText);
			}
			console.log('Response:', response);
			json =  await response.json();
			console.log(json);


		} catch(e) {
			console.error('Unable to request data: ',e)
			throw new Error(e);
		}
		console.log('JSON: ', json);
		return json;
	}

	// ..:: Widget specific fucntions ::..
	/**
	 *  Retrieves an array of daily data objects filtering out unnecessary entries
	 * @param {Array<Object>} dailyData the array of daily data object to be filtered
	 * @returns {Array<Object>} the filtered daily data
	 */
	getFilteredDailyData(dailyData) {
		const filteredDailytData = [];
		dailyData.forEach( day => {
			filteredDailytData.push(this.filterData(day));
		});
		return filteredDailytData;
	}

	/**
	 * Filters out unnecessary data
	 * @param {Object} responseData
	 * @returns the filtered data we want to keep
	 */
	filterData(responseData) {
		const filteredData = Object.keys(responseData)
			.filter( fieldName => reqFieldsFilter.includes(fieldName))
			.reduce( (obj, key) => {
				return Object.assign(obj, {
					[key]: responseData[key]
				});
		}, {});

		return filteredData;
	}

	/**
	 * Update widget fields with given data
	 * @param {Object} dayObject
	 */
	updateHTML(dayObject) {
		// Header elements
		const headerIcon = this.shadowRoot.querySelector('.header__icon');
		const headerTemp = this.shadowRoot.querySelector('.header__temp');
		const headerDate = this.shadowRoot.querySelector('.header__date');
		const headerFeels = this.shadowRoot.querySelector('.header__feels');
		// Details elements
		const pressure = this.shadowRoot.querySelector('.details__pressure');
		const humidity = this.shadowRoot.querySelector('.details__humidity');
		const windSpeed = this.shadowRoot.querySelector('.details__wind-speed');
		const windDeg = this.shadowRoot.querySelector('.details__wind-deg');
		const clouds = this.shadowRoot.querySelector('.details__clouds');

		// Update content
		headerIcon.src = `http://openweathermap.org/img/wn/${dayObject.weather[0].icon}.png`;
		headerTemp.textContent = `${this.getMeanTemp(dayObject.temp)}°`;
		headerDate.textContent = this.unixTimeToDate(dayObject.dt).toDateString();
		headerFeels.textContent = `Feels like: ${this.getMeanTemp(dayObject.feels_like)} °C`;
		pressure.textContent = `${dayObject.pressure} hPa`;
		humidity.textContent = `${dayObject.humidity} %`;
		windSpeed.textContent = `${dayObject.wind_speed} m/s`;
		windDeg.textContent = `${dayObject.wind_deg}`;
		clouds.textContent = `${dayObject.clouds} %`;
	}

	/**
	 * Highlights a specific point on provided chart.
	 * @param {Object} chart the chart containing the point to be highlighted
	 * @param {Number} index the index number for the point to be highlighted
	 */
	highlightPointOnChart(chart, index) {
		const dataset = chart.data.datasets[0];

		// Reset all points to default styling
		for (let i = 0; i < dataset.data.length; i++) {
			dataset.pointBackgroundColor[i] = '#9BD0F5';
			dataset.pointBorderColor[i] = '#36A2EB';
			dataset.radius[i] = 3;
		}

		// Change the style of the hightlighted point
		dataset.pointBackgroundColor[index] = 'orange';
		dataset.pointBorderColor[index] = '#EC6E4C';
		dataset.radius[index] = 6;

		// Apply changes
		chart.update();
	}

	/**
	 * Construcs a chart with labels labels and data
	 * @param {Array<String>} labels
	 * @param {Array<String>} data the data to be used in the constructed chart
	 * @returns {Chart} the Chart object
	 */
	drawLineChart(labels, data) {
		const ctx = this.shadowRoot.getElementById('myChart');
		const defaultColors = { bg: '#9BD0F5', border: '#36A2EB' };

		const chart = new Chart(ctx, {
		type: 'line',
		data: {
			labels,
			datasets: [{
				label: 'Max temp in °C',
				data,
				borderWidth: 2,
				radius: [3, 3, 3, 3, 3, 3, 3, 3],
				pointBackgroundColor: [defaultColors.bg, defaultColors.bg, defaultColors.bg, defaultColors.bg, defaultColors.bg, defaultColors.bg, defaultColors.bg, defaultColors.bg],
				pointBorderColor: [defaultColors.border, defaultColors.border, defaultColors.border, defaultColors.border, defaultColors.border, defaultColors.border, defaultColors.border, defaultColors.border],
				hoverRadius: [7, 7, 7, 7, 7, 7, 7, 7],
				hitRadius: [10, 10, 10, 10, 10, 10, 10, 10],

			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				y: {
					ticks: {
						// Include a degree sign in the ticks
						callback: function(value, index, ticks) {
							return  `${value}°`;
						}
					}
				}
			}
		}
		});
		return chart;
	}



	/**
	 * Fetches, formats and updates the data on the widget
	 * Core component function, all these could be onConnected().
	 */
	async updateWidget() {
		// 1. Get data
		const responseData = await this.requestData(url);

		// 2. Filter current Data
		const filteredCurrentData = this.filterData(responseData.current);

		// 3. Update HTML
		this.updateHTML(filteredCurrentData);

		// 4. Get Daily Data
		const filteredDailytData = this.getFilteredDailyData(responseData.daily);
		console.log(filteredDailytData);

		// 5. Get the labels and data to fill the chart and draw it.
		const chartLabels = filteredDailytData.map(d => this.getNameOfDay(d.dt));
		const chartData = filteredDailytData.map(d => d.temp.max);
		const chart = this.drawLineChart(chartLabels, chartData);

		// 6. Add event listener to each button
		this.dayButtons.forEach((button,index) => {
			if (index !== 0) {
				button.textContent = this.getNameOfDay(filteredDailytData[index].dt)
			}

			// Add event listener to each button
			button.addEventListener('click', (e) => {

				// Set active state on selected button
				this.dayButtons.forEach(button => {
					button.classList.remove('selected-day');
				});
				button.classList.add('selected-day');

				// Replace the currently shown data with the button's data
				if (index !== 0) {
					// future day
					this.updateHTML(filteredDailytData[index]);
				} else {
					// today
					this.updateHTML(filteredCurrentData);
				}

				// Set active state on the corresponding data point to the selected button
				this.highlightPointOnChart(chart, index);
			});
		})
	}


	async connectedCallback() {
		await this.updateWidget();
	}
}

customElements.define('drx-weather-widget', WeatherWidgetDrx);












// /**
//  * Fetch data on page load at a certain rate set by the interval
//  */
// window.addEventListener('load', function () {
// 	// var fetchInterval = 10000; // 10 seconds.

// 	// Update data every ${fetchInterval} seconds.
// 	// setInterval(updateWidget, fetchInterval);
// 	updateWidget();
// });

