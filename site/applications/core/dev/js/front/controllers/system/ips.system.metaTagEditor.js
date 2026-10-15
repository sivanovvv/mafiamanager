/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.metaTagEditor.js - Live meta tag editor functionality
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.system.metaTagEditor', {

		_changed: false,

		initialize: function () {
			this.on( 'click', '[data-action="addMeta"]', this.addMetaBlock );
			this.on( 'click', '[data-action="deleteMeta"]', this.removeMetaBlock );
			this.on( 'click', '[data-action="deleteDefaultMeta"]', this.removeDefaultMeta );
			this.on( 'click', '[data-action="restoreMeta"]', this.restoreDefaultMeta );
			this.on( 'change', 'input, select', this.changed );
			this.on( 'submit', 'form', this.formSubmit );
			this.on( window, 'beforeunload', this.beforeUnload );

			this.on( 'change', '[data-role="metaTagChooser"]', this.toggleNameField );
			this.setup();
		},

		setup: function () {
			this.scope.css({
				zIndex: "10000"
			});
		},

		/**
		 * Show/hide the meta tag name field as appropriate
		 *
		 * @returns 	{void}
		 */
		toggleNameField: function (e) {
			if( $(e.currentTarget).val() == 'other' )
			{
				$(e.currentTarget).closest('ul').find('[data-role="metaTagName"]').show();
			}
			else
			{
				$(e.currentTarget).closest('ul').find('[data-role="metaTagName"]').hide();
			}
		},

		/**
		 * Restores a previously deleted default meta tag
		 *
		 * @param e
		 */
		restoreDefaultMeta: function(e) {
			var tag = $(e.currentTarget).attr('data-tag');

			// Duplicate the metaTemplate block and append it to the list
			var copy = this.scope.find('[data-role="metaTemplate"]').clone().attr( 'data-role', 'metaTagRow' ).hide();

			if( tag == 'robots' || tag == 'keywords' || tag == 'description' )
			{
				copy.find('select[name="meta_tag_name[]"]').val( tag );
			}
			else
			{
				copy.find('select[name="meta_tag_name[]"]').val( 'other' );
				copy.find('[name="meta_tag_name_other[]"]').val( tag ).parent().removeClass('ipsHide');
			}

			if( this.scope.find('input[name="defaultMetaTag[' + tag + ']"]') )
			{
				copy.find('[name="meta_tag_content[]"]').val( this.scope.find('input[name="defaultMetaTag[' + tag + ']"]').val() );
			}

			copy.find('[data-action="deleteMeta"]').attr( 'data-action', 'deleteDefaultMeta' );

			$('#elMetaTagEditor_defaultTags').append( copy );

			ips.utils.anim.go( 'fadeIn', copy );

			$(document).trigger( 'contentChange', [ this.scope ] );
			
			this._doMetaRemoval( e );
		},

		/**
		 * Removes a default meta tag element
		 *
		 * @param e
		 */
		removeDefaultMeta: function(e) {
			if( $( e.currentTarget ).siblings('select').first().val() == 'other' )
			{
				var name	= $( e.currentTarget ).closest('ul').find('input[name="meta_tag_name_other[]"]').val();
			}
			else
			{
				var name	= $( e.currentTarget ).siblings('select').first().val();
			}

			$( e.currentTarget )
				.closest( 'form' )
				.find( 'input' )
				.first()
				.after( "<input type='hidden' name='deleteDefaultMeta[]' value='" + name + "'>" );
			
			this.removeMetaBlock( e, false );

			var string = ips.getString('meta_tag_deleted', {
				tag: name
			});

			var copy = this.scope.find('[data-role="metaDefaultDeletedTemplate"]').clone().attr( 'data-role', 'metaTagRow' ).hide();

			copy.find('[data-role="metaDeleteMessage"]').html( string );
			copy.find('[data-action="restoreMeta"]').attr( 'data-tag', name );

			$('#elMetaTagEditor_defaultTags').find('.i-background_3').after( copy );

			ips.utils.anim.go( 'fadeIn', copy );

			$(document).trigger( 'contentChange', [ this.scope ] );

			this.changed();

			this._showHideNoTagsMessage();
		},

		/**
		 * Removes a meta tag element
		 *
		 * @param e
		 */
		removeMetaBlock: function( e, restoreDefault ) {
			// We can't use ECMAScript 2015 yet so no default function parameter values
			if( restoreDefault === undefined )
			{
				restoreDefault = true;
			}

			if( $( e.currentTarget ).siblings('select').first().val() == 'other' )
			{
				var tag	= $( e.currentTarget ).closest('ul').find('input[name="meta_tag_name_other[]"]').val();
			}
			else
			{
				var tag	= $( e.currentTarget ).siblings('select').first().val();
			}

			if( this.scope.find('input[name="defaultMetaTag[' + tag + ']"]').length && restoreDefault )
			{
				$(e.currentTarget).attr( 'data-tag', tag );

				this.restoreDefaultMeta(e);
			}
			else
			{
				this._doMetaRemoval( e );
			}
		},

		/**
		 * Actually remove the row
		 *
		 * @param e
		 */
		 _doMetaRemoval: function(e) {
			e.preventDefault();
			var elem = $( e.currentTarget ).closest('[data-role="metaTagRow"]');
			elem.remove();
			ips.utils.anim.go( 'fadeOut', elem );

			this.changed();

			this._showHideNoTagsMessage();
		 },

		/**
		 * Determine if the "no custom meta tags" message should be shown or hidden
		 *
		 * @returns	{void}
		 */
		_showHideNoTagsMessage: function() {
			if( $('#elMetaTagEditor_customTags').find('li[data-role="metaTagRow"]').length )
			{
				$('#elMetaTagEditor_customTags').find('li[data-role="noCustomMetaTagsMessage"]').hide();
			}
			else
			{
				$('#elMetaTagEditor_customTags').find('li[data-role="noCustomMetaTagsMessage"]').show();
			}
		},

		/**
		 * Event handler for submitting the meta tags form
		 *
		 * @returns 	{void}
		 */
		formSubmit: function (e) {
			var form = $( e.currentTarget );
			
			if ( form.attr('data-noAjax') ) {
				return;
			}

			e.preventDefault();

			var self = this;

			form.find('.ipsButton').prop( 'disabled', true ).addClass('ipsButton--disabled');

			// Send ajax request to save
			ips.getAjax()( form.attr('action'), {
				data: form.serialize(),
				type: 'post'
			})
				.done( function () {
					ips.ui.flashMsg.show( ips.getString('metaTagsSaved') );
					form.find('.ipsButton').prop( 'disabled', false ).removeClass('ipsButton--disabled');
					self._changed = false;

					if( form.find('[name="meta_tag_title"]').val() )
					{
						document.title = form.find('[name="meta_tag_title"]').val();
					}
					else
					{
						document.title = self.scope.attr('data-defaultPageTitle');
					}
				})
				.fail( function () {
					form.attr('data-noAjax', 'true');
					form.trigger('submit');
				});
		},

		/**
		 * Warns the user if they've got unsaved changes
		 *
		 * @returns 	{string|null}
		 */
		beforeUnload: function () {
			if( this._changed ){
				return ips.getString('metaTagsUnsaved');
			}
		},

		/**
		 * Clones a new set of meta tag elements
		 *
		 * @returns 	{void}
		 */
		addMetaBlock: function (e) {

			// Duplicate the metaTemplate block and append it to the list
			var copy = this.scope.find('[data-role="metaTemplate"]').clone().attr( 'data-role', 'metaTagRow' ).hide();

			$('#elMetaTagEditor_customTags').append( copy );

			ips.utils.anim.go( 'fadeIn', copy );

			$(document).trigger( 'contentChange', [ copy ] );

			this.changed();

			this._showHideNoTagsMessage();
		},

		/**
		 * Called when an input changes, so we can later warn the use rif they leave the page
		 *
		 * @returns 	{void}
		 */
		changed: function (e) {
			this._changed = true;
		}
	});
}(jQuery));