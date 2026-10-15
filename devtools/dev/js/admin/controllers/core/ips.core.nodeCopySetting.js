/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.nav.js - AdminCP Nav
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.core.nodeCopySetting', {

		initialize: function () {
			this.on( 'click', this.click );
		},

		/**
		 * Handles clicks
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		click: function (e) {
			/*var value = null;
			ips.getAjax()( this.scope.closest('form').attr('action') + '&massChangeValue=' + this.scope.attr('data-field'), {
				async: false,
				data: this.scope.closest('form').serialize(),
				type: 'post'
			}).done( function (response, textStatus, jqXHR) {					
				value = response;
			});*/

			e.preventDefault();
		
			if( this.scope.next().hasClass('ipsSelectTree') )
			{
				var vals = this.scope.next('.ipsSelectTree').find("input").first().val();
			}
			else
			{
				var vals = '';
				
				if( this.scope.next().hasClass('ipsField_stack') ) {
					var valArray = [];
					this.scope.next().find('input:not([type=hidden]):not([type=submit]),textarea,select').each(function(){
						if ( $(this).attr('type') == 'checkbox' ) {
							valArray.push( $(this).is(':checked') ? 1 : 0 );
						} else {
							valArray.push( $(this).val() );
						}
					})
					vals = valArray.join(',');
				}
				else if( this.scope.next().hasClass('ipsField_autocomplete') ) {
					if( $('#' + this.scope.data('field')).is( ':checked ') ) {
						vals = this.scope.nextAll("input:not([type=hidden]),textarea,select").first().val();
					}
					else {
						vals = $( 'input[name="' + this.scope.data('field') + '"]' ).val();
					}
				}
				else {
					var input = this.scope.nextAll("input:not([type=hidden]),textarea,select").first();

					// Check if there's an unlimited checkbox here
					if( $('#' + this.scope.attr('data-field') + "-unlimitedCheck:checked" ).length ){
						vals = "-1";
					} else if ( input.attr('type') == 'checkbox' ) {
						vals = input.is(':checked') ? 1 : 0;
					} else {
						vals = input.val();
					}
				}
			}
			
			var dialogRef = ips.ui.dialog.create({
				title: this.scope.attr('_title'),
				url: this.scope.attr('data-baseLink'),
				forceReload: true,
				fixed: false,
				ajax: { type: 'post', data: { value: vals } }
			});
			dialogRef.show();
		}
	});
}(jQuery));