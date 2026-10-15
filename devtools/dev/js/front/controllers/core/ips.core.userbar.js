/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.userbar.js - Controller for userbar (inbox, notifications, etc.)
 *
 * Author: Rikki Tissier & Ehren Harber
 */
;( function($, _){
	"use strict";

	ips.controller.register('core.front.core.userbar', {

		/**
		 * Initialize controller events
		 * Sets up the events from the view that this controller will handle
		 *
		 * @returns 	{void}
		 */
		initialize() {
			// Events initiated here
			this.on( document, 'clearUserbarCache', (...args) => this.clearUserbarCache(...args) );
			this.on( document, 'submitDialog', '#elMessengerPopup_compose', (e) => this.clearUserbarCache(e, {type:'inbox'}));
			this.on( document, 'ipsFetch', '[data-ipsfetch-type]', this.emptyNotificationBubble);
		},

		// Remove the notification bubble when the fetch content is loaded
		emptyNotificationBubble(e){
			const type = e.target.getAttribute('data-ipsfetch-type');
			// Remove the notification count
			if (type !== 'reports') {
				const thisBubble = $(`[data-notificationtype="${type}"]`);
				const thisTotal = Math.max(0, parseInt(thisBubble.html())) || 0;

				const globalBubble = $(`[data-notificationtype="total"]`);
				const globalCount = Math.max(0, parseInt(globalBubble.html())) || 0;

				thisBubble.prop('hidden', true);
				if (globalCount - thisTotal <= 0) {
					globalBubble.prop('hidden', true);
				} else {
					globalBubble.html(globalCount - thisTotal)
				}
			}

			if ( type === 'notify' ) {
				/* Clear out any PWA badges now the menu has been opened */
				ips.utils.notification.clearBadgeCount();
			}
		},
		
		/**
		 * Event handler to clear the cache of loaded windows
		 *
		 * @param 		{event} 	e 		Event
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		clearUserbarCache(e, data) {
			// Refresh the data-ipsfetch content by removing the data-ipsfetch-loaded attribute
			document.querySelectorAll(`[data-ipsfetch-type="${data.type}"]`).forEach(el => {
				el.removeAttribute("data-ipsfetch-loaded");
			})
		},

	});

}(jQuery));