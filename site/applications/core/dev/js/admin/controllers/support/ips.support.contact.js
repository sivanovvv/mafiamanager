/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.support.contact.js
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.support.contact', {

		initialize: function () {
			this.on( 'change', '#elCheckbox_support_request_extra_admin', this.acpAccountCheckboxChange );
			this.on( document, 'refreshSupportSummary', this.embedSummary );

			this.embedSummary();
		},

		/**
		 * Toggle handler for support account function
		 *
		 * @param	{event}	e	Change event
		 * @returns	{void}
		 */
		acpAccountCheckboxChange: function (e) {
			if ( !$('#elCheckbox_support_request_extra_admin').is(':checked') ) {
				ips.ui.alert.show({
					type: 'confirm',
					message: ips.getString('supportAcpAccountHead'),
					subText: ips.getString('supportAcpAccountDisableBlurb'),
					icon: 'warn',
					buttons: {
						ok: ips.getString('supportAcpAccountDisableYes'),
						cancel: ips.getString('supportAcpAccountDisableNo')
					},
					callbacks: {
						ok: function(){
							$('#elCheckbox_support_request_extra_admin').prop( 'checked', true );
						}
					}
				});
			}
		},


		/**
		 * Get the summary and embed on the form
		 *
		 * @returns	{void}
		 */
		embedSummary: function() {
			var summary = $(document).find('[data-controller="core.admin.support.dashboard"] [data-role="summary"]');

			if( summary.length )
			{
				var html = $('<div>').append( summary.clone() );
				html.find( '.i-float_end' ).remove();
				html.find('[data-role="summary"]').addClass('i-margin-bottom_3');
				html.find('[data-role="summaryText"]').append( ips.templates.render('support.ticket.supportSummary' ) );
				html = html.html();

				this.scope.find('ul.ipsForm').prepend('<li>' + html + '</li>');
			}
		}	
	});
}(jQuery));