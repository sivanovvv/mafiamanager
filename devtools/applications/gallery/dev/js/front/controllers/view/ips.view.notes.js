/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.view.notes.js - Gallery notes controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('gallery.front.view.notes', {

		_inAddingState: false,

		initialize: function () {
			this.on( document, 'click', '[data-action="addNote"]', this.startAddNote );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			var notes;

			try {
				notes = JSON.parse( this.scope.attr('data-notesData') );
			} catch (err) {}

			if( notes && notes.length ){
				this._buildNotes( notes );
			}
		},

		/**
		 * Adds a new note to the image
		 *
		 * @param 	{event}		e 	Event object
		 * @returns {void}
		 */
		startAddNote: function (e) {
			e.preventDefault();

			this.scope.append( ips.templates.render( 'gallery.notes.wrapper', {
				id: 'new',
				left: 50,
				top: 50,
				width: ( 100 / this.scope.width() ) * 100,
				height: ( 100 / this.scope.height() ) * 100,
				editable: true
			}));

			$( document ).trigger( 'contentChange', [ this.scope ] );
		},

		/**
		 * Builds any existing notes from data attached to our scope element
		 *
		 * @param 	{array}		notes 	Array of note data to build from 
		 * @returns {void}
		 */
		_buildNotes: function (notes) {
			if( notes.length ){
				for( var i = 0; i < notes.length; i++ ){
					this.scope.append( ips.templates.render( 'gallery.notes.wrapper', {
						id: notes[ i ].ID,
						left: notes[ i ].LEFT,
						top: notes[ i ].TOP,
						width: notes[ i ].WIDTH,
						height: notes[ i ].HEIGHT,
						note: notes[ i ].NOTE,
						editable: (this.scope.attr('data-editable') !== undefined) ? true : false
					}));
				}

				$( document ).trigger( 'contentChange', [ this.scope ] );
			}
		}
	});
}(jQuery));