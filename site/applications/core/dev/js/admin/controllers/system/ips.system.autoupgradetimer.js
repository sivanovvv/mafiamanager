/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.autoupgradetimer.js - Countdown timer for CIC autoupgrade failures necessitating a full applylatestfiles call, or an upgrade call from Cloud2.
 *
 * Author: Brandon Farber
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.system.autoupgradetimer', {

		initialize: function () {
			var self = this;

			// Set a timer that counts down every second
			var secondsRemaining = 60 * 5;
			
			if ( ips.getSetting('cloud2') ) {
				// If we're on Cloud2, set it to 15 seconds initially instead
				secondsRemaining = 15;
			}
			
			var interval = setInterval( function() {
				// Take a second off
				secondsRemaining--;

				// If we are at 0, we're done
				if( secondsRemaining < 1 )
				{
					clearInterval( interval );
					self.scope.find('[data-role="counter-wrapper"]').hide();
					self.scope.find('[data-role="continue-button"]').show();
				}
				// Otherwise update the displayed countdown
				else
				{
					var minutes = Math.floor( secondsRemaining / 60 );
					var seconds = secondsRemaining % 60;

					self.scope.find('[data-role="counter"]').html( minutes + ':' + ( ( seconds >= 10 ) ? seconds : '0' + seconds ) );
				}
			}, 1000 );
		}
	});
}(jQuery));