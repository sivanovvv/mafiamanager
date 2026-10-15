/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.forms.js - Form handling in the AdminCP
 * Sets up basic form elements and behaviors used throughout the acp. More complex form controls (e.g.
 * uploading or autocomplete) are handled in their own widgets.
 *
 * Author: Matt Finger. Originally Mark Wade & Rikki Tissier, but they didn't do a great job :)
 */
;( function($, _){
	"use strict";

	/**
	 * @typedef {CustomEvent<ToggleCollection>} ToggleEvent
	 */

	/**
	 * @typedef {{togglesOn: Set<Element>, togglesOff: Set<Element>}} ToggleCollection
	 */

	ips.createModule('ips.ui.form', function(){

		const _cmInstances = {};
		const _support = {};

		const formTypes = {
			// Toggles to allow 'unlimited' values
			'unlimited': '[data-control~="unlimited"]',
			// Polyfills dates
			'date': 'input[type="date"], [data-control~="date"]',
			// Makes range inputs a bit nicer
			'range': 'input[type="range"], [data-control~="range"]',
			// Polyfills colors
			'color': 'input[type="color"], [data-control~="color"]',
			// Width/height changers
			'dimensions': '[data-control~="dimensions"]',
			// Width/height unlimited toggles
			'dimensionsUnlimited': '[data-control~="dimensionsUnlimited"]',
			// Disables fields if JS is enabled
			'jsDisable': 'input[data-control~="jsdisable"]',
			// Codemirror
			'codemirror': '[data-control~="codemirror"]',
			// CheckboxSets with Unimited toggles
			'granularCheckboxset': '[data-control~="granularCheckboxset"]',
		};

		const _controlMethods = {
			/**
			 * Handles codemirror fields
			 *
			 * @param	{element}	elem		The textarea element
			 * @returns {void}
			 */
			codemirror(elem) {
				ips.loader.getStatic( ['applications/core/interface/static/codemirror/diff_match_patch.js','applications/core/interface/static/codemirror/codemirror.js'] ).then( function () {
					const elemId = $(elem).attr('id');

					// If there's already an instance here, we need to remove it and reinitialize
					// This happens when, for example, a form is validated in a modal, meaning the same element
					// ID is used again
					if( _cmInstances[ elemId ] !== undefined ) {
						// 10/23/15 we were still losing the contents of codemirror when switching tabs. To fix this, we need to save
						// the contents to the textarea *before* removing the CM instance.
						_cmInstances[ elemId ].save();
						//-----

						$( _cmInstances[ elemId ].getWrapperElement() ).remove();
						delete _cmInstances[ elemId ];
					}

					_cmInstances[ elemId ]	= CodeMirror.fromTextArea( document.getElementById(elemId), {
						mode: $(elem).attr('data-mode'),
						lineWrapping: true,
						lineNumbers: false,
						leaveSubmitMethodAlone: true
					} );

					if ( $(elem).attr('data-height') ){
						_cmInstances[ elemId ].setSize( null, $(elem).attr('data-height') );
						$('div[data-codemirrorid=' + elemId + '] ul[data-role=tagsList]').css('max-height', $(elem).attr('data-height') );
					}

					$( '#' + elemId ).data('CodeMirrorInstance', _cmInstances[ elemId ] );

					// Support custom tags
					$('[data-codemirrorcustomtag]').on( 'click', function( e ){
						_cmInstances[ elemId ].replaceRange( $( e.currentTarget ).attr('data-codemirrorcustomtag'), _cmInstances[ elemId ].getCursor( "end" ) );
					});
				});
			},

			/**
			 * Makes range inputs a little nicer to use
			 *
			 * @param	{element}	elem		The range element
			 * @returns {void}
			 */
			range(elem) {
				if( _support['range'] === undefined ){
					const i = document.createElement("input");
					i.setAttribute("type", "range");

					_support['range'] = !( i.type === 'text' );
				}

				if( !_support['range'] ){
					elem.siblings('[data-role="rangeBoundary"]').hide();
				} else {
					const valueElem = $('#' + elem.attr('name') + '_rangeValue');
					valueElem.text( elem.val() );

					elem.on( 'change', function () {
						valueElem.text( elem.val() );
					});
				}
			},

			/**
			 * Enables functionality for 'unlimited' toggles
			 *
			 * @param	{HTMLInputElement}	elem		The checkbox element
			 * @returns {void}
			 */
			unlimited(elem) {
				elem = $(elem).get(0);
				elem.addEventListener('change', () =>_unlimitedCheck());

				if (!elem.dataset.initialized) {
					elem.dataset.initializd = '1';
					_unlimitedCheck();
				}

				/**
				 * 'Unlimited' checkbox implementation
				 * Disables inputs if the element is checked
				 *
				 * @returns {void}
				 */
				function _unlimitedCheck() {
					const checkbox = elem;
					if (checkbox.disabled) {
						return;
					}

					checkbox
						.closest('.ipsFieldRow__content,[data-role="unlimitedCatch"]')
						?.querySelectorAll('input:not([type="checkbox"],[type="hidden"]),select,textarea')
						.forEach(input => {
							if (input.dataset.control !== 'color') {
								if (checkbox.checked) {
									if (input.value) {
										input.dataset.previousvalue = input.value;
									}

									input.value = "";
									input.setAttribute('disabled', '');
								} else {
									input.removeAttribute('disabled');
									if (input.dataset.previousvalue) {
										input.value = input.dataset.previousvalue;
									}
								}
							}

							input
								.querySelectorAll('[data-role="rangeBoundary"]')
								.forEach(
									boundary => boundary.style.opacity = checkbox.checked ? '0.5' : '1'
								);
						});
				}
			},

			/**
			 * Handles color fields by adding a jquery plugin if the browser doesn't natively support type='color'
			 *
			 * @param	{element}	elem		The color control
			 * @returns {void}
			 */
			color(elem) {
				if( elem.attr('data-ipsFormData')) {
					return;
				}

				/** @type {HTMLInputElement<{tagName: "COLOR"}>} */
				const input = elem.get(0);
				input.setAttribute("data-ipsFormData", "1");
				const initialColor = input.style.getPropertyValue('--i-co--inverse') || "var(--i-color_root)"
				const unlimited = input.closest('.ipsFieldRow__content')?.querySelector(`input[data-control=unlimited]`);
				const wrap = input.closest('.ipsInput__color-wrap-inner');
				const iroWrap = wrap.querySelector('[data-role="iro-container"]');
				const label = input.closest('.ipsInput__color-wrap')?.querySelector('.ipsInput__color-label');
				let controller = 'label'; // this lets us keep track of what input the user last used
				let iro;
				ips.utils.color.loadIro().then(() => {
					function buildIro() {
						iroWrap.innerHTML = '';
						iro = new ips.utils.iro.ColorPicker(iroWrap, {
							color: input.value,
							layout: [
								{
									component: ips.utils.iro.ui.Box,
									options: {}
								},
								{
									component: ips.utils.iro.ui.Slider,
									options: {
										sliderType: 'hue'
									}
								}
							]
						});

						iro.on('input:change', (e) => {
							controller = 'picker';
							input.value = e.hexString;
							updateColor({target: input});
						});
					}

					buildIro();

					wrap?.addEventListener('pointerdown', e => {
						if (e.target.closest('[data-role="iro-container"]')) {
							return;
						}

						e.stopPropagation();
						if (unlimited) {
							const sel = document.getSelection();
							const activeElement = document.activeElement;
							const wasFocused = controller === 'label' && ((activeElement === label) || (activeElement.parentElement?.closest?.('.ipsInput__color-label') === label));
							const ranges = [];
							for (let i = 0; i < sel.rangeCount; i++) {
								ranges.push(sel.getRangeAt(i));
							}
							let currentText = label.innerText;
							unlimited.checked = false;
							updateColor(e);
							if (label.innerText !== currentText) {
								e.preventDefault();
								let sel = document.getSelection();
								if (!wasFocused || (e instanceof PointerEvent && e.detail >= 2)) {
									sel.removeAllRanges();
									const range = document.createRange();
									range.selectNodeContents(label);
									if (!(e instanceof PointerEvent && e.detail > 2) && label.innerText.startsWith('#')) {
										const st = document.createTextNode('#');
										const textNode = document.createTextNode(label.innerText.slice(1));

										label.innerHTML = "";
										label.appendChild(st);
										label.appendChild(textNode);
										range.selectNodeContents(textNode);
									} else {
										const text = document.createTextNode(label.innerText);
										label.innerHTML = "";
										label.append(text);
										range.selectNodeContents(text);
									}
									sel.addRange(range);
								} else if (wasFocused) {
									sel.removeAllRanges();
									ranges.forEach(range => {
										sel.addRange(range);
									})
								}
							}
						}

						iroWrap.classList.add('ipsInput__color-iro-container--open');
					});

					label.addEventListener('input', e => {
						controller = 'label';
						const text = label.innerText;
						try {
							input.value = (new ips.utils.iro.Color(text)).hexString;
							buildIro();
							updateColor({target: input}, true);
						} catch (e) {
							// This is an expected error; If the user enters an invalid color, such as "rgb(ba ba black sheep)", IRO will throw an error because it cannot determine the color. Simply exiting the flow is fine in this case
							// Debug.error(e);
						}
					});

					/**
					 * Handle data transfer from dropping or pasting content
					 *
					 * @param {DragEvent|ClipboardEvent} e
					 */
					function handleDataTransfer(e) {
						const dt = e instanceof ClipboardEvent ? e.clipboardData : e.dataTransfer;
						if (dt instanceof DataTransfer) {
							e.preventDefault();
							e.stopPropagation();
							const allTypes = [...dt.types];
							let textFound;
							if (allTypes.includes('text/plain')) {
								Debug.log("Using plain text from paste or drop event");
								textFound = dt.getData('text/plain');
							} else if (allTypes.includes('text/html')) {
								Debug.log("Using html from paste or drop event");
								const cleanText = (new DOMParser()).parseFromString(dt.getData('text/html'), 'text/html').body.innerText;
								if (cleanText) {
									textFound = cleanText;
								}
							}

							// now actually insert. This looks weird because we have to emulate native paste events with selection fixing
							if (textFound) {
								textFound = textFound.replaceAll(/\s+/g, ' ').trim().slice(0, 30).trim(); // make sure we don't have a 500kb webpage pasted in here. Won't break anything but could be problematic
								const selection = document.getSelection();
								const text = document.createTextNode(textFound);
								let usingExistingRange = false;

								for (let i = 0; i < selection.rangeCount; i++) {
									const existingRange = selection.getRangeAt(i);
									if (existingRange.intersectsNode(label)) {
										const isDescendant = (descendant, ancestor) => {
											while (descendant) {
												if (descendant === ancestor) {
													return true;
												}
												descendant = descendant.parentNode;
											}
											return false;
										}

										if (!isDescendant(existingRange.startContainer, label)) {
											existingRange.setStart(label, 0);
										}

										if (!isDescendant(existingRange.endContainer, label)) {
											existingRange.setEnd(label, label.childNodes.length);
										}

										usingExistingRange = true;
										existingRange.deleteContents();
										existingRange.insertNode(text);
										existingRange.collapse(false);
										break;
									}
								}

								selection.removeAllRanges();
								const newRange = document.createRange();
								if (!usingExistingRange) {
									label.innerHTML = "";
									label.appendChild(text);
								}
								newRange.setStartAfter(text);
								newRange.setEndAfter(text);
								selection.addRange(newRange);

								// now see if we need to truncate
								if (label.innerText.trim().length > 30) {
									let precedingTextLength = 0;
									for (let node of label.childNodes) {
										if (node === text) {
											break;
										}
										if (node instanceof Text) {
											precedingTextLength += node.wholeText.length;
										} else if (node instanceof Element) {
											precedingTextLength += node.innerText.length;
										}
									}
									const replacementTextNode = document.createTextNode(label.innerText.trim().slice(0, 30));
									label.innerHTML = "";
									label.appendChild(replacementTextNode);
									if (precedingTextLength) {
										const correctedRange = document.createRange();
										correctedRange.setStart(replacementTextNode, Math.min(30, precedingTextLength));
										correctedRange.setEnd(replacementTextNode, Math.min(30, precedingTextLength));
										selection.removeAllRanges();
										selection.addRange(correctedRange);
									}
								}

								controller = 'label';
								try {
									input.value = (new ips.utils.iro.Color(label.innerText)).hexString;
									buildIro();
									updateColor({target: input}, true);
								} catch (e) {
									Debug.error(e);
									// todo: possibly show a warning icon, but that may be overkill
								}
								return;
							}

							// still here? show a message
							ips.ui.flashMsg.show(ips.getString('form_color_datatransfer_fail'));
						}
					}

					label.addEventListener('drop', handleDataTransfer);
					label.addEventListener('paste', handleDataTransfer);

					document.addEventListener('pointerdown', e => {
						if (e.target.closest('.ipsInput__color-wrap-inner') !== wrap && iroWrap.classList.contains('ipsInput__color-iro-container--open')) {
							iroWrap.classList.remove('ipsInput__color-iro-container--open');
						}
					});
				});

				/**
				 *
				 * @param [e]
				 * @param [skipLabel]
				 */
				const updateColor = (e, skipLabel=false) => {
					if (unlimited && e?.target === input) {
						unlimited.checked=false;
					}

					if (unlimited?.checked) {
						wrap?.classList.add('ipsInput--color-disabled');
						if (label) {
							label.innerHTML = "";
						}
						return;
					}


					wrap?.classList.remove('ipsInput--color-disabled');
					let textColor;
					if (ips.utils.iro?.colorPackage) {
						// utilize oklab to determine perceived lightness rather than physical values
						const color = new ips.utils.iro.colorPackage(input.value);
						if (color.to('oklab').toGamut().l < 0.71) {
							textColor = "#fff";
						} else {
							textColor = "#000";
						}
					} else {
						const [_, __, l] = input.value.match(/#[0-9a-f]{3,8}/i) ? ips.utils.color.RGBtoHSL(...ips.utils.color.hexToRGB(input.value.match(/#([0-9a-f]{3,8})/i)[1])) : [null,null,null];
						textColor = typeof l === "number" ? (l < 0.6 ? "#fff" : "#000") : initialColor;
					}

					input.closest('.ipsInput__color-wrap')?.style.setProperty("--i-co-inverse", textColor);
					input.closest('.ipsInput__color-wrap')?.style.setProperty("--i-co", `${input.value}`);
					if (!skipLabel && label && label.innerText !== input.value) {
						// set the label's inner text to the selection; We don't want to select the # for hex codes though
						label.innerHTML = "";
						let textNodes = input.value.match(/^(#)?(.*)/i)
							.slice(1)
							.map(match => document.createTextNode(match || ''));

						textNodes.forEach(node => label.append(node));
						const sel = document.getSelection();
						sel.removeAllRanges();
						const range = document.createRange();
						range.selectNodeContents(textNodes[textNodes.length - 1]);
						sel.addRange(range);
					}

					input.setAttribute('value', input.value);
				};

				input.addEventListener("input", updateColor);
				unlimited?.addEventListener('input', updateColor);
				updateColor();
			},

			/**
			 * Handles dimension controls, which have dragging functionality to choose a size
			 *
			 * @param	{element}	elem	The dimensions element
			 * @returns {void}
			 */
			dimensions(elem) {
				const container = elem.closest('.ipsWidthHeight_container');

				elem.resizable( {
					resize: function (event, ui) {
						container.find('input.ipsWidthHeight_width').val( elem.width() );
						container.find('input.ipsWidthHeight_height').val( elem.height() );
					}
				});

				container.find('input.ipsWidthHeight_width').on( 'change', function () {
					elem.width( $( this ).val() );
				});

				container.find('input.ipsWidthHeight_height').on( 'change', function () {
					elem.height( $( this ).val() );
				});
			},

			/**
			 * Sets up events for unlimited checkbox for dimension controls
			 *
			 * @param	{Element}	elem	THe checkbox element
			 * @returns {void}
			 */
			dimensionsUnlimited(elem) {
				$(elem).get(0).addEventListener( 'change', () => _dimensionsUnlimitedCheck());
				_dimensionsUnlimitedCheck();

				/**
				 * Handles the 'unlimited' checkbox for dimension controls
				 *
				 * @returns {void}
				 */
				function _dimensionsUnlimitedCheck () {
					elem = $(elem).get(0);
					const container = elem.closest('.ipsWidthHeight_container');

					if( elem.matches(':checked') ){
						container
							.querySelectorAll('[data-control="dimensions"]')
							.ipsHide();

						container
							.querySelectorAll('input.ipsWidthHeight_width, input.ipsWidthHeight_height')
							.forEach(el => {
								if (el.value !== '' && !Number.isNaN(parseFloat(el.value))) {
									el.dataset.lastvalue = el.value;
								}
								el.value = '';
								el.setAttribute('disabled', '');
							});
					} else {
						container
							.querySelectorAll('[data-control="dimensions"]')
							.ipsShow();

						container
							.querySelectorAll('input.ipsWidthHeight_width, input.ipsWidthHeight_height')
							.forEach(el => {
								if (el.dataset.lastvalue !== undefined) {
									el.value = el.dataset.lastvalue;
								}
								// $(el).change(); // todo find a native js way to polyfill this jquery change event
								el.removeAttribute('disabled');
							});
					}
				}
			},

			/**
			 * Disables fields if JS is enabled
			 *
			 * @param	{element}	elem		The element this widget is being created on
			 * @returns {void}
			 */
			jsDisable(elem) {
				elem.prop('disabled', true);
			},

			/**
			 * CheckboxSet with Unlimited checkbox
			 *
			 * @param	{jQuery|element}	elem		The element this widget is being created on
			 * @returns {void}
			 */
			granularCheckboxset(elem) {
				elem.find('[data-role="checkboxsetUnlimitedToggle"]').on( 'change', function () {
					// We don't want to check disabled boxes, but we do want to uncheck them
					if( $(this).is(':checked') ){
						elem.find('[data-role="checkboxsetGranular"] input:enabled[type="checkbox"]').prop( 'checked', $(this).is(':checked') );
					} else {
						elem.find('[data-role="checkboxsetGranular"] input[type="checkbox"]').prop( 'checked', $(this).is(':checked') );
					}
				});

				elem.find('[data-action="checkboxsetCustomize"]').on( 'click', function () {
					elem.find('[data-role="checkboxsetUnlimited"]').hide();
					elem.find('[data-role="checkboxsetUnlimitedToggle"]').prop( 'checked', false );

					if( elem.find('[data-role="checkboxsetUnlimitedToggle"]').length > 0 ) {
						elem.find('[data-role="checkboxsetGranular"]').slideDown();
					}
				});

				elem.find('[data-action="checkboxsetAll"]').on( 'click', function () {
					elem.find('[data-role="checkboxsetGranular"] input:enabled[type="checkbox"]').prop( 'checked', true );

					if( elem.find('[data-role="checkboxsetUnlimitedToggle"]').length > 0 ) {
						elem.find('[data-role="checkboxsetUnlimited"]').slideDown();
						elem.find('[data-role="checkboxsetGranular"]').slideUp();
						elem.find('[data-role="checkboxsetUnlimitedToggle"]').prop( 'checked', true );
					}

					$(elem)[0]?.dispatchEvent(new CustomEvent('ips:formChange', {bubbles: true}));
				});
				elem.find('[data-action="checkboxsetNone"]').on( 'click', function () {
					elem.find('[data-role="checkboxsetGranular"] input:enabled[type="checkbox"]').prop( 'checked', false );

					if( elem.find('[data-role="checkboxsetUnlimitedToggle"]').length > 0 ) {
						elem.find('[data-role="checkboxsetUnlimited"]').slideDown();
						elem.find('[data-role="checkboxsetGranular"]').slideUp();
						elem.find('[data-role="checkboxsetUnlimitedToggle"]').prop( 'checked', false ).trigger('change');
					}

					$(elem)[0]?.dispatchEvent(new CustomEvent('ips:formChange', {bubbles: true}));
				});

				elem.find('[data-role="search"]').on( 'keydown', function(e){
					if ( e.keyCode == 13 || e.keyCode == 38 || e.keyCode == 40 ) {
						e.preventDefault();
					}
				});
				// We call .off() first in case this function is hit more than once - we don't want the event handler set more than once
				// or it will cause items to be skipped when navigating via arrows, and checkboxes not to check when hitting enter
				elem.find('[data-role="search"]').off('keyup').on( 'keyup', function(e){
					const focussedCheckbox = elem.find('[data-role="result"].ipsField__checkboxOverflow__focused');

					switch ( e.keyCode ) {
						case 13: // Return
							focussedCheckbox.find('input').prop( 'checked', !focussedCheckbox.find('input').prop('checked') );
							break;

						case 38: // Up
							var prev = focussedCheckbox.prevAll(':visible').first();
							if ( prev.length ) {
								focussedCheckbox.removeClass('ipsField__checkboxOverflow__focused')
								prev.addClass('ipsField__checkboxOverflow__focused');
							}
							break;

						case 40: // Down
							var next = focussedCheckbox.nextAll(':visible').first();
							if ( next.length ) {
								focussedCheckbox.removeClass('ipsField__checkboxOverflow__focused')
								next.addClass('ipsField__checkboxOverflow__focused');
							}
							break;

						default:
							focussedCheckbox.removeClass('ipsField__checkboxOverflow__focused');

							var val = $(this).val().toLowerCase();
							if ( val ) {
								elem.find('[data-role="massToggles"]').hide();
								elem.find('[data-role="result"]').each(function(){
									const labelText = this.querySelector('label svg[data-ipstooltip]')?.getAttribute('data-ipstooltip') || this.querySelector('label svg[data-ipstooltip]')?.getAttribute('title') || this.querySelector('label')?.innerText
									if (labelText?.toLowerCase().includes(val)) {
										$(this).show();
									} else {
										$(this).hide();
									}
								});
								elem.find('[data-role="result"]:visible').first().addClass('ipsField__checkboxOverflow__focused');
							} else {
								elem.find('[data-role="result"]:hidden').show();
								elem.find('[data-role="massToggles"]').show();
							}
					}
				});

				elem.find('[data-role="search"]').on( 'clear blur', function(e){
					// Did we want to select/un select an input first?
					if( $( e.relatedTarget ).closest('[data-role="checkboxsetGranular"]').find('[data-role="search"]').is( this ) ){
						e.preventDefault();
						$( this ).trigger('focus');
						return;
					}

					$(this).val('');
					elem.find('[data-role="result"].ipsField__checkboxOverflow__focused').removeClass('ipsField__checkboxOverflow__focused');
					elem.find('[data-role="result"]:hidden').show();
					elem.find('[data-role="massToggles"]').show();
				});

				const count = parseInt( elem.attr('data-count') );

				// If we have more than 10 items, then make this a scrolling selection box with search
				// v5 todo: This can be done with CSS: .ipsField__checkboxOverflow:has(li:nth-child(10))
				if( count > 10 ){
					elem.find('.ipsField__checkboxOverflow').addClass('ipsField__checkboxOverflow--scroll');
				}
			},

			/**
			 * Dialling code select box
			 *
			 * @param	{element}	elem		The element this widget is being created on
			 * @returns {void}
			 */
			diallingCode(elem) {

				const selected = elem.find('option:selected');
				if ( selected.length ) {
					selected.html( selected.attr('data-code') );
				}

				elem.on('change mouseleave', function(){
					elem.find('option').each(function(){
						$(this).html( $(this).attr('data-text') );
					});
					elem.find('option:selected').html( elem.find('option:selected').attr('data-code')  );
					$(this).trigger('blur');
				});
				elem.on('focus', function(){
					elem.find('option').each(function(){
						$(this).html( $(this).attr('data-text') );
					});
				});
			}
		}
		
		/**
		 * Locale sort
		 */
		function localeSort(a, b) {
			let bValue;
			let aValue;
			if ( $(a).prop("tagName") == 'OPTGROUP' ) {
				aValue = $(a).attr('label');
			} else {
				if (!a.value) {
			        return -1;   
			    }
				aValue = a.innerHTML;
			}
			if ( $(b).prop("tagName") == 'OPTGROUP' ) {
				bValue = $(b).attr('label');
			} else {
				if (!b.value) {
			        return 1;   
			    }
				bValue = b.innerHTML;
			}
									 
		    try {
		    	return aValue.localeCompare( bValue );
		    } catch ( err ) {
			    return ( aValue > bValue ) ? 1 : -1;
		    }
		}

		/**
		 * Refresh a form's toggles by firing an event.
		 *
		 * @note Third party code can listen to the `ips:calculateToggles` event, and add items to the `togglesOn` or `togglesOff` Set to modify what's toggled. Anything in togglesOn will be visible, everything in togglesOff that is NOT in togglesOn will be hidden
		 *
		 * @param {HTMLElement}	form
		 */
		function refreshFormToggles(form) {
			// do this twice so that toggles are accurately applied to elements which were just hidden
			if (!form) {
				return;
			}

			for (let i = 0; i < 1; i++) {
				/** @type ToggleEvent */
				const event = new CustomEvent('ips:calculateToggles', {
					cancelable: false,
					bubbles: false,
					detail: {
						togglesOn: new Set(),
						togglesOff: new Set(),
					}
				});

				// Dispatch an event so third party stuff can modify as needed
				try {
					form.dispatchEvent(event)
				} catch (e) {
					e.message = 'Failed to evaluate form toggles on an element:\n' + e.message;
					Debug.warn(e);
				}

				const forceStates = {
					togglesOn: new Set([...event.detail.togglesOn]),
					togglesOff: new Set([...event.detail.togglesOff])
				}

				parseToggleControls(event);

				// now we override system defaults with the custom values
				forceStates.togglesOn.forEach(el => {
					event.detail.togglesOn.add(el);
					event.detail.togglesOff.delete(el);
					forceStates.togglesOff.delete(el);
				})

				forceStates.togglesOff.forEach(el => {
					event.detail.togglesOff.add(el);
					event.detail.togglesOn.delete(el);
				})

				const allToggled = new Set([...event.detail.togglesOn, ...event.detail.togglesOff]);
				for (const toggle of allToggled) {
					if (event.detail.togglesOn.has(toggle)) {
						toggle.removeAttribute('hidden');
					} else {
						toggle.setAttribute('hidden', '');
					}
				}

				// These have to be updated when the form updates
				for (const widgetType of ['uploader', 'matrix']) {
					form
						.querySelectorAll(`[data-ips${widgetType}]`)
						.forEach(elem => ips.ui[widgetType].refresh($(elem)));
				}

				form.dispatchEvent(new CustomEvent('ips:refreshTogglesDone', {bubbles: true, cancelable: true}));
			}
		}

		/**
		 * Get a mapping of every toggled element to the things that toggle it
		 * @param {HTMLFormElement|Element}	form
		 * @param {Array<Element>}	togglers
		 * @param {Map<Element, ToggleCollection>}	toggledCollection
		 * @return {{inputMap: Map<Element, {parents: Set<Element>, ancestors: Set<Element>}>, toggleInputMap: Map<Element, Element>}}
		 */
		function buildToggleMap(form, togglers, toggledCollection) {
			togglers = [...togglers];
			const allToggledElementsForForm = new Set();
			for (const {togglesOn, togglesOff} of toggledCollection.values()) {
				togglesOn.forEach(elem => allToggledElementsForForm.add(elem));
				togglesOff.forEach(elem => allToggledElementsForForm.add(elem));
			}
			/**
			 * @type {Map<Element, {parents: Set<Element>, ancestors: Set<Element>}>}
			 */
			const map = new Map();
			const toggleInputMap = new Map();
			for (let toggler of togglers) {
				const toggleCollection = toggledCollection.get(toggler);
				const allToggled = new Set([...toggleCollection.togglesOn, ...toggleCollection.togglesOff]);
				let possibleToggled = toggler;
				while (possibleToggled && !allToggledElementsForForm.has(possibleToggled)) {
					possibleToggled = possibleToggled.parentElement;
				}
				toggleInputMap.set(toggler, possibleToggled || toggler);
				for (let toggled of allToggled) {
					if (!map.has(toggled)) {
						map.set(toggled, {parents: new Set(), ancestors: new Set()});
					}
					map.get(toggled).parents.add(toggler);
				}
			}

			/**
			 * @type {Map<Element, Set<Element>>}
			 */
			const allAncestorsMemo = new Map();

			/**
			 * @param {Element}	el
			 * @param {Set<Element>} [path]
			 * @return {Set<Element>}
			 */
			function getAllAncestors(el, path) {
				if (!allAncestorsMemo.has(el)) {
					path = path || new Set();
					path.add(el);
					const ancestors = new Set();
					if (map.has(el)) {
						for (let parent of map.get(el).parents) {
							if (path.has(parent)) {
								Debug.warn(`Cyclical form toggle detected. #${parent.getAttribute('id')} ultimately toggles itself.`);
								continue;
							}
							ancestors.add(parent);
							ancestors.add(toggleInputMap.get(parent))
							for (const ancestor of getAllAncestors(parent, new Set(path))) {
								ancestors.add(ancestor);
							}
						}
					}

					if (map.has(toggleInputMap.get(el))) {
						for (let parent of map.get(toggleInputMap.get(el)).parents) {
							if (path.has(parent)) {
								Debug.warn(`Cyclical form toggle detected. #${parent.getAttribute('id')} ultimately toggles itself.`);
								continue;
							}
							ancestors.add(parent);
							for (const ancestor of getAllAncestors(parent, new Set(path))) {
								ancestors.add(ancestor);
							}
						}
					}
					allAncestorsMemo.set(el, ancestors);
				}
				return allAncestorsMemo.get(el);
			}

			for (const toggled of map.keys()) {
				// we add all the ancestors of the parent to the ancestors array. The ancestors array doesn't contain direct parents
				for (const parent of [...map.get(toggled).parents]) {
					for (const ancestor of getAllAncestors(parent)) {
						map.get(toggled).ancestors.add(ancestor);
					}
				}
			}

			return {inputMap: map, toggleInputMap};
		}

		/**
		 *
		 * @param {ToggleEvent}	e
		 */
		function parseToggleControls(e) {
			/**@type {HTMLElement}*/
			const form = e.target;
			if (!form) {
				return;
			}
			const toggleCollectionMap = new Map();
			const allTogglers = [...form.querySelectorAll('[data-control~="toggle"], [data-action="nodeSelect"][data-toggles]')];
			allTogglers.forEach(toggler => toggleCollectionMap.set(toggler, getToggleCollection(toggler, form)));
			const {inputMap:toggleMap, toggleInputMap} = buildToggleMap(form, allTogglers, toggleCollectionMap);
			const toggleMapReverse = new Map();
			for (const toggled of toggleMap.keys()) {
				for (const parent of toggleMap.get(toggled).parents) {
					if (!toggleMap.get(toggled).ancestors.has(parent)) {
						if (!toggleMapReverse.has(parent)) {
							toggleMapReverse.set(parent, new Set())
						}
						toggleMapReverse.get(parent).add(toggled);
					}
				}
			}
			const roots = new Set();
			for (const toggler of toggleMapReverse.keys()) {
				// if the toggler is not toggled by something else, it is a root
				if (!toggleMap.has(toggler)) {
					roots.add(toggler);
				}
			}

			const toggleStates = new Map();

			// First, we need to compute the states depending on the elements themselves
			for (const toggle of allTogglers) {
				let eventType;
				let state;
				const toggleElements = toggleCollectionMap.get(toggle);
				if (!toggleElements.togglesOn.size && !toggleElements.togglesOff.size) {
					continue;
				}

				if (toggle.matches('option')) {
					state = toggleIsOn.select(toggle);
				} else if (toggle.matches('input[type="checkbox"], input[type="radio"]')) {
					state = toggleIsOn.checkbox(toggle);
				} else if (toggle.matches('.ipsSelectTree_item')) {
					state = toggleIsOn.node(toggle);
					eventType = 'nodeSelectedChanged';
				} else {
					state = toggleIsOn.generic(toggle);
				}
				toggleStates.set(toggle, state);
			}

			const checkAncestorMemo = new Map();

			/**
			 * Return whether this input has a disabled ancestor
			 * @param input
			 * @param path
			 */
			function checkAncestors(input, path) {
				if (checkAncestorMemo.has(input)) {
					return checkAncestorMemo.get(input);
				}

				path = path || new Set();
				const toggledEl = toggleInputMap.get(input) || input;
				path.add(input);
				if (!toggleMap.has(toggledEl)) {
					checkAncestorMemo.set(toggledEl, false);
					return false;
				}

				//now check all the immediate parents
				let allDisabled = true;
				for (const parent of toggleMap.get(toggledEl).parents) {
					if (toggleMap.get(toggledEl).ancestors.has(parent)) {
						continue;
					}

					if (!path.has(parent) && !checkAncestors(parent, new Set(path))) {
						let relationship = 'togglesOn';
						if (toggleCollectionMap.get(parent) && (toggleCollectionMap.get(parent).togglesOff.has(toggledEl) || toggleCollectionMap.get(parent).togglesOff.has(input))) {
							relationship = 'togglesOff';
						}

						if (toggleStates.has(parent) && !(relationship === 'togglesOn' ? toggleStates.get(parent) : !toggleStates.get(parent))) {
							continue;
						}
						allDisabled = false;
						break;

					}
				}

				if (allDisabled) {
					checkAncestorMemo.set(input, true);
					return true;
				}

				checkAncestorMemo.set(input, false);
				return false;
			}

			for (const toggle of [...toggleStates.keys()]) {
				const disabled = checkAncestors(toggle);
				const state = disabled ? false : toggleStates.get(toggle);
				const toggleElements = toggleCollectionMap.get(toggle);
				toggleElements.togglesOn.forEach(elem => {
					// if this toggler is also a "grandparent" toggler, don't consider it
					if (!toggleMap.get(elem).ancestors.has(toggle)) {
						if (state && !disabled) {
							e.detail.togglesOn.add(elem);
						} else {
							e.detail.togglesOff.add(elem);
						}
					}
				});

				toggleElements.togglesOff.forEach(elem => {
					if (!toggleMap.get(elem).ancestors.has(toggle)) {
						if (state || disabled) {
							e.detail.togglesOff.add(elem);
						} else {
							e.detail.togglesOn.add(elem);
						}
					}
				});
			}
		}

		/**
		 * Get all the toggled elements for a given toggler
		 *
		 * @param {HTMLElement}	elem
		 * @param {HTMLElement}	form
		 *
		 * @returns {ToggleCollection}
		 */
		function getToggleCollection(elem, form) {
			const getElements = s => new Set(form.querySelectorAll(s.split(',').map(c => "[id='" + c.trim() + "']").join(', ')));
			return {
				togglesOn: (elem.dataset.toggles || elem.dataset.toggleson) ? getElements(elem.dataset.toggles || elem.dataset.toggleson) : new Set(),
				togglesOff: elem.dataset.togglesoff ? getElements(elem.dataset.togglesoff) : new Set(),
			}
		}

		/**
		 * Methods to determine if the element is toggled to an "on" state
		 *
		 * @type {{[key: "select"|"checkbox"|"node"|"generic"]: function(HTMLOptionElement|HTMLInputElement|HTMLTextAreaElement|Element):boolean}}
		 */
		const toggleIsOn = {
			select: elem => !!elem.selected || elem.closest('select')?.value === elem.value,
			checkbox: elem => !!elem.checked,
			node: elem => elem.matches('[data-action="nodeSelect"][data-toggles].ipsSelectTree_selected'),
			generic: elem => elem.dataset && 'togglereverse' in elem.dataset ? !elem.value : !!elem.value,
		};

		ips.ui.registerWidget( 'form', ips.ui.form );

		return {

			/**
			 * Respond method
			 * Loops through each form type, finds elements that match, then initializes them
			 *
			 * @returns {void}
			 */
			respond(elem) {
				const form = $(elem).get(0).closest('form, [data-ipsform]');
				if (form && !('listenersSetup' in form.dataset)) {
					form.dataset.listenersSetup = '';
					form.addEventListener('nodeSelectedChanged', () => form.dispatchEvent(new CustomEvent('ips:formChange')));
					form.addEventListener('change', () => form.dispatchEvent(new CustomEvent('ips:formChange')));
					form.addEventListener(
						'ips:formChange',
						ips.utils.debounce(() => refreshFormToggles(form), 20)
					);

					// Timeout because we want other stuff to have a chance to initialize synchronously, and we don't want to block rendering
					setTimeout(() => refreshFormToggles(form));
				}

				// Loop through each type of control we'll work with
				for (const type in formTypes) {
				 	$( elem ).find( formTypes[ type ] ).each(function() {
				 		_controlMethods[type]?.($(this), elem);
				 	});
				}

				/* Sort any select boxes that need it */
				$(elem).find('select[data-sort]').each(function(){
					var value = $(this).val();
					$(this).children('optgroup').each(function(){
						$(this).append( $(this).children('option').remove().sort(localeSort) );
					});
					$(this).append( $(this).children('optgroup').remove().sort(localeSort) );
					$(this).append( $(this).children('option').remove().sort(localeSort) );
					$(this).val( value );
				});

				// When an error message is shown, if focus isn't inside the form already, place focus on the error message, otherwise announce the error via ipsAriaLive
				const formError = form.querySelector(`[data-role="formError"]`);
				if (formError) {
					const activeElement = document.activeElement;
					const focusIsOutsideForm = !activeElement || activeElement === document.body || !form.contains(activeElement);
					if (focusIsOutsideForm) {
						formError.focus();
					} else {
						document.getElementById('ipsAriaLive').innerHTML = formError.textContent;
					}
				}
			},
			/**
			 * Called when module is initialized.
			 * Observes the content change event, and calls our respond method. This allows us to initialize new form controls
			 * that might be added inside the form.
			 *
			 * @returns {void}
			 */
			init() {
				$( document ).on( 'contentChange', (e, data) => {
					if( data !== undefined && $( data[0] ).closest('[data-ipsForm]').length ){
						this.respond( $( data[0] ).closest('[data-ipsform]') );
					}
				});

				$( document ).on( 'menuOpened', (e, data = e.detail) => {
					if( data.menu.closest('[data-ipsForm]') && data.menu.closest('[data-ipsForm]').length ){
						this.respond( data.menu );
					}
				});

				/* This listens for codeMirrorInsert which is triggered from ips.editor.customtags.js and then inserts into code mirror instances */
				$( document ).on( 'codeMirrorInsert', function (e, data) {
					if( _cmInstances[ data.elemID ] !== undefined ) {
						_cmInstances[ data.elemID ].replaceRange( data.tag, _cmInstances[ data.elemID ].getCursor( "end" ) );
					}
				});

				$( document ).on( 'tabChanged', function (e, data) {
					var form = $( '#' + data['barID'] ).closest('[data-ipsForm]');
					if ( $('input[name=' + form.attr('data-formId' ) + '_activeTab]' ).length ) {
						$('input[name=' + form.attr('data-formId' ) + '_activeTab]' ).val( data['tabID'].replace( form.attr('data-formId' ) + '_tab_', '' ) );
					}
				});
			}
		};
	});
}(jQuery));