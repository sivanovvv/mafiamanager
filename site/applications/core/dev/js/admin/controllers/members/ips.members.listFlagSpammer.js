/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://invisioncommunity.com
 *
 * ips.members.listFlagSpammer.js - Member list spam flagging
 *
 * Author: Stuart Silvester
 */

;( function($){
	"use strict";

	ips.controller.register('core.admin.members.listFlagSpammer', {

		initialize: function () {
			this.on('click', this.toggleFlagSpammer  );
		},

		toggleFlagSpammer: function( e ) {
			e.preventDefault();

			var elem = $( e.currentTarget );
			var icon = elem.find( '.fa-flag' );
			var textLabel = elem.find('span');

			ips.ui.alert.show({
				'type': 'confirm',
				'icon': 'warn',
				'message': icon.hasClass( 'i-color_warning' ) ? ips.getString( 'confirmUnFlagAsSpammer' ) : ips.getString('confirmFlagAsSpammer'),
				'subText': icon.hasClass( 'i-color_warning' ) ? ips.getString( 'confirmUnFlagAsSpammerDesc' ) : '',
				callbacks: {
					ok: function () {
						ips.getAjax()( elem.attr('href'), { dataType: 'json' } )
							.done( function (response) {
								ips.ui.flashMsg.show( response );
								icon.toggleClass( 'i-color_warning');

								// adjust url
								var newStatus = ips.utils.url.getParam( 'status', elem.attr('href') ) == 1 ? 0 : 1;
								var newUrl = ips.utils.url.removeParam( 'status', elem.attr('href') );
								elem.attr( 'href', newUrl + '&status=' + newStatus );

								// Labels
								elem.attr( '_title', newStatus ? ips.getString( 'flagAsSpammer' ) : ips.getString( 'unflagAsSpammer' ) );
								elem.attr( 'aria-label', newStatus ? ips.getString( 'flagAsSpammer' ) : ips.getString( 'unflagAsSpammer' ) );
								textLabel.text(newStatus ? ips.getString( 'flagAsSpammer' ) : ips.getString( 'unflagAsSpammer' ));
							})
							.fail( function (jqXHR) {
								if( Debug.isEnabled() ){
									Debug.error( jqXHR.responseText );
								} else {
									window.location = elem.attr('href');
								}
							});
					}
				}
			});
		}

	});
}(jQuery));