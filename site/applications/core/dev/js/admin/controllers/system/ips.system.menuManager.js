/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.menuManager.js - Menu manager JS
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.system.menuManager', {

		_hasChanges: false,

		initialize: function () {
			this.on( 'sortstop', '.ipsTree_rows > .ipsTree', this.afterSort );
			this._hasChanges = ips.getSetting( 'menuChanged' );
			this.togglePublish();
		},

		afterSort: function(event, ui){
			this._hasChanges = true;
			this.togglePublish();
		},

		togglePublish: function(){
			if( this._hasChanges ){
				$( '#acpPageHeader > .ipsMessage' ).fadeIn();
			} else {
				$( '#acpPageHeader > .ipsMessage' ).hide();
			}
		}
	});
}(jQuery));