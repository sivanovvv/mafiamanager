/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.pages.form.js - Page Form Stuff That I Can't Be Bothered To Type Out Here
 *
 * Author: Matt Mecham
 */
;( function($){
	"use strict";

	ips.controller.register('cms.admin.pages.form', {

		initialize: function () {
			this.on( 'change', '#check_page_ipb_wrapper', this.toggleIPSWrapper );
			this.on( 'change', '#elSelect_page_wrapper_template', this.toggleTemplate );
			this.on( 'click', '[data-role=viewTemplate]', this.viewTemplate );
			this.on( 'submit', '[data-role=wordForm]', this.submitWordForm );
			
			/* View template */
			if ( this.scope.find('#elSelect_page_wrapper_template').val() == '_none_' )
			{
				this.scope.find('[data-role=viewTemplate]').hide();
			}
			
			/* Includes warning */
			if ( $('#check_page_ipb_wrapper').prop('checked') )
			{
				$('.ipsCmsIncludesMessage').hide();
			}
			else
			{
				$('.ipsCmsIncludesMessage').show();
			}
		},
		
		submitWordForm: function(e) {
			e.preventDefault();
			
			var form = $( e.currentTarget );
			var url = form.attr('action');
			
			ips.getAjax()( url, {
				type: 'post',
				data: form.serialize()
			} )
				.done( function( response, status, jqXHR ) {
					var tagSource = $('div[data-tagSource]');
			
					if ( tagSource !== undefined ) {
						ips.getAjax()( tagSource.attr('data-tagSource') )
							.done( function (response, status, jqXHR) {
								$('ul[data-role="tagsList"]').html( response )
							} );
					}
					
					var dialogObj = ips.ui.dialog.getObj( $( 'a[data-action="wordForm"]' ) );
					if ( dialogObj !== undefined )
					{
						dialogObj.hide();
					}
				} );
		},
		
		/**
		 * View a template. As the title of the method suggests.
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		viewTemplate: function (e) {
			var span = $( e.currentTarget );
			var template = this.scope.find('#elSelect_page_wrapper_template').val().split('__');
			var dialogRef = ips.ui.dialog.create({
				title: this.scope.find('#elSelect_page_wrapper_template option:selected').text(),
				url: '?app=cms&module=pages&controller=ajax&do=loadTemplate&show=modal&t_location=page&t_key=' + template[2],
				forceReload: true,
				remoteSubmit: true
			});
				
			dialogRef.show();
		},
		
		/**
		 * Toggle event handler
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		toggleTemplate: function (e) {
			var thisToggle = $( e.currentTarget );
			
			if ( thisToggle.val() == '_none_' )
			{
				this.scope.find('[data-role=viewTemplate]').hide();
			}
			else
			{
				this.scope.find('[data-role=viewTemplate]').show();
			}
		},

		/**
		 * Toggle event handler
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		toggleIPSWrapper: function (e) {
			var thisToggle = $( e.currentTarget );
			
			if ( thisToggle.prop('checked') )
			{
				$('.ipsCmsIncludesMessage').hide();
			}
			else
			{
				$('.ipsCmsIncludesMessage').show();
			}
		}
	});
}(jQuery));