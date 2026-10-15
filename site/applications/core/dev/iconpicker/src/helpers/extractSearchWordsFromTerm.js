const cachedTerms = {};


/**
 * Get words to use for the CSS based search index
 * @param {string} term
 * @return {string[]}
 */
export default function extractSearchWordsFromTerm(term) {
	if (term in cachedTerms) {
		const res = cachedTerms[term];

		// Move this to the 'end' of the cache
		delete cachedTerms[term];
		cachedTerms[term] = res;

		return cachedTerms[term];
	}

	const normalizedTerm = window.ips.utils.search.stripAccents(term)
		.trim()
		.toLowerCase();

	const mainComponents = normalizedTerm.split(/[\s\-_]+/);
	mainComponents.push(normalizedTerm);
	for (const component of [...mainComponents]) {
		if (component.includes('smiling')) {
			mainComponents.push(component.replaceAll('smiling', 'smiley'))
		}
	}

	const finalWords = Array.from(new Set(
		mainComponents
			.map(word => word.replaceAll(/[^\p{L}\p{N}\p{S}\p{P}_]/ug, ''))
			.filter(word => !!word.length)
	));

	// don't let this get tooooo big
	const cacheKeys = [...Object.keys(cachedTerms)];
	const toRemove = cacheKeys.length - 5000;
	for (let i = 0; i < toRemove; i++) {
		delete cachedTerms[cacheKeys[i]];
	}

	cachedTerms[term] = finalWords;
	return finalWords;
}