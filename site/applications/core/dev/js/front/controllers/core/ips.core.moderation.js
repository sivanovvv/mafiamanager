/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.moderation.js - Controller for moderation actions in content listings
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.moderation', {
		
		_editTimeout: 0,
		_editingTitle: false,

		initialize: function () {
			this.on( 'submit', '[data-role="moderationTools"]', this.moderationSubmit );
			this.on( 'mousedown', '[data-role="editableTitle"]', this.editTitleMousedown );
			this.on( 'mouseup mouseleave', '[data-role="editableTitle"]', this.editTitleMouseup );
			this.on( 'click', '[data-role="editableTitle"]', this.editTitleMouseclick );
		},
		
		/**
		 * Event handler called when the user clicks down an editable title
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		editTitleMousedown: function(e) {
			var self = this;

			if( e.which !== 1 ){ // Only care if it's the left mouse button
				return;
			}

			this._editTimeout = setTimeout(function(){
				self._editingTitle = true;
				clearTimeout( this._editTimeout );
				
				var anchor = $( e.currentTarget );
				anchor.hide();
				var inputNode = $('<input/>').attr( { type: 'text' } ).attr( 'data-role', 'editTitleField' ).val( anchor.text().trim() );
				anchor.after(inputNode);
				inputNode.focus();

				let params = { do: 'ajaxEditTitle' };
				if ( anchor.attr('data-params') !== undefined ) {
					params = Object.assign( {}, params, JSON.parse( anchor.attr('data-params') ) );
				}
				inputNode.on('blur', function(){
					inputNode.addClass('ipsField_loading');
					const oldTitle = anchor.text().trim();
					const newTitle = inputNode.val().trim();
					if (newTitle === '' || newTitle === oldTitle)
					{
                        inputNode.remove();
                        anchor.show();
                        self._editingTitle = false;
					}
					else
					{
						params = { ...params, ...{ "newTitle": newTitle } };
						ips.getAjax()( anchor.attr('href'), { method: 'post', data: params } )
                            .done(function(response){
                                anchor.text( response );
                            })
                            .fail(function(response){
                                ips.ui.alert.show( {
                                    type: 'alert',
                                    icon: 'warn',
                                    message: response.responseJSON,
                                });
                            })
                            .always(function(){
                                inputNode.remove();
                                anchor.show();
                                self._editingTitle = false;
                            });
					}
				});
				
				inputNode.on('keypress', function(e){
					if( e.keyCode == ips.ui.key.ENTER ){
						e.stopPropagation();
						e.preventDefault();
						inputNode.trigger('blur');
						return false;
					}
				});

				// Chrome requires checking keydown instead for escape
				inputNode.on('keydown', function(e){
					if( e.keyCode == ips.ui.key.ESCAPE ){
						inputNode.remove();
						anchor.show();
						self._editingTitle = false;
						return false;
					}
				});
			}, 1000);
		},
		
		/**
		 * Event handler called when the user clicks up an editable title
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		editTitleMouseup: function(e) {
 			clearTimeout( this._editTimeout );
		},
		
		/**
		 * Event handler called when the user clicks up an editable title
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		editTitleMouseclick: function(e) {
 			if ( this._editingTitle ) {
	 			e.preventDefault();
	 		}
		},
				
		/**
		 * Event handler called when the moderation bar submits
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		moderationSubmit: function (e) {
			
			if ( this._editingTitle ) {
				e.preventDefault();
			}

			var action = this.scope.find('[data-role="moderationAction"]').val();

			switch (action) {
				case 'delete':
					this._modActionDelete(e);
				break;
				case 'move':
					this._modActionDialog(e, 'move', 'narrow');
				break;
				case 'hide':
					this._modActionDialog(e, 'hide', 'narrow');
				break;
				case 'split':
					this._modActionDialog(e, 'split', 'wide');
				break;
				case 'merge':
					this._modActionDialog(e, 'merge', 'medium');
				break;
				case 'tag':
					this._modActionDialog(e, 'tag', 'narrow');
					break;
				case 'untag':
					this._modActionDialog(e, 'untag', 'narrow');
					break;
				default:
					 $( document ).trigger('moderationSubmitted');
				break;
			}
		},

		/**
		 * Handles a delete action from the moderation bar
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		_modActionDelete: function (e) {
			var self = this;
			var form = this.scope.find('[data-role="moderationTools"]');

			if( self._bypassDeleteCheck ){
				return;
			}

			e.preventDefault();

			// How many are we deleting?
			let count = parseInt(this.elem.querySelector('[data-role="moderationTools"][data-ipspageaction][data-ipspageaction-selected-count]')?.dataset.ipspageactionSelectedCount);

			if (Number.isNaN(count)) {
				count = (parseInt(this.scope.find('[data-role="moderation"]:checked').length) + parseInt(this.scope.find('[data-role="moderation"]:hidden').length));
			}

			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'warn',
				message: ( count > 1 ) ? ips.pluralize( ips.getString( 'delete_confirm_many' ), count ) : ips.getString('delete_confirm'),
				callbacks: {
					ok: function () {
                        $( document ).trigger('moderationSubmitted');
						self._bypassDeleteCheck = true;
						self.scope.find('[data-role="moderationTools"]').trigger('submit');
					}
				}
			});
		},

		/**
		 * Handles a move/split action from the moderation bar
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		_modActionDialog: function (e, title, size) {
			e.preventDefault();
			
			var form = this.scope.find('[data-role="moderationTools"]');
			
			// Create dialog to show the form
			var moveDialog = ips.ui.dialog.create({
				url: form.attr('action') + '&' + form.serialize().replace( /%5B/g, '[' ).replace( /%5D/g, ']' ),
				modal: true,
				title: ips.getString(title),
				forceReload: true,
				size: size
			});

			moveDialog.show();
			$( document ).trigger('moderationSubmitted');
		}
	});
}(jQuery));