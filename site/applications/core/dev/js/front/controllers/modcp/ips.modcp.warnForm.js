/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.modcp.warnForm.js - Controller for the add warning form
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.modcp.warnForm', {
		pointsEdited: false,
		expirationEdited: false,
		editorSetTo: '',

		initialize() {
			this.on( 'change', '[name="warn_reason"]', this.changeReason ); 
			this.on( 'change', '[name="warn_points"]', this.changePoints );
			this.on( 'change', '[name="warn_remove"],[name="warn_remove_time"]', e =>{
				this.expirationEdited = true;
			} );
			this.on( 'editorWidgetInitialized', this.editorInitialized );
		},

		editorInitialized(e, data) {
			if( data.id === 'warn_member_note' ){
				$('[name="warn_reason"]').trigger('change'); // Set for initial value

				// check if we have a default note
				const editor = ips.ui.editorv5.getObj( $( 'textarea[name="warn_member_note"]' ).closest('[data-ipsEditorv5]') );
				this.editorSetTo = editor.getInstanceHTML();
			}
		},
		
		/**
		 * Change reason handler
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		async changeReason(e) {
			const response = await ips.fetch( ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=warnings&do=reasonAjax&id=' + $( e.target ).val() )

			// If the points have been changed AND we can override the points, do not adjust
			if (!this.pointsEdited || !response.points_override)
			{
				const pointsNow = parseInt(this.scope.find('[name="warn_points"]').val());
				this.scope
					.find('[name="warn_points"]')
					.val( response.points )
					.prop( 'disabled', parseInt(response.points_override) === 0 );

				if (pointsNow !== response.points)
				{
					this.scope.find('[name="warn_points"]').trigger('change');
				}

				// Flag that we're back to default
				this.pointsEdited = false;
			}

			const removePointsUnlimited = this.scope.find('[name="warn_remove_unlimited"]');

			if (response.remove.unlimited) {
				if (!this.expirationEdited || !response.remove_override)
				{
					if( !removePointsUnlimited.prop( 'checked' ) )
					{
						if( removePointsUnlimited.prop('disabled') ){
							removePointsUnlimited.prop('disabled', false).trigger('click').prop('disabled', true);
						} else {
							removePointsUnlimited.trigger('click');
						}
					}
				}
			} else if( !this.expirationEdited || !response.remove_override) {
				removePointsUnlimited.prop( 'checked', false );
				this.scope.find('[name="warn_remove"]').val( response.remove.date ).prop( 'disabled', !response.remove_override );
				this.scope.find('[name="warn_remove_time"]').val( response.remove.time ).prop( 'disabled', !response.remove_override );
			}
			removePointsUnlimited.prop( 'disabled', !response.remove_override );

			const cheevPoints = this.scope.find('[name="warn_cheeve_point_reduction"]');
			if( !response.cheev_override ) {
				cheevPoints.prop('disabled', true);
			} else {
				cheevPoints.prop('disabled', false);
			}
			cheevPoints.val( response.cheev_point_reduction );

			const editor = ips.ui.editorv5.getObj( $( 'textarea[name="warn_member_note"]' ).closest('[data-ipsEditorv5]') );

			if( response.notes && editor ){
				const currentContents = editor.getInstanceHTML();
				const previousContents = this.editorSetTo;
				editor.unminimize(() => {
					if ( currentContents === previousContents ) {
						editor.reset();
					} else {
						editor.insertHtml('<p></p>');
					}
					editor.insertHtml( response.notes );
					this.editorSetTo = editor.getInstanceHTML();
				});
			}

		},
		
		/**
		 * Change points handler
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{Promise<void>}
		 */
		async changePoints(e) {
			this.pointsEdited	= true;

			const response = await ips.fetch( ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=warnings&do=actionAjax&points=' + $( e.target ).val() + '&member=' + this.elem.dataset.member );
			const types = [ 'mq', 'rpa', 'suspend' ];

			this.elem.querySelectorAll( 'ul#elWarningPenalties').forEach(e => e.remove());
			if (response.override) {
				this.elem.querySelectorAll( 'li#form_warn_punishment .ipsFieldRow__content' ).ipsShow();
			} else {
				this.elem.querySelectorAll( 'li#form_warn_punishment .ipsFieldRow__content' ).ipsHide();
				const enforcedPenalties = [];
				types.forEach(type => {
					if( response.actions[ type ].unlimited && (typeof response.actions[ type ].unlimited !== 'string' || parseInt(response.actions[ type ].unlimited)) ) {
						enforcedPenalties.push( ips.getString( 'warningPunishmentIndefinitely', { type: ips.getString( 'warningPunishment_' + type ) } ) );
					}
					else if( response.actions[ type ].date !== "" && response.actions[ type ].date !== null ) {
						const date = new Date( response.actions[ type ].date + ' ' + response.actions[ type ].time );
						enforcedPenalties.push( ips.getString( 'warningPunishmentDate', { type: ips.getString( 'warningPunishment_' + type ), date: date.toLocaleDateString(document.documentElement.lang || undefined ) } ) );
					}
				});

				// Generate penalty list
				this.scope.find( 'li#form_warn_punishment').append( ips.templates.render('system.warningpenalty.nomodify', { penalties: enforcedPenalties } ) );
			}

			// uncheck all checkboxes to hide toggled on fields
			this.scope.find('#form_warn_punishment [data-action="checkboxsetNone"]').trigger('click');

			types.forEach(type => {
				// Only check this checkbox if it can be overridden
				if (parseInt(response.override)) {
					this.scope.find( '[name="warn_punishment[' + type + ']"]' ).prop( 'checked', ( response.actions[ type ].date || response.actions[ type ].unlimited ) );
				}
				if(response.actions[ type ].unlimited){
					this.scope.find( '[name="warn_' + type + '_unlimited"]' ).prop( 'checked', true ).prop('disabled',!parseInt(response.override)).trigger('change');
				} else if( response.actions[ type ].date ){
					this.scope.find( '[name="warn_' + type + '_unlimited"]' ).prop( 'checked', false ).prop('disabled',!parseInt(response.override)).trigger('change');
					this.scope.find( '[name="warn_' + type + '"]' ).val( response.actions[ type ].date ).prop( 'disabled', !parseInt( response.override ) );
					this.scope.find( '[name="warn_' + type + '_time"]' ).val( response.actions[ type ].time ).prop( 'disabled', !parseInt( response.override ) );
				}
			});
		}
		

	});
}(jQuery));
