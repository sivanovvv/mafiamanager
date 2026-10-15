/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.view.note.js - Note controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('gallery.front.view.note', {

		_editing: false,
		_editable: false,
		_draggingNotEditing: false,
		_hoverTimerOn: null,
		_hoverTimerOff: null,
		_note: '',

		initialize: function () {
			this.on( 'click', '.cGalleryNote_border', this.startEditing );
			this.on( 'click', '[data-action="save"]', this.saveNote );
			this.on( 'click', '[data-action="cancel"]', this.cancelNote );
			this.on( 'click', '[data-action="delete"]', this.deleteNote );
			this.on( 'mousedown', '.cGalleryNote_note', this.mouseDown );
			this.on( 'mouseenter', this.mouseEnter );
			this.on( 'mouseleave', this.mouseLeave );

			this.setup();
		},

		/**
		 * Setup method, builds the note, makes it editable and positions it
		 *
		 * @returns {void}
		 */
		setup: function () {
			var self = this;

			// Force disable for mobile as the behavior isn't terribly good on a small device
			if( this.scope.attr('data-editable') !== undefined && !ips.utils.responsive.currentIs('phone') ){
				this._editable = true;
			}

			this._note = this.scope.attr('data-note');
			this._baseURL = ips.getSetting('baseURL') + 'index.php?app=gallery&module=gallery&controller=notes&imageId=' + this.scope.closest('.cGalleryViewImage').attr('data-imageID');

			this._buildNote();
			this._setUpEditable();
			this._initialPosition();

			// If this is a new note, trigger a click on it to put it into editing mode
			if( this.scope.attr('data-noteID') == 'new' ){
				this.scope.find('.cGalleryNote_border').trigger('click');
			}
		},

		/**
		 * Event handler for saving changes to note text
		 *
		 * @param 	{event}		e 	Event object
		 * @returns {void}
		 */
		saveNote: function (e) {
			e.preventDefault();
			var self = this;
			var note = this.scope.find('.cGalleryNote_note textarea').val();
			var savePosition = false;

			this.scope.draggable('enable');

			if( !note.trim() ){
				return;
			}
			
			// If this is a new note, we'll save the position too.
			if( this.scope.attr('data-noteID') == 'new' ){
				savePosition = true;
			}

			this._saveNote( note, savePosition )
				.done( function () {
					self._note = note;
					self._stopEditing();
				});
		},

		/**
		 * Event handler for cancelling changes to note text
		 *
		 * @param 	{event}		e 	Event object
		 * @returns {void}
		 */
		cancelNote: function (e) {
			// If this is a new note 'cancel' should actually delete
			if( this.scope.attr('data-noteID') == 'new' ){
				this.deleteNote( e );
				return;
			}

			e.preventDefault();
			this.scope.draggable('enable');
			this._stopEditing();
		},

		/**
		 * Event handler for deleting a note. Confirms with user, then triggers ajax request to remove this note
		 *
		 * @param 	{event}		e 	Event
		 * @returns {void}
		 */
		deleteNote: function (e) {
			e.preventDefault();
			var self = this;

			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'question',
				message: ips.getString('delete_note_confirm'),
				callbacks: {
					ok: function () {
						self._doDeleteNote();
					}
				}
			});
		},

		/**
		 * Mouse enter event; shows the note text after a short delay
		 *
		 * @returns {void}
		 */
		mouseEnter: function () {
			var self = this;

			if( this._hoverTimerOn ){
				clearTimeout( this._hoverTimerOn );
			}

			if( !this._editing ){
				this._hoverTimerOn = setTimeout( function () {
					if( !self.scope.find('.cGalleryNote_note').is(':visible') ){
						ips.utils.anim.go( 'fadeIn fast', self.scope.find('.cGalleryNote_note') );	
					}				
				});
			}
		},

		/**
		 * Mouse leave event; hides the note text after a short delay
		 *
		 * @returns {void}
		 */
		mouseLeave: function () {
			var self = this;

			if( this._hoverTimerOff ){
				clearTimeout( this._hoverTimerOff );
			}

			if( !this._editing ){
				this._hoverTimerOff = setTimeout( function () {
					if( self.scope.find('.cGalleryNote_note').is(':visible') ){
						ips.utils.anim.go( 'fadeOut fast', self.scope.find('.cGalleryNote_note') );	
					}				
				});
			}
		},

		/**
		 * Event handler for mousing down on the note edit area (textarea and buttons);
		 * This is necessary because on mobile, the draggable widget interferes with the controls
		 * and makes them unclickable. Instead what we do is disable the draggable onmouseodown so that
		 * clicks are registered, and then our save/cancel handlers will renable it.
		 *
		 * @returns {void}
		 */
		mouseDown: function () {
			// this.scope.draggable('disable');
		},

		/**
		 * Triggered when the user clicks on the note. Puts the note into editing state,
		 * and shows a little form to allow the text to be edited
		 *
		 * @returns {void}
		 */
		startEditing: function () {
			if( !this._editable || this._draggingNotEditing ){
				return;
			}

			if( this._editing === true )
			{
				this.scope.find('.cGalleryNote_note > div textarea').trigger('focus');
				return;
			}

			this._editing = true;

			this.scope
				.addClass('cGalleryNote_editing')
				.append( ips.templates.render('gallery.notes.delete') )
				.find('.cGalleryNote_note > div')
					.html( ips.templates.render('gallery.notes.edit', {
						note: this._note
					}))
					.find('textarea')
						.trigger('focus');
		},

		/**
		 * Deletes the note
		 *
		 * @returns {void}
		 */
		_doDeleteNote: function () {
			var url = this._baseURL;
			var self = this;

			if( this.scope.attr('data-noteID') == 'new' )
			{
				ips.utils.anim.go( 'fadeOutDown', self.scope )
					.done( function () {
						self.scope.remove();
					});
				return;
			}

			ips.getAjax()( url + '&delete=1&id=' + this.scope.attr('data-noteID') )
				.done( function () {
					ips.utils.anim.go( 'fadeOutDown', self.scope )
						.done( function () {
							self.scope.remove();
						});
				})
		},

		/**
		 * Saves the note
		 *
		 * @param 	{string}		noteContent 	If provided, the updated note text to be saved
		 * @param 	{boolean} 		savePosition	If true, will update the position info for the note
		 * @returns {promise}
		 */
		_saveNote: function (noteContent, savePosition) {
			var deferred = $.Deferred();
			var self = this;
			var url = this._baseURL;
			var position = '';
			var note = '';

			if( this.scope.attr('data-noteID') == 'new' ){
				url += '&add=1';
			} else {
				url += '&edit=1&id=' + this.scope.attr('data-noteID');
			}

			if( savePosition ){
				position = this._getPosition();
			}

			if( noteContent ){
				note = noteContent;
			}

			if( this.scope.find('[data-action="save"]').length && note ){
				this.scope.find('[data-action="save"]').prop('disabled', true).text( ips.getString('saving_note') );
			}

			// Send request
			ips.getAjax()( url, {
				data: {
					note: note,
					position: position
				}
			})
				.done( function (response) {
					if( self.scope.find('[data-action="save"]').length && note ){
						self.scope.find('[data-action="save"]').prop( 'disabled', false ).text( 'Save' );
					}

					// If this was a new note and the server returned an ID, update our attribute
					if( typeof response === "object" && response !== null && response.id ){
						self.scope.attr( 'data-noteID', response.id );
					}

					deferred.resolve();
				})
				.fail( function () {
					deferred.reject();
				});

			return deferred.promise();
		},

		/**
		 * Gets the position and dims of the note, in percentage values (relative to the image) 
		 *
		 * @returns {string}  In format <left>,<top>,<width>,<height>
		 */
		_getPosition: function () {
			var position = [];
			var parent = this.scope.closest('.cGalleryViewImage');
			var notePos = this.scope.position();

			// Left
			position[0] = ( notePos['left'] / parent.width() ) * 100;
			// Top
			position[1] = ( notePos['top'] / parent.height() ) * 100;
			// Width
			position[2] = ( this.scope.width() / parent.width() ) * 100;
			// Height
			position[3] = ( this.scope.height() / parent.height() ) * 100;

			return position.join(',');
		},

		/**
		 * Takes note out of editing state
		 *
		 * @returns {void}
		 */
		_stopEditing: function () {
			this._editing = false;
			this._draggingNotEditing = false;
			this.scope
				.removeClass('cGalleryNote_editing')
				.find('.cGalleryNote_note > div')
					.text( this._note )
				.end()
				.find('.cGalleryNote_delete')
					.remove();
		},

		/**
		 * Adds the note text to the note
		 *
		 * @returns {void}
		 */
		_buildNote: function () {
			this.scope.find('.cGalleryNote_note > div').text( this._note );
		},

		/**
		 * When the note is editable, loads jQuery UI and sets up resizable/draggable
		 *
		 * @returns {void}
		 */
		_setUpEditable: function () {
			if( !this._editable ){
				return;
			}

			var self = this;

			ips.loader.get( ['core/interface/jquery/jquery-ui.js'] ).then( function () {
				self.scope.resizable({
					containment: self.scope.closest('.cGalleryViewImage'),
					handles: 'se',
					stop: self._updatePosition.bind( self )
				});

				self.scope.draggable({
					containment: self.scope.closest('.cGalleryViewImage'),
					start: self._startDragging.bind( self ),
					stop: self._updatePosition.bind( self )
				});
			});
		},

		/**
		 * Event handler for start event on Draggable. If we aren't already editing, set a flag so that
		 * when we stop dragging, the click doens't incorrectly put note into editing mode
		 *
		 * @returns {void}
		 */
		_startDragging: function () {
			if( !this._editing ){
				this._draggingNotEditing = true;
			}
		},

		/**
		 * Saves the current position of the note. Called when resizable or draggable stop
		 *
		 * @returns {void}
		 */
		_updatePosition: function () {
			var self = this;

			// If the note block is now out of view, flip it to the other side
			/*
			var parent = this.scope.closest('.cGalleryViewImage');
			var notePos = this.scope.position();

			var posLeft = this.scope.find('.cGalleryNote_note').css('left');
			var posRight = this.scope.find('.cGalleryNote_note').css('right');

			// If the text box is on the right side, and is now past the boundary of the image, flip it to the left side
			if( parseInt( posLeft ) > 0 ) {
				if( notePos['left'] + parseInt( this.scope.width() ) + parseInt( this.scope.find('.cGalleryNote_note').width() ) > parent.width() ) {
					// But don't bother doing it if it will just be off the other side now
					if( notePos['left'] - parseInt( this.scope.find('.cGalleryNote_note').width() ) > 0 ) {
						this.scope.find('.cGalleryNote_note').css( 'left', posRight );
						this.scope.find('.cGalleryNote_note').css( 'right', posLeft );
					}
				}
			}
			else
			{
				if( notePos['left'] - parseInt( this.scope.find('.cGalleryNote_note').width() ) < 0 ) {
					// Don't flip if it will be off the other side now
					if( notePos['left'] + parseInt( this.scope.width() ) + parseInt( this.scope.find('.cGalleryNote_note').width() ) < parent.width() ) {
						this.scope.find('.cGalleryNote_note').css( 'left', posRight );
						this.scope.find('.cGalleryNote_note').css( 'right', posLeft );
					}
				}
			}
			*/

			// If this is a new note, we don't want to update the position remotely yet.
			// We'll only do that once the note text is saved for the first time.
			if( this.scope.attr('data-noteID') == 'new' ){
				return;
			}

			this._saveNote( false, true )
				.done( function () {

					// If we were editing before updating pos/dims, we don't want to run the stop method 
					// otherwise changes to the note text will be lost.
					if( !self._editing ){
						self._stopEditing();	
					}					
				});
		},

		/**
		 * Positions the note based on the attributes on the scope element
		 *
		 * @returns {void}
		 */
		_initialPosition: function () {
			var left = this.scope.attr('data-posLeft');
			var top = this.scope.attr('data-posTop');
			var width = this.scope.attr('data-dimWidth');
			var height = this.scope.attr('data-dimHeight');

			// Position the note
			this.scope.css({
				left: left + '%',
				top: top + '%',
				width: width + '%',
				height: height + '%'
			});
		}
	});
}(jQuery));