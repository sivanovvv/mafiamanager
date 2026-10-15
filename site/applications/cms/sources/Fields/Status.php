<?php

/**
 * @brief        Status
 * @author        <a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright    (c) Invision Power Services, Inc.
 * @license        https://www.invisioncommunity.com/legal/standards/
 * @package        Invision Community
 * @subpackage
 * @since        12/10/2025
 */

namespace IPS\cms\Fields;

/* To prevent PHP errors (extending class does not exist) revealing path */

use InvalidArgumentException;
use IPS\Helpers\Form\Color;
use IPS\Helpers\Form\FormAbstract;
use IPS\Helpers\Form\Text;
use IPS\Theme;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

class Status extends FormAbstract
{
	/**
	 * @var mixed|null
	 */
	protected mixed $keyField = null;

	/**
	 * @var mixed|null
	 */
	protected mixed $valueField = null;

	/**
	 * @var mixed|null
	 */
	protected mixed $colorField = null;

	/**
	 * Constructor
	 *
	 * @param string $name					Name
	 * @param mixed|null $defaultValue			Default value
	 * @param bool|null $required				Required? (NULL for not required, but appears to be so)
	 * @param array $options				Type-specific options
	 * @param callback|null $customValidationCode	Custom validation code
	 * @param string|null $prefix					HTML to show before input field
	 * @param string|null $suffix					HTML to show after input field
	 * @param string|null $id						The ID to add to the row
	 * @return	void
	 */
	public function __construct( string $name, mixed $defaultValue=NULL, ?bool $required=FALSE, array $options=array(), callable $customValidationCode=NULL, string $prefix=NULL, string $suffix=NULL, string $id=NULL )
	{
		$options = array_merge( $this->defaultOptions, $options );

		$this->keyField = new Text( "{$name}[key]", $defaultValue['key'] ?? null, false, $options['key'] ?? [] );
		$this->valueField = new Text( "{$name}[value]", $defaultValue['value'] ?? null, false, $options['value'] ?? [] );
		$this->colorField = new Color( "{$name}[color]", $defaultValue['color'] ?? null, false, $options['color'] ?? [] );

		parent::__construct( $name, $defaultValue, $required, $options, $customValidationCode, $prefix, $suffix, $id );
	}

	/**
	 * Format Value
	 *
	 * @return	mixed
	 */
	public function formatValue(): mixed
	{
		return [
			'key' => $this->keyField->formatValue(),
			'value' => $this->valueField->formatValue(),
			'color' => $this->colorField->formatValue()
		];
	}

	/**
	 * Get HTML
	 *
	 * @return	string
	 */
	public function html(): string
	{
		return Theme::i()->getTemplate( 'records', 'cms', 'global' )->status( $this->keyField->html(), $this->valueField->html(), $this->colorField->html() );
	}

	/**
	 * Validate
	 *
	 * @throws	InvalidArgumentException
	 * @return	TRUE
	 */
	public function validate(): bool
	{
		$this->keyField->validate();
		$this->valueField->validate();
		$this->colorField->validate();

		if( $this->customValidationCode !== NULL )
		{
			$validationFunction = $this->customValidationCode;
			$validationFunction( $this->valueField );
		}

		return true;
	}
}