/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.templates.conflict.js - Templates: Parent controller for the template conflict manager
 *
 * Author: Matt Mecham
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.templates.conflict', {

		initialize: function () {			
			this.on( 'click', '.ipsButton', this.makeSelection );
			this.setup();
		},

		setup: function () {
			$('span[data-conflict-name] input[type=radio]').hide();
		},

		/**
		 * "Use this version" button is clicked
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		makeSelection: function (e) {
			var span  = $( e.target ).closest('span');
			var radio = $( span ).find('input[type=radio]');
			var name  = $( span ).attr('data-conflict-name');
			var id    = $( radio ).attr('name').replace( /conflict_/, '' );
			
			// Button disabled
			if ( span.hasClass('ipsButton--disabled') ){
				return false;
			}

			// Undo selection 
			else if ( span.hasClass('ipsButton--secondary') ){
				radio.prop('checked', false);
				
				span.removeClass('ipsButton--secondary')
					   .addClass('ipsButton--primary')
					   .find('strong')
					   		.html( ips.getString('sc_use_this_version') );
					   
				$('input[type=radio][name=conflict_' + id + ']').closest('span.ipsButton[data-conflict-name=' + ( name == 'new' ? 'old' : 'new' ) +']').removeClass('ipsButton--disabled');
				
				$('th span[data-conflict-id=' + id + '][data-conflict-name=' + name + ']').removeClass('ipsBadge ipsBadge--positive');

				ips.utils.anim.go( 'blindDown', this.scope.find('div[data-conflict-id=' + id + ']') );
			}
			// Make selection
			else
			{
				radio.prop('checked', true);
				span.removeClass('ipsButton--primary')
					   .addClass('ipsButton--secondary')
					   .find('strong')
					   		.html( ips.getString('sc_remove_selection') );
						   
				$('input[type=radio][name=conflict_' + id + ']').closest('span.ipsButton[data-conflict-name=' + ( name == 'new' ? 'old' : 'new' ) +']').addClass('ipsButton--disabled');
				
				$('th span[data-conflict-id=' + id + '][data-conflict-name=' + name + ']').addClass('ipsBadge ipsBadge--positive');
				
				ips.utils.anim.go( 'fadeOut', this.scope.find('div[data-conflict-id=' + id + ']') );
			}
		}
	});
}(jQuery));