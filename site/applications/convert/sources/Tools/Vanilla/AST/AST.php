<?php

/**
 * @brief                Vanilla AST Renderer
 * @author               <a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright        (c) Invision Power Services, Inc.
 * @package              Invision Community
 * @subpackage           convert
 * @since                29 Apr 26
 */

namespace IPS\convert\Tools\Vanilla;

use Exception;
use IPS\convert\App;
use IPS\Db;
use IPS\Http\Url;
use IPS\Text\DOMParser;
use IPS\Xml\DOMDocument;
use OutOfRangeException;

/* To prevent PHP errors (extending class does not exist) revealing path */
if( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Vanilla AST Renderer
 */
class AST
{
	protected ?App $app;
	protected ?string $contentType;
	protected ?int $contentId;
	protected ?int $commentId;

	/**
	 * AST constructor.
	 *
	 * @param App|null    $app       Optional convert app instance.
	 * @param string|null $type      Optional content type.
	 * @param int|null    $contentId Optional content ID.
	 * @param int|null    $commentId Optional comment ID.
	 */
	public function __construct( ?App $app = NULL, ?string $type = NULL, ?int $contentId = NULL, ?int $commentId = NULL )
	{
		$this->app = $app;
		$this->contentType = $type;
		$this->contentId = $contentId;
		$this->commentId = $commentId;
	}

	/**
	 * Parse a JSON AST string and convert it to HTML.
	 *
	 * @param string      $postJson  JSON string representing the post AST.
	 * @param App|null    $app       Optional convert app instance.
	 * @param string|null $type      Optional content type.
	 * @param int|null    $contentId Optional content ID.
	 * @param int|null    $commentId Optional comment ID.
	 * @return string                 HTML output or original JSON if parsing fails.
	 */
	public static function parse( string $postJson, ?App $app = NULL, ?string $type = NULL, ?int $contentId = NULL, ?int $commentId = NULL ): string
	{
		$parser = new static( $app, $type, $contentId, $commentId );

		$json = json_decode( $postJson, TRUE ) ?? [];

		if( is_string( $json ) )
		{
			$json = json_decode( $json, TRUE );
		}

		$return = $parser->convertToHtml( $json );

		if( empty( $return ) )
		{
			return $postJson;
		}

		return '<!--Rich2-->' . $return;
	}

	/**
	 * Convert an array of AST nodes to HTML.
	 *
	 * @param array $nodes AST nodes.
	 * @return string         HTML output.
	 */
	public function convertToHtml( array $nodes ): string
	{
		$html = '';
		foreach( $nodes as $node )
		{
			$html .= $this->renderNode( $node );
		}
		return $html;
	}

	/**
	 * Render a single AST node to HTML.
	 *
	 * @param array $node AST node.
	 * @return string         HTML output for the node.
	 */
	private function renderNode( array $node ): string
	{
		// ── Text leaf ────────────────────────────────────────────────────────────
		if( array_key_exists( 'text', $node ) )
		{
			$text = htmlspecialchars( $node['text'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
			$text = str_replace( "\n", '<br>', $text );
			// Inner → outer so nesting reads naturally in the output
			if( !empty( $node['code'] ) )
			{
				$text = "<code>{$text}</code>";
			}
			if( !empty( $node['bold'] ) )
			{
				$text = "<strong>{$text}</strong>";
			}
			if( !empty( $node['italic'] ) )
			{
				$text = "<em>{$text}</em>";
			}
			if( !empty( $node['strikethrough'] ) )
			{
				$text = "<s>{$text}</s>";
			}
			if( !empty( $node['subscript'] ) )
			{
				$text = "<sub>{$text}</sub>";
			}
			return $text;
		}

		$type = $node['type'] ?? '';
		$children = $node['children'] ?? [];
		$inner = implode( '', array_map( [ $this, 'renderNode' ], $children ) );

		switch( $type )
		{

			// ── Headings ─────────────────────────────────────────────────────────
			case 'h1':
			case 'h2':
			case 'h3':
			case 'h4':
			case 'h5':
			case 'h6':
				return "<{$type}>" . trim( $inner ) . "</{$type}>\n";

			// ── Paragraph ────────────────────────────────────────────────────────
			case 'p':
				return trim( $inner ) !== '' ? "<p>{$inner}</p>\n" : '';

			// ── Lists ────────────────────────────────────────────────────────────
			case 'ul':
				return "<ul>\n{$inner}</ul>\n";
			case 'ol':
				return "<ol>\n{$inner}</ol>\n";
			case 'li':
				return "<li>{$inner}</li>\n";
			case 'lic':
				return $inner; // transparent content wrapper

			// ── Link ─────────────────────────────────────────────────────────────
			case 'a':
				$href = htmlspecialchars( $node['url'] ?? '#', ENT_QUOTES, 'UTF-8' );
				$target = isset( $node['target'] )
					? ' target="' . htmlspecialchars( $node['target'], ENT_QUOTES, 'UTF-8' ) . '"'
					: '';
				return "<a href=\"{$href}\"{$target}>{$inner}</a>";

			// ── Table ────────────────────────────────────────────────────────────
			case 'table':
				return "<table>\n{$inner}</table>\n";
			case 'thead':
				return "<thead>\n{$inner}</thead>\n";
			case 'tbody':
				return "<tbody>\n{$inner}</tbody>\n";
			case 'tr':
				return "<tr>\n{$inner}</tr>\n";
			case 'th':
				return "<th>" . $this->unwrapCellParagraphs( $children ) . "</th>\n";
			case 'td':
				return "<td>" . $this->unwrapCellParagraphs( $children ) . "</td>\n";

			// ── Code block ───────────────────────────────────────────────────────
			// Matches IPS: <pre class="ipsCode language-x" data-language="x" spellcheck="false">
			case 'code_block':
				$lang = htmlspecialchars( $node['lang'] ?? 'plaintext', ENT_QUOTES, 'UTF-8' );
				$langName = htmlspecialchars( ucfirst( $node['lang'] ?? 'plaintext' ), ENT_QUOTES, 'UTF-8' );
				return "<pre class=\"ipsCode language-{$lang}\" data-language=\"{$langName}\" spellcheck=\"false\">"
					. "<code>{$inner}</code>"
					. "</pre>\n";
			case 'code_line':
				return $inner . "\n";

			// ── Blockquote ───────────────────────────────────────────────────────
			// Matches IPS: <blockquote class="ipsQuote" data-ipsquote>
			case 'blockquote':
				return "<blockquote class=\"ipsQuote\" data-ipsquote>\n{$inner}</blockquote>\n";
			case 'blockquote-line':
				return trim( $inner ) !== '' ? "<p>{$inner}</p>\n" : '';

			// ── Horizontal rule ──────────────────────────────────────────────────
			case 'hr':
				return "<hr>\n";

			// ── Spoiler ──────────────────────────────────────────────────────────
			// Matches IPS: <details class="ipsRichTextBox ipsRichTextBox--collapsible ipsRichText__no-index">
			case 'spoiler':
				return "<details class=\"ipsRichTextBox ipsRichTextBox--collapsible ipsRichText__no-index\">\n"
					. "<summary>Spoiler</summary>\n"
					. $inner
					. "</details>\n";
			case 'spoiler-content':
				return $inner; // transparent
			case 'spoiler-item':
				return trim( $inner ) !== '' ? "<p>{$inner}</p>\n" : '';

			// ── Callout ──────────────────────────────────────────────────────────
			// Matches IPS: <div class="ipsRichTextBox ipsRichTextBox--alwaysopen">
			case 'callout':
			case 'toggle':
				return "<div class=\"ipsRichTextBox ipsRichTextBox--alwaysopen\">\n{$inner}</div>\n";
			case 'callout-item':
			case 'toggle-heading':
			case 'toggle-content':
				return $inner; // transparent

			// ── User mention ─────────────────────────────────────────────────────
			case '@':
				try
				{
					if( $this->app and !empty( $node['userID'] ) )
					{
						$ipsId = $this->app->getLink( $node['userID'], 'core_members', TRUE );
						return "[mention={$ipsId}]{$node['name']}[/mention]";
					}
					elseif( !empty( $node['name'] ) )
					{
						return "@{$node['name']}";
					}
					else
					{
						return $inner;
					}
				}
				catch( OutOfRangeException $e )
				{
					return $inner;
				}

			// ── Button link (semantically still an anchor) ────────────────────────
			case 'link_as_button':
				$href = htmlspecialchars( $node['url'] ?? '#', ENT_QUOTES, 'UTF-8' );
				return "<a href=\"{$href}\">{$inner}</a>";

			// ── Embeds ───────────────────────────────────────────────────────────
			case 'rich_embed_card':
				return $this->renderEmbed( $node, TRUE );
			case 'rich_embed_inline':
				return $this->renderEmbed( $node, FALSE );

			case 'legacy_emoji_image':
				return $node['attributes']['title'] ?? '';

			case 'mention_input':
				return '@' . $inner;

			default:
				if( \IPS\IN_DEV )
				{
					throw new Exception( 'Unknown node: ' . $node['name'] );
				}
				return $inner; // Unknown type — pass children through
		}
	}

	/**
	 * Render an embed node (image, file, video, etc.) to HTML.
	 *
	 * @param array $node  AST node with embed data.
	 * @param bool  $block Whether to render as a block element.
	 * @return string         HTML output for the embed.
	 */
	private function renderEmbed( array $node, bool $block ): string
	{
		$embed = $node['embedData'] ?? [];
		$embedType = $embed['embedType'] ?? '';

		switch( $embedType )
		{
			case 'image':
				return $this->renderEmbedImage( $node, $block );

			case 'file':
				return $this->renderEmbedFile( $embed, $block );

			case 'youtube':
			case 'vimeo':
				return $this->renderEmbedVideo( $embed );

			case 'link':
				// Matches IPS link embed template: <a target="_blank" rel="noopener" data-fromembed>
				$url = htmlspecialchars( $embed['url'] ?? $node['url'] ?? '#', ENT_QUOTES, 'UTF-8' );
				$name = htmlspecialchars( $embed['name'] ?? $embed['url'] ?? $url, ENT_QUOTES, 'UTF-8' );
				return "<a href=\"{$url}\" target=\"_blank\" rel=\"noopener\" data-fromembed>{$name}</a>";

			case 'quote':
				// Embedded quote — body is pre-rendered HTML from the source platform
				$cite = $embed['insertUser']['name'] ?? '';
				$attr = $cite
					? ' name="' . htmlspecialchars( $cite, ENT_QUOTES, 'UTF-8' ) . '"'
					: '';

				$post = '';
				try
				{
					if( $this->app AND isset( $embed['recordType'] ) AND !empty( $embed['recordID'] ) )
					{
						$type = match ( strtolower( $embed['recordType'] ) )
						{
							'comment' => 'forums_posts',
							'discussion' => 'forums_posts_first',
							default => throw new OutOfRangeException,
						};

						$ipsId = $this->app->getLink( $embed['recordID'], $type );
						$post = ' post="' . $ipsId .'"';
					}
				}
				catch( OutOfRangeException ) {}

				// Remove VanillaCloud attachments
				if( !empty( $embed['body'] ) AND ( strpos( $embed['body'], 'v-cdn.net' ) !== FALSE OR strpos( $embed['body'], 'leaving?allowTrusted' ) !== FALSE ) )
				{
					$doc = new DOMDocument( '1.0', 'UTF-8' );
					$doc->loadHTML( DOMDocument::wrapHtml( $embed['body'] ) );
					$xPath = new \DOMXPath( $doc );

					/* Remove Outbound link gate */
					$query = "//a[contains(@href, 'leaving?allowTrusted')]";
					foreach( iterator_to_array( $xPath->query( $query ) ) as $tag )
					{
						$href = Url::external( $tag->getAttribute( 'href' ) );
						$target = Url::external( $href->queryString['target'] ?? '' );
						$tag->setAttribute( 'href', (string) $target );
					}

					/* Remove CDN attachments (VanillaCloud) */
					$query = "//a[contains(@href, 'v-cdn.net/')]|//img[contains(@src, 'v-cdn.net/')]";
					foreach( iterator_to_array( $xPath->query( $query ) ) as $tag )
					{
						$tag->parentNode?->removeChild( $tag );
					}

					/* Get DOMDocument output */
					$embed['body'] = str_replace( '<p></p>', '', DOMParser::getDocumentBodyContents( $doc ) );
				}

				return "[quote{$attr}{$post}]\n"
					. ( $embed['body'] ?? '' )
					. "\n[/quote]\n";

			case 'iframe':
				return $embed['url'] . "\n";

			default:
				if( ( $node['dataSourceType'] ?? '' ) === 'image' )
				{
					return $this->renderEmbedImage( $node, $block );
				}
				$url = htmlspecialchars( $node['url'] ?? '', ENT_QUOTES, 'UTF-8' );
				return $url
					? "<a href=\"{$url}\" target=\"_blank\" rel=\"noopener\" data-fromembed>{$url}</a>"
					: '';
		}
	}

	/**
	 * Render an embedded image node to HTML.
	 *
	 * @param array $node  AST node with image embed data.
	 * @param bool  $block Whether to render as a block element.
	 * @return string         HTML output for the image embed.
	 */
	private function renderEmbedImage( array $node, bool $block ): string
	{
		$embed = $node['embedData'] ?? [];

		if( isset( $embed['mediaID'] ) )
		{
			if( $this->contentType and $this->commentId )
			{
				Db::i()->insert( 'convert_vanilla_temp', [ 'media_id' => $embed['mediaID'], 'link_type' => $this->contentType, 'content_id' => $this->contentId, 'post_id' => $this->commentId ] );
			}
			return "[ATTACH={$embed['mediaID']}] <br>\n";
		}
		elseif( !empty( $embed['url'] ) )
		{
			return "[img]{$embed['url']}[/img] <br>\n";
		}
		else
		{
			return '';
		}
	}

	/**
	 * Render an embedded file node to HTML.
	 *
	 * @param array $embed Embed data for the file.
	 * @param bool  $block Whether to render as a block element.
	 * @return string         HTML output for the file embed.
	 */
	private function renderEmbedFile( array $embed, bool $block ): string
	{
		return $this->renderEmbedImage( $embed, $block ); // Same response expected
	}

	/**
	 * Render an embedded video node to HTML.
	 *
	 * @param array $embed Embed data for the video.
	 * @return string         HTML output for the video embed.
	 */
	private function renderEmbedVideo( array $embed ): string
	{
		$src = htmlspecialchars( $embed['frameSrc'] ?? '', ENT_QUOTES, 'UTF-8' );
		return $src . " \n";
	}

	/**
	 * Helper to unwrap paragraphs in table cells for proper HTML output.
	 *
	 * @param array $children Child AST nodes of the cell.
	 * @return string             HTML output for the cell content.
	 */
	private function unwrapCellParagraphs( array $children ): string
	{
		$allParagraphs = !empty( $children ) && array_reduce(
				$children,
				fn( bool $carry, array $child ) => $carry && ( $child['type'] ?? '' ) === 'p',
				TRUE
			);

		if( $allParagraphs )
		{
			$parts = array_map( function( array $child ): string
			{
				return implode( '', array_map( [ $this, 'renderNode' ], $child['children'] ?? [] ) );
			}, $children );

			$parts = array_values( array_filter( $parts, fn( string $s ) => $s !== '' ) );

			return count( $parts ) > 1 ? implode( '<br>', $parts ) : ( $parts[0] ?? '' );
		}

		return implode( '', array_map( [ $this, 'renderNode' ], $children ) );
	}
}