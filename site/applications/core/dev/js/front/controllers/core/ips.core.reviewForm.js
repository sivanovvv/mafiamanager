/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.reviewForm.js - Review form controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.reviewForm', {
		initialize: function () {
			this.on( 'click', '[data-action="writeReview"]', this.toggleReview );
		},

		toggleReview: function (e) {
			this.scope.find('[data-role="reviewIntro"]').prop('hidden', true);
			this.scope.find('[data-role="reviewForm"]').prop('hidden', false);
		}
	});
}(jQuery));