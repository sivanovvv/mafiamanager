class iLatexNodeview extends HTMLElement {
	/**
	 * @type {iLatex|null}
	 * @private
	 */
	_preview = null;
	get preview() {return this._preview;}

	/**
	 * @type {HTMLElement|null}
	 * @private
	 */
	_source = null;
	get source() { return this._source; }

	/**
	 *
	 * @type {MutationObserver|null}
	 * @private
	 */
	_childObserver = null;

	/**
	 *
	 * @type {MutationObserver|null}
	 * @private
	 */
	_sourceObserver = null;

	constructor() {
		super();
		this._childObserver = new MutationObserver(ips.utils.throttle(entries => this._identifyComponentsInChildren(), 100));
		this._sourceObserver = new MutationObserver(ips.utils.debounce(entries => this._updateView(), 500));
		this._childObserver.observe(this, {childList: true, subtree: true});
		this._identifyComponentsInChildren();
		this.addEventListener('click', this);
	}

	/**
	 *
	 * @param {Event}	e
	 */
	handleEvent(e) {
		if (!(e instanceof Event)) {
			throw new TypeError(`A non-event object passed to handleEvent.`);
		}

		switch(e.type) {
			case 'click':
				if (e.target.closest('i-latex') === this.preview && this.source && this.preview) {
					this._focusSource()
				}
				break;
		}
	}

	/**
	 * Set the document's text selection to the source element of this node view. Will toggle the visibility of
	 * @private
	 */
	_focusSource() {
		if (!this.source) {
			return;
		}

		/** @see applications/cloud/dev/editor/latex.js. That handles the toggling on editor selection updates */
		this.source.classList.remove('ipsInvisible');
		this.preview.classList.add('iLatex--no-decoration');
		this.preview.querySelector(":scope > .latex")?.classList.add('ipsInvisible');
		const selection = document.getSelection();
		selection.removeAllRanges();
		const range = new Range();
		range.setStart(this.source.childNodes[0] || this.source, 1);
		range.setEnd(this.source.childNodes[0] || this.source, 0);
		selection.addRange(range);
	}

	/**
	 * Watch the contents to identify the source and the preview
	 * @private
	 */
	_identifyComponentsInChildren() {
		const preview = this.querySelector('i-latex');
		if (preview !== this._preview) {
			this._preview = preview;
		}

		const source = this.querySelector('[data-latex-source]');
		if (source !== this._source) {
			this._source = source;
			this._sourceObserver.disconnect();
			if (source) {
				this._sourceObserver.observe(this._source, {subtree: true, characterData: true});
				this._updateView();
			}
		}
	}

	/**
	 * Update the latex preview based on the source
	 * @private
	 */
	_updateView() {
		if (!this._source || !this._preview) {
			Debug.warn(`Cannot update view of i-latex-nodeview element because either its source or its preview is undefined`);
			return;
		}

		// It is possible, as a race condition such as when a draft loads, 
		customElements.whenDefined('i-latex')
			.then(() => this._preview.fill(this._source.textContent));
	}
}