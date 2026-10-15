/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.global.licenseRenewal.js - License Renewal message
 *
 * Author: Stuart Silvester
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.core.licenseRenewal', {
				
		initialize: function () {
			this.on( 'click', '[data-action="notNow"]', this.renewalPrompt );
			this.on(document, 'click', '[data-action="closeLicenseRenewal"]', this.close);
		},

		renewalPrompt: function(e) {
			e.preventDefault();
			
			this._modal = ips.ui.getModal();
			
			if ( !$('body').find('[data-role="licenseRenewal"]').length ) {
				$('body').append( ips.templates.render('licenseRenewal.wrapper') );
			}
			this._container = $('body').find('[data-role="licenseRenewal"]').css({ opacity: "0.001" });
			
			// Set the survey URL
			$('body').find( '[data-role="survey"]').attr( 'href', $( this.scope ).attr( 'data-surveyUrl' ) );

			this._modal.css( { zIndex: ips.ui.zIndex() } );
			var self = this;

			// Animate the modal in
			self._container.css( { zIndex: ips.ui.zIndex() } );
			self._container.animate({
				opacity: "1",
			}, 'fast');
			
			ips.utils.anim.go('fadeIn', this._modal);

		},

		/**
		 * Close the popup
		 *
		 * @returns {void}
		 */
		close: function (e) {
						
			if( $('body').find('[data-role="licenseRenewal"]').find( 'input[type=checkbox][name=hideRenewalNotice]' ).is(':checked') )
			{
				var notification = $(this.scope).closest('.cNotification,.cAcpNotificationBanner');
				
				ips.getAjax()( $(this.scope).find('[data-action="notNow"]').attr('href') ).done( function(response) {
					ips.utils.anim.go( 'fadeOut', notification );
					
					if ( !notification.closest('.cNotificationList').children().count ) {
						ips.utils.anim.go( 'fadeIn',  notification.closest('.cNotificationList').find('[data-role="empty"]').removeClass('ipsHide') );
					}
					
					$('body').trigger('updateNotificationCount');
				});
			}

			$('body').find('[data-role="licenseRenewal"]').animate({
				transform: "scale(0.7)",
				opacity: "0"
			}, 'fast');

			ips.utils.anim.go('fadeOut', this._modal);
		}
	});
}(jQuery));