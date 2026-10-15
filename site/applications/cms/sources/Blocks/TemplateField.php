<?php

/**
 * @brief        Field
 * @author        <a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright    (c) Invision Power Services, Inc.
 * @license        https://www.invisioncommunity.com/legal/standards/
 * @package        Invision Community
 * @subpackage
 * @since        12/9/2025
 */

namespace IPS\cms\Blocks;

/* To prevent PHP errors (extending class does not exist) revealing path */

use InvalidArgumentException;
use IPS\Helpers\Form\FormAbstract;
use IPS\Helpers\Form\Select;
use IPS\Helpers\Form\Text;
use IPS\Theme;
use LengthException;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

class TemplateField extends FormAbstract
{
	protected mixed $typeField = null;

	protected mixed $titleField = null;

	protected string $key = '';

	/**
	 * Constructor
	 *
	 * @param string $name Name
	 * @param mixed $defaultValue Default value
	 * @param bool|null $required Required? (NULL for not required, but appears to be so)
	 * @param array $options Type-specific options
	 * @param callable|null $customValidationCode Custom validation code
	 * @param string|null $prefix HTML to show before input field
	 * @param string|null $suffix HTML to show after input field
	 * @param string|null $id The ID to add to the row
	 */
	public function __construct( string $name, mixed $defaultValue=NULL, ?bool $required=FALSE, array $options=array(), callable $customValidationCode=NULL, string $prefix=NULL, string $suffix=NULL, string $id=NULL )
	{
		$options = array_merge( $this->defaultOptions, $options );

		$this->typeField = new Select( "{$name}[type]", $defaultValue['type'] ?? null, true, [
			'options' => [
				'Text'			=> 'pf_type_Text',
				'Editor'		=> 'pf_type_Editor',
				'TextArea'		=> 'pf_type_TextArea',
				'Upload'		=> 'pf_type_Image',
				'Number'		=> 'pf_type_Number',
			]
		] );

		$this->titleField = new Text( "{$name}[title]", $defaultValue['title'] ?? null, true );
		$this->key = $defaultValue['key'] ?? '';

		parent::__construct( $name, $defaultValue, $required, $options, $customValidationCode, $prefix, $suffix, $id );
	}

	/**
	 * Format Value
	 *
	 * @return	array
	 */
	public function formatValue(): mixed
	{
		return array(
			'type' => $this->typeField->formatValue(),
			'title' => $this->titleField->formatValue(),
			'key' => $this->key ?: mb_substr( md5( mt_rand() ), 0, 5 )
		);
	}

	/**
	 * Get HTML
	 *
	 * @return	string
	 */
	public function html(): string
	{
		return Theme::i()->getTemplate( 'blocks', 'cms', 'admin' )->templateField( $this->name, $this->typeField->html(), $this->titleField->html(), $this->key );
	}

	/**
	 * Validate
	 *
	 * @throws	InvalidArgumentException
	 * @throws	LengthException
	 * @return	TRUE
	 */
	public function validate(): bool
	{
		$this->typeField->validate();
		$this->titleField->validate();

		if( $this->customValidationCode !== NULL )
		{
			$validationFunction = $this->customValidationCode;
			$validationFunction( $this->value );
		}

		return TRUE;
	}
}