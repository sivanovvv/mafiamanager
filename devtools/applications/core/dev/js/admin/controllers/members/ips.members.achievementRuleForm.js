/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.members.achievementRuleForm.js - Controller for restrictions screen
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.members.achievementRuleForm', {

		initialize() {
			this.on( 'click', '[data-action="filterReveal"]', this.showFilter );
			this.on( 'click', '[data-action="filterCollapse"]', this.hideFilter );
			this.on( 'change keyup', 'input[type="number"]', this.changeNumber );
		},

		/**
		 * Show a filter when the reveal filter button was clicked
		 * @param {MouseEvent}	e
		 */
		showFilter(e) {
			const ruleWrap = e.currentTarget.closest('[data-role="ruleWrap"]');
			const toggleWrap = e.currentTarget.closest('[data-role="toggleFilter"]');
			const check = toggleWrap.querySelector('input[type="checkbox"]');
			const conditionButtons = toggleWrap.closest('[data-role="conditionButtons"]');

			check.checked = true;
			check.dispatchEvent(new Event('change', {bubbles: true}));
			toggleWrap.ipsHide();
			if (conditionButtons?.querySelector('[data-role="toggleFilter"] input[data-filter]:not(:checked)')) {
				conditionButtons?.ipsShow();
			} else {
				conditionButtons?.ipsHide();
			}

			const filterName = check.dataset.filter;
			if (filterName) {
				ruleWrap.querySelectorAll(`#${filterName}`).ipsShow();
			}
			ruleWrap.querySelectorAll('input[type="number"]').forEach(el => this._pluralizeNumber(el));
		},

		/**
		 * Hide a filter
		 * @param {MouseEvent}	e
		 */
		hideFilter(e) {
			e.preventDefault();
			const filter = e.currentTarget.closest('[data-role="filterField"]');
			const filterName = filter.id;
			const check = filter
				.closest('[data-role="ruleWrap"]') // in theory, we can just do document.querySelector, however other tabs may have an element sharing this ID. THerefore, we only find the element with this ID inside this tab
				.querySelector(`#${filterName}Checkbox`);

			const toggleWrap = check.closest('[data-role="toggleFilter"]');

			check.checked = false;
			check.dispatchEvent(new Event('change', {bubbles: true})); // todo this may be redundant
			toggleWrap.ipsShow()
			toggleWrap.closest('[data-role="conditionButtons"]')?.ipsShow();
			filter.ipsHide();
		},

		/**
		 * Change the number of a numeric input so that the lang string is pluralized properly
		 * @param {Event}	e
		 */
		changeNumber(e) {
			this._pluralizeNumber(e.currentTarget);
		},

		/**
		 *
		 * @param {HTMLInputElement} input
		 * @private
		 */
		_pluralizeNumber(input) {
			const span = input.nextElementSibling;

			if (span?.matches('[data-role="th"]')) {
				span.innerText = ips.pluralize(ips.getString('numberSuffix'), input.value);
			}
		}
	});
}(jQuery));