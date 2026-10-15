/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.editor.customtags.js - Controller for inserting custom tags into a text/editor element
 *
 * Author: Rikki Tissier & Brandon Farber
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.editor.customtags', {

		editorWrap: null,
		editorSidebar: null,
		editorSidebarHeader: null,
		editorSidebarList: null,

		initialize: function () {
			this.on( 'click', '[data-tagKey]', this.insertTag );
			//this.on( 'click', '[data-action="tagsToggle"]', this.toggleSidebar );
			this.setup();
		},

		/**
		 * Setup method. Sets an interval that checks the height of the editor and sets the sidebar
		 * to the same height
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		setup: function () {
			this.editorWrap = this.scope.find('[data-role="editor"]');
			this.editorSidebar = this.scope.find('.ipsComposeArea_sidebar');
			this.editorSidebarList = this.editorSidebar.find('[data-role="tagsList"]');
			this.editorSidebarHeader = this.editorSidebar.find('[data-role="tagsHeader"]');
			
			this.reloadTags();

			// setInterval( function () {
			// 	var editorHeight = self.editorWrap.outerHeight();
			// 	var headerHeight = self.editorSidebarHeader.outerHeight();
			//
			// 	self.editorSidebarList.css({
			// 		height: ( editorHeight - headerHeight ) + 'px'
			// 	});
			// }, 300);
		},

		/**
		 * Event handler for toggling the sidebar on and off
		 * Also set a cookie so that the choice is remembered
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		/*
		toggleSidebar: function (e) {
			e.preventDefault();

			if( this.editorSidebar.hasClass('ipsComposeArea_sidebarOpen') ) {
				this.editorSidebar
					.removeClass('ipsComposeArea_sidebarOpen')
					.addClass('ipsComposeArea_sidebarClosed');

				ips.utils.cookie.unset('tagSidebar');
			} else {
				this.editorSidebar
					.removeClass('ipsComposeArea_sidebarClosed')
					.addClass('ipsComposeArea_sidebarOpen');

				ips.utils.cookie.set('tagSidebar', true, true);
			}
		},
		*/

		/**
		 * Event handler for inserting custom tags defined on the page
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		insertTag: function (e) {
			const content = $( e.currentTarget ).attr('data-tagKey');

			if (this.scope.attr('data-tagFieldType') === 'editor') {
				$('textarea[name="' + this.scope.attr('data-tagFieldID') + '"]')
					.closest('[data-ipsEditorv5]')
					.data('_editor')
					.insertHtml( content );

			} else if (this.scope.attr('data-tagFieldType') === 'codemirror') {
				this.scope.trigger('codeMirrorInsert', {
					elemID: $( e.currentTarget ).closest('[data-codemirrorid]').attr('data-codemirrorid'),
					tag: content
				});
			} else if (this.scope.attr('data-tagfieldtype') === 'codebox') {
				this.scope.find('[data-ipscodebox]').get(0).dispatchEvent(new CustomEvent('insertCode', {detail: {content}}))
			} else {
				/** @type {HTMLTextAreaElement} */
				const textField = $('#' + this.scope.attr('data-tagFieldID') ).get(0);
				const focused = document.activeElement === textField
				if (!focused) {
					textField.setSelectionRange(textField.value.length, textField.value.length)
				}
				textField.setRangeText(content)
				textField.focus()
			}
		},
		
		/**
		 * Reload tags list from source
		 *
		 * @return	{void}
		 */
		reloadTags: function() {
			if ( this.scope.attr('data-tagSource' ) )
			{
				ips.getAjax()( this.scope.attr('data-tagSource') )
					.done((response, status, jqXHR) => {
						this.scope.find('ul[data-role="tagsList"]').html( response )
						$(document).trigger('contentChange', [this.scope.find('ul[data-role="tagsList"]')])

						this.elem.querySelectorAll('[data-customtags-dialog]').forEach(el => {
							el.addEventListener('dialogSubmission', (e) => {
								this.reloadTags()
							})
						});
					});
			}
		}
	});
}(jQuery));