/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.forum.flow.js - Flow filter controller
 *
 * Author: Matt Mecham, certainly not Rikki Tissier (yet)
 */
;( function($){
	"use strict";

	ips.controller.register('forums.front.forum.flow', {
	
		_ids: [],
		_button: null,
		_rootForum: null,
		urlParam: 'forumId',

		initialize: function () {
			this.on( 'click', '[data-node-id]', this.toggleFilters );
			this.on( 'click', '[data-action="dialogClose"]', this.closeFilterDialog );
			
			this.setup();
		},
		
		/**
		 * Um, set up...
		 */
		setup: function () {
			var self = this;

			/* Are we in a forum? */
			if ( this.scope.attr('data-rootForum') !== undefined ) {
				this._rootForum = this.scope.attr('data-rootForum');
			}

			if ( this._rootForum ) {
				this.urlParam = 'forumId' + this._rootForum;
			}

			/* Populate forum IDs */
			var _ids = ips.utils.url.getParam( this.urlParam );

			if ( _ids !== undefined ) {
				/* Check URL */
				this._ids = decodeURIComponent( _ids ).split(',');
			} else if ( this._rootForum ) {
				var found = false;
				if( ips.utils.cookie.get('forums_flowIdsRoots') !== undefined ) {
					/* Check local storage */
					try {
						var _jsonIds = JSON.parse(ips.utils.cookie.get('forums_flowIdsRoots'))[this._rootForum];
						found = true;
						if (_jsonIds !== undefined) {
							this._ids = _jsonIds;
						}
					} catch( exc ) { }
				}
				if ( ! found ) {
					this.scope.find('[data-node-id]').each(function (i, node) {
						var id = $(node).attr('data-node-id');
						self._ids.push(id);
					});
				}
			} else if( ips.utils.cookie.get('forums_flowIds') !== undefined ) {
				/* Check local storage */
				this._ids = ips.utils.cookie.get('forums_flowIds').split(',');
			}

			this._applyStoredFilters();

			/* Add forumIds to URL */
			if ( _ids === undefined && this._ids.length && this._rootForum === null ) {
				$( document ).trigger( 'updateTableURL', { [this.urlParam] : [...new Set( Object.values( this._ids ) )].join(',') } );
			}
			
			this._button = $('body').find("[data-ipsDialog-content='#elFluidFormFilters']");
			this._buttonText = $('body').find('[data-role="fluidForumMobileDesc"]');
			this._updateButtonText();
		},
		
		/**
		 * Applies selected styling for stored forum IDs (URL/cookie) without mutating _ids
		 *
		 * @returns {void}
		 */
		_applyStoredFilters: function () {
			if ( ! this._ids || ! this._ids.length ) {
				return;
			}

			var ids = Array.isArray( this._ids ) ? this._ids : Object.values( this._ids );
			ids = [...new Set( ids.map( String ).filter( Boolean ) )];
			this._ids = ids;

			var self = this;
			ids.forEach( function ( id ) {
				self.scope.find('[data-node-id="' + id + '"]').addClass('cForumMiniList__selected');
			});
		},

		/**
		 * Closes the mobile filter dialog
		 *
		 * @param	{event}	e	Event object
		 * @returns {void}
		 */
		closeFilterDialog: function (e) {
			e.preventDefault();
			var dialog = this.scope.closest('dialog.ipsDialog, .ipsDialog');

			if ( dialog.length ) {
				dialog.trigger('closeDialog');
			}
		},

		/**
		 * Event handler for toggling a filter
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		toggleFilters: function (e) {
			e.preventDefault();
			var link = $( e.currentTarget );
			var id = link.attr('data-node-id');
			var parentId = link.attr('data-parent-id');
			var hasChildren = link.attr('data-has-children');
			
			if ( ( this._ids ).indexOf( id ) == -1 ) {
				/* Does not exist, so add it */
				this.childSelect( id, false );

			} else {
				/* Exists, so remove it */
				this.childUnselect( id );
			}

			this._updateButtonText();

			$( document ).trigger( 'updateTableURL', { [this.urlParam]: [...new Set( Object.values( this._ids ) )].join(',') } );
		},
		
		/**
		 * Is item selected
		 *
		 */
		isSelected: function(id) {
			return this.scope.find('[data-node-id="' + id + '"]').hasClass('cForumMiniList__selected') ? true : false;
		},
		
		/**
		 * Select a child
		 *
		 */
		childSelect: function(id, skipChildren) {
			Debug.log("Select child: " + id );
			if ( ( this._ids ).indexOf( id ) == -1 ) {
				this._ids.push( id );
			}
			var node = this.scope.find('[data-node-id="' + id + '"]');
			node.addClass('cForumMiniList__selected');
			var parentId = node.attr('data-parent-id');

			/* Mark any children, but we do not need to keep individual row markings */
			if (skipChildren === false && (node.attr('data-has-children') || id == parentId)) {
				var self = this;
				for (const [k, v] of this.scope.find('[data-parent-id="' + id + '"]').toArray().entries()) {
					var _cId = $(v).attr('data-node-id');
					if (_cId != id) {
						self.childSelect(_cId, false);
					}
				};
			}

			this.updateCookie();
		},
		
		/**
		 * Unselect a child
		 *
		 */
		childUnselect: function(id) {
			Debug.log("UNselect child: " + id );
			/* Remove marking */
			this.scope.find('[data-node-id="' + id + '"]').removeClass('cForumMiniList__selected');
			
			/* Remove from local storage and id stack */
			this._ids = this._ids.filter(item => item !== id);
			this.updateCookie();
			
			/* Check for children of this and unselect those too */
			if ( this._rootForum === null ) {
				var self = this;
				for (const [k, v] of (this.scope.find('[data-parent-id="' + id + '"]').toArray().entries())) {
					var _cId = $(v).attr('data-node-id');
					if (_cId != id) {
						self.childUnselect(_cId);
					}
				};

				/* And we always need to unselect the category */
				this.parentUnselect( this.scope.find('[data-node-id="' + id + '"]').closest('[data-category]').find('[data-node-id]').first().attr('data-node-id') );
			}
		},

		/**
		 * Select a parent
		 *
		 */
		parentSelect: function(parentId) {
			Debug.log("Select parent: " + parentId );
			/* Mark category and children as selected */
			this.scope.find('[data-node-id="' + parentId + '"]').addClass('cForumMiniList__selected');
			
			/* Remove children from the arrays as PHP handles this */
			if ( this._rootForum === null ) {
				var self = this;
				for (const [k, v] of (this.scope.find('[data-parent-id="' + parentId + '"]').toArray().entries())) {
					var _cId = $(v).attr('data-node-id');

					if (_cId != parentId) {
						self.childUnselect(_cId);
					}
				};
			} else {
				this.updateCookie();
			}
		},
		
		/**
		 * Unselect a parent
		 *
		 */
		parentUnselect: function(parentId) {
			Debug.log("UNselect parent: " + parentId );
			/* Unselect parent as marked */
			var node = this.scope.find('[data-node-id="' + parentId + '"]');
			node.removeClass('cForumMiniList__selected');
			
			this._ids = this._ids.filter(id => id !== parentId);
			this.updateCookie();
			
			/* Off up the tree we go */
			Debug.log( "Looking for parent ID " + node.attr('data-parent-id') );
			if ( this._rootForum === null ) {
				var self = this;
				for (const [k, v] of (this.scope.find('[data-node-id="' + node.attr('data-parent-id') + '"]').toArray().entries())) {
					var _cId = $(v).attr('data-node-id');
					if (_cId != parentId) {
						Debug.log("Found " + _cId);
						self.parentUnselect(_cId);
					}
				};
			}
		},
		
		/**
		 * Update the cookie
		 */
		updateCookie: function(id) {
			var cookie = [...new Set( Object.values( this._ids ) )].join(',');
			Debug.log("Updating cookie: " + cookie );

			if ( ! this._rootForum ) {
				ips.utils.cookie.set('forums_flowIds', cookie, true);
			} else {
				var _json = {};
				if ( ips.utils.cookie.get( 'forums_flowIdsRoots' ) !== undefined ) {
					_json = JSON.parse( ips.utils.cookie.get( 'forums_flowIdsRoots' ) );
				}
				_json[ this._rootForum ] = [...new Set( Object.values( this._ids ) )];
				ips.utils.cookie.set('forums_flowIdsRoots', JSON.stringify( _json ), true);
				Debug.log("Updating cookie: " + JSON.stringify( _json ) );
			}
		},

		/**
		 * Updates the mobile button text based on selected forums
		 *
		 * @param		{event}		e			The submit event
		 * @param		{element} 	elem 		The element this widget is being created on
		 * @returns		{void}
		 */
		_updateButtonText: function () {
			var blobs = this.scope.find('.cForumMiniList__blob');
			var selectedBlobRows = blobs.filter( function () {
				if( $( this ).closest('.cForumMiniList__selected').length ){
					return true;
				}
				return false;
			});
			var text = '', buttonClass = '';

			// If the counts are the same, we know we've selected all of them
			if( blobs.length == selectedBlobRows.length || selectedBlobRows.length === 0 ){
				text = ips.getString('topicsFromAllForums');
				buttonClass = 'ipsButton--inherit';
			} else {
				text = ips.pluralize( ips.getString( 'topicsFromXForums' ), selectedBlobRows.length );
				buttonClass = 'ipsButton--secondary';
			}

			this._buttonText.text( text );
			this._button.removeClass("ipsButton--inherit ipsButton--secondary").addClass(buttonClass);
		}
	});
}(jQuery));