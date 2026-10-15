/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.stats.liveDateFilter.js - Controller for the date filter for overview stats pages
 *
 * Author: Matt Finger
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.stats.liveDateFilter', {

		dateFilters: { 'start': null, 'end': null, 'range': null },

		initialize() {
			this.on( 'submit', this.updateDateFilter );
			this.on( 'change', '[name="predate"]', this.changeDateField );
			this.on( 'click', '[data-action="cancelDateRange"]', this.cancelDateRange );
			document.addEventListener( 'reloadStatsDateFilters', e => this.resendDateFilters(e) );
			this.dateFilters.range = this.elem.dataset.defaultrange;

			this.elem.querySelector('[name="predate"]')?.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {submit:false}}));
		},

		/**
		 * Dispatch a global event containing the date filters
		 */
		resendDateFilters() {
			const url = new URL(window.location.href);
			let days = parseInt(this.dateFilters.range?.toString?.() || 'NaN');
			if (Number.isInteger(days) && days >= 0) {
				url.updateSearchParams({param: 'predate', value: days.toString()});
			} else {
				['start', 'end'].forEach(prop => {
					let ts = null;
					if (typeof this.dateFilters[prop] === 'string') {
						try {
							ts = Math.round((new Date(this.dateFilters[prop])).getTime() / 1000);
						} catch (e) {
						} /* note this is an unhandled caught exception which "can" cause issues */
					}

					url.updateSearchParams({param: 'predate', value: null});
					url.updateSearchParams({param: `date[${prop}]`, value: ts});
				});
			}

			if (url.toString() !== window.location.href) {
				ips.utils.history.replaceState({}, 'stats.liveDateFilter', url.toString());
			}
			this.elem.dispatchEvent(new CustomEvent('ips:stats.setDateFilters', {
				bubbles: true,
				detail: {
					dateFilters: this.dateFilters
				}
			}));
		},

		/**
		 * Cancel
		 * @param {Event}	e
		 */
		cancelDateRange(e) {
			e.preventDefault();
			const select = this.elem.querySelector('select[name="predate"]');
			select.value = this.elem.dataset.defaultrange;
			select.dispatchEvent(new CustomEvent('change', {bubbles: true}));
		},

		/**
		 *
		 * @param {InputEvent|CustomEvent}	e
		 */
		changeDateField(e) {
			/**
			 * @type {HTMLSelectElement|EventTarget}
			 */
			const select = e.target;
			if (!(select instanceof HTMLSelectElement) || !select?.matches?.('select[name="predate"]')) {
				return;
			}

			const button = this.elem.querySelectorAll('.cStatsFilters button');
			if (Number(select.value) === -1) {
				select.ipsHide();
				button.ipsShow();
			} else {
				this.elem.dataset.defaultrange = select.value;
				select.ipsShow();
				button.ipsHide();
				if (e?.detail?.submit !== false) {
					select.closest('form')?.dispatchEvent(new CustomEvent('submit'));
				}
			}
		},

		/**
		 * Update blocks on the page to use the new date filters
		 *
		 * @param	{Event} 	e	Event
		 * @returns {void}
		 */
		updateDateFilter(e) {
			e.preventDefault();
			e.stopPropagation();

			this.dateFilters = {
				'start': null,
				'end': null,
				'range': this.elem.querySelector( '[name="predate"]' ).value
			};

			// Are we specifying a custom date range?
			if (Number(this.dateFilters.range) === -1) {
				this.dateFilters.start = this.elem.querySelector( '[name="date[start]"]' ).value;
				this.dateFilters.end = this.elem.querySelector( '[name="date[end]"]' ).value;
			}

			this.resendDateFilters();

			// submit the filter to the backend
			this.actuallySubmitForm();
		},

		/**
		 *
		 * @return {Promise<Object>}
		 */
		async actuallySubmitForm() {
			// only do this if we're viewing a report
			const url = new URL(this.elem.getAttribute('action'), window.location.href);
			if (!url.searchParams.has('report_id') || url.searchParams.get('app') !== 'core' || url.searchParams.get('module') !== 'overview' || url.searchParams.get('controller') !== 'mycharts') {
				return;
			}
			const values = Object.fromEntries([...(new FormData(this.elem)).entries()]);
			const response = await ips.fetch(url.toString(), {
				method: 'post',
				data: values,
			} );
			console.log('got form submission response', response);
			return response;
		}
	});
}(jQuery));