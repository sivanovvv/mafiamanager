/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.files.moderate.js - Mixin to update moderator form endpoint when table sorting changes
 *
 * Author: bfarber
 */
;( function($){
	"use strict";

	ips.controller.mixin( 'file.moderate', 'core.global.core.table', false, function () {

		/**
		 * After we handle state changes, check the URL and adjust the moderation form
		 *
		 * @returns {void}
		 */
		this.after('_updateSort', function () {
			var current = this._getSortValue();

			var formAction = ips.utils.url.removeParams( [ 'sortby', 'sortdirection', 'listResort' ], this.scope.find('[data-role="moderationTools"]').attr('action') );
			this.scope.find('[data-role="moderationTools"]').attr( 'action', formAction + '&listResort=1&sortby=' + current.by + '&sortdirection=' + current.order );
		});
	});
}(jQuery));