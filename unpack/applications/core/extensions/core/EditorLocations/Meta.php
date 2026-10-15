<?php
/**
 * @brief		Editor Extension: Meta
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community

 * @since		27 Jan 2017
 */

namespace IPS\core\extensions\core\EditorLocations;

/* To prevent PHP errors (extending class does not exist) revealing path */

use Exception;
use IPS\Content;
use IPS\Db;
use IPS\Extensions\EditorLocationsAbstract;
use IPS\Helpers\Form\Editor;
use IPS\Http\Url;
use IPS\Member;
use IPS\Node\Model;
use LogicException;
use InvalidArgumentException;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Editor Extension: Meta
 */
class Meta extends EditorLocationsAbstract
{
	/**
	 * Can we use attachments in this editor?
	 *
	 * @param	Member					$member	The member
	 * @param	Editor	$field	The editor field
	 * @return	bool|null	NULL will cause the default value (based on the member's permissions) to be used, and is recommended in most cases. A boolean value will override that.
	 */
	public function canAttach( Member $member, Editor $field ): ?bool
	{
		return NULL;
	}
	
	/**
	 * Permission check for attachments
	 *
	 * @param	Member	$member		The member
	 * @param	int|null	$id1		Primary ID
	 * @param	int|null	$id2		Secondary ID
	 * @param	string|null	$id3		Arbitrary data
	 * @param	array		$attachment	The attachment data
	 * @param	bool		$viewOnly	If true, just check if the user can see the attachment rather than download it
	 * @return	bool
	 */
	public function attachmentPermissionCheck( Member $member, ?int $id1, ?int $id2, ?string $id3, array $attachment, bool $viewOnly=FALSE ): bool
	{
		$data = Db::i()->select( '*', 'core_content_meta', array( "meta_id=? AND meta_type=?", $id1, $id3 ) )->first();
		
		$item = $data['meta_class']::load( $data['meta_item_id'] );
		
		if ( $item->container() )
		{
			if ( !$item->canView( $member ) )
			{
				return FALSE;
			}
			
			return $viewOnly or $item->container()->can( 'attachments', $member );
		}
		else
		{
			return $item->canView( $member );
		}
	}
	
	/**
	 * Attachment lookup
	 *
	 * @param	int|null	$id1	Primary ID
	 * @param	int|null	$id2	Secondary ID
	 * @param	string|null	$id3	Arbitrary data
	 * @return    Content|Member|Model|Url|null
	 * @throws	LogicException
	 */
	public function attachmentLookup( int $id1=NULL, int $id2=NULL, string $id3=NULL ): Model|Content|Url|Member|null
	{
		try
		{
			$data = Db::i()->select( '*', 'core_content_meta', ["meta_id=? AND meta_type=?", $id1, $id3] )->first();
			return $data[ 'meta_class' ]::load( $data[ 'meta_item_id' ] );
		}
		catch( Exception $e )
		{
			throw new LogicException;
		}
	}
	
	/**
	 * Content Count
	 *
	 * @return	int
	 */
	public function contentCount(): int
	{
		return (int) Db::i()->select( 'COUNT(*)', 'core_content_meta', array( "meta_type=?", 'core_ContentMessages' ) )->first();
	}
	
	/**
	 * Rebuild content to add or remove lazy loading
	 *
	 * @param	int|null		$offset		Offset to start from
	 * @param	int|null		$max		Maximum to parse
	 * @return	int			Number completed
	 * @note	This method is optional and will only be called if it exists
	 */
	public function rebuildLazyLoad( ?int $offset, ?int $max ): int
	{
		return $this->performRebuild( $offset, $max, [ 'IPS\Text\Parser', 'parseLazyLoad' ] );
	}
	
	/**
	 * Perform rebuild - abstracted as the call for rebuildContent() and rebuildAttachmentImages() is nearly identical
	 *
	 * @param	int|null	$offset		Offset to start from
	 * @param	int|null	$max		Maximum to parse
	 * @param	callable	$callback	Method to call to rebuild content
	 * @return	int			Number completed
	 */
	protected function performRebuild( ?int $offset, ?int $max, callable $callback ): int
	{
		$did	= 0;
	
		/* Language bits */
		foreach( Db::i()->select( '*', 'core_content_meta', array( "meta_type=?", 'core_ContentMessages' ), 'meta_id ASC', array( $offset, $max ) ) as $message )
		{
			$did++;
			$rebuilt = FALSE;
			
			try
			{
				$data = json_decode( $message['meta_data'], true );
				if( !empty( $data['message'] ) )
				{
					$rebuilt = $callback( $data['message'] );
				}
			}
			catch( InvalidArgumentException $e )
			{
				if( is_array( $callback ) and $callback[1] == 'parseStatic' AND $e->getcode() == 103014 )
				{
					$rebuilt	= preg_replace( "#\[/?([^\]]+?)\]#", '', $data['message'] );
				}
				else
				{
					throw $e;
				}
			}
	
			if( $rebuilt !== FALSE )
			{
				$data['message'] = $rebuilt;
				Db::i()->update( 'core_content_meta', array( 'meta_data' => json_encode( $data ) ), 'meta_id=' . $message['meta_id'] );
			}
		}
	
		return $did;
	}
}