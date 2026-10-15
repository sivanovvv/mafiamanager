/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.settings.js - ACP login screen controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.system.settings', {

		initialize: function () {
			this.on( 'change', 'input[name=datastore_method]', this.datastoreChanged );
			this.on( 'change', 'input[name=cache_method]', this.cacheChanged );
			this.setup();
		},

		/**
		 * Setup method
		 * Focuses the first text field on the first visible tab automatically
		 *
		 * @returns {void}
		 */
		setup: function () {
			if ( $('input[name=datastore_method]:checked').val() == 'Redis' ) {
				$("input[name=cache_method][value=Redis]").prop("checked", true);
				$('#form_cache_method').slideUp();
				$('li[id^=redis]').slideDown();
			}
		},
		
		/**
		 * Event handler for when the the cache store radio is checked
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data	Event data object
		 * @returns {void}
		 */
		cacheChanged: function (e, data) {
			var value = $(e.currentTarget ).val();
			
			if ( value == 'Redis' ) {
				$("input[name=datastore_method][value=Redis]").prop("checked", true);
				$('#form_cache_method,#id_datastore_filesystem_path').slideUp();
				$('li[id^=redis]').slideDown();
			} else {
				$('#form_cache_method').slideDown();
				$('li[id^=redis]').slideUp();
				
				if ( $('input[name=datastore_method]:checked').val() == "Redis" ) {
					$("input[name=datastore_method][value=FileSystem]").prop("checked", true);
				}
			}
		},
		
		/**
		 * Event handler for when the the datastore radio is checked
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data	Event data object
		 * @returns {void}
		 */
		datastoreChanged: function (e, data) {
			var value = $(e.currentTarget ).val();
			
			if ( value == 'Redis' ) {
				$("input[name=cache_method][value=Redis]").prop("checked", true);
				$('#form_cache_method').slideUp();
				$('li[id^=redis]').slideDown();
			} else {
				$('#form_cache_method').slideDown();
				$('li[id^=redis]').slideUp();
				
				if ( $('input[name=cache_method]:checked').val() == "Redis" ) {
					$("input[name=cache_method][value=None]").prop("checked", true);
				}
			}
		}
	});
}(jQuery));