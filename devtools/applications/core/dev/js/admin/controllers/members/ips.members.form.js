/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.members.form.js - Editing member primary/secondary groups
 *
 * Author: MTM
 */

;( function($){
	"use strict";

	ips.controller.register('core.admin.members.form', {

		initialize: function () {
			this.on( 'submit', this.submitForm );
		},
		
		/**
		 * Check if move is needed
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		submitForm: function (e) {
			
			if( $( e.currentTarget ).attr('data-bypassValidation') ){
				return true;
			}
			
			e.preventDefault();
			e.stopPropagation();
		
			var isInAdminGroup = false;
			var mainGroup = this.scope.find('select[name=group]').val();
			var secondaryGroups = (this.scope.find('select[name="secondary_groups[]"]').val() || []).map(val => parseInt(val));
			var adminGroups = JSON.parse( this.scope.attr('data-adminGroups') );
			if( adminGroups.length ){
				for( var i = 0; i < adminGroups.length; i++ ) {
					var testId = adminGroups[i];
					if ( secondaryGroups != null && secondaryGroups.length && secondaryGroups.indexOf( testId ) !== -1 ) {
						isInAdminGroup = true;
					}
					if ( testId == mainGroup ) {
						isInAdminGroup = true;
					}
					if ( $( "input#elCheckbox_secondary_groups_" + testId + ":checked" ).length ) {
						isInAdminGroup = true;
					}
				}
			}
			
			if ( isInAdminGroup ) {
				ips.ui.alert.show({
					type: 'confirm',
					message: ips.getString('member_edit_is_admin'),
					icon: 'fa-solid fa-triangle-exclamation',
					buttons: {
						ok: ips.getString('member_edit_ok'),
						cancel: ips.getString('member_edit_cancel')
					},
					callbacks: {
						ok: function () {
							$( e.currentTarget ).attr('data-bypassValidation', true);
							$( e.currentTarget ).trigger('submit');
						},
						cancel: function () {
							return false;
						}
					}
				});
			} else {
				$( e.currentTarget ).attr('data-bypassValidation', true);
				$( e.currentTarget ).trigger('submit');
			}
		}
	});
}(jQuery));