<?php
/**
 * @brief		File Storage Extension: Blocks
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @subpackage	Pages
 * @since		09 Dec 2025
 */

namespace IPS\cms\extensions\core\FileStorage;

/* To prevent PHP errors (extending class does not exist) revealing path */

use Exception;
use IPS\Db;
use IPS\Extensions\FileStorageAbstract;
use IPS\File as SystemFile;
use UnderflowException;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * File Storage Extension: Blocks
 */
class Blocks extends FileStorageAbstract
{
	/**
	 * Count stored files
	 *
	 * @return	int
	 */
	public function count(): int
	{
		return Db::i()->select( 'COUNT(*)', 'cms_blocks', ['block_type=?', 'template' ] )->first();
	}
	
	/**
	 * Move stored files
	 *
	 * @param	int			$offset					This will be sent starting with 0, increasing to get all files stored by this extension
	 * @param	int			$storageConfiguration	New storage configuration ID
	 * @param	int|NULL	$oldConfiguration		Old storage configuration ID
	 * @throws	UnderflowException					When file record doesn't exist. Indicating there are no more files to move
	 * @return	void
	 */
	public function move( int $offset, int $storageConfiguration, int $oldConfiguration=NULL ) : void
	{
		$block = Db::i()->select( '*', 'cms_blocks', ['block_type=?', 'template' ], 'block_id', [ $offset, 1 ] )->first();

		$uploadKeys = [];
		foreach( json_decode( $block['block_plugin_config'], true ) as $field )
		{
			if( $field['type'] == 'Upload' )
			{
				$uploadKeys[] = $field['key'];
			}
		}

		if( count( $uploadKeys ) )
		{
			foreach( Db::i()->select( '*', 'core_widgets_config', [ "data like concat('%',?,'%')", 'cms_widget_custom_block":"' . $block['block_key']] ) as $config )
			{
				$data = json_decode( $config['data'], true );
				foreach( $uploadKeys as $_key )
				{
					if( !empty( $data[ $_key ] ) )
					{
						$newFile = SystemFile::get( $oldConfiguration ?: 'cms_Blocks', $data[ $_key ] )->move( $storageConfiguration );
						$data[ $_key ] = (string) $newFile;
					}

				}

				Db::i()->update( 'core_widgets_config', [ 'data' => json_encode( $data ) ], ['id=?', $config['id'] ] );
			}
		}
	}

	/**
	 * Check if a file is valid
	 *
	 * @param	SystemFile|string	$file		The file path to check
	 * @return	bool
	 */
	public function isValidFile( SystemFile|string $file ): bool
	{
		return (bool) Db::i()->select( 'count(*)', 'core_widgets_config', [ "data like concat('%',?,'%')", (string) $file ] )->first();
	}

	/**
	 * Delete all stored files
	 *
	 * @return	void
	 */
	public function delete() : void
	{
		foreach( Db::i()->select( '*', 'cms_blocks', [ 'block_type=?', 'template' ], 'block_id' ) as $block )
		{
			$uploadKeys = [];
			foreach( json_decode( $block['block_plugin_config'], true ) as $field )
			{
				if( $field['type'] == 'Upload' )
				{
					$uploadKeys[] = $field['key'];
				}
			}

			if( count( $uploadKeys ) )
			{
				foreach( Db::i()->select( '*', 'core_widgets_config', [ "data like concat('%',?,'%')", 'cms_widget_custom_block":"' . $block['block_key']] ) as $config )
				{
					$data = json_decode( $config['data'], true );
					foreach( $uploadKeys as $_key )
					{
						if( !empty( $data[ $_key ] ) )
						{
							try
							{
								SystemFile::get( 'cms_Blocks', $data[ $_key ] )->delete();
							}
							catch( Exception ){}
						}
					}
				}
			}
		}
	}
}