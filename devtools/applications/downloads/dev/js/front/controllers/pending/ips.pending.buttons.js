/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.pending.buttons.js - Pending Version
 *
 * Author: Stuart Silvester
 */
;( function($){
	"use strict";

	ips.controller.register('downloads.front.pending.buttons', {

	initialize: function () {
		this.on( 'click', 'a', this.processButton );
	},

	processButton: function(e) {
		if( $(e.currentTarget).hasClass('ipsButton--disabled') )
		{
			e.preventDefault();
		}

		$(e.currentTarget).addClass('ipsButton--disabled');
	}

	});
}(jQuery));