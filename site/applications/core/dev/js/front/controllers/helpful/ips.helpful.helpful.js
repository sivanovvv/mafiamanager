/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.helpful.helpful.js - General controller for marking items helpful
 *
 * Author: James Milne
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.helpful.helpful', {

		ajaxObj: null,

		/**
		 * Initialize controller events
		 *
		 * @returns 	{void}
		 */
		initialize: function () {
			this.on( 'click', '[data-action="helpful"]', this.markHelpful );
		},

		/**
		 * markHelpful
		 *
		 * @param 	{Event} 	e 	Event object
		 * @returns {void}
		 */
		async markHelpful(e) {
			e.preventDefault();

			let clicked = $( e.currentTarget );
			let showHelpfulButton = document.querySelector('[data-role="helpfulCount"]');
			let mostHelpfulBox = document.querySelector('[data-role="mostHelpful"]');
			clicked.addClass('i-opacity_3');

			/** @type {HelpfulResponse|HelpfulErrorResponse} */
			const response = await ips.fetch( clicked.attr('href') );
			if( !response.error ) {
				clicked.closest("li").replaceWith( response.button );

				if ( response.helpfulReplies === 0 ) {
					/* No helpful replies, redirect */
				}
				if ( showHelpfulButton && response.countLanguage ) {
					$(showHelpfulButton).html( response.countLanguage );
				}

				if ( mostHelpfulBox ) {
					if ( response.mostHelpfulHtml ) {
						$(mostHelpfulBox).removeClass('ipsHide');
						$(mostHelpfulBox).html(response.mostHelpfulHtml);
					}
					else
					{
						$(mostHelpfulBox).addClass('ipsHide');
					}
				}
			}
			clicked.removeClass('i-opacity_3');
		}
	});

	/**
	 * @typedef HelpfulResponse
	 * @property {number} helpfulReplies
	 * @property {string}	countLanguage
	 * @property {string}	button
	 * @property {string}	[mostHelpfulHtml]
	 */

	/**
	 * @typedef HelpfulErrorResponse
	 * @property {*} error
	 */
}(jQuery));