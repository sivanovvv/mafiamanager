class iLatex extends HTMLElement {
	/**
	 * The HTML (cached) for this element
	 * @type {string|null}
	 */
	_latexHTML = null;
	get latexHTML() { return this._latexHTML; }

	/**
	 * The text that was originally inside this element
	 * @type {string}
	 */
	_originalText = "";
	get originalText() { return this._originalText; }

	/**
	 * Initialize the katex object
	 */
	constructor() {
		super();
		this._originalText = this.textContent;
		this.addEventListener('fillLatex', this.fill);
		this.addEventListener('unfillLatex', this.unfill);
		this.fill().then(() => {});
	}

	/**
	 * Wait for katex to load
	 * @return {Promise<void>}
	 */
	async katexLoaded() {
		await ips.ui._codehighlighting.whenLoaded();
	}

	/**
	 * Fill with latex
	 *
	 * @param {string}		[text]		If specified, this text will be rendered as latex and then filled into the element
	 *
	 * @return {Promise<void>}
	 */
	async fill(text) {
		if (typeof text === 'string' && text !== this._originalText) {
			this._originalText = text;
			this._latexHTML = null;
		}

		if (!this._latexHTML) {
			await this.katexLoaded();
			this._latexHTML = await ips.ui.codehighlighting.renderKatexRaw(this._originalText);
		}
		this.innerHTML = this._latexHTML;
	}

	/**
	 * Clear the latex
	 */
	unfill() {
		this.textContent = this._originalText;
	}
}