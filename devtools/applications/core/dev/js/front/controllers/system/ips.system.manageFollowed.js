/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.manageFollowed.js - Followed content controll
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.system.manageFollowed', {

		initialize: function () {
			$( document ).on( 'followingItem', this.followingItemChange.bind(this) );
			this.setup();
		},

		setup: function () {
			this._followID = this.scope.attr('data-followID');
		},

		followingItemChange: function (e, data) {
			if( data.feedID != this._followID ){
				return;
			}

			if( data.unfollow !== undefined ){
				this.scope.find('[data-role="followDate"], [data-role="followFrequency"]').html('');
				this.scope.find('[data-role="followAnonymous"]').prop('hidden', true);
				this.scope.find('[data-role="followButton"]').addClass('ipsButton--disabled');
				this.scope.addClass('i-opacity_4');
				return;
			}

			// Update anonymous badge
			if(data.anonymous){
				this.scope.find('[data-role="followAnonymous"]').prop('hidden', false);
			} else {
				this.scope.find('[data-role="followAnonymous"]').prop('hidden', true);
			}

			// Update notification type
			if( data.notificationType ){
				this.scope.find('[data-role="followFrequency"]').html( ips.templates.render( 'follow.frequency', {
					hasNotifications: ( data.notificationType !== 'none' ),
					text: ips.getString( 'followFrequency_' + data.notificationType )
				} ));	
			}			
		}
	});
}(jQuery));