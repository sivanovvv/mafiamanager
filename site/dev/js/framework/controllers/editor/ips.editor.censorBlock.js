/**
 * IPS Social Suite 4
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.editor.censorBlock.js - Controller for the censor block feature
 *
 * Author: Matt Mecham, improved by Matt Finger
 */
;(function($, _){
	"use strict";

	ips.controller.register('core.global.editor.censorBlock', {

		initialize() {
			this._words = JSON.parse( this.scope.attr('data-censorblockwords') );
			this._editorId = $(this.scope).data('editorid');
			this.setup();
		},

		_editorId: null,
		_editor: null,
		
		/**
		 * Perform some set up after the editor has initialized
		 */
		setup() {
			Debug.log('setup the censorblock')
			this.scope.parent().find('[data-ipseditorv5]').on('editorWidgetInitialized', () => {
				this._editor = this.scope.parent().find('[data-ipseditorv5]').data('_editor').getInstance();
				this._form = this.scope.closest('form');

				/* Add submit listener */
				this.on($(this._form).get(0), 'submit', this.checkCensorBlock);
			})
		},
		
		/**
		 * On form submit, check the contents for any words we want to block
		 *
		 * @param {Event} e
		 *
		 * @return {boolean}
		 */
		checkCensorBlock(e) {
			let value = this._editor.getHTML();
			const tempElement = document.createElement('div');
			tempElement.innerHTML = value;
			const valueText = tempElement.innerText.toLowerCase();
			let found = false;

			let display = this.scope.find('[data-role="editorCensorBlockMessageInternal"]').get(0);
			display.innerHTML = value

			if ( this._words.length ) {
				/* Knock out quote/code blocks so we effectively ignore them then force into text to remove everything else */
				display.querySelectorAll('blockquote, pre').forEach(child => child.remove())
				let index = 0;
				const words = [];
				for (const {word, type} of this._words) {
					if (valueText.includes(word.toLowerCase())) {
						words.push(type==='exact' ? word : `[^\\b]*(?:${word})[^\\b]*`);
					}
				}

				const reggie = new RegExp(`(?:\\b|\\s|^)(?:${ words.join('|') })(?:\\b|\\s|$)`, 'ig')

				Debug.log(reggie);
				if (words.length && $(value).text().match(reggie)) {
					$(display).contents()
						.filter(function() {return this.nodeType === 3})
						.each(function(){
							const mark = '<mark class="ipsMatchWarning i-font-weight_bold i-font-size_2 ipsMatch${index}">'
							$(this).replaceWith(
								ips.utils.escapeHTML(
									$(this).text().replace(reggie, `${mark}$1</mark>`)
								)
									.replace(new RegExp(ips.utils.escapeHTML(mark), 'ig'), mark)
									.replace(/&lt;\/mark&gt;/ig, "</mark>")
									.trim()
							);
						});
					found = true;
				}
			}

			if (found) {
				e.preventDefault();
				e.stopPropagation();
				this._form.find('input[type="submit"],button[type="submit"]').prop( 'disabled', false );
				display.innerHTML = display.innerHTML.replace(/((\s+?)?(\r\n|\r|\n)(\s+?)?)+/g, '<br><br>')
				this.scope.show();
				this._editor?.commands?.focus();
			} else {
				this.scope.find('[data-role="editorCensorBlockMessage"]').html('<div data-role="editorCensorBlockMessageInternal"></div>');
				this.scope.hide();
			}

			return !found
		},
	});
}(jQuery));