/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.view.manageCategories.js - Blog manage categories controller
 *
 * Author: Matt Mecham
 */
;( function($){
	"use strict";

	ips.controller.register('blog.front.view.manageCategories', {
		_sortableElem: null,

		initialize: function () {
			this.on( 'click', '[data-action="delete"]', this.delete );
			this.on( 'click', '[data-action="edit"]', this.edit );
			this.on( 'click', '[data-role="saveChanges"]', this.saveChanges );
			this.on( 'click', '[data-role="cancelChanges"]', this.cancelEditing );


			/* Cancel edits */
			var _this = this;
			$( document )
				.on( 'keydown', function (e) {
					if( e.keyCode == ips.ui.key.ESCAPE ){
						_this.cancelEditing();
					}
				});
			
			/* Save button changes */
			$('.ipsTabs [role="tablist"] a').on( 'click', this.tabChange );			
			$('.ipsForm .ipsButtons').append( ips.templates.render('blog.view.addButton') );
			$('[data-action="addNew"]').on( 'click', this.newRow.bind(this) );
			
			this.renderList();
			this.setup();
		},

		setup: function () {
			var self = this;
			ips.loader.get( ['core/interface/jquery/jquery-ui.js'] ).then( function () {
				self.scope.find('[data-role="tableRows"]')
					.sortable({
						placeholder: 'sortable-placeholder',
						handle: '[data-role="sortHandle"]',
						items: '> li',
						forcePlaceholderSize: true,
						update: function () {
							var data = self.scope.find('[data-role="tableRows"]').sortable( 'toArray', { attribute: 'data-category-id' } )
							var url = '?app=blog&module=blogs&controller=view&do=categoriesReorder&id=' + self.scope.attr('data-blog-id');

							ips.getAjax()( url, {
								data: {
									ajax_order: data
								},
								method: 'POST'
							})
								.done( function() {
									ips.ui.flashMsg.show( ips.getString('entry_cat_order_saved') );
								})
								.fail( function () {
									window.location = url + "&ajax_order=" + data + "&csrfKey=" + ips.getSetting('csrfKey');
								});
						}
					});

				Debug.log( "Sortable categories initialized" );
			});

			if( !$('#form_tab_blog_entry_categories').length ) {
				$('[type="submit"]').addClass('ipsHide');
				$('[data-action="addNew"]').removeClass('ipsHide');
			}
		},
		
		/**
		 * Cancel all editing
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		cancelEditing: function (e) {
			e.preventDefault();

			var _this = this;
			this.scope.find('input[type="text"][name^="blog_name_"]').each( function( i ) {
				if ( ! $(this).hasClass('ipsHide') ) {
					var id = $(this).attr('data-role').replace( /^input_/, '' );

					if( id == 'new' )
					{
						_this.renderList();
					}
					else
					{
						_this._cancelEditingRow( id );
					}
				}
			} );
		},
		
		/**
		 * Cancel the text box editing
		 *
		 * @param	{int}	id	Category ID
		 * @returns {void}
		 */
		_cancelEditingRow: function( id ) {
			this.scope.find('[data-role="title_' + id + '"]').removeClass('ipsHide');
			this.scope.find('[data-role="input_' + id + '"]').addClass('ipsHide');
			this.scope.find('[data-role="saveChanges"][data-category-id="' + id + '"]').addClass('ipsHide');
			this.scope.find('[data-role="cancelChanges"][data-category-id="' + id + '"]').addClass('ipsHide');
		},
		
		/**
		 * Event handler for clicking the edit button
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		newRow: function (e) {
			var listContainer = this.scope.find('[data-role="tableRows"]');
			
			listContainer.append( ips.templates.render( 'blog.view.categoryRow', {
				cat: 'new',
				name: ''
			} ) );
			
			$('[data-action="addNew"]').prop('disabled', true );
			$('[data-action="delete"][data-category-id="new"],[data-action="edit"][data-category-id="new"],[data-role="sortHandle"]').hide();
			$('body').find('[data-action="edit"][data-category-id="new"]').trigger('click');

			this.scope.find('[data-role="tableRows"]').sortable( "disable" );
		},
		
		/**
		 * Re-draws the list of categories
		 *
		 */
		renderList: function() {
			var _this = this;

			ips.getAjax()( '?app=blog&module=blogs&controller=view&do=categoriesJson&id=' + this.scope.attr('data-blog-id') )
				.done( function (response) {
					if( response.categories.length ){
						var listContainer = _this.scope.find('[data-role="tableRows"]');
						listContainer.html('');
						var json = response.categories;
						
						for( var i = 0; i < json.length; i++ ){
							listContainer.append( ips.templates.render( 'blog.view.categoryRow', {
								cat: json[i].id,
								name: json[i].name
							} ) );
						}
					}
				} );
			
			$('[data-action="addNew"]').prop('disabled', false );
		},
		
		/**
		 * Event handler for clicking the edit button
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		tabChange: function (e) {
			if ($('#form_tab_blog_entry_categories').attr('aria-selected') == 'false') { // This looks back to front but the tab status is changed after this has fired
				$('button[type="submit"]').addClass('ipsHide');
				$('button[data-action="addNew"]').removeClass('ipsHide');
			} else {
				$('button[type="submit"]').removeClass('ipsHide');
				$('button[data-action="addNew"]').addClass('ipsHide');
			}
		},

		/**
		 * Event handler for clicking the edit button
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		edit: function (e) {
			e.preventDefault();
			var a = $( e.currentTarget );
			var id = a.attr('data-category-id');
			var title = this.scope.find('[data-role="title_' + id + '"]');
			var input = this.scope.find('[data-role="input_' + id + '"]');
			var saveButton = this.scope.find('[data-role="saveChanges"][data-category-id="' + id + '"]');
			var cancelLink = this.scope.find('[data-role="cancelChanges"][data-category-id="' + id + '"]');

			/* Are we already editing? */
			if ( ! input.hasClass('ipsHide') ) {
				this._cancelEditingRow( id );
				return;	
			}
			
			title.addClass('ipsHide');
			input.val( title.html() );
			input.removeClass('ipsHide');
			saveButton.removeClass('ipsHide');
			cancelLink.removeClass('ipsHide');
		},
		
		/**
		 * Event handler for clicking a save changes button
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		saveChanges: function (e) {
			e.preventDefault();
			var a = $( e.currentTarget );
			var id = a.attr('data-category-id');
			var title = this.scope.find('[data-role="title_' + id + '"]');
			var input = this.scope.find('[data-role="input_' + id + '"]');
			var _this = this;
		
			var langBit = a.html();
			a.html('&nbsp;&nbsp;').addClass('ipsField_loading');
			
			ips.getAjax()( '?app=blog&module=blogs&controller=view&do=editCategoryName&id=' + this.scope.attr('data-blog-id') + '&cat=' + id, {
					data: {
						name: input.val()
					},
					type: 'post'
				} )
				.done( function (response) {
					_this.renderList();
					_this.scope.find('[data-role="tableRows"]').sortable( "enable" );
				} )
				.fail( function (response) {
					a.html( langBit ).removeClass('ipsField_loading');
					ips.ui.flashMsg.show( response.responseJSON );
				} );
		},
		
		/**
		 * Event handler for clicking a delete button
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		delete: function (e) {
			e.preventDefault();
			var a = $( e.currentTarget );
			var id = a.attr('data-category-id');
			var _this = this;
			
			ips.ui.alert.show({
				type: 'confirm',
				message: ips.getString('blog_category_confirm_delete'),
				subText: ips.getString('blog_category_confirm_delete_desc'),
				icon: 'info',
				callbacks: {
					ok: function () {
						if ( a.attr('data-category-id') == 'new' ) {
							_this.renderList();
						} else {
							ips.getAjax()( '?app=blog&module=blogs&controller=view&do=deleteCategory&id=' + _this.scope.attr('data-blog-id') + '&cat=' + id )
							.done( function (response) {
								_this.renderList();
							} )
							.fail( function (response) {
								ips.ui.flashMsg.show( response.responseJSON );
							} );
						}
					}
				}
			});
			
			return false;
		}
	});
}(jQuery));