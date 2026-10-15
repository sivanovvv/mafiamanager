/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.stats.overview.js - Overview statistics controller
 *
 * Author: Brandon Farber
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.stats.overview', {
		_dateFilters: undefined, // { 'start': null, 'end': null, 'range': null },
		_dateFilterQueue: new Set(),
		set dateFilters(dateFilters) {
			this._dateFilters = dateFilters;
			this._dateFilterQueue.forEach(cb => cb());
			this._dateFilterQueue.clear();
		},

		/**
		 *
		 * @return {{start: null|number, range: null|number, end: null|number}}
		 */
		get dateFilters() {
			if (this._dateFilters) {
				return this._dateFilters;
			}
			return {
				start: null,
				end: null,
				range: null,
			}
		},

		initialize: function () {
			document.addEventListener('ips:stats.setDateFilters', e => this.updateDateFilter(e));
			this.on( 'change', '[data-action="toggleApp"]', this.toggleApp );

			// we need to debounce this to prevent a loop from occurring. On page load, every overview block dispatches this event, but we only need to send the date filter back to the block once
			this.elem.addEventListener('stats.ready', ips.utils.debounce((...args) => this.blockReady(...args), 100) );
			this.url = this.scope.attr('data-url');
		},

		/**
		 * Promise that resolves after the date filters are known. Since the date filter form is handled as a separate component, we need to do this asynchronously.
		 * @return {Promise<void>}
		 */
		dateFiltersKnown() {
			return new Promise((resolve) => {
				if (this._dateFilters) {
					return resolve();
				}
				this._dateFilterQueue.add(resolve);
				setTimeout(() => {
					document.dispatchEvent(new CustomEvent('reloadStatsDateFilters'));
				})
			});
		},

		/**
		 * A block is ready to be loaded
		 *
		 * @param	{Event} 	e		Event
		 * @param 	{Object}	data 	Event data
		 *
		 * @returns {void}
		 */
		async blockReady(e, data) {
			await this.dateFiltersKnown();
			$(e.target).trigger('stats.loadBlock', {
				dateFilters: this.dateFilters,
				url: this.url
			});
		},

		/**
		 * Event handler for toggling which apps to see
		 *
		 * @returns {void}
		 */
		toggleApp: function () {
			// Get selected apps
			var enabledApps = Array.from( this.scope.find('[data-action="toggleApp"]:checked') ).map( (app) => { 
				return app.getAttribute('data-toggledApp')
			});
			var disabledApps = Array.from( this.scope.find('[data-action="toggleApp"]:not( :checked )') ).map( (app) => {
				return app.getAttribute('data-toggledApp');
			});

			// Select all tiles, except those that are enabled
			if (document.startViewTransition){
                document.startViewTransition(() => this.toggleTiles(enabledApps));
            } else {
                this.toggleTiles(enabledApps);
            }

			// Write the cookie to set disabled apps
			ips.utils.cookie.set('overviewExcludedApps', JSON.stringify( disabledApps ), true );
		},

		toggleTiles: function(enabledApps = []){
			this.scope.find('.cStatTile[data-app]').each( function () {
				var tile = $(this);
				if( tile.is('[hidden]') && enabledApps.indexOf( $( this ).attr('data-app') ) !== -1 ){
					tile.prop('hidden', false);
				} else if ( enabledApps.indexOf( $( this ).attr('data-app') ) === -1 ){
					tile.prop('hidden', true);
				}
			});
		},

		/**
		 * Update blocks on the page to use the new date filters
		 *
		 * @param	{CustomEvent<{dateFilters:{start:*,end:*,range:*}}>} 	e	Event
		 * @returns {void}
		 */
		updateDateFilter: function (e){
			this.dateFilters = {...e.detail.dateFilters};
			this.triggerOn('core.admin.stats.overviewBlock', 'stats.loadBlock', {
				dateFilters: e.detail.dateFilters,
				url: this.url
			});
		},
	});
}(jQuery));