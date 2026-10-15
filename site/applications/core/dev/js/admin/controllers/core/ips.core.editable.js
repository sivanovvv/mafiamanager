/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.editable.js - Inline editing support
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.core.editable', {

		_editTimeout: null,
		_editing: false,

		initialize: function () {
			this.on( 'mousedown', this.editMousedown );
			this.on( 'mouseup mouseleave', this.editMouseup );
			this.on( 'click', this.editMouseclick );
			this.on( 'click', '[data-role="edit"]', this.clickEdit );
			this.setup();
		},
		
		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			var defaultFill = this.scope.attr('data-default');
			// If this is a touch device, remove the highlight class and show the button
			if( ips.utils.events.isTouchDevice() || ( defaultFill !== undefined && defaultFill == 'empty' ) ) {
				this.scope.removeClass('ipsType_editable').find('[data-role="edit"]').show();
			}
		},

		/**
		 * Handles a click on the Edit button
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		clickEdit: function (e) {
			e.preventDefault();
			this._triggerEdit();
		},

		/**
		 * Event handler called when the user clicks down an editable text area
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		editMousedown: function (e) {
			var self = this;

			if( e.which !== 1 ){ // Only care if it's the left mouse button
				return;
			}

			this._editTimeout = setTimeout( this._triggerEdit.bind(this), 1000);
		},
		
		/**
		 * Event handler called when the user clicks up an editable title
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		editMouseup: function (e) {
			clearTimeout( this._editTimeout );
		},
		
		/**
		 * Event handler called when the user clicks up an editable title
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		editMouseclick: function (e) {
			if ( this._editing ) {
				e.preventDefault();
			}
		},

		/**
		 * Transforms our scope element into an editable text field
		 *
		 * @returns {void}
		 */
		_triggerEdit: function () {
			var self = this;

			this._editing = true;
			clearTimeout( this._editTimeout );
			
			var span = this.scope;
			var url = span.attr('data-url');
			var textField = span.find('[data-role="text"]');
			var fieldName = span.find('[data-name]').attr('data-name');
			var defaultFill = span.attr('data-default');
			span.hide();
			
			var defaultText = ( defaultFill === undefined || defaultFill != 'empty' ) ? textField.text().trim() : '';
			var inputNode = $('<input/>').attr( { type: 'text' } ).attr( 'data-role', 'editField' ).val( defaultText );

			span.after(inputNode);
			inputNode.trigger('focus');
			
			inputNode.on('blur', function(){
				inputNode.addClass('ipsField_loading');
				if( inputNode.val() == '' ){
					inputNode.remove();
					span.show();
					self._editing = false;
				} else {
					var dataToSend = {};
					dataToSend[fieldName] = inputNode.val();

					ips.getAjax()( url, { method: 'post', data: dataToSend } )
						.done( function(response) {
							textField.text( inputNode.val() );
						})
						.fail( function(response) {
							ips.ui.alert.show( {
								type: 'alert',
								icon: 'warn',
								message: response.responseJSON,
							});
						})
						.always(function(){
							inputNode.remove();
							span.show();
							self._editing = false;
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
					span.show();
					self._editing = false;
					return false;
				}
			});
		}
	});
}(jQuery));
