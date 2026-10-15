<?php
/**
 * @brief		Custom Blocks Block
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @subpackage	Content
 * @since		17 Oct 2014
 */

namespace IPS\cms\widgets;

/* To prevent PHP errors (extending class does not exist) revealing path */

use Exception;
use IPS\cms\Blocks\Block;
use IPS\cms\Blocks\Container;
use IPS\Db;
use IPS\File;
use IPS\Helpers\Form;
use IPS\Helpers\Form\Node;
use IPS\Helpers\Form\Upload;
use IPS\Http\Url;
use IPS\Widget\PermissionCache;
use OutOfRangeException;
use UnderflowException;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Custom block Widget
 */
class Blocks extends PermissionCache
{
	/**
	 * @brief	Widget Key
	 */
	public string $key = 'Blocks';
	
	/**
	 * @brief	App
	 */
	public string $app = 'cms';

	/**
	 * Constructor
	 *
	 * @param String $uniqueKey				Unique key for this specific instance
	 * @param	array				$configuration			Widget custom configuration
	 * @param array|string|null $access					Array/JSON string of executable apps (core=sidebar only, content=IP.Content only, etc)
	 * @param string|null $orientation			Orientation (top, bottom, right, left)
	 * @param string $layout
	 * @return	void
	 */
	public function __construct(string $uniqueKey, array $configuration, array|string $access=null, string $orientation=null, string $layout='table' )
	{
		try
		{
			if (  isset( $configuration['cms_widget_custom_block'] ) )
			{
				$block = Block::load( $configuration['cms_widget_custom_block'], 'block_key' );
				if ( $block->type === 'custom' AND ! $block->cache )
				{
					$this->neverCache = TRUE;
				}
				else if ( $block->type === 'plugin' )
				{
					try
					{
						/* loads and JS and CSS needed */
						$block->orientation = $orientation;
						$block->widget()->init();
					}
					catch( Exception $e ) { }
				}
			}
		}
		catch( Exception $e ) { }
		
		parent::__construct( $uniqueKey, $configuration, $access, $orientation, $layout );
	}
	
	/**
	 * Specify widget configuration
	 *
	 * @param   Form|null   $form       Form Object
	 * @return	Form
	 */
	public function configuration( Form &$form=null ): Form
 	{
		$form = new Form;
		
		/* A block may be deleted on the back end */
		$block = NULL;
		try
		{
			if ( isset( $this->configuration['cms_widget_custom_block'] ) )
			{
				$block = Block::load( $this->configuration['cms_widget_custom_block'], 'block_key' );
			}
		}
		catch( OutOfRangeException $e ) { }

		if( $block?->type == 'template' )
		{
			$form->hiddenValues['cms_widget_custom_block'] = $block->key;
			foreach( $block->_plugin_config as $formField )
			{
				switch( $formField['type'] )
				{
					case 'Upload':
						$val = !empty( $this->configuration[ $formField['key'] ] ) ? File::get( 'cms_Blocks', $this->configuration[ $formField['key'] ] ) : null;
						$field = new Upload( $formField['key'], $val, false, [
							'storageExtension' => 'cms_Blocks',
							'multiple' => false,
							'image' => true,
							'allowStockPhotos' => true
						] );
						break;

					case 'Editor':
						$field = new Form\Editor( $formField['key'], $this->configuration[ $formField['key'] ] ?? null, false, [
							'app' => 'cms',
							'key' => 'BlockContent',
							'allowAttachments' => false,
							'autoSaveKey' => 'cms-BlockContent-' . $this->uniqueKey . '-' . $formField['key'],
						]);
						break;

					default:
						$class = "IPS\Helpers\Form\\" . $formField['type'];
						$field = new $class( $formField['key'], $this->configuration[ $formField['key'] ] ?? null, false );
						break;
				}

				$field->label = $formField['title'];
				$form->add( $field );
			}
		}
		else
		{
			$form->add( new Node( 'cms_widget_custom_block', $block, FALSE, array(
				'class' => '\IPS\cms\Blocks\Container',
				'showAllNodes' => TRUE,
				'permissionCheck' => function( $node )
				{
					if ( $node instanceof Container )
					{
						return FALSE;
					}

					return TRUE;
				}
			) ) );
		}

	    return $form;
 	}

	/**
	 * Pre config
	 *
	 * @param   array   $values     Form values
	 * @return  array
	 */
	public function preConfig( array $values ): array
	{
		$block = null;
		if( isset( $values['cms_widget_custom_block'] ) and $values['cms_widget_custom_block'] instanceof Block )
		{
			$block = $values['cms_widget_custom_block'];
			$values['cms_widget_custom_block'] = $values['cms_widget_custom_block']->key;
		}

		foreach( $values as $k => $v )
		{
			/* Make sure we cast everything as a string in case we have images or URLs */
			if( $v instanceof File or $v instanceof Url )
			{
				$values[ $k ] = (string) $v;
			}
		}

		if( $block?->type == 'template' )
		{
			foreach( $block->_plugin_config as $formField )
			{
				if( $formField['type'] == 'Editor' )
				{
					File::claimAttachments( 'cms-BlockContent-' . $this->uniqueKey . '-' . $formField['key'], $block->_id, null, $formField['key'] );
				}
			}
		}

		return $values;
	}

	/**
	 * Delete the widget configuration.
	 * Moved to a method so that individual widget types can do a cleanup
	 *
	 * @param string $uniqueId
	 * @return void
	 */
	public static function deleteConfig( string $uniqueId ) : void
	{
		try
		{
			$row = Db::i()->select( '*', 'core_widgets_config', [ 'id=?', $uniqueId ] )->first();
			$config = json_decode( $row['data'], true );

			$block = Block::load( $config['cms_widget_custom_block'], 'block_key' );
			if( $block->type === 'template' )
			{
				foreach( $block->_plugin_config as $field )
				{
					if( $field['type'] == 'Upload' and !empty( $config[ $field['key'] ] ) )
					{
						File::get( 'cms_Blocks', $config[ $field['key'] ] )->delete();
					}
				}
			}
		}
		catch( UnderflowException | OutOfRangeException ){}

		parent::deleteConfig( $uniqueId );
	}

	/**
	 * Render a widget
	 *
	 * @return	string
	 */
	public function render(): string
	{
		if ( isset( $this->configuration['cms_widget_custom_block'] ) )
		{
			return (string) Block::display( $this->configuration['cms_widget_custom_block'], $this->orientation, static::getConfiguration( $this->uniqueKey ) );
		}

		return '';
	}
}