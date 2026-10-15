/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.dashboard.onboard.js - Onboarding setup controller
 *
 * Author: Brandon Farber
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.dashboard.onboard', {

		initialize: function () {
			this.on( 'click', '[data-role="sectionToggle"]', this.toggleSection );
			this.on( 'click', '[data-action="nextStep"]', this.nextStep );
			this.on( 'click', '[data-action="skipStep"]', this.skipStep );

			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
		
		},

		/**
		 * Toggle a section open and closed
		 *
		 * @param	{event}		e	Event
		 * @returns	{void}
		 */
		toggleSection: function( e ) {
			e.preventDefault();

			this.scope.find('[data-role="sectionWrap"]').addClass('cOnboard__section--closed');
			$( e.currentTarget ).closest('.cOnboard__section').toggleClass('cOnboard__section--closed');
			$(document).trigger( 'contentChange', [ $( e.currentTarget ).closest('.cOnboard__section') ] );
		},

		nextStep: function (e) {
			e.preventDefault();

			var wrap = $( e.currentTarget ).closest('.cOnboard__section');
			var nextWrap = wrap.next('.cOnboard__section');

			if( nextWrap.length ){
				$('html, body').animate({ scrollTop: String(wrap.position().top - 70) }, function () {
					setTimeout( function () {
						wrap.addClass('cOnboard__section--closed cOnboard__section--done');
						nextWrap.removeClass('cOnboard__section--closed');
						$(document).trigger( 'contentChange', [ nextWrap ] );
					}, 200);
				});
			} else {
				wrap.addClass('cOnboard__section--closed cOnboard__section--done');
			}
		}

	});
}(jQuery));


