/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.dynamicChart.js - Dynamic chart controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.core.dynamicChart', {

		storedValues: {},
		identifier: '',
		originalFilters: {},
		type: '',

		initialize: function () {
			// Set up the events that will capture chart changes
			this.on( 'click', '[data-timescale]', this.changeTimescale );
			this.on( document, 'submit', '[data-role="dateForm"]', this.changeDateRange );
			document.addEventListener('ips:stats.setDateFilters', e => this.globalDateRangeSet(e));
			this.on( document, 'click', '[data-role="clearSearchTerm"]', this.resetSearch );
			this.on( document, 'submit', '[data-role="searchForm"]', this.changeSearch );
			this.on( 'menuItemSelected', '[data-action="chartFilter"]', this.changeFilter );
			this.on( 'click', '[data-type]', this.changeChartType );

			// Select all/none for filters
			this.on( 'click', '[data-role="filterMenu"] [data-role="selectAll"]', this.selectAllFilters );
			this.on( 'click', '[data-role="filterMenu"] [data-role="unselectAll"]', this.unselectAllFilters );

			// Save filters
			this.on( 'click', '[data-role="updateChart"]', this.saveFilters.bind(this));
			this.on( 'click', '[data-role="saveReport"]', this.saveFilters.bind(this) );
			this.on( 'click', '[data-role="renameChart"]', this.renameFilters.bind(this) );

			this.setup();
		},

		/**
		 * Select all filters
		 *
		 * @returns {void}
		 */
		selectAllFilters: function ( e ) {
			$(e.currentTarget)
				.closest('i-dropdown')
				.find('[data-ipsMenuValue]:not([aria-selected="true"])')
				.each(function() {
					this.click(); // Use native click instead of jQuery .trigger
				});
		},

		/**
		 * Un-select all filters
		 *
		 * @returns {void}
		 */
		unselectAllFilters: function ( e ) {
			$(e.currentTarget)
				.closest('i-dropdown')
				.find('[data-ipsMenuValue][aria-selected="true"]')
				.each(function() {
					this.click(); // Use native click instead of jQuery .trigger
				});
		},

		/**
		 * Setup method. Sets the default storeValues values.
		 *
		 * @returns {void}
		 */
		setup: function () {
			this.identifier = this.scope.attr('data-chart-identifier');

			this.loadFilters();
			this.originalFilters = structuredClone(this.storedValues);
			document.querySelector('[data-chart-identifier="' + this.identifier + '"] [data-role="updateChart"]')?.setAttribute('disabled','disabled');

			this.checkType();
			const url = new URL(window.location.href);
			const action = new URL(this.elem.dataset.chartUrl, window.location.href);
			if (parseInt(url.searchParams.get('highlight')) && url.searchParams.get('highlight') === action.searchParams.get('chartId')) {
				this.pulse();
				ips.utils.history.replaceState(window.history.state?._current?.[window.history.state?._lastKey] || {}, window.history.state?._lastKey|| "", url.updateSearchParams({params: {highlight: null}}).toString());
			}
		},

		loadFilters: function(){
			// Get the initial values
			// Timescale & type
			this.storedValues.timescale = this.scope.find('[data-timescale][data-selected]').attr('data-timescale');
			this.storedValues.type = this.scope.find('[data-type][data-selected]').attr('data-type');

			if( this.scope.find('[data-role="searchForm"] input') )
			{
				this.storedValues.term = null;
			}

			this.storedValues.filters = [];
			this.storedValues.dates = { start: '', end: '' };
			this.type = this.scope.attr('data-chart-type');
			this.timescale = this.scope.attr('data-chart-timescale');

			// Filters
			let filterMenu = document.getElementById('el' + this.identifier + 'Filter_menu') || null;
			if(filterMenu){
				filterMenu.querySelectorAll('[aria-selected="true"]').forEach( ( elem ) => {
					this.storedValues.filters.push( elem.getAttribute('data-ipsMenuValue'));
				});
			}
		},

		pulse() {
			setTimeout(() => {
				requestAnimationFrame(() => {
					this.elem.animate([
						{
							boxShadow: "0 0 0px 0px color-mix(in srgb-linear, var(--i-primary) 50%, transparent)",
							// easing: 'ease-in-out',
							offset: 0
						},
						{
							boxShadow: "0 0 4px 4px color-mix(in srgb-linear, var(--i-primary) 50%, transparent)",
							// easing: 'ease',
							offset: 0.15
						},
						{
							boxShadow: "0 0 4px 4px color-mix(in srgb-linear, var(--i-primary) 50%, transparent)",
							// easing: 'ease',
							offset: 0.85
						},
						{
							boxShadow: "0 0 0px 0px color-mix(in srgb-linear, var(--i-primary) 50%, transparent)",
							// easing: 'ease-out',
							offset: 1
						},
					], 4000);
				});
			}, 1000);
		},

		/**
		 * Event handler for changing the timescale
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		changeTimescale: function (e) {
			this.timescale = $(e.currentTarget).attr('data-timescale');
			this._toggleButtonRow( e, 'timescale');
		},

		/**
		 * Event handler for changing the chart type
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		changeChartType: function (e) {
			this.type = $(e.currentTarget).attr('data-type');
			this._toggleButtonRow( e, 'type' );
			this.checkType();
		},

		/**
		 * Check type
		 */
		checkType: function() {
			if ( this.type == 'Table' || this.type == 'PieChart' || this.type == 'GeoChart' ) {
				$(this.scope).find('[data-role="groupingButtons"] a.ipsButton').addClass('ipsButton--disabled');
			} else {
				$(this.scope).find('[data-role="groupingButtons"] a.ipsButton').removeClass('ipsButton--disabled');
			}
		},

		/**
		 * Track whether we've bound the updateUrl method
		 */
		updateUrlBound: false,

		/**
		 * Event handler for changing the filter
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Data object from the menu widget
		 * @returns {void}
		 */
		changeFilter: function (e, data = e.detail) {
			if($(e.currentTarget).attr('id') !== 'el' + this.identifier + 'Filter' ){
				return;
			}
			data.originalEvent.preventDefault();

			// Reset filters
			this._resetFilters();

			if( this.updateUrlBound === false )
			{
				$(this.scope).find('[data-action="chartFilter"]').one( 'menuClosed', this.fetchNewResults.bind(this) );
				this.updateUrlBound = true;
			}
		},

		/**
		 * Wrapper method for _updateUrl() so we only send request if needed
		 *
		 * @returns {void}
		 */
		fetchNewResults: function( e ) {
			this._updateURL();

			this.updateUrlBound = false;
		},

		/**
		 * Save the current filters
		 *
		 * @returns	{void}
		 */
		 saveFilters: async function( event ) {
			// Init
			var identifier	= this.identifier;
			var self		= this;
			var pieces		= [];
			this.loadFilters();

			for (const [idx, value] of this.storedValues.filters.entries()) {
				pieces.push( "chartFilters[" + idx + "]=" + value );
			}

			// Work in custom form filters
			$('#el' + this.identifier + 'CustomFiltersForm input[data-role="nodeValue"]').each( function () {
				pieces.push( 'customform_' + $(this).attr('name') + "=" + $(this).val() );
			});
			$('#el' + this.identifier + 'CustomFiltersForm select').each( function(){
				pieces.push( 'customform_' + $(this).attr('name') + '=' + $(this).val() );
			})

			var newFilters	= pieces.join('&');

			if ( this.timescale )
			{
				newFilters = newFilters + "&timescale=" + this.timescale;
			}

			// Are we on default panel or a custom one?
			if( !$( event.currentTarget ).attr('data-chartId') )
			{
				// When clicking on the save button, stop the chart from updating initially
				this._skipUpdate = true;

				// Then set an event handler for the form submission where we specify the chart title
				$('#el' + this.identifier + 'FilterSave_menu').one( 'submit', 'form', function( e ){
					if( $(this).attr('data-bypassValidation') ){
						return false;
					}

					// Hide the menu
					$(this)[0].closest("[popover]")?.hidePopover();

					var tabTitle = $(this).find('[name="custom_chart_title"]').val();

					e.preventDefault();

					ips.getAjax()( $(this).attr('action'), {
						data: $(this).serialize() + '&' + newFilters,
						type: 'post'
					} )
						.done( function (response, status, jqXHR) {
							// if this as saved to a report, the tab isn't visible so we redirect
							if (response.reportURL) {
								window.location.href = response.reportURL;
								return;
							}

							// Add the tab
							$('[data-ipsTabBar-contentArea="#' + identifier + '"]').find('[role="tablist"]').append(
								"<a href='" + response.tabHref + "' id='ipsTabs_" + response.tabId + "_" + response.chartId + "' class='ipsTabs__tab' title='" + tabTitle + "' role='tab' aria-controls='ipsTabs_" + response.tabId + "_" + response.chartId + "_panel' aria-selected='false'>" + tabTitle + "</a>"
							);

							// Add the new tab content area
							$('#' + identifier ).append(
								"<div id='ipsTabs_" + response.tabId + "_" + response.chartId + "_panel' class='ipsTabs__panel' role'tabpanel' aria-labelledby='ipsTabs_" + response.tabId + "_" + response.chartId + "' hidden></div>"
							);

							// Make sure we update URL correctly moving forward
							self._skipUpdate = false;

							// And trigger content change event
							$( document ).trigger( 'contentChange', [ self.scope ] );

							// Clear input field
							$('#el' + self.identifier + 'FilterSave_menu').find('[name="custom_chart_title"]').val( '' );

							// And then switch to the tab
							$('#' + response.tabId + "_" + response.chartId ).trigger('click');

							// And show a confirmation message that we saved.
							ips.ui.flashMsg.show( ips.getString('saved') );
						})
						.fail( function () {
							$(this).attr( 'data-bypassValidation', true ).trigger('submit');
						});
				});
			}
			else
			{
				// Send AJAX request to save report
				await ips.fetch( this.scope.attr('data-chart-url') + '&saveFilters=1', { data: newFilters } );

				// reset the stored values
				this.originalFilters = structuredClone(this.storedValues);
				this._toggleSaveButton('filters');

				// And update the chart
				this._updateURL();

				// And show a confirmation message that we saved.
				ips.ui.flashMsg.show( ips.getString('saved') );
			}
		 },

		/**
		 * Rename the current filters
		 *
		 * @returns	{void}
		 */
		renameFilters() {
			// Init
			const identifier = this.scope.closest('.ipsTabs__panel').closest('section').attr('id');

			// if we have no identifier, we're probably on the overview page. Wrapping the queries in an anonymous function allows us to only query if needed
			const titlefield = () => identifier ? $(`[data-ipsTabBar-contentArea="#${identifier}"] [role="tablist"] [aria-selected="true"]`) : this.scope.find('.ipsTitle');

			// Set an event handler for the form submission where we specify the chart title
			$('#el' + this.identifier + 'FilterRename_menu').on( 'submit', 'form', async function( e ){
				if( $(this).attr('data-bypassValidation') ){
					return false;
				}

				e.preventDefault();

				// Hide the menu
				$(this)[0].closest("[popover]")?.hidePopover();

				try {
					const {title} = await ips.fetch($(this).attr('action'), {
						data: $(this).serialize(),
						type: 'post'
					});

					titlefield().text(title);
				} catch (e) {
					Debug.error(e)
					$(this).attr( 'data-bypassValidation', true ).trigger('submit');
				}
			});
		},

		/**
		 * Searches for a specific value in the graph
		 *
		 * @param 	{event} 	e 		Event object
		 * @returns {void}
		 */
		changeSearch: function (e) {
			e.preventDefault();

			var form = $('#el' + this.identifier + 'Search_menu');

			this.storedValues.term = form.find('[name="search"]').val();

			this.scope.find('[data-role="searchSummary"]').text( this.storedValues.term );

			form.find('[data-role="clearSearchTerm"]').prop('hidden', !this.storedValues.term);

			form[0].closest("[popover]")?.hidePopover();

			this._updateURL();
		},

		/**
		 * Resets our search term
		 *
		 * @param 	{event} 	e 		Event object
		 * @returns {void}
		 */
		resetSearch: function (e) {
			$('#el' + this.identifier + 'Search_menu').find('[name="search"]').val( '' );

			// The event bubbles up since this is a "submit" button, and changeSearch will be called next
		},

		/**
		 * Changes the range of the graph being shown
		 *
		 * @param 	{event} 	e 		Event object
		 * @returns {void}
		 */
		changeDateRange: function (e) {
			const identifier = this.elem.querySelector('[data-action="chartDate"]')?.id;
			if (identifier && !e.target?.closest(`#${identifier}_menu`)) {
				return;
			}
			e.preventDefault();

			var form = $('#el' + this.identifier + 'Date_menu');

			this.storedValues.dates.start = form.find('[name="start"]').val();
			this.storedValues.dates.end = form.find('[name="end"]').val();

			form[0].closest("[popover]")?.hidePopover();

			if( this.storedValues.dates.start && this.storedValues.dates.end )
			{
				this.scope.find('[data-role="dateSummary"]').text( '(' + ips.getString('betweenXandX', { start: ips.utils.time.localeDateString( ips.utils.time.removeTimezone( new Date( this.storedValues.dates.start ) ) ), end: ips.utils.time.localeDateString( ips.utils.time.removeTimezone( new Date( this.storedValues.dates.end ) ) ) }) + ')' );
			}
			else if( this.storedValues.dates.start )
			{
				this.scope.find('[data-role="dateSummary"]').text( '(' + ips.getString('afterX', { start: ips.utils.time.localeDateString( ips.utils.time.removeTimezone( new Date( this.storedValues.dates.start ) ) ) }) + ')' );
			}
			else if( this.storedValues.dates.end )
			{
				this.scope.find('[data-role="dateSummary"]').text( '(' + ips.getString('beforeX', { end: ips.utils.time.localeDateString( ips.utils.time.removeTimezone( new Date( this.storedValues.dates.end ) ) ) }) + ')' );
			}
			else
			{
				this.scope.find('[data-role="dateSummary"]').text( '' );
			}

			this._toggleSaveButton('dates');

			this._updateURL();
		},

		/**
		 *
		 * @param {CustomEvent<{dateFilters: {start: null|string, end: null|string, range: null|string|number}}>}e
		 */
		globalDateRangeSet(e) {
			let {start, end, range} = e?.detail?.dateFilters || {};
			if (!start && !end && !range) {
				return;
			}

			if (range) {
				const days = parseInt(range);
				if (Number.isNaN(days)) {
					throw new RangeError(`Expected range to be an integer representing a number of days`);
				} else if (days >= 0) {
					end = Math.round(Date.now() / 1000);
					start = days > 0 ? end - (86400 * days) : 0; // we get 'all time' in this case
				}
			}

			if (typeof start === 'string') {
				start = Math.round((new Date(start)).getTime() / 1000);
			}

			if (typeof end === 'string') {
				end = Math.round((new Date(end)).getTime() / 1000);
			}

			if (Number.isNaN(start) || Number.isNaN(end)) {
				throw new RangeError(`Could not determine either the start or end of the interval`);
			}

			this.storedValues.dates.start = start;
			this.storedValues.dates.end = end;
			this.storedValues.dates.range = range;
			this._updateURL();
		},

		/**
		 * Method for toggling buttons and setting new values in the store
		 *
		 * @param 	{event} 	e 		Event object from the event handler
		 * @param 	{string} 	type 	The type being handled (timescale or type)
		 * @returns {void}
		 */
		_toggleButtonRow: function (e, type) {
			e.preventDefault();

			var val = $( e.currentTarget ).attr( 'data-' + type );

			this.scope.find('[data-' + type + ']')
				.removeClass('ipsButton--active')
				.removeAttr('data-selected')
				.filter('[data-' + type + '="' + val + '"]')
					.addClass('ipsButton--active')
					.attr('data-selected', true);

			this.storedValues[ type ] = val;

			// Reset filters
			this._resetFilters();

			this._toggleSaveButton(type);

			this._updateURL();
		},

		/**
		 * Method to enable/disable the save chart button
		 *
		 * @param {string} type
		 * @returns {void}
		 */
		_toggleSaveButton: function(type){
			let disabled;
			if(type === 'filters' || type === 'dates'){
				disabled = JSON.stringify(this.storedValues[type]) === JSON.stringify(this.originalFilters[type]);
			} else {
				disabled = this.storedValues[type] === this.originalFilters[type];
			}

			if(disabled){
				document.querySelector('[data-chart-identifier="' + this.identifier + '"] [data-role="updateChart"]')?.setAttribute('disabled','disabled');
			} else {
				document.querySelector('[data-chart-identifier="' + this.identifier + '"] [data-role="updateChart"]')?.removeAttribute('disabled');
			}
		},

		/**
		 * Reset our stored filters to only include what we presently have selected
		 *
		 * @return {void}
		 */
		_resetFilters: function() {
			// Reset filters
			this.loadFilters();
			this._toggleSaveButton('filters');
		},

		_skipUpdate: false,

		/**
		 * Fetches new chart HTML from the server, then reinits the chart widget
		 *
		 * @returns {void}
		 */
		_updateURL: function () {
			// We skip updating the chart when clicking over to the save button the first time
			if( this._skipUpdate === true )
			{
				this._skipUpdate = false;
				return;
			}

			var url = this._buildURL();
			var chartArea = this.scope.find('[data-role="chart"]');
			chartArea.css( 'height', chartArea.height() ).html( '' ).addClass('ipsLoading');

			ips.getAjax()( this.scope.attr('data-chart-url'), {
				data: url,
				type: 'post'
			})
				.done( function (response) {
					chartArea.css( 'height', 'auto' ).html( response );
					$( document ).trigger( 'contentChange', [ chartArea ] );
				})
				.always( function () {
					chartArea.removeClass('ipsLoading');
				});

			// Update download button URL
			this.scope.find('[data-role="downloadChart"]').attr('href', this.scope.attr('data-chart-url') + '&' + url + '&download=1');
		},

		/**
		 * Builds a query param based on the values we have stored
		 *
		 * @returns {string}
		 */
		_buildURL: function () {
			const params = new URLSearchParams();

			// Needed for dynamic chart buttons. We can't simply rely on checking request isAjax() as it could be loaded inside tabs etc.
			params.set('noheader', '1');

			// Timescale
			params.set(`timescale[${this.identifier}]`, this.storedValues.timescale);

			// Type
			if ('type' in this.storedValues) {
				params.set(`type[${this.identifier}]`, this.storedValues.type);
			}

			// Term
			if (this.storedValues.term !== undefined && this.storedValues.term !== null) {
				params.set(`search[${this.identifier}]`, this.storedValues.term);
			}

			// Filters
			if (this.storedValues.filters && Symbol.iterator in this.storedValues.filters) {
				let idx = 0;
				for (const value of this.storedValues.filters) {
					params.set(`filters[${this.identifier}][${idx++}]`, value);
				}
			}

			// Dates
			if (this.storedValues.dates.start || this.storedValues.dates.end) {
				params.set(`start[${this.identifier}]`, this.storedValues.dates.start);
				params.set(`end[${this.identifier}]`, this.storedValues.dates.end);
			}

			// For the mycharts page, we handle this a bit differently as all the charts use the same date range
			if (document.body.dataset.pagecontroller === 'mycharts' && document.body.dataset.pageapp === 'core' && document.body.dataset.pagemodule === 'overview') {
				if (this.storedValues.dates.range) {
					params.set('predate', this.storedValues.dates.range);
				}

				if ((!this.storedValues.dates.range || parseInt(this.storedValues.dates.range) === -1) && (this.storedValues.dates.start || this.storedValues.dates.end)) {
					params.delete('predate');
					params.set('date[start]', this.storedValues.dates.start || null);
					params.set('date[end]', this.storedValues.dates.end || null);
				}
			}
			
			// Work in custom form filters
			$('#el' + this.identifier + 'CustomFiltersForm input[data-role="nodeValue"]').each( function () {
				params.set( 'customform_' + $(this).attr('name'), $(this).val() );
			});
			$('#el' + this.identifier + 'CustomFiltersForm select').each( function () {
				params.set( 'customform_' + $(this).attr('name'), $(this).val() );
			});

			return params.toString();
		}
	});
}(jQuery));