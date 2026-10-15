/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.formSubmit.js - Disables form submit button when form is submitted to help prevent duplicated submissions
 *
 * Author: Mark Wade & Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.formSubmit', function(){

		/**
		 * Respond
		 *
		 * @returns {void}
		 */
		var respond = function (elem, options) {
			var formElement = $(elem).is('form') ? $(elem) : $(elem).closest('form');

			// Disable submit button when form is submitted to prevent duplicate submissions
			formElement.on( 'submit', function( e ){
				formElement.find('input[type="submit"],button[type="submit"]').prop( 'disabled', true );
			});

			// If attachment is still uploading, form submission is stopped. If that happens, re-enable submit button so user can try again
			formElement.on( 'fileStillUploading', function( e ){
				formElement.find('input[type="submit"],button[type="submit"]').prop( 'disabled', false );
			});
		};

		ips.ui.registerWidget( 'formSubmit', ips.ui.formSubmit );

		return {
			respond: respond
		};
	});
}(jQuery));