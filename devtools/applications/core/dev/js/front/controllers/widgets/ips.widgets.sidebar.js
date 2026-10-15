/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.widgets.sidebar.js - Special additional controller for the sidebar, to show/hide the whole sidebar as needed
 *
 * Author: Matt Finger (orig. Rikki Tissier, but that finger guy made it wayyy better)
 */
;( function($, _){
	"use strict";

	ips.controller.register('core.front.widgets.sidebar', {

		initialize() {
			this.on( 'managingStarted.widgets', this.managingStarted );
			this.on( 'managingFinished.widgets', this.managingFinished );
			this.setup();
		},

		setup() {
			if (!CSS.supports("selector(a:has(b))") || ips.getSetting('sidebar_use_js_fallback')) {
				Debug.log('using the js sidebar hide fallback')
				this._addConditionalClasses();
				this.on(window, 'resize', this._addConditionalClasses);
				this.on('addConditionalClasses', this._addConditionalClasses)
			}
		},

		/**
		 * Called when we're managing widgets
		 * Shows the sidebar if it was hidden, and sets the height of the droppable area
		 *
		 * @returns {void}
		 */
		managingStarted() {
			this.scope.addClass('ipsLayout__secondary-column--managing');
		},

		/**
		 * Called when we've finished managing widgets
		 * Hides the sidebar completely if there's no widgets or contextual tools displaying
		 *
		 * @returns {void}
		 */
		managingFinished() {
			this.scope.trigger('addConditionalClasses');
			this.scope.removeClass('ipsLayout__secondary-column--managing');
		},

		/**
		 * Adds a class to the body that indicates if the sidebar is shown
		 *
		 * @returns {void}
		 */
		_addConditionalClasses() {
			const isVisible = [
				...this.elem.querySelectorAll('.cWidgetContainer--isWidget [data-blockID]:not([hidden]), #elContextualTools, [data-role="sidebarAd"]')
			].find(el => {
				const rect = el.getBoundingClientRect();
				return !!(rect.width * rect.height);
			});

			if (!isVisible) {
				this.scope.addClass('ipsLayout__secondary-column--hide');
			} else {
				this.scope.removeClass('ipsLayout__secondary-column--hide');
			}
		}
	});
}(jQuery));