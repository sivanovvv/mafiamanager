/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * There are a lot of toggles that the form toggles just can't manage.
 * app = value of the select[name=template_hookapp]
 * path = value of the select[name=template_path_{app}]
 * hookpoint = value of the select[name=template_hookpoint_{app}_{path}] (this is the name of the {template}.phtml )
 *
 * The select values must use _ as path separators and : as hookpoint separators (eg: forums_front_forums_table:row )
 * The PHP code will convert these to / and : respectively (eg: forums/front/forums/table:row )
 *
 * Author: Matt Mecham
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.customization.customTemplatesForm', {

		currentHookPoint: null,

		initialize: function () {
			this.on( 'change', 'input[name=template_type]', this.typeChanged );
			this.on( 'change', 'select[name=template_hookapp]', this.hookAppChanged );
			this.on( 'change', 'select[name^=template_path_]', this.hookPathChanged );
			this.on( 'change', 'select[name^=template_hookpoint_]', this.hookPointChanged );
			this.on( 'click', '[data-role=viewTemplate]', this.viewTemplate );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			// Hide all app paths
			$('li[id^=template_path_]').hide();

			// Hide all selectors
			$('#template_hookapp').hide();
			$('li[id^=template_hookpoint_]').hide();
			$('#template_hookpoint_type').hide();

			$('#template_key').hide();

			this.typeChanged();
		},

		/**
		 * View a template. As the title of the method suggests.
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		viewTemplate: function (e) {
			let currentApp = $('select[name=template_hookapp]').val();
			let currentPath = $('select[name=template_path_' + currentApp + ']').val();

			let dialogRef = ips.ui.dialog.create({
				title: ips.getString('custom_theme_template_title'),
				url: '?app=core&module=customization&controller=customtemplates&do=ajaxGetTemplate&hookpoint=' + currentApp + '/' + currentPath.replace( /_/g, '/',) + ':' + this.currentHookPoint,
				forceReload: true,
				remoteSubmit: true
			});

			dialogRef.show();
		},

		/**
		 * Event handler for when the template type has changed
		 * Fixes an issue with our toggles where a toggle of a toggle doesn't toggle
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data	Event data object
		 * @returns {void}
		 */
		typeChanged: function (e, data) {
			if ( $('input[name="template_type"]:checked').val() === 'hook' ) {
				/* This is a hook type */
				$('#template_key').hide();
				$('#template_hookapp').show();
				this.hookAppChanged(e, data);
			} else {
				// Hide all hook fields
				$('#template_hookapp').hide();
				$('li[id^=template_path_]').hide();
				$('li[id^=template_hookpoint_]').hide();

				// Show custom template key
				$('#template_key').show();
			}
		},

		/**
		 * Event handler for when the hook app has changed
		 * Fixes an issue with our toggles where a toggle of a toggle doesn't toggle
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data	Event data object
		 * @returns {void}
		 */
		hookAppChanged: function (e, data) {
			// We need all rows that are template_path_{template_hookapp} to show and others to be hidden
			$('li[id^=template_path_]').hide();
			$('li[id^=template_hookpoint_]').hide();

			$('#template_path_' + $('select[name=template_hookapp]').val() ).show();

			// Make sure the actions for the default item in the select that is now showing takes place
			this.hookPathChanged( e, data );
		},

		/**
		 * Event handler for when the hook path has changed
		 * Fixes an issue with our toggles where a toggle of a toggle doesn't toggle
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data	Event data object
		 * @returns {void}
		 */
		hookPathChanged: function (e, data) {
			let currentApp = $('select[name=template_hookapp]').val();

			// Hide all open hookpoints
			$('li[id^=template_hookpoint_' + currentApp + '_]').hide();

			// Show the selected hookpoint
			$('#template_hookpoint_' + currentApp + '_' + $('select[name=template_path_' + currentApp + ']').val() ).show();

			// Make sure the actions for the default item in the select that is now showing takes place
			this.hookPointChanged( e, data );
		},

		/**
		 * Event handler for when the hook point is loaded
		 * Fixes an issue with our toggles where a toggle of a toggle doesn't toggle
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data	Event data object
		 * @returns {void}
		 */
		hookPointChanged: function (e, data) {
			let currentApp = $('select[name=template_hookapp]').val();
			let currentPath = $('select[name=template_path_' + currentApp + ']').val();
			this.currentHookPoint = $('select[name=template_hookpoint_' + currentApp + '_' + currentPath + ']').val();

			$('#template_hookpoint_type').show();

			/* Now check the params */
			this.getTemplateParams( e, data );
		},

		/**
		 * Event handler for when the hook point is loaded
		 * Fixes an issue with our toggles where a toggle of a toggle doesn't toggle
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data	Event data object
		 * @returns {void}
		*/
		getTemplateParams: function( e, data ) {
			let currentApp = $('select[name=template_hookapp]').val();
			let currentPath = $('select[name=template_path_' + currentApp + ']').val();

			ips.getAjax()( '?app=core&module=customization&controller=customtemplates&do=ajaxGetAvailableParams', {
				data: {
					hookpoint: currentApp + '/' + currentPath.replace( /_/g, '/',) + ':' + this.currentHookPoint,
					hookpoint_type: $('#template_hookpoint_type').val(),
				}
			} )
				.done( function (response) {
					$('span[data-template-params]').html( response );
				});
		}
	});
}(jQuery));
