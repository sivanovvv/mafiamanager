/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.codebox.js - Codebox widget (like the editor but dumbed down and only has a code box)
 *
 * Author: Matt Finger
 */
;( function($){
    "use strict";

    ips.createModule('ips.ui.codebox', function() {


        ips.ui.registerWidget(
            'codebox',
            ips.ui.codebox,
            [
                'allowed-languages',
                'autosave-key'
            ]
        );

        return {

            /**
             * Respond method, sets up the editor widget.
             * Loads the Tiptap libraries, then boots the editor
             *
             * @param	{element} 	elem 		The element this widget is being created on
             * @param	{object} 	options 	The options passed into this instance
             * @returns {void}
             */
            respond(elem, options) {

                if ($(elem).data('_editor')) {
                    return;
                }

                const instance = editorObj(elem, options)
                $(elem).data('_editor', instance)
                instance.init()
            },

            /**
             * Retrieve the editor instance (if any) on the given element
             *
             * @param	{element} 	elem 		The element to check
             *
             * @returns {editorObj|undefined} 	The editor instance or undefined
             */
            getObj(elem) {
                if( $( elem ).data('_editor') ){
                    return $( elem ).data('_editor');
                }

                return undefined;
            },

            /**
             * Retrieve the editor instance (if any) on the given element, initiating it if it isn't already. The instance is passed to a callback
             *
             * @param	{element} 	                        elem 		The element to check
             * @param   {function(editorObj|undefined)}     callback    If the instance exists, it will be passed to this callback
             *
             * @returns {void}
             */
            getObjWithInit( elem, callback ) {
                let obj = this.getObj( elem );
                if ( obj ) {
                    callback( obj );
                } else {
                    let initFunction = $( elem ).data('_editorInit');
                    if ( initFunction ) {
                        initFunction( callback );
                    }
                }
            },

            /**
             * Destruct the editor
             *
             * @param	{element} 	elem 		The element to check
             * @returns {void}
             */
            destruct(elem) {
                this.getObj( elem )?.destruct();
            }
        };
    });


    function editorObj(elem, options) {
        let instance;
        let reactRoot
        let allowedLanguages;
        async function init() {
            await ips.ui.editorv5.whenLoaded()

            const config = {'codeMode' : true}
            if (options['allowed-languages']) {
                allowedLanguages = [...new Set(JSON.parse(options['allowed-languages']))]
                config.allowedLanguages = allowedLanguages
                config.defaultLanguage = allowedLanguages.includes('plaintext') ? 'plaintext' : allowedLanguages[0]
            }

            /**@var {HTMLElement|HTMLTextAreaElement}*/
            const textArea = $(elem).get(0);
            config.textArea = textArea;

            if (options['autosave-key']) {
                config.autosaveKey = options['autosave-key'];
            } else if (!textArea.closest('i-theme-editor') && textArea.closest('form[action]') && (textArea.hasAttribute('name') || textArea.closest('.ipsFieldRow[id], .ipsFieldRow [id]'))) {
                config.autosaveKey = ips.utils.crypto.md5(
                    JSON.stringify([
                        textArea.closest('form[action]').getAttribute('action'),
                        textArea.getAttribute('name') || textArea.closest('.ipsFieldRow[id], .ipsFieldRow [id]').id
                    ])
                );
            }

            const editorLocation = document.createElement('div')
            editorLocation.dataset.role = 'reactRoot'
            textArea.parentElement.insertBefore(editorLocation, textArea)
            config.content = textArea.innerHTML
            config.onUpdate = (editor) => {
                const value = editor.getValue();
                textArea.innerHTML = "";
                textArea.appendChild(document.createTextNode(value));
                textArea.value = value;
                textArea.dispatchEvent(new CustomEvent('ips:codebox#update', {detail: {instance, elem: textArea}, bubbles: true}));
            }

            config.hasTags = !!textArea.closest('[data-controller="core.global.editor.customtags"]');

            textArea.ipsHide()
            let result = await ips.utils.tiptap.editorInstance(editorLocation, config);
            instance = result[0] // this is a MONACO instance
            textArea.dispatchEvent(new CustomEvent('ips:codeboxAfterInit', {
                bubbles: true,
                cancelable: true,
                detail: {
                    instance,
                    config
                }
            }))

            textArea.addEventListener('insertCode', e => {
                if (e?.detail?.content) {
                    let content = e.detail.content;

                    // if this is a string, it could very well contain HTML, in which case we need to insert it as a text node, not raw HTML
                    if (typeof content === 'string') {
                        instance.executeEdits("insertCode", [
                            {
                                text: content,
                                range: instance.getSelection()
                            }
                        ]);
                        instance.focus();
                    } else {
                        throw new TypeError(`The content property of the event insertCode is expected to be a string`);
                    }
                }
            })

            reactRoot = result[1]
        }

        function destruct() {
            instance?.dispose()
            reactRoot.unmount();
        }

        return {instance, destruct, init}
    }

}(jQuery));